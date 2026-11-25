import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { seedDatabase } from './seed-data'

/**
 * Append-only. Never edit a shipped migration; add a new SQL string instead.
 * `PRAGMA user_version` records how many entries have been applied.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    name TEXT NOT NULL,
    is_builtin INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE template_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 180)
  );
  CREATE INDEX idx_template_sections_template
    ON template_sections(template_id, position);

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    template_name TEXT NOT NULL,
    theme TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('full', 'light', 'rest')),
    auto_advance INTEGER NOT NULL DEFAULT 1 CHECK (auto_advance IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    started_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
  CREATE INDEX idx_sessions_status ON sessions(status);

  CREATE TABLE session_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    planned_seconds INTEGER NOT NULL CHECK (planned_seconds > 0),
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    completed_at TEXT
  );
  CREATE INDEX idx_session_sections_session
    ON session_sections(session_id, position);

  CREATE TABLE presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    name TEXT NOT NULL,
    is_builtin INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
    bpm INTEGER NOT NULL CHECK (bpm BETWEEN 1 AND 999),
    beats INTEGER NOT NULL CHECK (beats BETWEEN 1 AND 16),
    beat_unit INTEGER NOT NULL CHECK (beat_unit IN (2, 4, 8, 16)),
    subdivision TEXT NOT NULL CHECK (
      subdivision IN ('none', 'eighth', 'sixteenth', 'triplet', 'swing')
    ),
    accents TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    one_thing_to_fix TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    has_timing INTEGER NOT NULL DEFAULT 0 CHECK (has_timing IN (0, 1)),
    difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
    tags TEXT NOT NULL DEFAULT '[]',
    tab_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE exercise_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    max_clean_bpm INTEGER CHECK (max_clean_bpm BETWEEN 1 AND 999),
    avg_bpm INTEGER CHECK (avg_bpm BETWEEN 1 AND 999),
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    clean_streak INTEGER CHECK (clean_streak >= 0),
    self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
    notes TEXT NOT NULL DEFAULT '',
    completed_at TEXT NOT NULL
  );
  CREATE INDEX idx_exercise_progress_exercise
    ON exercise_progress(exercise_id, completed_at DESC);
  `,
  `
  ALTER TABLE sessions ADD COLUMN mood TEXT CHECK (mood IN ('energized', 'neutral', 'drained'));

  CREATE TABLE weekly_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL UNIQUE,
    practiced_everyday INTEGER NOT NULL DEFAULT 0 CHECK (practiced_everyday IN (0, 1)),
    streak_count INTEGER NOT NULL DEFAULT 0 CHECK (streak_count >= 0),
    improved TEXT NOT NULL DEFAULT '',
    focus TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    session_name TEXT,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
    exercise_name TEXT,
    is_reference INTEGER NOT NULL DEFAULT 0 CHECK (is_reference IN (0, 1)),
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_recordings_exercise ON recordings(exercise_id);
  CREATE INDEX idx_recordings_created ON recordings(created_at DESC);

  CREATE TABLE tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('file', 'url')),
    url TEXT,
    mime TEXT,
    data BLOB,
    created_at TEXT NOT NULL
  );
  `,
]

export const databasePath = resolve(
  process.env.DATABASE_PATH ?? 'data/guitar-trainer.db',
)

mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA busy_timeout = 5000')

function migrate(): void {
  const row = db.prepare('PRAGMA user_version').get() as {
    user_version: number
  }
  const applied = Number(row.user_version)

  for (let index = applied; index < MIGRATIONS.length; index += 1) {
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec(MIGRATIONS[index])
      db.exec(`PRAGMA user_version = ${index + 1}`)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

migrate()
seedDatabase(db)

export function closeDb(): void {
  db.close()
}
