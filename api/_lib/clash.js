// Shared Clash Royale API access, used by the Vercel functions (api/*.js),
// the local Express server (server/server.js) and the Vite dev server.
//
// The client calls /api/clash?path=<api path>, e.g. path=players/#ABC/battlelog.
// Only paths matching ALLOWED_PATHS are forwarded so the key can't be used to
// hit arbitrary endpoints.

const TAG = '#[0-9A-Z]+';

const ALLOWED_PATHS = [
  new RegExp(`^players/${TAG}(/battlelog)?$`),
  new RegExp(`^clans/${TAG}(/(members|currentriverrace|riverracelog))?$`),
  /^cards$/,
];

// Vercel's egress IPs aren't fixed, so by default go through the RoyaleAPI
// proxy. Its IP (45.79.218.79) must be whitelisted on the key.
export function apiBase(fallback = 'https://proxy.royaleapi.dev/v1') {
  return process.env.CLASH_API_BASE || fallback;
}

// Tags never contain the letter O, so a typed O is always meant as zero.
export function normalizeTag(raw) {
  const t = String(raw).trim().toUpperCase().replace(/O/g, '0');
  return t.startsWith('#') ? t : `#${t}`;
}

/** Calls the Clash API and returns the raw status and body text. */
export async function clashFetch(base, path) {
  const key = process.env.CLASH_KEY;
  if (!key) throw new Error('CLASH_KEY is not set in environment');

  const upstreamPath = path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  const upstream = await fetch(`${base}/${upstreamPath}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
  return { status: upstream.status, body: await upstream.text() };
}

/** Calls the Clash API and parses the JSON, throwing on any error status. */
export async function clashJson(base, path) {
  const { status, body } = await clashFetch(base, path);
  if (status !== 200) throw new Error(`Clash API ${status} for ${path}`);
  return JSON.parse(body);
}

export function createClashHandler(base) {
  return async function handler(req, res) {
    if (!process.env.CLASH_KEY) {
      console.error('CLASH_KEY is not set in environment');
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    // The API wants tags uppercase; endpoint names stay as written.
    const path = String(req.query.path ?? '').replace(/#[0-9a-z]+/gi, (tag) =>
      tag.toUpperCase(),
    );

    if (!ALLOWED_PATHS.some((re) => re.test(path))) {
      return res.status(400).json({ error: 'Path not allowed' });
    }

    try {
      const { status, body } = await clashFetch(base, path);

      if (status !== 200) {
        console.error('Clash API error', status, body);
        return res
          .status(status)
          .json({ error: 'Failed to fetch', reason: body });
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(body);
    } catch (err) {
      console.error('Proxy request failed', err);
      return res.status(502).json({ error: 'Upstream request failed' });
    }
  };
}
