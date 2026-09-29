import { apiBase } from './_lib/clash.js';
import { createSyncHandler } from './_lib/history.js';

// Stores new battles for every tracked player. The API only keeps ~25 battles
// per player and Vercel's Hobby plan only allows a daily cron (vercel.json),
// so an always-on VM calls this hourly. Its crontab entry:
//
//   17 * * * * curl -fsS --max-time 60 -H "Authorization: Bearer $(cat ~/.clash-sync-secret)" https://<app>/api/sync >> ~/clash-sync.log 2>&1
//
// ~/.clash-sync-secret (chmod 600) holds the same value as CRON_SECRET.
export default createSyncHandler(apiBase());
