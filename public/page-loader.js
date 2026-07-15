// THE INTERNET REST STOP -- fake page-load screen.
// Purely cosmetic: pages here already load instantly (small static files),
// but a flash of a retro "loading..." screen between internal navigations
// is funnier and more in-theme than an instant snap-cut, like the site is
// still on a modem. Shows for a short, randomized duration with a fake
// progress bar and a rotating joke tip, then does the real navigation.

(function () {
  var TIPS = [
    'Tip: Do not unplug the modem.',
    'Tip: Baby Markus does not like being ignored for too long.',
    'Tip: The News Ticker is 100% verified, we checked.',
    'Tip: MK is better than Discord. Statistically. Maybe.',
    'Tip: Try not to spill anything on the keyboard.',
    'Tip: If the page looks broken, it is probably fine.',
    'Tip: Markus does not actually eat real pizza, only mp3s.',
    'Tip: Buffering is a state of mind.',
    'Tip: This message is fake but the loading bar is faker.',
    'Tip: Please remain seated with your seatbelt fastened.',
    'Tip: We are not responsible for lost sleep due to Duck Race.',
    'Tip: Refreshing will not make this go faster.',
    'Tip: Baby Markus once dropped out of college. Still recovering.',
    'Tip: 56k modems had a good run.',
    'Tip: This rest stop has clean bathrooms and a gift shop.'
  ];

  function injectStyles() {
    if (document.getElementById('pl-style')) return;
    var style = document.createElement('style');
    style.id = 'pl-style';
    style.textContent =
      '#pl-overlay{position:fixed;inset:0;z-index:99999;background:#000080;' +
      'display:none;align-items:center;justify-content:center;font-family:' +
      '"Courier New",Courier,monospace;color:#ffffff;}' +
      '#pl-overlay.show{display:flex;}' +
      '#pl-box{width:320px;max-width:80vw;text-align:center;}' +
      '#pl-title{font-size:15px;font-weight:bold;margin-bottom:4px;' +
      'text-shadow:1px 1px 0 #000040;}' +
      '#pl-sub{font-size:11px;color:#c0c0ff;margin-bottom:14px;}' +
      '#pl-barOuter{width:100%;height:18px;background:#000040;border:2px inset #8080c0;' +
      'padding:2px;box-sizing:border-box;margin-bottom:10px;}' +
      '#pl-barInner{height:100%;width:0%;background:repeating-linear-gradient(' +
      '45deg,#00aa00,#00aa00 6px,#00cc00 6px,#00cc00 12px);transition:width 0.15s linear;}' +
      '#pl-pct{font-size:11px;color:#ffffff;margin-bottom:10px;}' +
      '#pl-tip{font-size:11px;color:#e0e0ff;font-style:italic;min-height:28px;}' +
      '#pl-spinner{display:inline-block;margin-bottom:10px;font-size:20px;' +
      'animation:pl-spin 0.9s steps(8) infinite;}' +
      '@keyframes pl-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}';
    document.head.appendChild(style);
  }

  function injectMarkup() {
    if (document.getElementById('pl-overlay')) return;
    var div = document.createElement('div');
    div.innerHTML =
      '<div id="pl-overlay">' +
      '  <div id="pl-box">' +
      '    <div id="pl-spinner">&#8987;</div>' +
      '    <div id="pl-title">Loading The Internet Rest Stop&hellip;</div>' +
      '    <div id="pl-sub" id="pl-dest"></div>' +
      '    <div id="pl-barOuter"><div id="pl-barInner"></div></div>' +
      '    <div id="pl-pct">0%</div>' +
      '    <div id="pl-tip"></div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(div.firstElementChild);
  }

  function showLoader(destLabel, onDone) {
    // Guard the whole thing: this is a cosmetic flourish, and if anything
    // here throws (a missing element, a rAF issue, whatever), the caller
    // still needs onDone to fire so navigation actually happens instead of
    // leaving whatever overlay was already showing frozen on screen forever.
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      onDone();
    }
    // Absolute worst-case backstop, independent of everything below.
    var hardTimeout = setTimeout(finish, 3000);

    try {
      injectStyles();
      injectMarkup();
      var overlay = document.getElementById('pl-overlay');
      var bar = document.getElementById('pl-barInner');
      var pct = document.getElementById('pl-pct');
      var tipEl = document.getElementById('pl-tip');
      var destEl = document.getElementById('pl-dest');

      if (!overlay || !bar || !pct || !tipEl || !destEl) {
        finish();
        return;
      }

      destEl.textContent = destLabel || '';
      tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      bar.style.width = '0%';
      pct.textContent = '0%';
      overlay.classList.add('show');

      var duration = 650 + Math.random() * 550;
      var start = null;
      function tick(ts) {
        try {
          if (!start) start = ts;
          var elapsed = ts - start;
          var progress = Math.min(100, Math.round((elapsed / duration) * 100));
          bar.style.width = progress + '%';
          pct.textContent = progress + '%';
          if (progress < 100) {
            requestAnimationFrame(tick);
          } else {
            clearTimeout(hardTimeout);
            setTimeout(finish, 120);
          }
        } catch (err) {
          finish();
        }
      }
      requestAnimationFrame(tick);
    } catch (err) {
      finish();
    }
  }

  function wireInternalLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      // Only intercept same-origin internal page navigations -- not
      // external links, not anchors (#foo), not the torn-corner portal
      // (that one already runs its own zoom transition and calls the
      // loader itself from index.html's script, so it isn't double-hooked
      // here).
      if (link.id === 'tornCornerLink') return;
      if (href.charAt(0) === '#') return;
      if (/^https?:\/\//i.test(href)) return;
      if (link.target === '_blank') return;

      link.addEventListener('click', function (e) {
        e.preventDefault();
        var dest = link.href;
        var label = href === '/' ? 'Returning to the Rest Stop' : 'Heading to ' + href.replace(/^\//, '').replace(/\.html$/, '');
        showLoader(label, function () {
          window.location.href = dest;
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', wireInternalLinks);

  window.RestStopLoader = { show: showLoader };
})();
