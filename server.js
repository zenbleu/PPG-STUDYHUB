import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const production = process.argv.includes("--production") || process.argv.includes("--api-only");
const apiOnly = process.argv.includes("--api-only");
const PORT = Number(process.env.PORT || 5000);
const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
const DEFAULT_SETTINGS = {
  heroTitle: "Learn with focus.",
  heroAccent: "Progress with confidence.",
};
const defaultData = JSON.parse(await readFile(resolve(projectRoot, "public/data.json"), "utf8"));
const DEFAULT_STATE = {
  library: {
    subjects: defaultData.subjects || [],
    lessons: defaultData.lessons || [],
    quizzes: defaultData.quizzes || [],
  },
  settings: DEFAULT_SETTINGS,
};
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

const allowedOrigins = new Set(
  (process.env.STUDYHUB_ALLOWED_ORIGINS || "https://zenbleu.github.io")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const loginFailures = new Map();

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function applyCors(request, response) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const isReplitOrigin = /^https:\/\/[a-z0-9.-]+\.replit\.(?:dev|app)$/i.test(origin);
  const isLocalOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (!allowedOrigins.has(origin) && !isReplitOrigin && !isLocalOrigin) return false;

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Max-Age", "600");
  response.setHeader("Vary", "Origin");
  return true;
}

async function readJson(request, limitBytes = 2_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limitBytes) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

function signSession(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function issueAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    expiresAt: Date.now() + ADMIN_SESSION_SECONDS * 1000,
  })).toString("base64url");
  return `${payload}.${signSession(payload)}`;
}

function hasAdminToken(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const separator = token.lastIndexOf(".");
  if (!token || separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = signSession(payload);
  const suppliedHash = createHash("sha256").update(signature).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(suppliedHash, expectedHash)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.role === "admin" && Number(claims.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

function passwordMatches(supplied) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (typeof supplied !== "string" || !expectedPassword) return false;
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expectedPassword).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

function loginAttemptKey(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  return String(forwardedFor || request.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function isLoginRateLimited(request) {
  const attempts = loginFailures.get(loginAttemptKey(request));
  if (!attempts) return false;
  if (Date.now() - attempts.startedAt >= 15 * 60 * 1000) {
    loginFailures.delete(loginAttemptKey(request));
    return false;
  }
  return attempts.count >= 8;
}

function recordFailedLogin(request) {
  const key = loginAttemptKey(request);
  const attempts = loginFailures.get(key);
  if (!attempts || Date.now() - attempts.startedAt >= 15 * 60 * 1000) {
    loginFailures.set(key, { count: 1, startedAt: Date.now() });
  } else {
    attempts.count += 1;
  }
}

async function readSharedState() {
  const result = await pool.query(
    "SELECT library, settings, revision, updated_at FROM public.studyhub_state WHERE id = 1",
  );
  if (result.rowCount === 0) {
    return { ...DEFAULT_STATE, revision: 0, updatedAt: null, initialized: false };
  }
  const row = result.rows[0];
  return {
    library: row.library,
    settings: row.settings,
    revision: row.revision,
    updatedAt: row.updated_at,
    initialized: true,
  };
}

async function handleApi(request, response) {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  if (!requestUrl.pathname.startsWith("/api/")) return false;
  if (!applyCors(request, response)) {
    sendJson(response, 403, { error: "This site is not allowed to access StudyHub." });
    return true;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return true;
  }

  try {
    if (requestUrl.pathname === "/api/state" && request.method === "GET") {
      sendJson(response, 200, await readSharedState());
      return true;
    }

    if (requestUrl.pathname === "/api/admin/session" && request.method === "POST") {
      if (isLoginRateLimited(request)) {
        sendJson(response, 429, { error: "Too many sign-in attempts. Try again in 15 minutes." });
        return true;
      }
      const body = await readJson(request, 8_000);
      if (!passwordMatches(body.password)) {
        recordFailedLogin(request);
        sendJson(response, 401, { error: "The admin password is incorrect." });
        return true;
      }
      loginFailures.delete(loginAttemptKey(request));
      const token = issueAdminToken();
      sendJson(response, 200, {
        authenticated: true,
        token,
        expiresAt: Date.now() + ADMIN_SESSION_SECONDS * 1000,
      });
      return true;
    }

    if (requestUrl.pathname === "/api/admin/session" && request.method === "GET") {
      sendJson(response, 200, { authenticated: hasAdminToken(request) });
      return true;
    }

    if (requestUrl.pathname === "/api/state" && request.method === "POST") {
      if (!hasAdminToken(request)) {
        sendJson(response, 401, { error: "Admin access is required to update StudyHub." });
        return true;
      }
      const body = await readJson(request);
      const { library, settings, expectedRevision } = body || {};
      if (
        !library ||
        !Array.isArray(library.subjects) ||
        !Array.isArray(library.quizzes) ||
        !settings ||
        typeof settings !== "object" ||
        Array.isArray(settings) ||
        typeof settings.heroTitle !== "string" ||
        typeof settings.heroAccent !== "string" ||
        !Number.isInteger(expectedRevision) ||
        expectedRevision < 0
      ) {
        sendJson(response, 400, { error: "The shared StudyHub data is incomplete or invalid." });
        return true;
      }

      const values = [JSON.stringify(library), JSON.stringify(settings)];
      const result = expectedRevision === 0
        ? await pool.query(
          `INSERT INTO public.studyhub_state (id, library, settings, revision, updated_at)
           VALUES (1, $1::jsonb, $2::jsonb, 1, NOW())
           ON CONFLICT (id) DO NOTHING
           RETURNING revision, updated_at`,
          values,
        )
        : await pool.query(
          `UPDATE public.studyhub_state
           SET library = $1::jsonb, settings = $2::jsonb,
               revision = revision + 1, updated_at = NOW()
           WHERE id = 1 AND revision = $3
           RETURNING revision, updated_at`,
          [...values, expectedRevision],
        );

      if (result.rowCount === 0) {
        sendJson(response, 409, {
          error: "Another admin has already updated StudyHub. The latest shared version has been loaded.",
          state: await readSharedState(),
        });
        return true;
      }

      const row = result.rows[0];
      sendJson(response, 200, {
        revision: row.revision,
        updatedAt: row.updated_at,
        initialized: true,
      });
      return true;
    }

    sendJson(response, 404, { error: "StudyHub API route not found." });
    return true;
  } catch (error) {
    if (error.status) {
      sendJson(response, error.status, { error: error.message });
      return true;
    }
    console.error("StudyHub API request failed:", error.code || error.name || "unknown error");
    sendJson(response, 503, { error: "Shared StudyHub storage is temporarily unavailable." });
    return true;
  }
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function serveProductionFile(request, response) {
  const distDirectory = resolve(projectRoot, "dist");
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  } catch {
    sendJson(response, 400, { error: "Invalid URL." });
    return;
  }
  const requestedFile = resolve(distDirectory, `.${pathname}`);
  if (requestedFile !== distDirectory && !requestedFile.startsWith(`${distDirectory}${sep}`)) {
    sendJson(response, 400, { error: "Invalid file path." });
    return;
  }
  try {
    const filePath = pathname === "/" ? resolve(distDirectory, "index.html") : requestedFile;
    const contents = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(contents);
  } catch {
    try {
      const contents = await readFile(resolve(distDirectory, "index.html"));
      response.writeHead(200, { "Cache-Control": "no-cache", "Content-Type": "text/html; charset=utf-8" });
      response.end(contents);
    } catch {
      sendJson(response, 503, { error: "The StudyHub web build is not available." });
    }
  }
}

let vite;
const server = createServer(async (request, response) => {
  if (await handleApi(request, response)) return;
  if (production) {
    if (apiOnly) {
      sendJson(response, 404, { error: "This service only hosts the StudyHub API." });
      return;
    }
    await serveProductionFile(request, response);
    return;
  }
  vite.middlewares(request, response, (error) => {
    if (error) {
      console.error("StudyHub development server failed:", error.name || "unknown error");
      sendJson(response, 500, { error: "The StudyHub development server encountered an error." });
    }
  });
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing; the shared StudyHub API cannot connect to PostgreSQL.");
}

if (!production) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
}

server.on("close", () => vite?.close());
server.listen(PORT, "0.0.0.0", () => {
  console.log(`StudyHub ${apiOnly ? "API" : production ? "server" : "development server"} listening on port ${PORT}.`);
});