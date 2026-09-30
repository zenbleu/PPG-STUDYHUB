import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileQuestion,
  Flag,
  Home,
  LayoutDashboard,
  Library,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Moon,
  Sun,
  Target,
  TimerReset,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";

const STORAGE = {
  library: "studyhub.library.v1",
  results: "studyhub.results.v1",
  settings: "studyhub.settings.v1",
  theme: "studyhub.theme.v1",
};
const ADMIN_TOKEN_KEY = "studyhub.admin.session.v1";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const DEFAULT_SETTINGS = {
  heroTitle: "Learn with focus.",
  heroAccent: "Progress with confidence.",
};

const DEFAULT_LIBRARY = {
  subjects: [
    { id: "science", name: "General Science", color: "violet", icon: "✦" },
    { id: "math", name: "Mathematics", color: "blue", icon: "∑" },
    { id: "history", name: "World History", color: "amber", icon: "◐" },
  ],
  quizzes: [
    {
      id: "science-midterm",
      title: "The Living World",
      subjectId: "science",
      lesson: "Lesson 04",
      type: "Exam",
      tags: ["Midterm Exam", "Biology"],
      questionTypes: ["Multiple choice", "Identification"],
      rules: { timer: true, minutes: 12, skip: true, previous: true, flag: true, random: false, explanation: true },
      questions: [
        { id: "s1", type: "multiple", text: "Which part of a plant cell is responsible for photosynthesis?", options: ["Nucleus", "Chloroplast", "Mitochondria", "Cell wall"], answer: "Chloroplast", explanation: "Chloroplasts contain chlorophyll, which captures light energy for photosynthesis." },
        { id: "s2", type: "multiple", text: "What is the smallest unit of life?", options: ["Tissue", "Organ", "Cell", "Atom"], answer: "Cell", explanation: "The cell is the basic structural and functional unit of all known living organisms." },
        { id: "s3", type: "identification", text: "The process by which liquid water changes into water vapor is called ___.", answer: "Evaporation", explanation: "Evaporation happens when heat gives water molecules enough energy to escape into the air." },
        { id: "s4", type: "multiple", text: "Which organ pumps blood throughout the human body?", options: ["Lungs", "Brain", "Liver", "Heart"], answer: "Heart", explanation: "The heart is a muscular organ that circulates blood through the body's vessels." },
        { id: "s5", type: "identification", text: "Animals that eat only plants are called ___.", answer: "Herbivores", explanation: "Herbivores have diets made up primarily of plants and algae." },
      ],
    },
    {
      id: "math-foundations",
      title: "Algebra Foundations",
      subjectId: "math",
      lesson: "Lesson 02",
      type: "Quiz",
      tags: ["Practice", "Core Skills"],
      questionTypes: ["Multiple choice", "Enumeration"],
      rules: { timer: false, minutes: 10, skip: true, previous: true, flag: true, random: true, explanation: false },
      questions: [
        { id: "m1", type: "multiple", text: "Solve for x: 3x + 5 = 20", options: ["3", "5", "8", "15"], answer: "5", explanation: "Subtract 5 from both sides, then divide by 3: x = 15 ÷ 3 = 5." },
        { id: "m2", type: "multiple", text: "What is the value of 4² + 3²?", options: ["12", "18", "25", "49"], answer: "25", explanation: "4² is 16 and 3² is 9. Together, they equal 25." },
        { id: "m3", type: "identification", text: "A number that can be written as a fraction of two integers is called a ___ number.", answer: "Rational", explanation: "Rational numbers can be represented as p/q, where p and q are integers and q is not zero." },
        { id: "m4", type: "multiple", text: "Which expression is equivalent to 2(x + 4)?", options: ["2x + 4", "x + 8", "2x + 8", "2x + 2"], answer: "2x + 8", explanation: "Distribute 2 to each term inside the parentheses." },
      ],
    },
    {
      id: "history-modern",
      title: "Modern History Check-in",
      subjectId: "history",
      lesson: "Lesson 07",
      type: "Quiz",
      tags: ["Quick check"],
      questionTypes: ["Multiple choice"],
      rules: { timer: true, minutes: 8, skip: true, previous: false, flag: true, random: false, explanation: true },
      questions: [
        { id: "h1", type: "multiple", text: "The Renaissance began in which European country?", options: ["France", "Italy", "Spain", "England"], answer: "Italy", explanation: "The Renaissance began in Italian city-states such as Florence during the 14th century." },
        { id: "h2", type: "multiple", text: "Which invention made the widespread printing of books possible in Europe?", options: ["Steam engine", "Compass", "Printing press", "Telescope"], answer: "Printing press", explanation: "Gutenberg's movable-type printing press enabled books to be produced much faster." },
        { id: "h3", type: "multiple", text: "The ancient city of Machu Picchu was built by which civilization?", options: ["Maya", "Roman", "Inca", "Greek"], answer: "Inca", explanation: "Machu Picchu was built by the Inca civilization in the 15th century." },
      ],
    },
  ],
};

const iconFor = (name, props = {}) => {
  const icons = { dashboard: LayoutDashboard, library: Library, book: BookOpen, chart: BarChart3, settings: Settings2 };
  const Icon = icons[name] || CircleHelp;
  return <Icon size={18} strokeWidth={1.9} {...props} />;
};

function loadStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function requestApi(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const error = new Error(payload.error || "StudyHub could not complete the request.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function comparableLibrary(value) {
  const library = normalizeLibrary(value);
  return JSON.stringify({
    subjects: library.subjects,
    lessons: library.lessons,
    quizzes: library.quizzes,
  });
}

function readLegacyContent() {
  try {
    const libraryValue = localStorage.getItem(STORAGE.library);
    const settingsValue = localStorage.getItem(STORAGE.settings);
    if (!libraryValue && !settingsValue) return null;
    const library = normalizeLibrary(libraryValue ? JSON.parse(libraryValue) : DEFAULT_LIBRARY);
    const settings = { ...DEFAULT_SETTINGS, ...(settingsValue ? JSON.parse(settingsValue) : {}) };
    return {
      library,
      settings,
      customized:
        comparableLibrary(library) !== comparableLibrary(DEFAULT_LIBRARY) ||
        JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS),
    };
  } catch {
    return null;
  }
}

function deriveLessons(library) {
  const lessons = new Map();
  (library.quizzes || []).forEach((quiz) => {
    const identifier = quiz.lesson || "Lesson 01";
    const id = `${quiz.subjectId || "general"}-${identifier.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const current = lessons.get(id) || {
      id,
      subjectId: quiz.subjectId,
      title: identifier,
      identifier,
      quizIds: [],
    };
    if (!current.quizIds.includes(quiz.id)) current.quizIds.push(quiz.id);
    lessons.set(id, current);
  });
  return Array.from(lessons.values());
}

function normalizeLibrary(value) {
  const source = value && typeof value === "object" ? value : {};
  const subjects = Array.isArray(source.subjects) ? source.subjects : DEFAULT_LIBRARY.subjects;
  const quizzes = Array.isArray(source.quizzes) ? source.quizzes : [];
  const derivedLessons = deriveLessons({ subjects, quizzes });
  const explicitLessons = Array.isArray(source.lessons) ? source.lessons : [];
  const lessons = [
    ...derivedLessons,
    ...explicitLessons.filter((lesson) => !derivedLessons.some((derivedLesson) => derivedLesson.id === lesson.id)),
  ];
  return { ...source, subjects, lessons, quizzes };
}

function hasLibraryData(value) {
  const source = value?.library && typeof value.library === "object" ? value.library : value;
  return Boolean(source && Array.isArray(source.subjects) && Array.isArray(source.quizzes) && (source.subjects.length || source.quizzes.length));
}

function libraryFromPayload(value) {
  return value?.library && typeof value.library === "object" ? value.library : value;
}

function mergeLibrarySnapshots(localValue, staticValue) {
  const local = normalizeLibrary(localValue);
  const deployed = normalizeLibrary(staticValue);
  const mergeById = (deployedItems, localItems) => [
    ...deployedItems,
    ...localItems.filter((localItem) => !deployedItems.some((deployedItem) => deployedItem.id === localItem.id)),
  ];
  return normalizeLibrary({
    ...local,
    ...deployed,
    subjects: mergeById(deployed.subjects, local.subjects),
    lessons: mergeById(deployed.lessons, local.lessons),
    quizzes: mergeById(deployed.quizzes, local.quizzes),
  });
}

function createDatabaseSnapshot(library, settings = DEFAULT_SETTINGS) {
  const normalized = normalizeLibrary(library);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    subjects: normalized.subjects,
    lessons: normalized.lessons,
    quizzes: normalized.quizzes,
  };
}

function downloadDatabase(library, settings) {
  const file = new Blob([JSON.stringify(createDatabaseSnapshot(library, settings), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function getSubject(library, subjectId) {
  return library.subjects.find((subject) => subject.id === subjectId) || library.subjects[0];
}

function answerIsCorrect(question, answer) {
  if (Array.isArray(question.answer)) {
    const expected = question.answer.map((item) => item.toLowerCase().trim());
    const actual = Array.isArray(answer) ? answer : String(answer || "").split(",").map((item) => item.toLowerCase().trim());
    return expected.length === actual.length && expected.every((item) => actual.includes(item));
  }
  return String(answer || "").trim().toLowerCase() === String(question.answer || "").trim().toLowerCase();
}

function App() {
  const [legacyContent] = useState(() => readLegacyContent());
  const [library, setLibrary] = useState(() => normalizeLibrary(DEFAULT_LIBRARY));
  const [results, setResults] = useState(() => loadStorage(STORAGE.results, []));
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState(() => loadStorage(STORAGE.theme, "dark") === "light" ? "light" : "dark");
  const [page, setPage] = useState("home");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [notice, setNotice] = useState("");
  const [stateReady, setStateReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState("loading");
  const [revision, setRevision] = useState(0);
  const [pendingMigration, setPendingMigration] = useState(null);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => localStorage.setItem(STORAGE.results, JSON.stringify(results)), [results]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE.theme, theme);
  }, [theme]);

  const applySharedState = (shared, saveLocalCopy = true) => {
    const nextLibrary = normalizeLibrary(shared.library);
    const nextSettings = { ...DEFAULT_SETTINGS, ...(shared.settings || {}) };
    revisionRef.current = Number(shared.revision) || 0;
    setRevision(revisionRef.current);
    setLibrary(nextLibrary);
    setSettings(nextSettings);
    setSelectedSubject((current) => current === "all" || nextLibrary.subjects.some((subject) => subject.id === current) ? current : "all");
    if (saveLocalCopy) {
      try {
        localStorage.setItem(STORAGE.library, JSON.stringify(nextLibrary));
        localStorage.setItem(STORAGE.settings, JSON.stringify(nextSettings));
      } catch {
        // The server remains authoritative if browser storage is unavailable.
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadSharedState = async () => {
      setStateReady(false);
      setLoadError("");
      setSyncStatus("loading");
      try {
        const shared = await requestApi("/api/state");
        if (cancelled) return;
        const needsMigration = !shared.initialized && Boolean(legacyContent?.customized);
        applySharedState(shared, !needsMigration);
        setPendingMigration(needsMigration ? legacyContent : null);
        setStateReady(true);
        setSyncStatus("saved");

        try {
          const session = await requestApi("/api/admin/session");
          if (cancelled) return;
          setAdminAuthed(Boolean(session.authenticated));
          if (!session.authenticated) sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        } catch {
          setAdminAuthed(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "StudyHub could not connect to shared storage.");
          setSyncStatus("error");
        }
      }
    };

    loadSharedState();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const startQuiz = (quizToStart) => {
    setQuiz(quizToStart);
    setQuizResult(null);
    setPage("quiz");
  };

  const finishQuiz = (result) => {
    setQuizResult(result);
    setResults((previous) => [result, ...previous].slice(0, 20));
    setPage("results");
  };

  const openHome = () => {
    setPage("home");
    setQuiz(null);
    setQuizResult(null);
  };

  const saveSharedState = async (nextLibrary, nextSettings) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSyncStatus("saving");
    try {
      const saved = await requestApi("/api/state", {
        method: "POST",
        body: JSON.stringify({
          library: normalizeLibrary(nextLibrary),
          settings: { ...DEFAULT_SETTINGS, ...nextSettings },
          expectedRevision: revisionRef.current,
        }),
      });
      applySharedState({
        ...saved,
        library: nextLibrary,
        settings: nextSettings,
        initialized: true,
      });
      setPendingMigration(null);
      setSyncStatus("saved");
      setNotice("Saved to shared StudyHub");
      return true;
    } catch (error) {
      if (error.status === 409 && error.payload?.state) {
        applySharedState(error.payload.state);
        setPendingMigration(null);
        setSyncStatus("updated");
        setNotice("Another admin updated StudyHub. The latest version is loaded; review and save your change again.");
      } else if (error.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminAuthed(false);
        setPage("home");
        setAdminOpen(true);
        setSyncStatus("error");
        setNotice("Admin session expired. Sign in again to save changes.");
      } else {
        setSyncStatus("error");
        setNotice(error.message || "Could not save to shared StudyHub. Check the connection and try again.");
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  };

  const updateLibrary = (next) => saveSharedState(next, settings);
  const updateSettings = (next) => saveSharedState(library, next);

  const refreshSharedState = async (notify = false) => {
    if (savingRef.current) return;
    try {
      const shared = await requestApi("/api/state");
      if (Number(shared.revision) > revisionRef.current) {
        applySharedState(shared);
        setPendingMigration(null);
        setSyncStatus("updated");
        if (notify) setNotice("StudyHub content updated from another device");
      } else if (syncStatus === "error") {
        setSyncStatus("saved");
      }
    } catch {
      setSyncStatus("error");
    }
  };

  useEffect(() => {
    if (!stateReady || page === "library") return undefined;
    const refresh = () => refreshSharedState(true);
    const interval = window.setInterval(() => refreshSharedState(false), 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [stateReady, page, revision, syncStatus]);

  const importLegacyContent = async () => {
    if (!pendingMigration) return;
    await saveSharedState(pendingMigration.library, pendingMigration.settings);
  };

  const keepSharedContent = () => {
    setPendingMigration(null);
    try {
      localStorage.setItem(STORAGE.library, JSON.stringify(library));
      localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    } catch {
      // Keeping the server version does not depend on browser storage.
    }
  };

  return (
    <div className="app-shell">
      {!stateReady ? (
        <main className="shared-state-screen">
          {loadError ? (
            <div className="shared-state-message">
              <h1>StudyHub could not connect</h1>
              <p>{loadError}</p>
              <button className="primary-button" onClick={() => setRetryCount((count) => count + 1)}>Retry connection</button>
            </div>
          ) : <div className="shared-state-message"><span className="status-dot" /><p>Loading shared StudyHub content…</p></div>}
        </main>
      ) : <>
        <Header
          page={page}
          onHome={openHome}
          onAdmin={() => setAdminOpen(true)}
          onNavigate={(nextPage) => setPage(nextPage)}
          theme={theme}
          setTheme={setTheme}
          syncStatus={syncStatus}
        />
        {page === "home" && (
          <HomePage
            library={library}
            results={results}
            subject={selectedSubject}
            setSubject={setSelectedSubject}
            query={searchQuery}
            setQuery={setSearchQuery}
            onStart={startQuiz}
            onAdmin={() => setAdminOpen(true)}
            settings={settings}
          />
        )}
        {page === "quiz" && quiz && <QuizPage quiz={quiz} onExit={openHome} onFinish={finishQuiz} />}
        {page === "results" && quizResult && (
          <ResultsPage result={quizResult} library={library} onHome={openHome} onRetry={() => startQuiz(quiz)} />
        )}
        {page === "library" && (
          <AdminPage
            library={library}
            settings={settings}
            onUpdate={updateLibrary}
            onUpdateSettings={updateSettings}
            onExit={openHome}
            syncStatus={syncStatus}
            revision={revision}
            pendingMigration={pendingMigration}
            onImportLegacy={importLegacyContent}
            onKeepShared={keepSharedContent}
          />
        )}
        {adminOpen && (
          <AdminGate
            authed={adminAuthed}
            setAuthed={setAdminAuthed}
            onClose={() => setAdminOpen(false)}
            onContinue={() => {
              setAdminOpen(false);
              setPage("library");
            }}
          />
        )}
        {notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}
      </>}
    </div>
  );
}

function Header({ page, onHome, onAdmin, onNavigate, theme, setTheme, syncStatus }) {
  const isAdmin = page === "library";
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={onHome} aria-label="StudyHub home">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span>Study<span>Hub</span></span>
        </button>
        <nav className="topnav">
          <button className={page === "home" ? "nav-link active" : "nav-link"} onClick={onHome}>{iconFor("dashboard")} Overview</button>
          <button className={page === "library" ? "nav-link active" : "nav-link"} onClick={() => (isAdmin ? onNavigate("library") : onAdmin())}>{iconFor("library")} Manage library</button>
        </nav>
        <div className="topbar-actions">
          <span className={`online-status sync-${syncStatus}`}><span className="status-dot" /> {syncStatus === "saving" ? "Saving changes" : syncStatus === "error" ? "Sync unavailable" : "Shared StudyHub"}</span>
          <div className="theme-switcher" role="group" aria-label="Visual theme">
            <button className={`theme-button ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")} aria-pressed={theme === "light"} title="Use light theme"><Sun size={15} /><span className="theme-label">Light</span></button>
            <button className={`theme-button ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"} title="Use dark theme"><Moon size={15} /><span className="theme-label">Dark</span></button>
          </div>
          {isAdmin ? (
            <button className="avatar-button" onClick={onHome}>SH</button>
          ) : (
            <button className="admin-button" onClick={onAdmin}><LockKeyhole size={15} /> Admin</button>
          )}
        </div>
      </div>
    </header>
  );
}

function HomePage({ library, results, subject, setSubject, query, setQuery, onStart, onAdmin, settings }) {
  const filteredQuizzes = useMemo(() => library.quizzes.filter((item) => {
    const matchesSubject = subject === "all" || item.subjectId === subject;
    const haystack = `${item.title} ${item.lesson} ${item.tags.join(" ")}`.toLowerCase();
    return matchesSubject && haystack.includes(query.toLowerCase());
  }), [library.quizzes, subject, query]);
  const recentResult = results[0];
  const totalQuestions = library.quizzes.reduce((sum, item) => sum + item.questions.length, 0);
  const completedCount = new Set(results.map((item) => item.quizId)).size;

  return (
    <main className="page-content">
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL STUDY SPACE</div>
          <h1>{settings.heroTitle}<br /><em>{settings.heroAccent}</em></h1>
          <p>Pick up where you left off, or explore a new lesson. Your library stays synced across every device.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#library"><BookOpen size={17} /> Explore library</a>
            {recentResult && <button className="text-button" onClick={() => document.getElementById("recent-work")?.scrollIntoView({ behavior: "smooth" })}>View recent result <ArrowRight size={15} /></button>}
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-star star-one">✦</div><div className="hero-star star-two">✦</div>
          <div className="hero-card floating-card"><span className="card-icon icon-lilac"><Target size={18} /></span><div><strong>Stay curious</strong><small>One question at a time</small></div></div>
          <div className="hero-book"><div className="book-page page-back" /><div className="book-page page-front"><span>SH</span><small>STUDY<br />HUB</small></div></div>
          <div className="hero-card progress-float"><div className="mini-progress"><span style={{ width: "74%" }} /></div><strong>74%</strong><small>Weekly focus</small></div>
        </div>
      </section>

      <section className="stat-row" aria-label="Study overview">
        <div className="stat-item"><span className="stat-icon lavender"><Library size={18} /></span><div><strong>{library.quizzes.length}</strong><span>Available tests</span></div></div>
        <div className="stat-item"><span className="stat-icon mint"><CheckCircle2 size={18} /></span><div><strong>{completedCount}</strong><span>Completed tests</span></div></div>
        <div className="stat-item"><span className="stat-icon peach"><FileQuestion size={18} /></span><div><strong>{totalQuestions}</strong><span>Questions to explore</span></div></div>
        <div className="stat-item tip-stat"><span className="stat-icon yellow"><Sparkles size={18} /></span><div><strong>Small steps</strong><span>make lasting progress</span></div></div>
      </section>

      <section className="library-section" id="library">
        <div className="section-heading">
          <div><div className="eyebrow">BUILD YOUR MOMENTUM</div><h2>Explore your library</h2></div>
          <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons or tests" /></div>
        </div>
        <div className="subject-tabs">
          <button className={subject === "all" ? "subject-tab active" : "subject-tab"} onClick={() => setSubject("all")}>All subjects <span>{library.quizzes.length}</span></button>
          {library.subjects.map((item) => {
            const count = library.quizzes.filter((quiz) => quiz.subjectId === item.id).length;
            return <button key={item.id} className={subject === item.id ? "subject-tab active" : "subject-tab"} onClick={() => setSubject(item.id)}><span className={`subject-dot ${item.color}`} />{item.name}<span>{count}</span></button>;
          })}
        </div>
        <div className="quiz-grid">
          {filteredQuizzes.map((item) => <QuizCard key={item.id} quiz={item} library={library} onStart={onStart} />)}
          {!filteredQuizzes.length && <div className="empty-state"><Search size={26} /><h3>No lessons found</h3><p>Try another search or choose a different subject.</p></div>}
        </div>
      </section>

      {recentResult && <section className="recent-card" id="recent-work"><div className="recent-icon"><Trophy size={19} /></div><div><span className="eyebrow">RECENTLY COMPLETED</span><h3>{recentResult.quizTitle}</h3><p>You scored <strong>{recentResult.score}/{recentResult.total}</strong> · {new Date(recentResult.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><button className="secondary-button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>Keep going <ArrowRight size={15} /></button></section>}
      <footer className="footer"><span>StudyHub</span><span>Designed for focused learning · Your data stays on this device</span><button onClick={onAdmin}><Settings2 size={14} /> Manage library</button></footer>
    </main>
  );
}

function QuizCard({ quiz, library, onStart }) {
  const subject = getSubject(library, quiz.subjectId);
  return (
    <article className="quiz-card">
      <div className={`quiz-card-top ${subject.color}`}>
        <span className="quiz-subject-label"><span className="subject-dot light" />{subject.name}</span>
        <span className="more-button"><MoreHorizontal size={18} /></span>
        <div className="quiz-decoration">{subject.icon}</div>
      </div>
      <div className="quiz-card-body">
        <div className="quiz-meta"><span>{quiz.lesson}</span><span className="meta-separator">·</span><span className={quiz.type === "Exam" ? "type-label exam" : "type-label"}>{quiz.type}</span></div>
        <h3>{quiz.title}</h3>
        <div className="tag-row">{quiz.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="quiz-card-bottom"><span className="question-count"><FileQuestion size={15} /> {quiz.questions.length} questions</span><button className="start-button" onClick={() => onStart(quiz)}>Start <ArrowRight size={14} /></button></div>
      </div>
    </article>
  );
}

function AdminGate({ authed, setAuthed, onClose, onContinue }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const session = await requestApi("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      sessionStorage.setItem(ADMIN_TOKEN_KEY, session.token);
      setAuthed(true);
      onContinue();
      setPassword("");
    } catch (requestError) {
      setError(requestError.message || "Could not verify admin access. Try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal-card login-modal">
      <button className="modal-close" onClick={onClose}><X size={18} /></button>
      <div className="login-lock"><ShieldCheck size={25} /></div>
      <div className="eyebrow centered">LIBRARY ACCESS</div><h2>Welcome, admin</h2><p>Manage your subjects, lessons, and assessments from one place.</p>
      {!authed ? <form onSubmit={submit}><label className="field-label">Admin password<input autoFocus type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter your password" /></label>{error && <div className="error-message"><XCircle size={15} /> {error}</div>}<button className="primary-button full" type="submit" disabled={submitting}><LockKeyhole size={16} /> {submitting ? "Verifying…" : "Unlock library"}</button></form> : <button className="primary-button full" onClick={onContinue}>Continue to library <ArrowRight size={16} /></button>}
      <small className="modal-note">Admin access is verified by the shared StudyHub server.</small>
    </div>
  </div>;
}

function QuizPage({ quiz, onExit, onFinish }) {
  const [questions] = useState(() => quiz.rules.random ? [...quiz.questions].sort(() => Math.random() - 0.5) : quiz.questions);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(quiz.rules.timer ? quiz.rules.minutes * 60 : null);
  const question = questions[current];
  const currentAnswer = answers[question.id] || "";
  const isCorrect = submitted && answerIsCorrect(question, currentAnswer);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) submitQuiz(true);
  }, [secondsLeft]);

  const setAnswer = (value) => {
    if (!submitted) setAnswers((previous) => ({ ...previous, [question.id]: value }));
  };
  const goNext = () => {
    if (current < questions.length - 1) {
      setCurrent((value) => value + 1);
      setSubmitted(false);
    } else submitQuiz(false);
  };
  const submitQuiz = (timedOut) => {
    const reviewed = questions.map((item) => ({ questionId: item.id, answer: answers[item.id] || "", correct: answerIsCorrect(item, answers[item.id]), flagged: flags.includes(item.id) }));
    onFinish({ id: makeId("result"), quizId: quiz.id, quizTitle: quiz.title, total: questions.length, score: reviewed.filter((item) => item.correct).length, answers: reviewed, questions, timedOut, completedAt: new Date().toISOString() });
  };

  return <main className="quiz-page">
    <div className="quiz-topline"><button className="back-link" onClick={onExit}><ArrowLeft size={16} /> Leave quiz</button><span className="quiz-name">{quiz.title}</span><div className="quiz-top-actions">{quiz.rules.timer && <span className={`timer-pill ${secondsLeft < 60 ? "warning" : ""}`}><Clock3 size={15} /> {formatTime(secondsLeft)}</span>}<span className="question-progress">{current + 1} <span>/</span> {questions.length}</span></div></div>
    <div className="quiz-layout">
      <aside className="question-sidebar"><div className="sidebar-kicker">QUESTION MAP</div><div className="question-map">{questions.map((item, index) => <button key={item.id} className={`map-number ${index === current ? "current" : ""} ${answers[item.id] ? "answered" : ""} ${flags.includes(item.id) ? "flagged" : ""}`} onClick={() => { setCurrent(index); setSubmitted(false); }}>{index + 1}{flags.includes(item.id) && <Flag size={10} fill="currentColor" />}</button>)}</div><div className="sidebar-rule" /><div className="sidebar-help"><CircleHelp size={16} /><div><strong>Study tip</strong><p>Read each question twice before choosing your answer.</p></div></div></aside>
      <section className="question-panel">
        <div className="question-header"><span className={`question-type-badge ${question.type === "multiple" ? "purple" : "blue"}`}>{question.type === "multiple" ? "MULTIPLE CHOICE" : "IDENTIFICATION"}</span><button className={flags.includes(question.id) ? "flag-link active" : "flag-link"} onClick={() => setFlags((previous) => previous.includes(question.id) ? previous.filter((id) => id !== question.id) : [...previous, question.id])}><Flag size={16} fill={flags.includes(question.id) ? "currentColor" : "none"} /> {flags.includes(question.id) ? "Flagged" : "Flag question"}</button></div>
        <div className="question-copy"><span className="question-number">Question {String(current + 1).padStart(2, "0")}</span><h1>{question.text}</h1></div>
        <div className="answer-area">{question.type === "multiple" ? <div className="option-list">{question.options.map((option, index) => <button key={option} className={`answer-option ${currentAnswer === option ? "selected" : ""} ${submitted && currentAnswer === option && !isCorrect ? "wrong" : ""} ${submitted && option === question.answer ? "correct-answer" : ""}`} onClick={() => setAnswer(option)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{submitted && option === question.answer && <CheckCircle2 className="answer-check" size={19} />}{submitted && currentAnswer === option && !isCorrect && <XCircle className="answer-check wrong-icon" size={19} />}</button>)}</div> : <label className="identification-input"><span>Your answer</span><input value={currentAnswer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer here..." autoComplete="off" /></label>}</div>
        {submitted && quiz.rules.explanation && <div className={`explanation-box ${isCorrect ? "correct" : "incorrect"}`}><span className="explanation-icon">{isCorrect ? <Check size={16} /> : <CircleHelp size={17} />}</span><div><strong>{isCorrect ? "Nice work!" : "Keep learning"}</strong><p>{question.explanation}</p></div></div>}
        <div className="question-footer">{quiz.rules.skip && current < questions.length - 1 ? <button className="skip-link" onClick={goNext}>Skip for now <ArrowRight size={15} /></button> : <span />}{quiz.rules.previous && current > 0 && <button className="previous-button" onClick={() => { setCurrent((value) => value - 1); setSubmitted(false); }}><ArrowLeft size={15} /> Previous</button>}<button className="next-button" onClick={() => submitted || !quiz.rules.explanation ? goNext() : setSubmitted(true)}>{current === questions.length - 1 ? (submitted ? "Finish quiz" : "Submit & finish") : (submitted ? "Next question" : "Check answer")} <ArrowRight size={16} /></button></div>
      </section>
    </div>
  </main>;
}

function ResultsPage({ result, library, onHome, onRetry }) {
  const percentage = Math.round((result.score / result.total) * 100);
  const subject = getSubject(library, library.quizzes.find((item) => item.id === result.quizId)?.subjectId);
  return <main className="results-page">
    <div className="results-header"><button className="back-link" onClick={onHome}><ArrowLeft size={16} /> Back to library</button><span className="results-label">QUIZ COMPLETE</span><span /></div>
    <section className="results-hero"><div className="eyebrow centered"><span className="eyebrow-line" /> KEEP THE MOMENTUM <span className="eyebrow-line" /></div><h1>{percentage >= 80 ? "Great work. Keep going." : "Good effort. Keep learning."}</h1><p>You completed <strong>{result.quizTitle}</strong> {result.timedOut ? "before the timer ran out." : "at your own pace."}</p>
      <div className="score-ring" style={{ "--score": `${percentage * 3.6}deg` }}><div className="score-ring-inner"><strong>{percentage}<sup>%</sup></strong><span>your score</span></div></div>
      <div className="score-summary"><div><strong>{result.score}</strong><span>Correct</span></div><div><strong>{result.total - result.score}</strong><span>To review</span></div><div><strong>{result.total}</strong><span>Total</span></div></div>
    </section>
    <section className="review-section"><div className="section-heading review-heading"><div><div className="eyebrow">LOOK BACK TO MOVE FORWARD</div><h2>Review your answers</h2></div><div className="review-actions"><button className="secondary-button" onClick={onRetry}><RotateCcw size={15} /> Try again</button><button className="primary-button" onClick={onHome}>Done <Check size={15} /></button></div></div>
      <div className="review-list">{result.questions.map((question, index) => { const response = result.answers.find((item) => item.questionId === question.id); return <article className={`review-item ${response.correct ? "review-correct" : "review-wrong"}`} key={question.id}><div className="review-number">{String(index + 1).padStart(2, "0")}</div><div className="review-main"><div className="review-question-top"><span className="review-status">{response.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {response.correct ? "Correct" : "Review this one"}</span>{response.flagged && <span className="flagged-chip"><Flag size={12} fill="currentColor" /> Flagged</span>}</div><h3>{question.text}</h3><div className="answer-comparison"><div><small>Your answer</small><span className={response.correct ? "answer-text correct-text" : "answer-text wrong-text"}>{response.answer || "Skipped"}</span></div><div><small>Correct answer</small><span className="answer-text correct-text">{Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}</span></div></div><div className="review-explanation"><CircleHelp size={15} /><span>{question.explanation}</span></div></div></article>})}</div>
    </section>
  </main>;
}

const emptyQuestion = () => ({ id: makeId("question"), type: "multiple", text: "", options: ["", "", "", ""], answer: "", explanation: "" });
const blankQuiz = (subjectId) => ({ id: makeId("quiz"), title: "", subjectId, lesson: "Lesson 01", type: "Quiz", tags: ["Practice"], questionTypes: ["Multiple choice"], rules: { timer: false, minutes: 10, skip: true, previous: true, flag: true, random: false, explanation: true }, questions: [emptyQuestion()] });

function AdminPage({ library, settings, onUpdate, onUpdateSettings, onExit, syncStatus, revision, pendingMigration, onImportLegacy, onKeepShared }) {
  const [editing, setEditing] = useState(null);
  const [adminTab, setAdminTab] = useState("assessments");
  const [subjectName, setSubjectName] = useState("");
  const quizzes = library.quizzes;
  const saveQuiz = async (nextQuiz) => {
    const exists = library.quizzes.some((item) => item.id === nextQuiz.id);
    const saved = await onUpdate({ ...library, quizzes: exists ? library.quizzes.map((item) => item.id === nextQuiz.id ? nextQuiz : item) : [nextQuiz, ...library.quizzes] });
    if (saved) setEditing(null);
  };
  const deleteQuiz = async (id) => {
    if (window.confirm("Delete this assessment from shared StudyHub?")) {
      await onUpdate({ ...library, quizzes: library.quizzes.filter((item) => item.id !== id) });
    }
  };
  const deleteSubject = async (subject) => {
    const subjectQuizzes = library.quizzes.filter((quiz) => quiz.subjectId === subject.id);
    const assessmentText = subjectQuizzes.length
      ? ` and its ${subjectQuizzes.length} associated assessment${subjectQuizzes.length === 1 ? "" : "s"}`
      : "";
    if (!window.confirm(`Delete the subject "${subject.name}"${assessmentText} from shared StudyHub? This action cannot be undone.`)) return;
    await onUpdate({
      ...library,
      subjects: library.subjects.filter((item) => item.id !== subject.id),
      quizzes: library.quizzes.filter((quiz) => quiz.subjectId !== subject.id),
    });
  };
  const addSubject = async (event) => {
    event.preventDefault();
    const name = subjectName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (library.subjects.some((item) => item.id === id)) {
      setSubjectName("");
      return;
    }
    const saved = await onUpdate({ ...library, subjects: [...library.subjects, { id, name, color: ["violet", "blue", "amber", "mint"][library.subjects.length % 4], icon: "✦" }] });
    if (saved) setSubjectName("");
  };
  if (editing) return <QuizEditor quiz={editing} library={library} onSave={saveQuiz} onCancel={() => setEditing(null)} />;
  const syncMessage = syncStatus === "saving"
    ? "Saving to StudyHub…"
    : syncStatus === "error"
      ? "Not synced — check connection"
      : syncStatus === "updated"
        ? "Updated from shared StudyHub"
        : revision === 0
          ? "Shared starter content"
          : "Saved to shared StudyHub";
  return <main className="admin-page">
    <div className="admin-header">
      <div>
        <button className="back-link" onClick={onExit}><ArrowLeft size={16} /> Back to StudyHub</button>
        <div className="eyebrow admin-eyebrow"><ShieldCheck size={14} /> ADMIN WORKSPACE</div>
        <h1>Manage your library</h1>
        <p>Changes are shared with students and other devices as soon as they save.</p>
      </div>
      <div className="admin-header-actions">
        <button className="export-button" onClick={() => downloadDatabase(library, settings)}><Download size={16} /> Save &amp; Export Database JSON</button>
        <button className="primary-button" onClick={() => setEditing(blankQuiz(library.subjects[0]?.id))}><Plus size={17} /> New assessment</button>
      </div>
    </div>
    {pendingMigration && <section className="migration-banner" aria-live="polite">
      <div><strong>Previous changes found on this device</strong><p>Import this browser’s saved subjects, assessments, and headings into shared StudyHub? This will replace the shared starter content.</p></div>
      <div className="migration-actions">
        <button className="primary-button" onClick={onImportLegacy} disabled={syncStatus === "saving"}>Import this device’s content</button>
        <button className="text-button" onClick={onKeepShared}>Keep shared content</button>
      </div>
    </section>}
    <div className="admin-tabs">
      <button className={adminTab === "assessments" ? "admin-tab active" : "admin-tab"} onClick={() => setAdminTab("assessments")}>{iconFor("library")} Assessments <span>{quizzes.length}</span></button>
      <button className={adminTab === "subjects" ? "admin-tab active" : "admin-tab"} onClick={() => setAdminTab("subjects")}>{iconFor("book")} Subjects <span>{library.subjects.length}</span></button>
      <button className={adminTab === "settings" ? "admin-tab active" : "admin-tab"} onClick={() => setAdminTab("settings")}>{iconFor("settings")} Site settings</button>
      <div className="admin-save-state" title={`Shared revision ${revision}`}><span className={`status-dot ${syncStatus === "error" ? "status-error" : ""}`} /> {syncMessage}</div>
    </div>
    {adminTab === "assessments" ? (
      <div className="admin-table-card">
        <div className="admin-table-heading">
          <div><h2>Assessments</h2><p>Quizzes and exams available to your students</p></div>
          <div className="admin-search"><Search size={16} /><input placeholder="Find an assessment" /></div>
        </div>
        <div className="assessment-list">
          {quizzes.length === 0 ? <div className="empty-state"><h3>No assessments yet</h3><p>Create an assessment to add practice for your students.</p></div> : quizzes.map((item) => {
            const subject = getSubject(library, item.subjectId);
            return <div className="assessment-row" key={item.id}>
              <div className={`assessment-symbol ${subject?.color || "violet"}`}>{subject?.icon || "✦"}</div>
              <div className="assessment-info"><h3>{item.title || "Untitled assessment"}</h3><span>{subject?.name || "Unassigned"} <i>·</i> {item.lesson}</span></div>
              <span className={`table-type ${item.type === "Exam" ? "exam" : ""}`}>{item.type}</span>
              <span className="table-questions"><FileQuestion size={14} /> {item.questions.length}</span>
              <div className="row-actions">
                <button onClick={() => setEditing(item)} title="Edit"><Pencil size={15} /></button>
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(item, null, 2)); }} title="Copy JSON"><Copy size={15} /></button>
                <button onClick={() => deleteQuiz(item.id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>;
          })}
        </div>
      </div>
    ) : adminTab === "subjects" ? (
      <div className="subjects-admin-grid">
        <div className="subject-manager-card">
          <div className="admin-card-heading"><div><h2>Subjects</h2><p>Organize your assessment library</p></div><BookOpen size={20} /></div>
          <div className="subject-admin-list">
            {library.subjects.map((item) => <div className="subject-admin-row" key={item.id}>
              <span className={`subject-symbol ${item.color}`}>{item.icon}</span>
              <div><strong>{item.name}</strong><small>{library.quizzes.filter((quiz) => quiz.subjectId === item.id).length} assessments</small></div>
              <button
                type="button"
                className="subject-delete-button"
                onClick={() => deleteSubject(item)}
                title={library.subjects.length <= 1 ? "Add another subject before deleting the last one" : `Delete ${item.name}`}
                aria-label={`Delete ${item.name}`}
                disabled={library.subjects.length <= 1}
              ><Trash2 size={15} /></button>
            </div>)}
          </div>
          <form className="add-subject-form" onSubmit={addSubject}>
            <input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="New subject name" />
            <button className="secondary-button" type="submit"><Plus size={15} /> Add</button>
          </form>
        </div>
        <div className="admin-info-card">
          <div className="info-icon"><Sparkles size={19} /></div><h3>Build a clear learning path</h3>
          <p>Use subjects to group lessons, then add assessments with the rules that fit each learning moment.</p>
          <div className="info-list"><span><Check size={15} /> Import questions in bulk</span><span><Check size={15} /> Add custom quiz rules</span><span><Check size={15} /> Keep everything synced</span></div>
        </div>
      </div>
    ) : <SiteSettings settings={settings} onSave={onUpdateSettings} />}
  </main>;
}

function SiteSettings({ settings, onSave }) {
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_SETTINGS, ...settings }));
  const update = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    await onSave({
      heroTitle: draft.heroTitle.trim() || DEFAULT_SETTINGS.heroTitle,
      heroAccent: draft.heroAccent.trim() || DEFAULT_SETTINGS.heroAccent,
    });
  };
  return <div className="site-settings-grid">
    <form className="settings-card" onSubmit={save}>
      <div className="admin-card-heading"><div><h2>Homepage heading</h2><p>Customize the message students see at the top of the study space.</p></div><Settings2 size={20} /></div>
      <label className="field-label">Main heading<input value={draft.heroTitle} onChange={(event) => update("heroTitle", event.target.value)} placeholder="Learn with focus." /></label>
      <label className="field-label">Accent heading<input value={draft.heroAccent} onChange={(event) => update("heroAccent", event.target.value)} placeholder="Progress with confidence." /></label>
      <div className="settings-actions"><span className="settings-help">Saved changes appear across StudyHub devices.</span><button className="primary-button" type="submit"><Check size={16} /> Save heading</button></div>
    </form>
    <div className="settings-card settings-preview-card">
      <div className="admin-card-heading"><div><h2>Live preview</h2><p>This is how the heading will appear on the homepage.</p></div><Sparkles size={20} /></div>
      <div className="settings-preview"><div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL STUDY SPACE</div><h3>{draft.heroTitle || DEFAULT_SETTINGS.heroTitle}<br /><em>{draft.heroAccent || DEFAULT_SETTINGS.heroAccent}</em></h3></div>
    </div>
  </div>;
}

function QuizEditor({ quiz, library, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(quiz)));
  const [bulkText, setBulkText] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const update = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));
  const updateRule = (key, value) => setDraft((previous) => ({ ...previous, rules: { ...previous.rules, [key]: value } }));
  const updateQuestion = (index, key, value) => setDraft((previous) => ({ ...previous, questions: previous.questions.map((question, questionIndex) => questionIndex === index ? { ...question, [key]: value } : question) }));
  const parseBulk = () => {
    try {
      const parsed = JSON.parse(bulkText);
      const imported = Array.isArray(parsed) ? parsed : parsed.questions;
      if (Array.isArray(imported) && imported.length) {
        const normalized = imported.map((item) => ({ ...emptyQuestion(), ...item, id: item.id || makeId("question") }));
        setDraft((previous) => ({ ...previous, questions: normalized }));
        setImportMessage(`${normalized.length} questions imported from JSON.`);
        return;
      }
    } catch { /* markdown fallback below */ }
    const blocks = bulkText.split(/\n(?=\s*(?:Q\d+[\s:.]|Question\s*\d+))/i).map((block) => block.trim()).filter(Boolean);
    const normalized = blocks.map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const text = lines.find((line) => /^(?:Q\d+|Question\s*\d+)[\s:.]/i.test(line))?.replace(/^(?:Q\d+|Question\s*\d+)[\s:.]*/i, "") || lines[0] || "";
      const options = lines.filter((line) => /^[A-D][).:-]/i.test(line)).map((line) => line.replace(/^[A-D][).:-]\s*/i, ""));
      const answerLine = lines.find((line) => /^answer\s*:/i.test(line));
      const answerRaw = answerLine?.replace(/^answer\s*:/i, "").trim() || "";
      const answer = options.length && /^[A-D]$/i.test(answerRaw) ? options[answerRaw.toUpperCase().charCodeAt(0) - 65] || answerRaw : answerRaw;
      const explanation = lines.find((line) => /^explanation\s*:/i.test(line))?.replace(/^explanation\s*:/i, "").trim() || "";
      return { ...emptyQuestion(), text, options: options.length ? [...options, ...Array(Math.max(0, 4 - options.length)).fill("")].slice(0, 4) : emptyQuestion().options, answer, explanation, type: options.length ? "multiple" : "identification" };
    });
    if (normalized.length) {
      setDraft((previous) => ({ ...previous, questions: normalized }));
      setImportMessage(`${normalized.length} questions imported from text.`);
    } else setImportMessage("No questions found. Use the template below.");
  };
  const addQuestion = () => setDraft((previous) => ({ ...previous, questions: [...previous.questions, emptyQuestion()] }));
  const removeQuestion = (index) => setDraft((previous) => ({ ...previous, questions: previous.questions.filter((_, questionIndex) => questionIndex !== index) }));
  return <main className="editor-page"><div className="editor-topbar"><button className="back-link" onClick={onCancel}><ArrowLeft size={16} /> Cancel</button><div className="editor-title"><span className="eyebrow">ASSESSMENT EDITOR</span><h1>{draft.title || "New assessment"}</h1></div><button className="primary-button" onClick={() => onSave(draft)}><Check size={16} /> Save assessment</button></div>
    <div className="editor-layout"><section className="editor-main"><div className="editor-card"><div className="editor-card-heading"><div><h2>Assessment details</h2><p>Give students the context they need before they begin.</p></div><FileQuestion size={20} /></div><div className="form-grid"><label className="field-label wide">Title<input value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. The Living World" /></label><label className="field-label">Subject<select value={draft.subjectId} onChange={(event) => update("subjectId", event.target.value)}>{library.subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label className="field-label">Lesson identifier<input value={draft.lesson} onChange={(event) => update("lesson", event.target.value)} placeholder="Lesson 01" /></label><label className="field-label">Assessment type<select value={draft.type} onChange={(event) => update("type", event.target.value)}><option>Quiz</option><option>Exam</option></select></label></div><label className="field-label">Tags <span className="label-help">comma-separated</span><input value={draft.tags.join(", ")} onChange={(event) => update("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} placeholder="Midterm Exam, Biology" /></label></div>
      <div className="editor-card"><div className="editor-card-heading"><div><h2>Questions <span className="heading-count">{draft.questions.length}</span></h2><p>Add questions one by one or import a full set below.</p></div><button className="secondary-button" onClick={addQuestion}><Plus size={15} /> Add question</button></div><div className="question-editor-list">{draft.questions.map((question, index) => <div className="question-editor" key={question.id}><div className="question-editor-head"><span className="editor-question-number">Q{String(index + 1).padStart(2, "0")}</span><select value={question.type} onChange={(event) => updateQuestion(index, "type", event.target.value)}><option value="multiple">Multiple choice</option><option value="identification">Identification</option></select>{draft.questions.length > 1 && <button className="icon-delete" onClick={() => removeQuestion(index)}><Trash2 size={15} /></button>}</div><label className="field-label">Question text<textarea rows="2" value={question.text} onChange={(event) => updateQuestion(index, "text", event.target.value)} placeholder="Write the question prompt..." /></label>{question.type === "multiple" && <div className="option-editor-grid">{question.options.map((option, optionIndex) => <label className="field-label" key={optionIndex}><span className="option-label">{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateQuestion(index, "options", question.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item))} placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</div>}<div className="form-grid"><label className="field-label">Correct answer<input value={Array.isArray(question.answer) ? question.answer.join(", ") : question.answer} onChange={(event) => updateQuestion(index, "answer", event.target.value)} placeholder="Exact answer" /></label><label className="field-label">Explanation<input value={question.explanation} onChange={(event) => updateQuestion(index, "explanation", event.target.value)} placeholder="Explain why it is correct" /></label></div></div>)}</div></div>
      <div className="editor-card import-card"><div className="editor-card-heading"><div><h2><Upload size={19} /> AI bulk-paste importer</h2><p>Paste JSON or the simple Q1 / A) / Answer: format to add questions quickly.</p></div><span className="ai-badge"><Sparkles size={13} /> FAST IMPORT</span></div><textarea className="bulk-textarea" value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={'Q1: What is the capital of France?\nA) Paris\nB) London\nC) Rome\nAnswer: A\nExplanation: Paris is the capital city of France.'} /><div className="import-actions"><button className="text-button" onClick={() => setBulkText('[{"text":"Your question","type":"multiple","options":["Option A","Option B","Option C","Option D"],"answer":"Option A","explanation":"Why it is correct"}]')}><Copy size={14} /> Use JSON template</button><button className="secondary-button" onClick={parseBulk}><Sparkles size={15} /> Parse questions</button></div>{importMessage && <div className="import-message"><CheckCircle2 size={15} /> {importMessage}</div>}</div>
    </section><aside className="editor-sidebar"><div className="editor-card rules-card"><div className="editor-card-heading"><div><h2>Behavioral rules</h2><p>Shape the assessment experience.</p></div><Settings2 size={19} /></div><div className="rule-list"><RuleToggle label="Add timer" hint="Countdown per assessment" checked={draft.rules.timer} onChange={(value) => updateRule("timer", value)} /><div className={`timer-setting ${draft.rules.timer ? "visible" : ""}`}><Clock3 size={15} /><input type="number" min="1" value={draft.rules.minutes} onChange={(event) => updateRule("minutes", Number(event.target.value))} /><span>minutes</span></div><RuleToggle label="Allow skip" hint="Students can move ahead" checked={draft.rules.skip} onChange={(value) => updateRule("skip", value)} /><RuleToggle label="Allow previous" hint="Students can go back" checked={draft.rules.previous} onChange={(value) => updateRule("previous", value)} /><RuleToggle label="Flag questions" hint="Bookmark for review" checked={draft.rules.flag} onChange={(value) => updateRule("flag", value)} /><RuleToggle label="Randomized order" hint="Shuffle on each start" checked={draft.rules.random} onChange={(value) => updateRule("random", value)} /><RuleToggle label="Show explanations" hint="Reveal after answering" checked={draft.rules.explanation} onChange={(value) => updateRule("explanation", value)} /></div></div><div className="editor-card editor-tip"><Sparkles size={18} /><strong>Good to know</strong><p>Everything is stored in your browser. Students can finish an active assessment without internet access.</p></div></aside></div>
  </main>;
}

function RuleToggle({ label, hint, checked, onChange }) {
  return <label className="rule-toggle"><span><strong>{label}</strong><small>{hint}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i className="toggle-track"><b /></i></label>;
}

export default App;