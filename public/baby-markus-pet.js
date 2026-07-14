// BABY MARKUS -- a separate, younger version of Markus (a "before he was in
// MusicToDiscord" prequel character), living in a free-roam field instead
// of a stat menu. Inspired by MeepCity / Chao Garden / Adopt Me: he wanders
// on his own, you can drag him around, drag toys/food onto him, he grows
// through real-time stages based on how well you care for him, and random
// field events happen while you're around.

(function () {
  var STORAGE_KEY = 'reststop_baby_markus_v1';

  var STAGES = ['baby', 'toddler', 'kid', 'tween'];
  var STAGE_LABELS = { baby: 'Baby', toddler: 'Toddler', kid: 'Kid', tween: 'Tween' };
  var STAGE_SCALE = { baby: 0.7, toddler: 0.85, kid: 1.0, tween: 1.15 };
  // Minimum real days in a stage before he's even eligible to grow, and the
  // average care score (0-100) needed over that window to actually advance.
  // Poor care doesn't stop time, it just means he takes longer to grow up.
  var STAGE_MIN_DAYS = { baby: 3, toddler: 4, kid: 5, tween: Infinity };
  var STAGE_CARE_THRESHOLD = 55;

  var FIELD_EVENTS = [
    { key: 'toy', label: 'A toy rolled into the field!', chance: 0.05 },
    { key: 'treat', label: 'Baby Markus found a treat!', chance: 0.05 },
    { key: 'rain', label: 'It started raining!', chance: 0.03 },
    { key: 'cold', label: 'Baby Markus caught a little cold.', chance: 0.015 },
    { key: 'butterfly', label: 'A butterfly is fluttering by!', chance: 0.04 }
  ];

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function daysBetween(aKey, bKey) {
    var a = new Date(aKey + 'T00:00:00');
    var b = new Date(bKey + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  // Shop catalog: food is consumed on use, toys are owned once bought and
  // can be dragged onto him any time after that (like the random-event toy,
  // but permanently available from your inventory).
  var SHOP_FOOD = [
    { key: 'apple', label: 'Apple', emoji: '🍎', cost: 8, hunger: 15, happiness: 2 },
    { key: 'sandwich', label: 'Sandwich', emoji: '🥪', cost: 18, hunger: 30, happiness: 4 },
    { key: 'cake', label: 'Slice of Cake', emoji: '🍰', cost: 35, hunger: 40, happiness: 15 }
  ];
  var SHOP_TOYS = [
    { key: 'ball', label: 'Ball', emoji: '⚽', cost: 25, happiness: 10 },
    { key: 'kite', label: 'Kite', emoji: '🫁', cost: 40, happiness: 16 },
    { key: 'blocks', label: 'Blocks', emoji: '🧱', cost: 55, happiness: 22 }
  ];

  function defPet() {
    var today = todayKey();
    return {
      name: 'Baby Markus',
      stage: 'baby',
      stageStartDate: today,
      birthDate: today,
      hunger: 80,
      happiness: 85,
      cleanliness: 100,
      hasCold: false,
      lastUpdate: Date.now(),
      lastVisitDate: today,
      careLog: [], // recent daily care-quality samples, used to compute the growth average
      activeToy: false,
      activeTreat: false,
      raining: false,
      x: 50, // field position, in percent
      y: 60,
      coins: 20, // small starting balance so the shop isn't empty on day one
      ownedToys: [], // keys from SHOP_TOYS the player has bought
      dirtSpots: [] // [{id, x, y}] scrubbable dirt marks, in percent relative to the creature sprite
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

  function careScoreNow() {
    // Simple average of the three core stats -- a rough "how well is he
    // doing right now" number from 0-100, sampled once per day into
    // careLog so growth can look at a window of recent days rather than
    // a single lucky/unlucky moment.
    return Math.round((pet.hunger + pet.happiness + pet.cleanliness) / 3);
  }

  function sampleCareForToday() {
    var today = todayKey();
    var already = pet.careLog.some(function (entry) { return entry.date === today; });
    if (already) return;
    pet.careLog.push({ date: today, score: careScoreNow() });
    // Keep only the last 10 days of samples.
    if (pet.careLog.length > 10) pet.careLog = pet.careLog.slice(-10);
  }

  function averageCareScore() {
    if (pet.careLog.length === 0) return careScoreNow();
    var sum = pet.careLog.reduce(function (acc, e) { return acc + e.score; }, 0);
    return sum / pet.careLog.length;
  }

  function maybeGrow() {
    var stageIndex = STAGES.indexOf(pet.stage);
    if (stageIndex === STAGES.length - 1) return null; // already fully grown

    var minDays = STAGE_MIN_DAYS[pet.stage];
    var daysInStage = daysBetween(pet.stageStartDate, todayKey());
    if (daysInStage < minDays) return null;

    var avgCare = averageCareScore();
    if (avgCare < STAGE_CARE_THRESHOLD) return null; // eligible by time, not by care yet

    var nextStage = STAGES[stageIndex + 1];
    pet.stage = nextStage;
    pet.stageStartDate = todayKey();
    pet.careLog = [];
    return nextStage;
  }

  function updatePet() {
    var now = Date.now();
    var hoursElapsed = (now - pet.lastUpdate) / 3600000;

    pet.hunger = Math.max(0, pet.hunger - hoursElapsed * 3);
    pet.cleanliness = Math.max(0, pet.cleanliness - hoursElapsed * 2.2);
    pet.happiness = Math.max(0, Math.min(100, (pet.hunger + pet.cleanliness) / 2));
    if (pet.hasCold) pet.happiness = Math.max(0, pet.happiness - 10);

    pet.lastUpdate = now;
    sampleCareForToday();
    pet.lastVisitDate = todayKey();
    maybeAddDirt();
    savePet();
  }

  function feedPet(hungerAmt, happyAmt) {
    pet.hunger = Math.min(100, pet.hunger + (hungerAmt != null ? hungerAmt : 22));
    pet.happiness = Math.min(100, pet.happiness + (happyAmt != null ? happyAmt : 6));
    sampleCareForToday();
    savePet();
  }

  function playWithPet(happyAmt) {
    pet.happiness = Math.min(100, pet.happiness + (happyAmt != null ? happyAmt : 12));
    sampleCareForToday();
    savePet();
  }

  // ---------- Dirt / brush cleaning (Talking-Tom style) ----------
  var nextDirtId = 1;

  function maybeAddDirt() {
    if (pet.cleanliness > 55) return; // only gets visibly dirty once cleanliness has dropped a fair bit
    if (pet.dirtSpots.length >= 5) return;
    if (Math.random() > 0.35) return;
    pet.dirtSpots.push({
      id: nextDirtId++,
      x: 20 + Math.random() * 60,
      y: 25 + Math.random() * 55
    });
    savePet();
  }

  function scrubDirt(dirtId) {
    var idx = pet.dirtSpots.findIndex(function (d) { return d.id === dirtId; });
    if (idx === -1) return false;
    pet.dirtSpots.splice(idx, 1);
    pet.cleanliness = Math.min(100, pet.cleanliness + 12);
    pet.happiness = Math.min(100, pet.happiness + 2);
    if (pet.hasCold && pet.cleanliness > 70) pet.hasCold = false;
    sampleCareForToday();
    savePet();
    return true;
  }

  // ---------- Coins / shop ----------
  function addCoins(amount) {
    pet.coins = Math.max(0, pet.coins + amount);
    savePet();
  }

  function buyFood(key) {
    var item = SHOP_FOOD.filter(function (f) { return f.key === key; })[0];
    if (!item) return { ok: false, error: 'Unknown item.' };
    if (pet.coins < item.cost) return { ok: false, error: 'Not enough coins.' };
    pet.coins -= item.cost;
    feedPet(item.hunger, item.happiness);
    return { ok: true, item: item };
  }

  function buyToy(key) {
    var item = SHOP_TOYS.filter(function (t) { return t.key === key; })[0];
    if (!item) return { ok: false, error: 'Unknown item.' };
    if (pet.ownedToys.indexOf(key) !== -1) return { ok: false, error: 'Already owned.' };
    if (pet.coins < item.cost) return { ok: false, error: 'Not enough coins.' };
    pet.coins -= item.cost;
    pet.ownedToys.push(key);
    savePet();
    return { ok: true, item: item };
  }

  function useOwnedToy(key) {
    var item = SHOP_TOYS.filter(function (t) { return t.key === key; })[0];
    if (!item) return;
    playWithPet(item.happiness);
  }

  function renamePet(name) {
    var n = String(name || '').trim().slice(0, 20);
    if (n) { pet.name = n; savePet(); }
  }

  // ---------- Field wander AI ----------
  var wanderTimer = null;
  var isDragging = false;
  var isMoving = false;

  function startWander(fieldEl, creatureEl) {
    function step() {
      if (isDragging) return;
      var targetX = 10 + Math.random() * 80;
      var targetY = 35 + Math.random() * 55;
      moveTo(fieldEl, creatureEl, targetX, targetY);
    }
    if (wanderTimer) clearInterval(wanderTimer);
    wanderTimer = setInterval(step, 4500);
  }

  function moveTo(fieldEl, creatureEl, targetX, targetY) {
    if (isDragging) return;
    isMoving = true;
    var facingLeft = targetX < pet.x;
    creatureEl.style.transform = 'scaleX(' + (facingLeft ? -1 : 1) + ')';
    creatureEl.classList.add('bm-walking');

    pet.x = targetX;
    pet.y = targetY;
    positionCreature(creatureEl);
    savePet();

    setTimeout(function () {
      isMoving = false;
      creatureEl.classList.remove('bm-walking');
    }, 1400);
  }

  function positionCreature(creatureEl) {
    // If pet.x/pet.y ever end up NaN, missing, or just some stale value
    // sitting right at/near a corner (e.g. an old 0/0 from a past bug),
    // clamp back into the field's real usable area. "left: NaN%" alone is
    // invalid CSS and gets silently dropped (leaving the element at its
    // default static position, i.e. the container's top-left corner), but
    // a valid-yet-wrong 0/0 slips right past a simple isFinite check --
    // clamping to the same range the wander AI uses closes that gap too.
    var x = Number(pet.x);
    var y = Number(pet.y);
    if (!isFinite(x) || x < 4 || x > 96) x = 50;
    if (!isFinite(y) || y < 20 || y > 96) y = 60;
    pet.x = x;
    pet.y = y;
    creatureEl.style.left = x + '%';
    creatureEl.style.top = y + '%';
  }

  // ---------- Random field events ----------
  function rollFieldEvent() {
    if (pet.activeToy || pet.activeTreat || pet.raining) return null;
    var roll = Math.random();
    var acc = 0;
    for (var i = 0; i < FIELD_EVENTS.length; i++) {
      acc += FIELD_EVENTS[i].chance;
      if (roll < acc) return FIELD_EVENTS[i];
    }
    return null;
  }

  function applyFieldEvent(evt, notifyFn) {
    if (evt.key === 'toy') {
      pet.activeToy = true;
      savePet();
      notifyFn(evt.label + ' Drag it to him!');
    } else if (evt.key === 'treat') {
      pet.activeTreat = true;
      savePet();
      notifyFn(evt.label + ' Drag it to him!');
    } else if (evt.key === 'rain') {
      pet.raining = true;
      pet.happiness = Math.max(0, pet.happiness - 8);
      savePet();
      notifyFn(evt.label);
      setTimeout(function () { pet.raining = false; savePet(); renderAll(); }, 12000);
    } else if (evt.key === 'cold') {
      pet.hasCold = true;
      pet.cleanliness = Math.max(0, pet.cleanliness - 15);
      savePet();
      notifyFn(evt.label + ' Keep him clean to help him feel better.');
    } else if (evt.key === 'butterfly') {
      pet.happiness = Math.min(100, pet.happiness + 3);
      savePet();
      notifyFn(evt.label);
    }
  }

  // ---------- Rendering ----------
  var renderAllRef = null;
  function renderAll() {
    if (renderAllRef) renderAllRef();
  }

  function initBabyMarkus() {
    updatePet();
    var grown = maybeGrow();

    var field = document.getElementById('bm-field');
    var creature = document.getElementById('bm-creature');
    var nameEl = document.getElementById('bm-name');
    var stageEl = document.getElementById('bm-stage');
    var hungerBar = document.getElementById('bm-hunger');
    var cleanBar = document.getElementById('bm-clean');
    var happyBar = document.getElementById('bm-happy');
    var notifyEl = document.getElementById('bm-notify');
    var toyEl = document.getElementById('bm-toy');
    var treatEl = document.getElementById('bm-treat');
    var rainEl = document.getElementById('bm-rain');
    var coldEl = document.getElementById('bm-cold-badge');
    var growthNote = document.getElementById('bm-growth-note');
    var coinsEl = document.getElementById('bm-coins');
    var dirtLayer = document.getElementById('bm-dirt-layer');
    var brushEl = document.getElementById('bm-brush');

    function notify(msg) {
      notifyEl.textContent = msg;
      notifyEl.classList.add('show');
      clearTimeout(notify._t);
      notify._t = setTimeout(function () { notifyEl.classList.remove('show'); }, 4500);
    }

    function render() {
      nameEl.textContent = pet.name;
      stageEl.textContent = STAGE_LABELS[pet.stage];
      hungerBar.style.width = pet.hunger + '%';
      hungerBar.classList.toggle('low', pet.hunger < 30);
      cleanBar.style.width = pet.cleanliness + '%';
      cleanBar.classList.toggle('low', pet.cleanliness < 30);
      happyBar.style.width = pet.happiness + '%';
      happyBar.classList.toggle('low', pet.happiness < 30);

      var scale = STAGE_SCALE[pet.stage];
      creature.style.setProperty('--bm-scale', scale);
      positionCreature(creature);

      toyEl.style.display = pet.activeToy ? 'block' : 'none';
      treatEl.style.display = pet.activeTreat ? 'block' : 'none';
      rainEl.style.display = pet.raining ? 'block' : 'none';
      coldEl.style.display = pet.hasCold ? 'inline' : 'none';
      coinsEl.textContent = pet.coins;

      // Dirt spots render as little clickable/draggable smudges positioned
      // relative to the creature sprite so they move and scale along with him.
      dirtLayer.innerHTML = '';
      pet.dirtSpots.forEach(function (spot) {
        var el = document.createElement('div');
        el.className = 'bm-dirt';
        el.style.left = spot.x + '%';
        el.style.top = spot.y + '%';
        el.dataset.dirtId = spot.id;
        dirtLayer.appendChild(el);
      });

      var daysInStage = daysBetween(pet.stageStartDate, todayKey());
      var minDays = STAGE_MIN_DAYS[pet.stage];
      if (pet.stage === 'tween') {
        growthNote.textContent = 'Fully grown.';
      } else if (daysInStage < minDays) {
        growthNote.textContent = 'Growing up in ' + (minDays - daysInStage) + ' more day' + (minDays - daysInStage === 1 ? '' : 's') + ' (with good care).';
      } else if (averageCareScore() < STAGE_CARE_THRESHOLD) {
        growthNote.textContent = 'Ready to grow, but needs better care first.';
      } else {
        growthNote.textContent = 'About to grow up!';
      }
    }

    renderAllRef = render;
    render();
    savePet(); // persist any x/y correction positionCreature() just made

    if (grown) {
      notify(pet.name + ' grew into a ' + STAGE_LABELS[grown] + '!');
    }

    startWander(field, creature);

    // ---- Drag baby Markus around ----
    var dragOffset = null;
    function startDrag(clientX, clientY) {
      isDragging = true;
      if (wanderTimer) clearInterval(wanderTimer);
      creature.classList.add('bm-dragging');
    }
    function duringDrag(clientX, clientY) {
      var rect = field.getBoundingClientRect();
      var px = ((clientX - rect.left) / rect.width) * 100;
      var py = ((clientY - rect.top) / rect.height) * 100;
      px = Math.max(4, Math.min(96, px));
      py = Math.max(20, Math.min(92, py));
      pet.x = px;
      pet.y = py;
      positionCreature(creature);
    }
    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      creature.classList.remove('bm-dragging');
      savePet();
      startWander(field, creature);
    }

    creature.addEventListener('mousedown', function (e) { e.preventDefault(); startDrag(e.clientX, e.clientY); });
    document.addEventListener('mousemove', function (e) { if (isDragging) duringDrag(e.clientX, e.clientY); });
    document.addEventListener('mouseup', endDrag);

    creature.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!isDragging) return;
      var t = e.touches[0];
      duringDrag(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', endDrag);

    // ---- Drag toy/treat onto baby Markus ----
    function wireDraggableItem(itemEl, onDeliver) {
      var dragging = false;

      function drop(clientX, clientY) {
        var creatureRect = creature.getBoundingClientRect();
        var dx = clientX - (creatureRect.left + creatureRect.width / 2);
        var dy = clientY - (creatureRect.top + creatureRect.height / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 70) {
          onDeliver();
          itemEl.style.left = '';
          itemEl.style.top = '';
        }
      }

      itemEl.addEventListener('mousedown', function (e) {
        e.preventDefault();
        dragging = true;
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var rect = field.getBoundingClientRect();
        itemEl.style.left = (((e.clientX - rect.left) / rect.width) * 100) + '%';
        itemEl.style.top = (((e.clientY - rect.top) / rect.height) * 100) + '%';
      });
      document.addEventListener('mouseup', function (e) {
        if (!dragging) return;
        dragging = false;
        drop(e.clientX, e.clientY);
      });

      itemEl.addEventListener('touchstart', function () { dragging = true; }, { passive: true });
      document.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        var t = e.touches[0];
        var rect = field.getBoundingClientRect();
        itemEl.style.left = (((t.clientX - rect.left) / rect.width) * 100) + '%';
        itemEl.style.top = (((t.clientY - rect.top) / rect.height) * 100) + '%';
      }, { passive: true });
      document.addEventListener('touchend', function (e) {
        if (!dragging) return;
        dragging = false;
        var t = e.changedTouches[0];
        drop(t.clientX, t.clientY);
      });
    }

    wireDraggableItem(toyEl, function () {
      pet.activeToy = false;
      playWithPet();
      notify(pet.name + ' loved playing with the toy!');
      render();
    });
    wireDraggableItem(treatEl, function () {
      pet.activeTreat = false;
      feedPet();
      notify(pet.name + ' gobbled up the treat!');
      render();
    });

    // ---- Brush cleaning (Talking-Tom style: drag the brush over dirt spots) ----
    var brushDragging = false;

    function moveBrushTo(clientX, clientY) {
      var rect = field.getBoundingClientRect();
      brushEl.style.left = (((clientX - rect.left) / rect.width) * 100) + '%';
      brushEl.style.top = (((clientY - rect.top) / rect.height) * 100) + '%';

      // Check overlap against every rendered dirt spot's DOM position.
      var brushRect = brushEl.getBoundingClientRect();
      var bx = brushRect.left + brushRect.width / 2;
      var by = brushRect.top + brushRect.height / 2;
      var dirtEls = dirtLayer.querySelectorAll('.bm-dirt');
      for (var i = 0; i < dirtEls.length; i++) {
        var dRect = dirtEls[i].getBoundingClientRect();
        var dx = dRect.left + dRect.width / 2;
        var dy = dRect.top + dRect.height / 2;
        var dist = Math.sqrt((bx - dx) * (bx - dx) + (by - dy) * (by - dy));
        if (dist < 42) {
          var id = parseInt(dirtEls[i].dataset.dirtId, 10);
          if (scrubDirt(id)) {
            notify('Scrubbing ' + pet.name + ' clean!');
            render();
          }
        }
      }
    }

    brushEl.addEventListener('mousedown', function (e) { e.preventDefault(); brushDragging = true; brushEl.classList.add('active'); });
    document.addEventListener('mousemove', function (e) { if (brushDragging) moveBrushTo(e.clientX, e.clientY); });
    document.addEventListener('mouseup', function () { brushDragging = false; brushEl.classList.remove('active'); });

    brushEl.addEventListener('touchstart', function () { brushDragging = true; brushEl.classList.add('active'); }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!brushDragging) return;
      var t = e.touches[0];
      moveBrushTo(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', function () { brushDragging = false; brushEl.classList.remove('active'); });

    // ---- Shop ----
    function renderShop() {
      var foodList = document.getElementById('bm-shop-food');
      var toyList = document.getElementById('bm-shop-toys');
      var inventoryList = document.getElementById('bm-inventory');

      foodList.innerHTML = '';
      SHOP_FOOD.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'bm-shop-row';
        row.innerHTML = '<span class="bm-shop-emoji">' + item.emoji + '</span>' +
          '<span class="bm-shop-name">' + item.label + '</span>' +
          '<span class="bm-shop-cost">' + item.cost + ' coins</span>' +
          '<input type="button" value="Buy" class="bm-buy-btn">';
        row.querySelector('.bm-buy-btn').addEventListener('click', function () {
          var result = buyFood(item.key);
          if (result.ok) {
            notify('Fed ' + pet.name + ' a ' + item.label + '!');
            render();
            renderShop();
          } else {
            notify(result.error);
          }
        });
        foodList.appendChild(row);
      });

      toyList.innerHTML = '';
      SHOP_TOYS.forEach(function (item) {
        var owned = pet.ownedToys.indexOf(item.key) !== -1;
        var row = document.createElement('div');
        row.className = 'bm-shop-row';
        row.innerHTML = '<span class="bm-shop-emoji">' + item.emoji + '</span>' +
          '<span class="bm-shop-name">' + item.label + '</span>' +
          '<span class="bm-shop-cost">' + (owned ? 'Owned' : item.cost + ' coins') + '</span>' +
          (owned ? '' : '<input type="button" value="Buy" class="bm-buy-btn">');
        if (!owned) {
          row.querySelector('.bm-buy-btn').addEventListener('click', function () {
            var result = buyToy(item.key);
            if (result.ok) {
              notify('Bought a ' + item.label + '!');
              renderShop();
            } else {
              notify(result.error);
            }
          });
        }
        toyList.appendChild(row);
      });

      inventoryList.innerHTML = '';
      if (pet.ownedToys.length === 0) {
        inventoryList.innerHTML = '<span style="font-size:11px; color:#777;">No toys yet -- buy some from the Toys tab!</span>';
      }
      pet.ownedToys.forEach(function (key) {
        var item = SHOP_TOYS.filter(function (t) { return t.key === key; })[0];
        if (!item) return;
        var btn = document.createElement('input');
        btn.type = 'button';
        btn.value = item.emoji + ' Play with ' + item.label;
        btn.className = 'bm-inventory-btn';
        btn.addEventListener('click', function () {
          useOwnedToy(key);
          notify(pet.name + ' had fun with the ' + item.label + '!');
          render();
        });
        inventoryList.appendChild(btn);
      });
    }

    document.getElementById('bm-shop-btn').addEventListener('click', function () {
      renderShop();
      document.getElementById('bm-shop-overlay').style.display = 'flex';
    });
    document.getElementById('bm-shop-close').addEventListener('click', function () {
      document.getElementById('bm-shop-overlay').style.display = 'none';
    });
    document.querySelectorAll('.bm-shop-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.bm-shop-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.tab;
        document.querySelectorAll('.bm-shop-panel').forEach(function (p) { p.style.display = 'none'; });
        document.getElementById('bm-shop-panel-' + target).style.display = 'block';
      });
    });

    // ---- Games menu ----
    document.getElementById('bm-games-btn').addEventListener('click', function () {
      window.BabyMarkusGames.open({
        onReward: function (coinAmount) {
          addCoins(coinAmount);
          coinsEl.textContent = pet.coins;
          notify('Earned ' + coinAmount + ' coins!');
        }
      });
    });

    var renameBtn = document.getElementById('bm-rename-btn');
    renameBtn.addEventListener('click', function () {
      var input = document.getElementById('bm-rename-input');
      var confirmBtn = document.getElementById('bm-rename-confirm');
      renameBtn.style.display = 'none';
      input.value = pet.name;
      input.style.display = '';
      confirmBtn.style.display = '';
      input.focus();
      input.select();

      function doRename() {
        renamePet(input.value.trim());
        input.style.display = 'none';
        confirmBtn.style.display = 'none';
        renameBtn.style.display = '';
        render();
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

    // ---- Periodic loop: decay + random events ----
    setInterval(function () {
      updatePet();
      var grown2 = maybeGrow();
      if (grown2) notify(pet.name + ' grew into a ' + STAGE_LABELS[grown2] + '!');
      render();
    }, 20000);

    setInterval(function () {
      var evt = rollFieldEvent();
      if (evt) applyFieldEvent(evt, notify);
      render();
    }, 25000);
  }

  document.addEventListener('DOMContentLoaded', initBabyMarkus);
})();
