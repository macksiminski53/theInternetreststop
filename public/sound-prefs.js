// SOUND PREFS -- a tiny, shared on/off switch for the little synthesized
// pet noises (markus-pet.js's chirps, etc). Lives in its own file since it's
// used by more than one page, and is deliberately dumb: one boolean in
// localStorage, defaulting to "on" so nothing changes for people who never
// touch it.
(function () {
  var STORAGE_KEY = 'reststop_sound_enabled';

  function isEnabled() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return true; // default: sound on
      return raw === 'true';
    } catch (e) {
      return true;
    }
  }

  function set(enabled) {
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false'); } catch (e) { /* non-fatal */ }
    document.dispatchEvent(new CustomEvent('reststop-sound-changed', { detail: { enabled: enabled } }));
  }

  function toggle() {
    var next = !isEnabled();
    set(next);
    return next;
  }

  // Wires up any element with [data-sound-toggle] found on the page: sets its
  // initial icon/label and flips state + icon on click. Call after the
  // element exists in the DOM.
  function wireToggleButtons() {
    document.querySelectorAll('[data-sound-toggle]').forEach(function (btn) {
      function refresh() {
        var on = isEnabled();
        btn.textContent = on ? '🔊 Sound: On' : '🔇 Sound: Off';
        btn.classList.toggle('soundOff', !on);
      }
      refresh();
      btn.addEventListener('click', function () {
        toggle();
        refresh();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggleButtons);
  } else {
    wireToggleButtons();
  }

  window.SoundPrefs = { isEnabled: isEnabled, set: set, toggle: toggle };
})();
