const CLASH_API_BASE = 'https://proxy.royaleapi.dev/v1';

export default async function handler(req, res) {
  const { tag } = req.query;
  const key = process.env.CLASH_KEY;

  if (!key) {
    console.error('CLASH_KEY is not set in environment');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const upstream = await fetch(`${CLASH_API_BASE}/players/${tag}`, {
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
    return res.status(500).json({ error: 'Upstream request failed' });
  }
}
