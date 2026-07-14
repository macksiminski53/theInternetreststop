// BABY MARKUS -- mini-games arcade.
// Four small coin-earning games, opened from the "Play Games" button:
// three quick reaction/timing games (Whack-a-Mole, Timing Bar, Memory
// Match) plus one flagship arcade game (Falling Fruit Dodger/Catcher) with
// more replay depth. All render into a shared overlay/modal; each game
// reports coins earned back through onReward().

(function () {
  var overlay, menuView, gameView, onRewardCb, getCoinsCb, spendCoinsCb;

  function buildDom() {
    if (document.getElementById('bmg-overlay')) return;
    var html = '' +
      '<div id="bmg-overlay">' +
      '  <div id="bmg-box">' +
      '    <div id="bmg-titlebar">' +
      '      <span id="bmg-title">Mini-Games</span>' +
      '      <a href="#" id="bmg-close">Close X</a>' +
      '    </div>' +
      '    <div id="bmg-menu">' +
      '      <div class="bmg-game-card" data-game="whack">' +
      '        <div class="bmg-game-icon">&#128027;</div>' +
      '        <div class="bmg-game-name">Whack-a-Markus</div>' +
      '        <div class="bmg-game-desc">Click him as he pops up. Quick reflexes!</div>' +
      '      </div>' +
      '      <div class="bmg-game-card" data-game="timing">' +
      '        <div class="bmg-game-icon">&#127919;</div>' +
      '        <div class="bmg-game-name">Stop the Bar</div>' +
      '        <div class="bmg-game-desc">Stop the marker in the green zone.</div>' +
      '      </div>' +
      '      <div class="bmg-game-card" data-game="memory">' +
      '        <div class="bmg-game-icon">&#127183;</div>' +
      '        <div class="bmg-game-name">Memory Match</div>' +
      '        <div class="bmg-game-desc">Find all the matching pairs.</div>' +
      '      </div>' +
      '      <div class="bmg-game-card" data-game="dodger">' +
      '        <div class="bmg-game-icon">&#127814;</div>' +
      '        <div class="bmg-game-name">Snack Catcher</div>' +
      '        <div class="bmg-game-desc">Catch falling snacks, dodge the rocks!</div>' +
      '      </div>' +
      '      <div class="bmg-game-card" data-game="duckrace">' +
      '        <div class="bmg-game-icon">&#129737;</div>' +
      '        <div class="bmg-game-name">Duck Race</div>' +
      '        <div class="bmg-game-desc">Bet coins on a duck. Watch them race!</div>' +
      '      </div>' +
      '    </div>' +
      '    <div id="bmg-game-area" style="display:none;"></div>' +
      '  </div>' +
      '</div>';
    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
  }

  function showMenu() {
    document.getElementById('bmg-menu').style.display = 'grid';
    document.getElementById('bmg-game-area').style.display = 'none';
    document.getElementById('bmg-game-area').innerHTML = '';
    document.getElementById('bmg-title').textContent = 'Mini-Games';
  }

  function showGameArea(title) {
    document.getElementById('bmg-menu').style.display = 'none';
    var area = document.getElementById('bmg-game-area');
    area.style.display = 'block';
    area.innerHTML = '';
    document.getElementById('bmg-title').textContent = title;
    return area;
  }

  function reward(amount) {
    if (onRewardCb) onRewardCb(amount);
  }

  // ---------------- GAME 1: Whack-a-Markus ----------------
  function startWhackGame() {
    var area = showGameArea('Whack-a-Markus');
    var DURATION_MS = 15000;
    var holes = 6;
    var score = 0;
    var timeLeft = DURATION_MS;
    var activeHole = -1;
    var popTimer = null;
    var countdownTimer = null;
    var running = true;

    area.innerHTML =
      '<div class="bmg-hud">Score: <b id="wk-score">0</b> &nbsp; Time: <b id="wk-time">15</b>s</div>' +
      '<div id="wk-grid"></div>' +
      '<div class="bmg-hud-note">Click him when he pops up!</div>';

    var grid = document.getElementById('wk-grid');
    for (var i = 0; i < holes; i++) {
      var hole = document.createElement('div');
      hole.className = 'wk-hole';
      hole.dataset.index = i;
      hole.innerHTML = '<div class="wk-critter">&#128027;</div>';
      grid.appendChild(hole);
    }
    var holeEls = grid.querySelectorAll('.wk-hole');

    function popRandom() {
      if (!running) return;
      if (activeHole !== -1) holeEls[activeHole].classList.remove('up');
      activeHole = Math.floor(Math.random() * holes);
      holeEls[activeHole].classList.add('up');
      var upFor = 550 + Math.random() * 500;
      popTimer = setTimeout(function () {
        if (activeHole !== -1) holeEls[activeHole].classList.remove('up');
        activeHole = -1;
        if (running) popTimer = setTimeout(popRandom, 200 + Math.random() * 300);
      }, upFor);
    }

    holeEls.forEach(function (hole, idx) {
      hole.addEventListener('click', function () {
        if (idx === activeHole) {
          score++;
          document.getElementById('wk-score').textContent = score;
          hole.classList.remove('up');
          hole.classList.add('hit');
          setTimeout(function () { hole.classList.remove('hit'); }, 200);
          activeHole = -1;
        }
      });
    });

    popRandom();
    countdownTimer = setInterval(function () {
      timeLeft -= 1000;
      document.getElementById('wk-time').textContent = Math.max(0, Math.ceil(timeLeft / 1000));
      if (timeLeft <= 0) {
        running = false;
        clearInterval(countdownTimer);
        clearTimeout(popTimer);
        var coins = Math.min(40, score * 3);
        area.innerHTML += '<div class="bmg-result">Game over! You hit him ' + score + ' times.<br>Earned ' + coins + ' coins!</div>' +
          '<input type="button" value="Back to Games" class="bmg-back-btn" id="wk-back">';
        document.getElementById('wk-back').addEventListener('click', showMenu);
        reward(coins);
      }
    }, 1000);
  }

  // ---------------- GAME 2: Stop the Bar (timing) ----------------
  function startTimingGame() {
    var area = showGameArea('Stop the Bar');
    var rounds = 3;
    var round = 0;
    var totalScore = 0;

    area.innerHTML =
      '<div class="bmg-hud">Round <b id="tb-round">1</b> / ' + rounds + ' &nbsp; Total: <b id="tb-total">0</b></div>' +
      '<div id="tb-track"><div id="tb-zone"></div><div id="tb-marker"></div></div>' +
      '<input type="button" value="Stop!" id="tb-stop-btn">' +
      '<div class="bmg-hud-note">Stop the marker inside the green zone.</div>';

    var track = document.getElementById('tb-track');
    var marker = document.getElementById('tb-marker');
    var zone = document.getElementById('tb-zone');
    var pos = 0;
    var dir = 1;
    var speed = 2.2;
    var raf = null;
    var roundActive = true;

    function placeZone() {
      var zoneWidth = 15 + Math.random() * 10;
      var zoneStart = 10 + Math.random() * (75 - zoneWidth);
      zone.style.left = zoneStart + '%';
      zone.style.width = zoneWidth + '%';
      return { start: zoneStart, end: zoneStart + zoneWidth };
    }
    var currentZone = placeZone();

    function tick() {
      if (!roundActive) return;
      pos += dir * speed;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = pos + '%';
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    document.getElementById('tb-stop-btn').addEventListener('click', function onStop() {
      if (!roundActive) return;
      roundActive = false;
      cancelAnimationFrame(raf);

      var hit = pos >= currentZone.start && pos <= currentZone.end;
      var centerDist = Math.abs(pos - (currentZone.start + currentZone.end) / 2);
      var roundScore = hit ? Math.max(5, Math.round(20 - centerDist)) : 0;
      totalScore += roundScore;
      document.getElementById('tb-total').textContent = totalScore;

      round++;
      if (round >= rounds) {
        var coins = Math.min(45, totalScore);
        area.innerHTML += '<div class="bmg-result">Final score: ' + totalScore + '<br>Earned ' + coins + ' coins!</div>' +
          '<input type="button" value="Back to Games" class="bmg-back-btn" id="tb-back">';
        document.getElementById('tb-back').addEventListener('click', showMenu);
        reward(coins);
      } else {
        setTimeout(function () {
          document.getElementById('tb-round').textContent = round + 1;
          pos = 0;
          dir = 1;
          speed += 0.4;
          currentZone = placeZone();
          roundActive = true;
          raf = requestAnimationFrame(tick);
        }, 700);
      }
    });
  }

  // ---------------- GAME 3: Memory Match ----------------
  function startMemoryGame() {
    var area = showGameArea('Memory Match');
    var emojis = ['🍎', '⚽', '🎈', '🧸', '🍰', '🎁'];
    var cards = emojis.concat(emojis);
    // Fisher-Yates shuffle
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
    }

    var moves = 0;
    var matched = 0;
    var first = null;
    var lock = false;

    area.innerHTML =
      '<div class="bmg-hud">Moves: <b id="mm-moves">0</b> &nbsp; Pairs found: <b id="mm-pairs">0</b> / ' + emojis.length + '</div>' +
      '<div id="mm-grid"></div>';

    var grid = document.getElementById('mm-grid');
    cards.forEach(function (emoji, idx) {
      var card = document.createElement('div');
      card.className = 'mm-card';
      card.dataset.emoji = emoji;
      card.dataset.index = idx;
      card.innerHTML = '<div class="mm-card-inner"><div class="mm-card-back">?</div><div class="mm-card-front">' + emoji + '</div></div>';
      grid.appendChild(card);

      card.addEventListener('click', function () {
        if (lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        card.classList.add('flipped');

        if (!first) {
          first = card;
          return;
        }

        moves++;
        document.getElementById('mm-moves').textContent = moves;

        if (first.dataset.emoji === card.dataset.emoji && first !== card) {
          first.classList.add('matched');
          card.classList.add('matched');
          matched++;
          document.getElementById('mm-pairs').textContent = matched;
          first = null;

          if (matched === emojis.length) {
            var coins = Math.max(10, Math.min(50, 60 - moves * 2));
            setTimeout(function () {
              area.innerHTML += '<div class="bmg-result">Solved in ' + moves + ' moves!<br>Earned ' + coins + ' coins!</div>' +
                '<input type="button" value="Back to Games" class="bmg-back-btn" id="mm-back">';
              document.getElementById('mm-back').addEventListener('click', showMenu);
              reward(coins);
            }, 400);
          }
        } else {
          lock = true;
          var toUnflip = [first, card];
          setTimeout(function () {
            toUnflip[0].classList.remove('flipped');
            toUnflip[1].classList.remove('flipped');
            lock = false;
          }, 700);
          first = null;
        }
      });
    });
  }

  // ---------------- GAME 4 (flagship): Snack Catcher ----------------
  function startDodgerGame() {
    var area = showGameArea('Snack Catcher');
    area.innerHTML =
      '<div class="bmg-hud">Score: <b id="dg-score">0</b> &nbsp; Lives: <b id="dg-lives">3</b></div>' +
      '<div id="dg-stage"><div id="dg-basket">&#127814;</div></div>' +
      '<div class="bmg-hud-note">Move your mouse (or drag) to catch snacks, avoid rocks!</div>';

    var stage = document.getElementById('dg-stage');
    var basket = document.getElementById('dg-basket');
    var score = 0;
    var lives = 3;
    var basketX = 50;
    var running = true;
    var items = [];
    var spawnTimer = null;
    var raf = null;
    var speed = 1.6;

    function setBasketX(px) {
      var rect = stage.getBoundingClientRect();
      basketX = Math.max(6, Math.min(94, ((px - rect.left) / rect.width) * 100));
      basket.style.left = basketX + '%';
    }

    stage.addEventListener('mousemove', function (e) { setBasketX(e.clientX); });
    stage.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      setBasketX(t.clientX);
    }, { passive: true });

    function spawnItem() {
      if (!running) return;
      var isRock = Math.random() < 0.32;
      var el = document.createElement('div');
      el.className = 'dg-item' + (isRock ? ' dg-rock' : ' dg-snack');
      el.textContent = isRock ? '🪨' : (['🍎', '🍪', '🧁', '🍬'])[Math.floor(Math.random() * 4)];
      var x = 6 + Math.random() * 88;
      el.style.left = x + '%';
      el.style.top = '-30px';
      stage.appendChild(el);
      items.push({ el: el, x: x, y: -30, isRock: isRock, speed: speed + Math.random() * 1.2 });
      spawnTimer = setTimeout(spawnItem, 550 - Math.min(300, score * 4));
    }

    function tick() {
      if (!running) return;
      var stageHeight = stage.clientHeight;
      var basketRect = basket.getBoundingClientRect();
      var stageRect = stage.getBoundingClientRect();

      for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i];
        item.y += item.speed;
        item.el.style.top = item.y + 'px';

        var itemRect = item.el.getBoundingClientRect();
        var caught = !(itemRect.right < basketRect.left || itemRect.left > basketRect.right ||
          itemRect.bottom < basketRect.top || itemRect.top > basketRect.bottom);

        if (caught) {
          if (item.isRock) {
            lives--;
            document.getElementById('dg-lives').textContent = lives;
            basket.classList.add('dg-hurt');
            setTimeout(function () { basket.classList.remove('dg-hurt'); }, 200);
          } else {
            score++;
            document.getElementById('dg-score').textContent = score;
          }
          item.el.remove();
          items.splice(i, 1);
          continue;
        }

        if (item.y > stageHeight + 20) {
          item.el.remove();
          items.splice(i, 1);
        }
      }

      if (lives <= 0) {
        running = false;
        clearTimeout(spawnTimer);
        items.forEach(function (it) { it.el.remove(); });
        var coins = Math.min(60, score * 2);
        area.innerHTML += '<div class="bmg-result">Game over! Caught ' + score + ' snacks.<br>Earned ' + coins + ' coins!</div>' +
          '<input type="button" value="Back to Games" class="bmg-back-btn" id="dg-back">';
        document.getElementById('dg-back').addEventListener('click', showMenu);
        reward(coins);
        return;
      }

      raf = requestAnimationFrame(tick);
    }

    spawnItem();
    raf = requestAnimationFrame(tick);
  }

  // ---------------- GAME 5: Duck Race (betting) ----------------
  // Four ducks with different odds race down a short track on their own --
  // you pick one and a wager amount, then watch. Payout is wager * odds if
  // your duck wins, otherwise the wager is lost. Odds are fixed per duck
  // (not secretly rigged against the player) so a cautious bettor can always
  // pick the favorite for a small, likely payout, or gamble on a longspot
  // for a bigger one.
  var DUCK_RACERS = [
    { name: 'Speedy',   color: '#ffd93b', odds: 2 },
    { name: 'Lucky',    color: '#7bd979', odds: 3 },
    { name: 'Grandpa',  color: '#8fa7d6', odds: 5 },
    { name: 'Mystery',  color: '#e08ac9', odds: 8 }
  ];

  function startDuckRaceGame() {
    var area = showGameArea('Duck Race');
    var wager = 10;
    var pickedIndex = null;

    function renderBetScreen() {
      var coins = getCoinsCb();
      var html = '<div class="bmg-hud">Your coins: ' + coins + '</div>';
      html += '<div class="bmg-duck-picks">';
      DUCK_RACERS.forEach(function (duck, i) {
        html += '<div class="bmg-duck-pick' + (pickedIndex === i ? ' picked' : '') + '" data-duck="' + i + '">' +
          '<div class="bmg-duck-swatch" style="background:' + duck.color + ';"></div>' +
          '<div class="bmg-duck-pick-name">' + duck.name + '</div>' +
          '<div class="bmg-duck-pick-odds">' + duck.odds + 'x</div>' +
        '</div>';
      });
      html += '</div>';
      html += '<div class="bmg-hud" style="margin-top:10px;">Wager: ' + wager + ' coins ' +
        '<input type="button" value="-5" id="bmg-wager-down" style="margin-left:8px;font-size:11px;padding:2px 8px;"> ' +
        '<input type="button" value="+5" id="bmg-wager-up" style="font-size:11px;padding:2px 8px;">' +
        '</div>';
      html += '<input type="button" value="Place Bet & Race!" id="bmg-duck-go" style="margin-top:10px;">';
      html += '<div class="bmg-hud-note">Pick a duck, set your wager, and see if he crosses first.</div>';
      area.innerHTML = html;

      area.querySelectorAll('.bmg-duck-pick').forEach(function (el) {
        el.addEventListener('click', function () {
          pickedIndex = Number(el.dataset.duck);
          renderBetScreen();
        });
      });
      document.getElementById('bmg-wager-down').addEventListener('click', function () {
        wager = Math.max(5, wager - 5);
        renderBetScreen();
      });
      document.getElementById('bmg-wager-up').addEventListener('click', function () {
        wager = Math.min(getCoinsCb(), wager + 5);
        renderBetScreen();
      });
      document.getElementById('bmg-duck-go').addEventListener('click', function () {
        if (pickedIndex === null) return;
        if (wager > getCoinsCb()) return;
        if (wager <= 0) return;
        spendCoinsCb(wager);
        runRace(pickedIndex, wager);
      });
    }

    function runRace(pickedIndex, wager) {
      var TRACK_LEN = 100;
      var lanes = DUCK_RACERS.map(function (duck) {
        return { duck: duck, pos: 0, speedBias: 0.7 + Math.random() * 0.6 };
      });

      var html = '<div class="bmg-hud">Wager: ' + wager + ' coins on ' + DUCK_RACERS[pickedIndex].name + '</div>';
      html += '<div id="bmg-duck-track">';
      lanes.forEach(function (lane, i) {
        html += '<div class="bmg-duck-lane">' +
          '<div class="bmg-duck-lane-name">' + lane.duck.name + '</div>' +
          '<div class="bmg-duck-lane-track"><div class="bmg-duck-runner" id="bmg-duck-runner-' + i + '" style="background:' + lane.duck.color + ';">&#129737;</div></div>' +
        '</div>';
      });
      html += '</div>';
      area.innerHTML = html;

      var finished = false;
      var raceInterval = setInterval(function () {
        if (finished) return;
        lanes.forEach(function (lane, i) {
          if (lane.pos >= TRACK_LEN) return;
          lane.pos += lane.speedBias * (2 + Math.random() * 4);
          if (lane.pos > TRACK_LEN) lane.pos = TRACK_LEN;
          var runnerEl = document.getElementById('bmg-duck-runner-' + i);
          if (runnerEl) runnerEl.style.left = lane.pos + '%';
        });

        var winnerIdx = lanes.findIndex(function (lane) { return lane.pos >= TRACK_LEN; });
        if (winnerIdx !== -1 && !finished) {
          finished = true;
          clearInterval(raceInterval);
          setTimeout(function () { showResult(winnerIdx, pickedIndex, wager); }, 500);
        }
      }, 120);
    }

    function showResult(winnerIdx, pickedIndex, wager) {
      var won = winnerIdx === pickedIndex;
      var winnerDuck = DUCK_RACERS[winnerIdx];
      var html = '<div class="bmg-result">' + winnerDuck.name + ' wins the race!</div>';
      if (won) {
        var payout = Math.round(wager * winnerDuck.odds);
        reward(payout);
        html += '<div class="bmg-result">You won ' + payout + ' coins! (' + winnerDuck.odds + 'x on ' + wager + ')</div>';
      } else {
        html += '<div class="bmg-result">Your duck didn\'t make it. Lost ' + wager + ' coins.</div>';
      }
      html += '<input type="button" value="Race Again" id="bmg-duck-again" class="bmg-back-btn">' +
        '<input type="button" value="Back to Games" class="bmg-back-btn" id="bmg-back-menu">';
      area.innerHTML = html;
      document.getElementById('bmg-duck-again').addEventListener('click', function () {
        pickedIndex = null;
        wager = 10;
        renderBetScreen();
      });
      document.getElementById('bmg-back-menu').addEventListener('click', showMenu);
    }

    renderBetScreen();
  }

  var GAME_STARTERS = {
    whack: startWhackGame,
    timing: startTimingGame,
    memory: startMemoryGame,
    dodger: startDodgerGame,
    duckrace: startDuckRaceGame
  };

  function wireMenu() {
    document.querySelectorAll('.bmg-game-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var game = card.dataset.game;
        if (GAME_STARTERS[game]) GAME_STARTERS[game]();
      });
    });
    document.getElementById('bmg-close').addEventListener('click', function (e) {
      e.preventDefault();
      document.getElementById('bmg-overlay').style.display = 'none';
    });
    document.getElementById('bmg-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'bmg-overlay') {
        document.getElementById('bmg-overlay').style.display = 'none';
      }
    });
  }

  function open(opts) {
    onRewardCb = (opts && opts.onReward) || null;
    getCoinsCb = (opts && opts.getCoins) || function () { return 0; };
    spendCoinsCb = (opts && opts.onSpend) || function () {};
    buildDom();
    if (!buildDom._wired) {
      wireMenu();
      buildDom._wired = true;
    }
    showMenu();
    document.getElementById('bmg-overlay').style.display = 'flex';
  }

  window.BabyMarkusGames = { open: open };
})();
