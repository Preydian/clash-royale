import { apiBase } from './_lib/clash.js';
import { createHistoryHandler } from './_lib/history.js';

export default createHistoryHandler(apiBase());
