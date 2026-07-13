// MARKUS THE MUSIC PET — standalone browser build
// Ported from the Electron version bundled with MusicToDiscord. This
// version has no access to real listening data or Node's filesystem, so:
//   - State saves to localStorage instead of userData/pet.json
//   - "Play a song" is a button the visitor clicks to simulate feeding him,
//     instead of being driven by actual Apple Music / iTunes playback
//   - Song requests/genre vibing are simulated with a small canned list
//     instead of pulling from real play history
//
// Everything else (decay math, mood states, party mode, sounds) matches
// the original MusicToDiscord feature.

(function () {
  var STORAGE_KEY = 'reststop_markus_pet_v1';
  var DEMO_GENRES = ['Hip-Hop', 'Rock', 'Pop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Country'];
  var DEMO_SONGS = [
    { name: 'Midnight Drive', artist: 'The Rest Stops' },
    { name: 'Static & Gravel', artist: 'Overpass Radio' },
    { name: 'Exit 12', artist: 'Loose Change' },
    { name: 'Gas Station Sunset', artist: 'Vending Machine' }
  ];

  function getCurrentMonthKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function defPet() {
    return {
      name: 'Markus',
      bornMonth: getCurrentMonthKey(),
      hunger: 80,
      cleanliness: 100,
      happiness: 90,
      poop: 0,
      alive: true,
      songRequest: null,
      lastUpdate: Date.now(),
      vibingGenre: null,
      vibingUntil: 0,
      partyMode: false
    };
  }

  function loadPet() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(defPet(), JSON.parse(raw));
    } catch (e) { /* fall through */ }
    return defPet();
  }

  function savePet() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pet)); } catch (e) { /* non-fatal */ }
  }

  var pet = loadPet();

  function updatePet() {
    var now = Date.now();

    if (pet.bornMonth !== getCurrentMonthKey()) {
      var name = pet.name;
      pet = defPet();
      pet.name = name;
      pet.bornMonth = getCurrentMonthKey();
      savePet();
      petSound('revival');
      return;
    }

    if (!pet.alive) { pet.lastUpdate = now; return; }

    var hoursElapsed = (now - pet.lastUpdate) / 3600000;
    pet.hunger = Math.max(0, pet.hunger - hoursElapsed * 4);
    pet.cleanliness = Math.max(0, pet.cleanliness - hoursElapsed * 3);

    var newPoops = Math.floor(hoursElapsed / 5);
    if (newPoops > 0) pet.poop = Math.min(5, pet.poop + newPoops);

    pet.happiness = Math.max(0, Math.min(100, (pet.hunger + pet.cleanliness) / 2 - pet.poop * 8));

    if (pet.hunger <= 0 && pet.cleanliness <= 0) {
      pet.alive = false;
      pet.happiness = 0;
    }

    pet.lastUpdate = now;
    savePet();
  }

  function getPetSoundState() {
    if (!pet.alive) return 'dead';
    if (pet.hunger <= 10) return 'starving';
    if (pet.hunger <= 30 && pet.cleanliness <= 20) return 'sick';
    if (pet.poop >= 3) return 'poop';
    if (pet.cleanliness <= 25) return 'dirty';
    if (pet.hunger <= 40) return 'hungry';
    if (pet.songRequest) return 'request';
    if (pet.happiness <= 30) return 'sad';
    return 'happy';
  }

  // ---- Actions (replace the Electron IPC handlers) ----
  function petClean() {
    updatePet();
    if (!pet.alive) return pet;
    if (pet.poop > 0) pet.poop--;
    pet.cleanliness = Math.min(100, pet.cleanliness + 25);
    pet.happiness = Math.min(100, pet.happiness + 5);
    savePet();
    petSound('clean');
    return pet;
  }

  function petPlay() {
    updatePet();
    if (!pet.alive) return pet;
    pet.happiness = Math.min(100, pet.happiness + 8);
    savePet();
    petSound('play');
    return pet;
  }

  function petRename(name) {
    updatePet();
    var n = String(name || '').trim().slice(0, 20);
    if (n) { pet.name = n; savePet(); }
    return pet;
  }

  // Simulated "feed" — since there's no real music player here, one click
  // stands in for a chunk of listening time (like the 300s threshold in
  // the original feedFromListening()).
  function petFeed() {
    updatePet();
    if (!pet.alive) return pet;

    pet.hunger = Math.min(100, pet.hunger + 20);
    pet.happiness = Math.min(100, pet.happiness + 5);
    petSound('fed');

    if (pet.songRequest && Math.random() < 0.35) {
      pet.hunger = Math.min(100, pet.hunger + 30);
      pet.happiness = Math.min(100, pet.happiness + 20);
      pet.songRequest = null;
      pet.partyMode = true;
      savePet();
      petSound('party');
      window.dispatchEvent(new CustomEvent('pet-party'));
      setTimeout(function () {
        pet.partyMode = false;
        savePet();
        renderPet();
      }, 6000);
    } else if (!pet.songRequest && Math.random() < 0.4) {
      var pick = DEMO_SONGS[Math.floor(Math.random() * DEMO_SONGS.length)];
      pet.songRequest = pick;
    }

    var genre = DEMO_GENRES[Math.floor(Math.random() * DEMO_GENRES.length)];
    pet.vibingGenre = genre;
    pet.vibingUntil = Date.now() + 20000;

    savePet();
    return pet;
  }

  // ---- Rendering (same logic as pet-renderer.js, DOM-only, no IPC) ----
  function setPetBar(id, val) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.width = Math.max(0, Math.min(100, val)) + '%';
    el.classList.toggle('low', val < 30);
  }

  function renderPet() {
    document.getElementById('pet-name').textContent = pet.name;

    var vibeClasses = ['vibe-hiphop', 'vibe-rock', 'vibe-pop', 'vibe-rbsoul',
      'vibe-electronic', 'vibe-jazz', 'vibe-classical', 'vibe-country'];
    document.body.classList.remove('pet-vibing');
    vibeClasses.forEach(function (c) { document.body.classList.remove(c); });

    var isVibing = pet.alive && pet.vibingUntil && Date.now() < pet.vibingUntil;
    if (isVibing && pet.vibingGenre) {
      document.body.classList.add('pet-vibing');
      var g = pet.vibingGenre.toLowerCase();
      var cls = null;
      if (g.indexOf('hip') !== -1) cls = 'vibe-hiphop';
      else if (g.indexOf('rock') !== -1) cls = 'vibe-rock';
      else if (g.indexOf('pop') !== -1) cls = 'vibe-pop';
      else if (g.indexOf('r&b') !== -1 || g.indexOf('soul') !== -1) cls = 'vibe-rbsoul';
      else if (g.indexOf('electronic') !== -1) cls = 'vibe-electronic';
      else if (g.indexOf('jazz') !== -1) cls = 'vibe-jazz';
      else if (g.indexOf('classical') !== -1) cls = 'vibe-classical';
      else if (g.indexOf('country') !== -1) cls = 'vibe-country';
      if (cls) document.body.classList.add(cls);
    }

    document.body.classList.remove('pet-happy', 'pet-sad', 'pet-sick', 'pet-dead', 'pet-party');
    if (!pet.alive) {
      document.body.classList.add('pet-dead');
    } else if (pet.partyMode) {
      document.body.classList.add('pet-party');
    } else if (pet.cleanliness < 30) {
      document.body.classList.add('pet-sick');
    } else if (pet.happiness >= 70) {
      document.body.classList.add('pet-happy');
    } else if (pet.happiness < 40) {
      document.body.classList.add('pet-sad');
    }

    var cravingEl = document.getElementById('pet-craving');
    var deadMsg = document.getElementById('pet-dead-msg');
    var actions = document.getElementById('pet-actions');
    if (!pet.alive) {
      cravingEl.textContent = '';
      deadMsg.style.display = 'block';
      actions.style.display = 'none';
    } else {
      deadMsg.style.display = 'none';
      actions.style.display = 'flex';
      if (pet.partyMode) {
        cravingEl.textContent = 'PARTY TIME! His friends came to celebrate!';
      } else if (pet.songRequest) {
        cravingEl.textContent = 'Wants to hear: "' + pet.songRequest.name + '" by ' + pet.songRequest.artist;
      } else if (pet.hunger < 60) {
        cravingEl.textContent = 'Getting hungry — hit Play a Song!';
      } else {
        cravingEl.textContent = 'Content — keep the music going!';
      }
    }

    setPetBar('pet-hunger', pet.hunger);
    setPetBar('pet-clean', pet.cleanliness);
    setPetBar('pet-happy', pet.happiness);

    var layer = document.getElementById('pet-poop-layer');
    layer.innerHTML = '';
    var positions = [[30, 130], [150, 120], [80, 145], [120, 60], [50, 50]];
    for (var i = 0; i < (pet.poop || 0); i++) {
      var p = document.createElement('div');
      p.className = 'pet-poop';
      p.textContent = '💩';
      var pos = positions[i % positions.length];
      p.style.left = pos[0] + 'px';
      p.style.top = pos[1] + 'px';
      p.title = 'Click to clean';
      p.addEventListener('click', function () {
        petClean();
        renderPet();
      });
      layer.appendChild(p);
    }
  }

  // ---- Sound ----
  var _petAudio = null;
  var _petAudioCtx = null;
  function petSound(clip) {
    if (!clip) return;
    try {
      if (_petAudio) { _petAudio.pause(); _petAudio = null; }
      var src = 'pet-sounds/' + clip + '.mp3';
      _petAudio = new Audio(src);
      _petAudio.volume = 1.0;
      if (!_petAudioCtx) _petAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var source = _petAudioCtx.createMediaElementSource(_petAudio);
      var gain = _petAudioCtx.createGain();
      gain.gain.value = 1.8;
      source.connect(gain);
      gain.connect(_petAudioCtx.destination);
      _petAudioCtx.resume().then(function () {
        _petAudio.play().catch(function () {});
      });
    } catch (e) { /* audio not critical */ }
  }

  // ---- Wire-up ----
  function initPet() {
    updatePet();
    renderPet();

    var cleanBtn = document.getElementById('pet-clean-btn');
    var playBtn = document.getElementById('pet-play-btn');
    var renameBtn = document.getElementById('pet-rename-btn');

    if (cleanBtn) cleanBtn.addEventListener('click', function () { petClean(); renderPet(); });
    if (playBtn) playBtn.addEventListener('click', function () { petFeed(); renderPet(); });

    if (renameBtn) {
      renameBtn.addEventListener('click', function () {
        var input = document.getElementById('pet-rename-input');
        var confirmBtn = document.getElementById('pet-rename-confirm');
        var nameSpan = document.getElementById('pet-name');
        renameBtn.style.display = 'none';
        input.value = nameSpan.textContent || '';
        input.style.display = '';
        confirmBtn.style.display = '';
        input.focus();
        input.select();

        function doRename() {
          var name = input.value.trim();
          input.style.display = 'none';
          confirmBtn.style.display = 'none';
          renameBtn.style.display = '';
          if (name) { petRename(name); renderPet(); }
        }

        confirmBtn.onclick = doRename;
        input.onkeydown = function (e) {
          if (e.key === 'Enter') doRename();
          if (e.key === 'Escape') {
            input.style.display = 'none';
            confirmBtn.style.display = 'none';
            renameBtn.style.display = '';
          }
        };
      });
    }

    // Passive re-render loop so stat bars visibly decay while the page is open.
    setInterval(function () {
      updatePet();
      renderPet();
    }, 15000);
  }

  document.addEventListener('DOMContentLoaded', initPet);
})();
