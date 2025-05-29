// Preload the Phoenix cry
const ignitionAudio = new Audio('assets/sounds/primordial-ignition.mp3');
ignitionAudio.preload = 'auto';
ignitionAudio.volume = 0.8;

// Create and pool embers for performance
const EMBER_COUNT = 30;
const emberPool = [];

document.addEventListener('DOMContentLoaded', () => {
  // Build the ember pool
  for (let i = 0; i < EMBER_COUNT; i++) {
    const ember = document.createElement('div');
    ember.className = 'ember';
    ember.style.opacity = '0';
    document.body.appendChild(ember);
    emberPool.push(ember);

    // Reset on animation end
    ember.addEventListener('animationend', () => {
      ember.style.opacity = '0';
      ember.classList.remove('ember-animate');
    });
  }

  // Bind the sacred button
  document.querySelector('.btn-next')
    .addEventListener('click', voidTransition);
});

function voidTransition() {
  // Empy ember storm
  emberPool.forEach((ember) => {
    ember.style.left = `${Math.random() * 100}%`;
    ember.style.top  = '100%';
    ember.style.opacity = '1';
    ember.classList.add('ember-animate');
  });

  // Play the cosmic sound
  ignitionAudio.currentTime = 0;
  ignitionAudio.play().catch(() => console.warn('Audio blocked'));

  // Ritual progression
  setTimeout(() => {
    window.location.href = 'module2.html';
  }, 2000);
}
