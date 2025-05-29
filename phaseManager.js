// phaseManager.js

/**
 * Calculate current phase and redirect user.
 */
async function checkPhase() {
  try {
    const start = localStorage.getItem('flameStart');
    if (!start) {
      showUserFeedback(FEEDBACK_TYPES.ERROR, 'Journey not started');
      return;
    }

    const days = Math.floor((Date.now() - new Date(start)) / 86400000) + 1;
    let phase;
    if (days <= PHASE_CONFIG.PHASE_1_DURATION) phase = 1;
    else if (days <= PHASE_CONFIG.PHASE_2_DURATION) phase = 2;
    else phase = 3;

    window.location.href = `module${phase}.html?day=${days}`;
  } catch (err) {
    logError('Phase check failed', err);
    showUserFeedback(FEEDBACK_TYPES.ERROR, 'Phase management error');
    redirectToSafety();
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', checkPhase);
