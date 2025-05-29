// -----------------------------
// moneyEngine.js
// -----------------------------

// Commission configuration constants
const COMMISSION_CONFIG = {
  BASE_PERCENTAGE:     0.70,  // Creator keeps 70%
  REFERRAL_PERCENTAGE: 0.20   // Referrer gets 20% if applicable
};

/**
 * Validates that we have a valid user object and a positive amount.
 * @param {Object} user   – must be non-null
 * @param {number} amount – must be a number > 0
 * @throws {Error} if validation fails
 */
function validatePayment(user, amount) {
  if (
    typeof user    !== 'object' ||
    user           === null   ||
    typeof amount  !== 'number'||
    isNaN(amount)  ||
    amount        <= 0
  ) {
    throw new Error('Invalid payment parameters');
  }
}

/**
 * Determines the monthly platform fee.
 * @param {Object} user
 * @param {boolean} user.hasPaidPlatform – true if public user already paid
 * @param {string}  user.type            – 'family' or anything else
 * @returns {number} 0 for family, otherwise $10 if not yet paid
 */
function getPlatformFee(user) {
  if (user.type === 'family') return 0;
  return user.hasPaidPlatform ? 0 : 10;
}

/**
 * Determines the per-upload fee.
 * @param {Object} user
 * @param {string} user.desiredQuality – 'high' for $5, anything else $2
 * @returns {number} upload fee in USD
 */
function getUploadFee(user) {
  return user.desiredQuality === 'high' ? 5 : 2;
}

/**
 * Splits a gross amount into creator, referrer, and platform shares.
 * @param {number} gross
 * @param {Object} user          – current user data
 * @param {string?} user.referrerId
 * @returns {{toCreator:number,toReferrer:number,toPlatform:number}}
 * @throws {Error} if inputs are invalid
 */
function splitCommission(gross, user) {
  // 1. Validate inputs
  validatePayment(user, gross);

  // 2. Calculate slices
  const basePct     = COMMISSION_CONFIG.BASE_PERCENTAGE;
  const refPct      = user.referrerId ? COMMISSION_CONFIG.REFERRAL_PERCENTAGE : 0;
  const platformPct = 1 - basePct - refPct;

  // 3. Return exact amounts
  return {
    toCreator:  gross * basePct,
    toReferrer: gross * refPct,
    toPlatform: gross * platformPct
  };
}
