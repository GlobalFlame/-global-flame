import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // 1. Sanctuary Input Purification
    const { inbound_percent } =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // 2. Truth Validation
    if (typeof inbound_percent !== 'number' || inbound_percent < 0) {
      return res.status(418).json({
        ok: false,
        error: 'Sanctuary Refinement #3: Invalid payload structure',
      });
    }

    // 3. Pressure Tier Calculation
    const tier =
      inbound_percent < 10 ? 'CRITICAL' :
      inbound_percent < 20 ? 'WARNING'  : 'OK';

    // 4. Slack Notification
    if (process.env.SLACK_WEBHOOK) {
      try {
        await fetch(process.env.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 REFINERY PRESSURE: TIER_${tier} (${inbound_percent}%)`,
          }),
        });
      } catch (slackError) {
        console.error(`SANCTUARY_SLACK_FAIL: ${slackError.message}`);
      }
    }

    // 5. Sacred Response
    res.json({ ok: true, tier, sanctuary_seal: 'PURIFIED' });

  } catch (error) {
    // 6. Elder Emergency Protocol
    console.error(`SANCTUARY_MELTDOWN: ${error.message}`);
    res.status(500).json({
      ok: false,
      error: 'Elder intervention required',
      sanctuary_case_id: `LIQ-${Date.now()}`,
      refinement_room: '#7',
    });
  }
}
