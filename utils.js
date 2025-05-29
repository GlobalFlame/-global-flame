// utils.js

/**
 * Central error logger
 */
function logError(message, error, context = {}) {
  console.error(`[GlobalFlame] ${message}`, error, context);
}

/**
 * Redirect user to a safe page
 */
function redirectToSafety() {
  window.location.href = 'sanctuary-charter.html';
}

/**
 * Show on-screen toast feedback
 */
function showUserFeedback(type, message, duration = 5000) {
  const el = document.createElement('div');
  el.className = `feedback ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('exit');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, context) {
  let attempts = 0;
  while (attempts <= ERROR_CONFIG.MAX_RETRIES) {
    try {
      return await fn();
    } catch (err) {
      attempts++;
      if (attempts > ERROR_CONFIG.MAX_RETRIES) {
        logError(`Operation failed after ${attempts} attempts`, err, context);
        throw err;
      }
      await new Promise(r => setTimeout(r, ERROR_CONFIG.RETRY_DELAY));
    }
  }
}
