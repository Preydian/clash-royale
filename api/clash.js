import { createClashHandler } from './_lib/clash.js';

// Vercel's egress IPs aren't fixed, so go through the RoyaleAPI proxy. Its IP
// (45.79.218.79) must be whitelisted on the key.
export default createClashHandler(
  process.env.CLASH_API_BASE ?? 'https://proxy.royaleapi.dev/v1',
);
