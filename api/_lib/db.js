import pg from 'pg';

// Battles are stored raw (as the API returned them) so any future analysis can
// run over old data. Snapshots record the profile numbers the battle log
// doesn't carry (lifetime totals, ranked rating) each time they change.
const SCHEMA = `
  create table if not exists battles (
    player_tag  text        not null,
    battle_time timestamptz not null,
    type        text        not null,
    battle      jsonb       not null,
    primary key (player_tag, battle_time)
  );

  create table if not exists snapshots (
    player_tag       text        not null,
    taken_at         timestamptz not null default now(),
    battle_count     integer     not null,
    trophies         integer     not null,
    best_trophies    integer     not null,
    wins             integer     not null,
    losses           integer     not null,
    three_crown_wins integer,
    exp_level        integer,
    ranked_league    integer,
    ranked_trophies  integer,
    ranked_rank      integer,
    primary key (player_tag, taken_at)
  );
`;

let pool = null;
let schemaReady = null;

/** A connection pool, or null when no database is configured. */
export function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!pool) {
    // One connection per function instance; Neon's pooler does the rest.
    // Close it when idle rather than let the server drop it.
    pool = new pg.Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    // An idle connection dropped by the server emits 'error' on the pool;
    // unhandled, that would crash the process (including the dev server).
    pool.on('error', (err) => console.error('Idle database client error', err));
  }
  return pool;
}

/** Creates the tables on first use, once per function instance. */
export function ensureSchema(db) {
  schemaReady ??= db.query(SCHEMA).catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}
