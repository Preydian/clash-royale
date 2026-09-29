import { timingSafeEqual } from 'node:crypto';
import { clashJson, normalizeTag } from './clash.js';
import { ensureSchema, getDb } from './db.js';

const MAX_BATTLES = 5000;

/** Tags whose history is stored: TRACKED_TAGS, else the app's default tags. */
export function trackedTags() {
  const raw = process.env.TRACKED_TAGS || process.env.VITE_DEFAULT_TAGS || '';
  return raw
    .split(',')
    .map((t) => t.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
    .map(normalizeTag);
}

// "20250928T141502.000Z" -> "2025-09-28T14:15:02.000Z"
function battleTimeToIso(time) {
  return time.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6',
  );
}

/** Stores new battles and, if anything changed, a profile snapshot. */
export async function syncPlayer(db, base, tag) {
  const [player, battles] = await Promise.all([
    clashJson(base, `players/${tag}`),
    clashJson(base, `players/${tag}/battlelog`),
  ]);

  const rows = battles.map((battle) => ({
    time: battleTimeToIso(battle.battleTime),
    battle,
  }));
  const inserted = await db.query(
    `insert into battles (player_tag, battle_time, type, battle)
     select $1, (b->>'time')::timestamptz, b->'battle'->>'type', b->'battle'
     from jsonb_array_elements($2::jsonb) as b
     on conflict do nothing`,
    [tag, JSON.stringify(rows)],
  );

  // battleCount only goes up, so an existing row with the same count means
  // nothing has changed since the last snapshot.
  const ranked = player.currentPathOfLegendSeasonResult ?? {};
  const snapshot = await db.query(
    `insert into snapshots (player_tag, battle_count, trophies, best_trophies,
       wins, losses, three_crown_wins, exp_level, ranked_league,
       ranked_trophies, ranked_rank)
     select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
     where not exists (
       select 1 from snapshots where player_tag = $1 and battle_count = $2
     )`,
    [
      tag,
      player.battleCount ?? player.wins + player.losses,
      player.trophies,
      player.bestTrophies,
      player.wins,
      player.losses,
      player.threeCrownWins ?? null,
      player.expLevel ?? null,
      ranked.leagueNumber ?? null,
      ranked.trophies ?? null,
      ranked.rank ?? null,
    ],
  );

  return { newBattles: inserted.rowCount, snapshot: snapshot.rowCount > 0 };
}

/**
 * Card icon URLs are most of a battle's size and repeat constantly, so they're
 * sent once per card in `icons` and stripped from the battles.
 */
function splitIcons(battles) {
  const icons = {};
  const strip = (card) => {
    if (card.iconUrls) icons[card.id] = card.iconUrls;
    const { iconUrls: _icons, ...rest } = card;
    return rest;
  };
  const slim = battles.map((b) => ({
    ...b,
    team: b.team.map((p) => ({ ...p, cards: (p.cards ?? []).map(strip) })),
    opponent: b.opponent.map((p) => ({
      ...p,
      cards: (p.cards ?? []).map(strip),
    })),
  }));
  return { battles: slim, icons };
}

export async function readHistory(db, tag, days) {
  const [battles, first] = await Promise.all([
    db.query(
      `select battle from battles
       where player_tag = $1
         and ($2::int is null
              or battle_time > now() - make_interval(days => $2::int))
       order by battle_time desc limit ${MAX_BATTLES}`,
      [tag, days],
    ),
    db.query(
      'select min(battle_time) as since from battles where player_tag = $1',
      [tag],
    ),
  ]);

  return {
    since: first.rows[0]?.since ?? null,
    ...splitIcons(battles.rows.map((r) => r.battle)),
  };
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const given = String(req.headers.authorization ?? '');
  const expected = `Bearer ${secret}`;
  return (
    Boolean(secret) &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}

/** GET /api/sync — called on a schedule; stores every tracked player. */
export function createSyncHandler(base) {
  return async function handler(req, res) {
    if (!authorized(req))
      return res.status(401).json({ error: 'Unauthorized' });
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DATABASE_URL is not set' });

    await ensureSchema(db);
    const results = [];
    for (const tag of trackedTags()) {
      try {
        results.push({ tag, ...(await syncPlayer(db, base, tag)) });
      } catch (err) {
        console.error('Sync failed for', tag, err);
        results.push({ tag, error: err.message });
      }
    }
    const failed = results.some((r) => r.error);
    return res.status(failed ? 502 : 200).json({ synced: results });
  };
}

/**
 * GET /api/history?tag=#ABC&days=30 — stored battles for a tracked player.
 * Syncs that player first, so history stays complete even when a scheduled
 * run was missed. Leave `days` out for all time.
 */
export function createHistoryHandler(base) {
  return async function handler(req, res) {
    const db = getDb();
    if (!db) return res.status(200).json({ enabled: false });

    const tag = normalizeTag(req.query.tag ?? '');
    if (!trackedTags().includes(tag)) {
      return res.status(200).json({ enabled: true, tracked: false });
    }
    const days = req.query.days ? Number.parseInt(req.query.days, 10) : null;
    if (days !== null && !(days > 0)) {
      return res.status(400).json({ error: 'days must be a positive number' });
    }

    try {
      await ensureSchema(db);
      await syncPlayer(db, base, tag).catch((err) =>
        console.error('Sync on read failed for', tag, err),
      );
      const history = await readHistory(db, tag, days);
      return res.status(200).json({ enabled: true, tracked: true, ...history });
    } catch (err) {
      console.error('History read failed', err);
      return res.status(500).json({ error: 'History unavailable' });
    }
  };
}
