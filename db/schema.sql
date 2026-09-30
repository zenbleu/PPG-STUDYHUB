CREATE TABLE public.studyhub_state (
  id integer PRIMARY KEY CHECK (id = 1),
  library jsonb NOT NULL,
  settings jsonb NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1),
  updated_at timestamptz NOT NULL
);