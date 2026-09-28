// Shared Clash Royale API proxy, used by the Vercel function (api/clash.js)
// and the local Express server (server/server.js).
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

export function createClashHandler(apiBase) {
  return async function handler(req, res) {
    const key = process.env.CLASH_KEY;
    if (!key) {
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

    const upstreamPath = path
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    try {
      const upstream = await fetch(`${apiBase}/${upstreamPath}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      });

      const body = await upstream.text();

      if (!upstream.ok) {
        console.error('Clash API error', upstream.status, body);
        return res
          .status(upstream.status)
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
