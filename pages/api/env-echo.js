// /api/env-echo.js
export const config = { runtime: 'node' };

export default function handler(req, res) {
  res.json({
    SLACK_LEN:    process.env.SLACK_WEBHOOK?.length    || 0,
    SUPA_URL_LEN: process.env.SUPABASE_URL?.length     || 0,
    KEY_PRESENT:  Boolean(process.env.SUPABASE_SERVICE_KEY)
  });
}
