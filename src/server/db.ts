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
