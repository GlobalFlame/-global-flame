// api/tipWebhook.js
import { createClient } from '@supabase/supabase-js';
import { calcCuts }     from '../lib/commission.js'; // api ↔ lib are siblings

/* ------------------------------------------------------------------
   Supabase – service-role key (full SQL power, no persisted session)
------------------------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/* ------------------------------------------------------------------
   Business rules (cents = int); adjust to taste
------------------------------------------------------------------- */
const MIN_TIP_CENTS     = 50;       // $0.50
const MAX_TIP_CENTS     = 100000;   // $1 000
const MAX_HOURLY_TIPS   = 20;
const MAX_DAILY_CENTS   = 500000;   // $5 000

export default async function handler(req, res) {
  /* 1️⃣  Method guard */
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST')
              .json({ error: 'Method Not Allowed' });
  }

  /* 2️⃣  Basic body validation ------------------------------------ */
  const { userId, amount, sessionId } = req.body ?? {};
  const amountCents = Math.round(Number(amount) * 100); // 💲→¢

  if (!userId || !sessionId || isNaN(amountCents)) {
    return res.status(400).json({ error: 'Required: userId, amount, sessionId' });
  }

  if (amountCents < MIN_TIP_CENTS || amountCents > MAX_TIP_CENTS) {
    return res.status(422).json({ error: `Tip must be between $${(MIN_TIP_CENTS/100)
      .toFixed(2)} and $${(MAX_TIP_CENTS/100).toFixed(2)}` });
  }

  /* 3️⃣  Fraud / velocity check ----------------------------------- */
  const sinceDay  = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const sinceHour = new Date(Date.now() -      3600 * 1000).toISOString();

  const { data: recent, error: velErr } = await supabase
    .from('tip_events')
    .select('amount_cents, created_at')
    .eq('user_id', userId)
    .gt('created_at', sinceDay);

  if (velErr) return res.status(500).json({ error: 'Velocity check failed' });

  const hourlyCount = recent.filter(t => t.created_at > sinceHour).length;
  const dailyTotal  = recent.reduce((sum, t) => sum + t.amount_cents, 0);

  if (hourlyCount >= MAX_HOURLY_TIPS)
    return res.status(429).json({ error: 'Hourly tip limit exceeded' });

  if (dailyTotal + amountCents > MAX_DAILY_CENTS)
    return res.status(429).json({ error: 'Daily tip limit exceeded' });

  /* 4️⃣  Fetch user tier & payment status -------------------------- */
  const { data: user, error: uErr } = await supabase
    .from('users')
    .select('flame_tier, payment_verified')
    .eq('id', userId)
    .single();

  if (uErr || !user) return res.status(404).json({ error: 'User not found' });

  if (!user.payment_verified) {
    await supabase.from('pending_tips').insert({
      user_id: userId, amount_cents: amountCents, session_id: sessionId
    });
    return res.status(403).json({
      error: 'Payment verification required',
      action: 'verify_payment',
      verification_url: `/api/verify-payment?session=${sessionId}`
    });
  }

  /* 5️⃣  Calculate splits (still in cents) ------------------------- */
  const cuts = calcCuts(user, amountCents); // returns { toCreator, toUpline, toPool }

  /* 6️⃣  Atomic SQL transaction via RPC ---------------------------- */
  const { error: rpcErr } = await supabase.rpc('record_tip_and_update', {
    p_creator_id:  userId,
    p_amount_cents: amountCents,
    p_to_creator:  cuts.toCreator,
    p_to_pool:     cuts.toPool,
    p_to_upline:   cuts.toUpline,
    p_session_id:  sessionId
  });

  if (rpcErr) {
    console.error('record_tip_and_update error:', rpcErr);
    return res.status(500).json({ error: 'Database transaction failed' });
  }

  /* 7️⃣  Success --------------------------------------------------- */
  return res.status(200).json({
    ok: true,
    userId,
    amount:  (amountCents / 100).toFixed(2),
    splits: {
      toCreator: (cuts.toCreator / 100).toFixed(2),
      toUpline:  (cuts.toUpline  / 100).toFixed(2),
      toPool:    (cuts.toPool    / 100).toFixed(2)
    },
    remaining_daily: ((MAX_DAILY_CENTS - dailyTotal - amountCents) / 100).toFixed(2)
  });
}
