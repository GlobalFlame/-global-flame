// -----------------------------
// referral.js
// -----------------------------

// Referral configuration
const REFERRAL_CONFIG = {
  CODE_REGEX: /^\d{3}$/   // exactly 3 digits
};

/**
 * Applies a one-time 3-digit family referral code.
 * @param {string} code   – user-entered referral code
 * @param {string} userId – new user's unique ID
 * @returns {boolean} true if applied successfully
 * @throws {Error} if code is invalid, not found, or already used
 */
function applyFamilyCode(code, userId) {
  // 1. Validate format
  if (!REFERRAL_CONFIG.CODE_REGEX.test(code)) {
    throw new Error('Invalid code format: must be 3 digits');
  }

  // 2. Lookup referral record (your DB mock or real API)
  const record = db.referrals.find(r => r.code === code);
  if (!record) {
    throw new Error('Referral code not found');
  }
  if (record.redeemedBy) {
    throw new Error('Referral code already used');
  }

  // 3. Apply perks
  record.redeemedBy        = userId;         // lock code
  currentUser.type         = 'family';       // waive platform fee
  currentUser.hasPaidPlatform = true;
  currentUser.referrerId   = record.ownerId; // link to referrer

  return true;
}
