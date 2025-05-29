// /api/liquidity-alert.js

import { createClient } from '@supabase/supabase-js';

// 1️⃣ Force Node.js runtime
export const config = { runtime: 'node' };

// 2️⃣ Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 3️⃣ Thresholds & limits
const TOP_UP    = 15;
const CRITICAL  = 10;
const EMERGENCY = 5;
const MAX_DAILY = 3;

// 4️⃣ Suggested sats per alert level
const CHANNEL_SATS = {
  WARNING:   750_000,
  CRITICAL:1_000_000,
  EMERGENCY:1_500_000
};

// 5️⃣ Helper to post to Slack
async function slack(text) {
  const hook = process.env.SLACK_WEBHOOK;
  if (!hook) return console.warn('Missing SLACK_WEBHOOK');
  await fetch(hook, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text })
  });
}

// 6️⃣ Main handler
export default async function handler(req, res) {
  // 6.1 Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST only' });
  }

  // 6.2 Input validation
  const { inbound_percent } = req.body || {};
  if (typeof inbound_percent !== 'number') {
    return res.status(400).json({ ok: false, error: 'Missing inbound_percent' });
  }

  try {
    // 6.3 Increment & fetch counters (RPC)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('inc_liquidity_counter');
    if (rpcErr) throw rpcErr;
    const todayCount     = rpcData[0].today_count;
    const hoursSinceLast = rpcData[0].hours_since_last;

    // 6.4 Determine tier
    const isEmer = inbound_percent < EMERGENCY;
    const isCrit = inbound_percent < CRITICAL;
    const isWarn = inbound_percent < TOP_UP;
    const tier   = isEmer ? 'EMERGENCY' : isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'NORMAL';

    // 6.5 Auto-open channel if under limit
    if (isWarn && todayCount <= MAX_DAILY && process.env.VOLTAGE_API_KEY) {
      const sats = CHANNEL_SATS[tier];
      const r = await fetch('https://api.voltage.cloud/open-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.VOLTAGE_API_KEY
        },
        body: JSON.stringify({
          node: 'global-flame-node',
          remote_pubkey: '03a52b…ACINQ',
          local_funding_amount: sats
        })
      });
      if (!r.ok) throw new Error(`Voltage ${r.status}`);
    }

    // 6.6 Log it
    await supabase
      .from('liquidity_alerts_log')
      .insert({ inbound_percent, tier, created_at: new Date().toISOString() });

    // 6.7 Build Slack message
    const EMOJIS = {
      EMERGENCY: ':rotating_light:',
      CRITICAL:  ':warning:',
      WARNING:   ':droplet:',
      NORMAL:    ':white_check_mark:'
    };
    const emoji = EMOJIS[tier];
    const lines = [
      `${emoji} *Inbound Liquidity ${inbound_percent}%*`,
      `*Status:* ${tier}${tier !== 'NORMAL' ? ' – channel may open' : ''}`,
      `Last top-up: ${hoursSinceLast === null ? 'N/A' : hoursSinceLast + 'h'}`,
      `Daily top-ups: ${todayCount}/${MAX_DAILY}`
    ];
    if (todayCount > MAX_DAILY) lines.push(':no_entry: *Top-up limit hit*');
    await slack(lines.join('\n'));

    // 6.8 Success response
    return res.status(200).json({ ok: true, tier });

  } catch (err) {
    console.error('Handler error:', err);
    await slack(`:x: *Liquidity Alert Error* – ${err.message}`);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
}
