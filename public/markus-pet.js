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
  // No audio files -- each mood gets a little synthesized chirp instead,
  // built from a base pitch/shape per emotion with random jitter so it
  // doesn't sound identical every time.
  var _petAudioCtx = null;
  function getAudioCtx() {
    if (!_petAudioCtx) _petAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _petAudioCtx;
  }

  // Each mood: base frequency (Hz), oscillator shape, and a pitch "contour"
  // (multiplier applied to frequency over the note's life) that gives it
  // character -- rising = perky/happy, falling = sad/dying, wobble = sick.
  var MOOD_TONES = {
    happy:     { freq: 660, type: 'triangle', contour: 'rise', notes: 2, dur: 0.11 },
    fed:       { freq: 520, type: 'triangle', contour: 'rise', notes: 2, dur: 0.10 },
    play:      { freq: 580, type: 'square',   contour: 'rise', notes: 1, dur: 0.09 },
    clean:     { freq: 720, type: 'sine',     contour: 'rise', notes: 1, dur: 0.12 },
    party:     { freq: 700, type: 'triangle', contour: 'rise', notes: 4, dur: 0.09 },
    revival:   { freq: 440, type: 'triangle', contour: 'rise', notes: 3, dur: 0.14 },
    request:   { freq: 600, type: 'sine',     contour: 'wobble', notes: 2, dur: 0.13 },
    hungry:    { freq: 320, type: 'sawtooth', contour: 'fall', notes: 1, dur: 0.14 },
    dirty:     { freq: 260, type: 'sawtooth', contour: 'wobble', notes: 1, dur: 0.15 },
    poop:      { freq: 200, type: 'square',   contour: 'fall', notes: 1, dur: 0.10 },
    sick:      { freq: 220, type: 'sawtooth', contour: 'wobble', notes: 2, dur: 0.18 },
    starving:  { freq: 180, type: 'sawtooth', contour: 'fall', notes: 2, dur: 0.16 },
    sad:       { freq: 300, type: 'sine',     contour: 'fall', notes: 1, dur: 0.22 },
    dead:      { freq: 160, type: 'sine',     contour: 'fall', notes: 1, dur: 0.5 }
  };

  function playTone(freq, type, contour, dur, startAt) {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;

    // Random jitter (+/- 6%) so repeated plays of the same mood aren't identical.
    var jitter = 1 + (Math.random() - 0.5) * 0.12;
    var f0 = freq * jitter;
    var f1 = f0;
    if (contour === 'rise') f1 = f0 * 1.5;
    else if (contour === 'fall') f1 = f0 * 0.6;

    osc.frequency.setValueAtTime(f0, startAt);
    if (contour === 'wobble') {
      osc.frequency.setValueAtTime(f0, startAt);
      osc.frequency.linearRampToValueAtTime(f0 * 0.85, startAt + dur * 0.5);
      osc.frequency.linearRampToValueA