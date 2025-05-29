// config.js

// 1. Phase durations (in days)
const PHASE_CONFIG = {
  PHASE_1_DURATION: 30,
  PHASE_2_DURATION: 60,
  PHASE_3_DURATION: 90
};

// 2. Commission settings
const COMMISSION_CONFIG = {
  BASE_PERCENTAGE:     0.70,  // Creator keeps 70%
  REFERRAL_PERCENTAGE: 0.20   // Referrer gets 20%
};

// 3. Referral code rules
const REFERRAL_CONFIG = {
  CODE_LENGTH: 3,
  CODE_REGEX:  /^\d{3}$/,     // exactly 3 digits
  MAX_ATTEMPTS: 3
};

// 4. Retry settings
const ERROR_CONFIG = {
  MAX_RETRIES: 2,
  RETRY_DELAY: 3000           // milliseconds
};

// 5. Feedback types
const FEEDBACK_TYPES = {
  ERROR:   'error',
  WARNING: 'warning',
  SUCCESS: 'success'
};
