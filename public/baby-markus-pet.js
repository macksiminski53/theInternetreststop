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

  // Where-are-they-now montage shown after Baby Markus graduates to college --
  // original stylized scenes (no real likenesses or copyrighted characters),
  // captions carry the pop-culture nods as jokes.
  var COLLEGE_MONTAGE = [
    { caption: `Dropped out of college immediately. Started wearing a backpack with teddy bears on it. Sound familiar?`, svg: `<svg viewBox="0 0 280 160" width="280" height="160">
    <defs>
      <linearGradient id="s1bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3a3a3a"/>
        <stop offset="100%" stop-color="#1c1c1c"/>
      </linearGradient>
      <linearGradient id="s1board" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2a4d3a"/>
        <stop offset="100%" stop-color="#173324"/>
      </linearGradient>
      <radialGradient id="s1bear" cx="42%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#c89a5e"/>
        <stop offset="60%" stop-color="#a4703a"/>
        <stop offset="100%" stop-color="#7a4f24"/>
      </radialGradient>
      <linearGradient id="s1gown" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#262626"/>
        <stop offset="100%" stop-color="#0d0d0d"/>
      </linearGradient>
    </defs>
    <rect width="280" height="160" fill="url(#s1bg)"/>
    <rect x="8" y="8" width="264" height="92" fill="url(#s1board)" stroke="#0f2419" stroke-width="3" rx="2"/>
    <rect x="18" y="18" width="130" height="9" fill="#e8e0c8" opacity="0.45"/>
    <rect x="18" y="36" width="95" height="9" fill="#e8e0c8" opacity="0.32"/>
    <rect x="18" y="54" width="70" height="9" fill="#e8e0c8" opacity="0.22"/>
    <rect x="222" y="16" width="34" height="46" fill="#8a6a3a" opacity="0.5" rx="2"/>
    <rect x="0" y="98" width="280" height="62" fill="#151515"/>
    <ellipse cx="140" cy="150" rx="46" ry="8" fill="#000000" opacity="0.35"/>
    <path d="M100 150 Q140 165 180 150 L176 118 Q140 128 104 118 Z" fill="url(#s1gown)"/>
    <path d="M112 122 Q140 130 168 122 L165 116 Q140 123 115 116 Z" fill="#3a3a3a"/>
    <circle cx="140" cy="112" r="27" fill="url(#s1bear)"/>
    <circle cx="125" cy="103" r="4.5" fill="#2a1a0e"/>
    <circle cx="155" cy="103" r="4.5" fill="#2a1a0e"/>
    <circle cx="126.5" cy="101.5" r="1.3" fill="#ffffff"/>
    <circle cx="156.5" cy="101.5" r="1.3" fill="#ffffff"/>
    <ellipse cx="140" cy="120" rx="11" ry="7" fill="#e0bd8f"/>
    <ellipse cx="140" cy="119" rx="3" ry="2" fill="#3a2515"/>
    <path d="M132 126 Q140 131 148 126" fill="none" stroke="#3a2515" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="118" cy="112" rx="6" ry="9" fill="#a4703a"/>
    <ellipse cx="162" cy="112" rx="6" ry="9" fill="#a4703a"/>
    <polygon points="140,80 104,96 140,112 176,96" fill="#111111"/>
    <polygon points="140,80 104,96 140,112 176,96" fill="#000000" opacity="0.2"/>
    <rect x="137" y="96" width="6" height="20" fill="#111111"/>
    <circle cx="140" cy="118" r="3" fill="#ffd93b"/>
    <path d="M137 118 L143 118 M140 115 L140 121" stroke="#c9a227" stroke-width="0.8"/>
    <rect x="205" y="120" width="22" height="26" rx="3" fill="#5a3a1a"/>
    <circle cx="211" cy="128" r="4" fill="#a4703a"/>
    <circle cx="221" cy="128" r="4" fill="#a4703a"/>
    <circle cx="216" cy="136" r="4" fill="#a4703a"/>
  </svg>` },
    { caption: `Walked a gold carpet at some big music awards show. Didn't win anything. Still counts.`, svg: `<svg viewBox="0 0 280 160" width="280" height="160">
    <defs>
      <radialGradient id="s2glow" cx="50%" cy="20%" r="60%">
        <stop offset="0%" stop-color="#4a3a1a"/>
        <stop offset="100%" stop-color="#120a1e"/>
      </radialGradient>
      <linearGradient id="s2carpetOuter" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#8a691f"/>
        <stop offset="100%" stop-color="#5c4315"/>
      </linearGradient>
      <linearGradient id="s2carpetInner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e6c34a"/>
        <stop offset="100%" stop-color="#b3922c"/>
      </linearGradient>
      <radialGradient id="s2bear" cx="42%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#c89a5e"/>
        <stop offset="60%" stop-color="#a4703a"/>
        <stop offset="100%" stop-color="#7a4f24"/>
      </radialGradient>
    </defs>
    <rect width="280" height="160" fill="url(#s2glow)"/>
    <polygon points="55,0 225,0 262,160 18,160" fill="url(#s2carpetOuter)"/>
    <polygon points="88,0 192,0 212,160 68,160" fill="url(#s2carpetInner)"/>
    <circle cx="140" cy="38" r="40" fill="#ffe9a8" opacity="0.2"/>
    <path d="M30 60 Q30 30 30 8 L45 8 Q45 40 42 70 Z" fill="#050505" opacity="0.7"/>
    <path d="M250 60 Q250 30 250 8 L235 8 Q235 40 238 70 Z" fill="#050505" opacity="0.7"/>
    <circle cx="20" cy="70" r="10" fill="#050505" opacity="0.6"/>
    <circle cx="260" cy="72" r="9" fill="#050505" opacity="0.6"/>
    <ellipse cx="140" cy="150" rx="34" ry="7" fill="#000000" opacity="0.3"/>
    <path d="M120 148 Q140 154 160 148 L156 108 Q140 116 124 108 Z" fill="#0d0d0d"/>
    <path d="M124 112 Q140 118 156 112" fill="none" stroke="#e6c34a" stroke-width="2"/>
    <circle cx="140" cy="98" r="23" fill="url(#s2bear)"/>
    <circle cx="130" cy="90" r="3.6" fill="#2a1a0e"/>
    <circle cx="150" cy="90" r="3.6" fill="#2a1a0e"/>
    <circle cx="131" cy="88.8" r="1" fill="#ffffff"/>
    <circle cx="151" cy="88.8" r="1" fill="#ffffff"/>
    <ellipse cx="140" cy="106" rx="8.5" ry="5.5" fill="#e0bd8f"/>
    <path d="M133 111 Q140 115 147 111" fill="none" stroke="#3a2515" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="118" y="122" width="44" height="18" rx="4" fill="#111111"/>
    <rect x="126" y="114" width="4" height="12" fill="#111111"/>
    <rect x="150" y="114" width="4" height="12" fill="#111111"/>
    <path d="M120 130 L160 130" stroke="#e6c34a" stroke-width="1.5"/>
    <text x="140" y="18" text-anchor="middle" font-size="12" fill="#ffd93b" font-family="Arial, sans-serif" font-weight="bold" letter-spacing="1">&#9733; AWARDS NIGHT &#9733;</text>
  </svg>` },
    { caption: `Learned the moonwalk from a guy in a sparkly glove. Still can't do it backwards.`, svg: `<svg viewBox="0 0 280 160" width="280" height="160">
    <defs>
      <radialGradient id="s3spot" cx="50%" cy="35%" r="55%">
        <stop offset="0%" stop-color="#3a3a55"/>
        <stop offset="100%" stop-color="#0a0a14"/>
      </radialGradient>
      <linearGradient id="s3floor" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2a2a3c"/>
        <stop offset="100%" stop-color="#141420"/>
      </linearGradient>
      <radialGradient id="s3bear" cx="42%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#c89a5e"/>
        <stop offset="60%" stop-color="#a4703a"/>
        <stop offset="100%" stop-color="#7a4f24"/>
      </radialGradient>
    </defs>
    <rect width="280" height="160" fill="url(#s3spot)"/>
    <polygon points="110,20 170,20 220,128 60,128" fill="#ffffff" opacity="0.05"/>
    <rect x="0" y="128" width="280" height="32" fill="url(#s3floor)"/>
    <ellipse cx="140" cy="130" rx="90" ry="6" fill="#ffffff" opacity="0.06"/>
    <circle cx="70" cy="18" r="1.6" fill="#ffffff" opacity="0.85"/>
    <circle cx="200" cy="26" r="1.4" fill="#ffffff" opacity="0.7"/>
    <circle cx="230" cy="10" r="1.2" fill="#ffffff" opacity="0.6"/>
    <circle cx="40" cy="45" r="1" fill="#ffffff" opacity="0.5"/>
    <circle cx="245" cy="55" r="1.2" fill="#ffffff" opacity="0.55"/>
    <ellipse cx="140" cy="128" rx="30" ry="6" fill="#000000" opacity="0.4"/>
    <path d="M120 126 Q140 132 160 126 L156 96 Q140 102 124 96 Z" fill="#1a1a1a"/>
    <path d="M124 100 Q140 105 156 100" fill="none" stroke="#c9c9c9" stroke-width="1.2"/>
    <circle cx="140" cy="86" r="21" fill="url(#s3bear)"/>
    <circle cx="132" cy="80" r="3.4" fill="#2a1a0e"/>
    <circle cx="148" cy="80" r="3.4" fill="#2a1a0e"/>
    <ellipse cx="140" cy="94" rx="7.5" ry="5" fill="#e0bd8f"/>
    <path d="M134 99 Q140 102 146 99" fill="none" stroke="#3a2515" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="123" y="108" width="34" height="14" rx="3" fill="#1a1a1a"/>
    <path d="M108 92 Q100 100 98 112" fill="none" stroke="#a4703a" stroke-width="7" stroke-linecap="round"/>
    <circle cx="96" cy="114" r="8" fill="#ffffff"/>
    <path d="M89 107 L103 121 M103 107 L89 121" stroke="#dddddd" stroke-width="1.2"/>
    <circle cx="92" cy="110" r="1.4" fill="#a8d4ff"/>
    <circle cx="99" cy="117" r="1.2" fill="#a8d4ff"/>
    <path d="M108 145 Q140 133 172 145" fill="none" stroke="#a4703a" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="108" cy="147" rx="9" ry="4" fill="#111111"/>
    <ellipse cx="172" cy="147" rx="9" ry="4" fill="#111111"/>
  </svg>` },
    { caption: `Visited a pineapple under the sea. The guy who lives there wasn't home, but the snail said hi.`, svg: `<svg viewBox="0 0 280 160" width="280" height="160">
    <defs>
      <linearGradient id="s4water" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1e7fae"/>
        <stop offset="100%" stop-color="#0a4a70"/>
      </linearGradient>
      <linearGradient id="s4sand" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e8d38f"/>
        <stop offset="100%" stop-color="#c9ab5f"/>
      </linearGradient>
      <linearGradient id="s4pineapple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f0d060"/>
        <stop offset="100%" stop-color="#c9982a"/>
      </linearGradient>
      <radialGradient id="s4bear" cx="42%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#c89a5e"/>
        <stop offset="60%" stop-color="#a4703a"/>
        <stop offset="100%" stop-color="#7a4f24"/>
      </radialGradient>
    </defs>
    <rect width="280" height="160" fill="url(#s4water)"/>
    <rect y="122" width="280" height="38" fill="url(#s4sand)"/>
    <circle cx="35" cy="28" r="4" fill="#bfe6ff" opacity="0.55"/>
    <circle cx="55" cy="48" r="2.6" fill="#bfe6ff" opacity="0.45"/>
    <circle cx="225" cy="22" r="5" fill="#bfe6ff" opacity="0.55"/>
    <circle cx="245" cy="58" r="3" fill="#bfe6ff" opacity="0.45"/>
    <circle cx="20" cy="80" r="2" fill="#bfe6ff" opacity="0.4"/>
    <ellipse cx="55" cy="45" rx="13" ry="6" fill="#e8834f"/>
    <path d="M42 45 L28 40 M42 45 L28 50" stroke="#e8834f" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="60" cy="43" r="1.4" fill="#111111"/>
    <path d="M38 118 Q42 92 55 118 Z" fill="#c9503a"/>
    <path d="M225 118 Q233 86 244 118 Z" fill="#c9503a"/>
    <path d="M60 120 Q68 100 78 120 Z" fill="#3f8f3f" opacity="0.8"/>
    <ellipse cx="152" cy="103" rx="28" ry="32" fill="url(#s4pineapple)"/>
    <path d="M152 71 Q140 55 152 43 Q164 55 152 71" fill="#3f8f3f"/>
    <path d="M140 60 Q152 50 164 60" fill="none" stroke="#2f6f2f" stroke-width="2"/>
    <path d="M128 88 L176 88 M128 98 L176 98 M128 108 L176 108 M128 118 L176 118" stroke="#a97d1f" stroke-width="2.2"/>
    <path d="M132 82 L172 94 M132 94 L172 82" stroke="#a97d1f" stroke-width="1" opacity="0.6"/>
    <rect x="140" y="112" width="24" height="20" fill="#8a5a2b"/>
    <rect x="146" y="118" width="6" height="8" fill="#3a2515"/>
    <circle cx="96" cy="132" r="13" fill="url(#s4bear)"/>
    <circle cx="91" cy="127" r="2.3" fill="#2a1a0e"/>
    <circle cx="101" cy="127" r="2.3" fill="#2a1a0e"/>
    <ellipse cx="96" cy="136" rx="5.5" ry="4" fill="#e0bd8f"/>
    <ellipse cx="70" cy="115" rx="9" ry="6" fill="#d9b183" opacity="0.9"/>
    <path d="M63 113 Q70 108 77 113" fill="none" stroke="#8a5a2b" stroke-width="1.5"/>
    <circle cx="63" cy="118" r="2" fill="#111111"/>
    <path d="M50 148 Q60 138 68 148" fill="none" stroke="#9c6b3a" stroke-width="3" stroke-linecap="round"/>
  </svg>` },
    { caption: `Took a selfie with an extremely muscular, eyebrow-raising gentleman in a wrestling ring. He could not smell what Markus was cooking.`, svg: `<svg viewBox="0 0 280 160" width="280" height="160">
    <defs>
      <radialGradient id="s5arena" cx="50%" cy="20%" r="70%">
        <stop offset="0%" stop-color="#332020"/>
        <stop offset="100%" stop-color="#0d0d0d"/>
      </radialGradient>
      <linearGradient id="s5mat" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4a2020"/>
        <stop offset="100%" stop-color="#2a1010"/>
      </linearGradient>
      <radialGradient id="s5bear" cx="42%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#c89a5e"/>
        <stop offset="60%" stop-color="#a4703a"/>
        <stop offset="100%" stop-color="#7a4f24"/>
      </radialGradient>
    </defs>
    <rect width="280" height="160" fill="url(#s5arena)"/>
    <circle cx="40" cy="30" r="6" fill="#050505" opacity="0.6"/>
    <circle cx="60" cy="20" r="5" fill="#050505" opacity="0.6"/>
    <circle cx="230" cy="24" r="6" fill="#050505" opacity="0.6"/>
    <circle cx="255" cy="34" r="5" fill="#050505" opacity="0.6"/>
    <rect x="8" y="18" width="264" height="6" fill="#e6e6e6"/>
    <rect x="8" y="48" width="264" height="6" fill="#e6e6e6"/>
    <rect x="8" y="78" width="264" height="6" fill="#e6e6e6"/>
    <rect x="4" y="15" width="10" height="75" fill="#888888"/>
    <rect x="266" y="15" width="10" height="75" fill="#888888"/>
    <rect y="105" width="280" height="55" fill="url(#s5mat)"/>
    <ellipse cx="140" cy="155" rx="120" ry="10" fill="#000000" opacity="0.25"/>
    <path d="M185 158 L207 92 Q212 76 200 64 L188 52 Q176 48 164 56 L157 92 L148 158 Z" fill="#050505" opacity="0.9"/>
    <path d="M164 56 Q176 50 188 52" fill="none" stroke="#222222" stroke-width="1.5"/>
    <circle cx="184" cy="46" r="17" fill="#050505" opacity="0.9"/>
    <path d="M170 42 Q184 34 198 42" fill="none" stroke="#333333" stroke-width="2"/>
    <ellipse cx="88" cy="128" rx="12" ry="6" fill="#000000" opacity="0.3"/>
    <path d="M70 126 Q88 132 106 126 L102 98 Q88 104 74 98 Z" fill="#111111"/>
    <circle cx="88" cy="88" r="19" fill="url(#s5bear)"/>
    <circle cx="80" cy="81" r="3.2" fill="#2a1a0e"/>
    <circle cx="96" cy="81" r="3.2" fill="#2a1a0e"/>
    <ellipse cx="88" cy="95" rx="7" ry="4.6" fill="#e0bd8f"/>
    <path d="M82 100 Q88 103 94 100" fill="none" stroke="#3a2515" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="62" y="60" width="13" height="52" rx="6" fill="#a4703a" transform="rotate(-20 68 86)"/>
    <circle cx="52" cy="52" r="10" fill="#d4d4d4"/>
    <rect x="46" y="45" width="12" height="7" fill="#999999"/>
    <path d="M42 48 L38 40 M62 48 L66 40" stroke="#ffffff" stroke-width="2"/>
    <circle cx="52" cy="52" r="3" fill="#eeeeee" opacity="0.8"/>
  </svg>` },
    { caption: `Eventually settled down in Buffalo, New York. Great wings. Rough winters. Good place to write music.`, svg: `<svg viewBox="0 0 280 160" width="280" height="160">
    <defs>
      <linearGradient id="s6sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#c9e2f2"/>
        <stop offset="100%" stop-color="#eef6fb"/>
      </linearGradient>
      <linearGradient id="s6roof" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#6a3418"/>
        <stop offset="100%" stop-color="#4a2410"/>
      </linearGradient>
      <linearGradient id="s6house" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#c8542a"/>
        <stop offset="100%" stop-color="#9c3d1a"/>
      </linearGradient>
      <radialGradient id="s6bear" cx="42%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#c89a5e"/>
        <stop offset="60%" stop-color="#a4703a"/>
        <stop offset="100%" stop-color="#7a4f24"/>
      </radialGradient>
    </defs>
    <rect width="280" height="160" fill="url(#s6sky)"/>
    <rect y="128" width="280" height="32" fill="#f5fafd"/>
    <circle cx="35" cy="28" r="4" fill="#ffffff"/>
    <circle cx="85" cy="16" r="3" fill="#ffffff"/>
    <circle cx="215" cy="24" r="4" fill="#ffffff"/>
    <circle cx="55" cy="55" r="2" fill="#ffffff"/>
    <circle cx="195" cy="50" r="2.4" fill="#ffffff"/>
    <circle cx="245" cy="35" r="2.2" fill="#ffffff"/>
    <path d="M20 130 Q35 118 50 130" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    <path d="M200 132 Q215 120 230 132" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    <rect x="88" y="88" width="104" height="52" fill="url(#s6house)"/>
    <rect x="88" y="88" width="104" height="6" fill="#000000" opacity="0.15"/>
    <polygon points="78,88 202,88 140,50" fill="url(#s6roof)"/>
    <polygon points="78,88 202,88 140,50" fill="#ffffff" opacity="0.12"/>
    <rect x="118" y="105" width="20" height="35" fill="#5a3418"/>
    <rect x="122" y="109" width="12" height="12" fill="#dceaf5" stroke="#5a3418" stroke-width="1.5"/>
    <rect x="146" y="98" width="18" height="18" fill="#ffd98a" stroke="#5a3418" stroke-width="2"/>
    <path d="M146 98 L155 107 L164 98 M146 116 L155 107 L164 116" stroke="#5a3418" stroke-width="1.2"/>
    <rect x="90" y="98" width="16" height="16" fill="#ffd98a" stroke="#5a3418" stroke-width="2"/>
    <rect x="130" y="60" width="8" height="18" fill="#5a3418"/>
    <ellipse cx="134" cy="58" rx="6" ry="4" fill="#cccccc" opacity="0.6"/>
    <circle cx="72" cy="130" r="15" fill="url(#s6bear)"/>
    <circle cx="66" cy="124" r="2.6" fill="#2a1a0e"/>
    <circle cx="78" cy="124" r="2.6" fill="#2a1a0e"/>
    <ellipse cx="72" cy="136" rx="5.5" ry="4" fill="#e0bd8f"/>
    <path d="M66 141 Q72 144 78 141" fill="none" stroke="#3a2515" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="60" y="146" width="24" height="10" rx="2" fill="#c9503a"/>
    <rect x="30" y="140" width="66" height="15" rx="2" fill="#ffffff" stroke="#999999" stroke-width="1"/>
    <text x="63" y="151" text-anchor="middle" font-size="8.5" fill="#333333" font-family="Arial, sans-serif" font-weight="bold">BUFFALO, NY</text>
  </svg>` }
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
      dirtSpots: [], // [{id, x, y}] scrubbable dirt marks, in percent relative to the creature sprite
      graduated: false // true once he's reached tween and walked off to college
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

    var collegeCard = document.getElementById('bm-college-card');
    var collegeIntro = document.getElementById('bm-college-intro');
    var collegeSub = document.getElementById('bm-college-sub');
    var collegeContinueBtn = document.getElementById('bm-college-continue');
    var montageEl = document.getElementById('bm-montage');
    var montageFrame = document.getElementById('bm-montage-frame');
    var montageCaption = document.getElementById('bm-montage-caption');
    var montageDots = document.getElementById('bm-montage-dots');
    var montageSkipBtn = document.getElementById('bm-montage-skip');

    // ---- Where-are-they-now montage ----
    // A short slideshow of stylized, original-art scenes (no real likenesses
    // or copyrighted characters -- just silhouettes/generic stand-ins with
    // the jokes carried entirely by the captions) that plays after the
    // college send-off, then lands on the same "To be continued..." beat.
    var montageIndex = 0;
    var montageTimer = null;

    function renderMontageDots() {
      montageDots.innerHTML = '';
      COLLEGE_MONTAGE.forEach(function (_, i) {
        var dot = document.createElement('span');
        if (i === montageIndex) dot.className = 'active';
        montageDots.appendChild(dot);
      });
    }

    function showMontageSlide(i) {
      montageIndex = i;
      var scene = COLLEGE_MONTAGE[montageIndex];
      montageFrame.innerHTML = scene.svg;
      montageCaption.textContent = scene.caption;
      renderMontageDots();
    }

    function finishMontage() {
      clearTimeout(montageTimer);
      montageEl.classList.remove('show');
      collegeIntro.classList.remove('hide');
      collegeSub.textContent = pet.name + ' settled down, and this is where his story catches up to the Markus you know from MusicToDiscord.';
      var continued = document.createElement('div');
      continued.className = 'bmcContinued';
      continued.textContent = 'To be continued\u2026';
      collegeIntro.appendChild(continued);
      collegeContinueBtn.style.display = 'none';
    }

    function advanceMontage() {
      if (montageIndex >= COLLEGE_MONTAGE.length - 1) {
        finishMontage();
        return;
      }
      showMontageSlide(montageIndex + 1);
      montageTimer = setTimeout(advanceMontage, 2600);
    }

    function startMontage() {
      collegeIntro.classList.add('hide');
      montageEl.classList.add('show');
      showMontageSlide(0);
      montageTimer = setTimeout(advanceMontage, 2600);
    }

    collegeContinueBtn.addEventListener('click', startMontage);
    montageSkipBtn.addEventListener('click', finishMontage);

    // ---- Off to college: the final "growth" moment ----
    // Reaching tween is the last stage the normal growth system supports, so
    // instead of just another "grew up!" toast, treat it as the character's
    // send-off: he walks toward the field edge, fades out, and a title-card
    // takes over -- a soft narrative stop rather than an ordinary level-up,
    // since after this he's "the Markus from MusicToDiscord" and this
    // younger side-story is done.
    function sendToCollege() {
      pet.graduated = true;
      savePet();
      if (wanderTimer) clearInterval(wanderTimer);
      isDragging = false;

      var edgeX = pet.x < 50 ? 6 : 94;
      creature.classList.add('bm-leaving');
      moveTo(field, creature, edgeX, 30);

      collegeSub.textContent = pet.name + ' is all grown up and just left for college. This is where his story catches up to the Markus you know from MusicToDiscord.';

      setTimeout(function () {
        collegeCard.classList.add('show');
      }, 3200);
    }

    if (pet.graduated) {
      // Returning after he already graduated in a past visit -- skip the
      // walk-off animation and just show the card immediately.
      creature.classList.add('bm-leaving');
      collegeSub.textContent = pet.name + ' graduated and headed off to college. This is where his story catches up to the Markus you know from MusicToDiscord.';
      collegeCard.classList.add('show');
    } else if (grown === 'tween') {
      notify(pet.name + ' is all grown up!');
      setTimeout(sendToCollege, 900);
    } else if (grown) {
      notify(pet.name + ' grew into a ' + STAGE_LABELS[grown] + '!');
    }

    if (!pet.graduated) startWander(field, creature);

    // ---- Drag baby Markus around ----
    var dragOffset = null;
    function startDrag(clientX, clientY) {
      if (pet.graduated) return;
      isDragging = true;
      if (wanderTimer) clearInterval(wanderTimer);
      creature.classList.add('bm-dragging');
    }
    function duringDrag(clientX, clientY) {
      if (pet.graduated) return;
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
      if (!pet.graduated) startWander(field, creature);
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
        },
        getCoins: function () {
          return pet.coins;
        },
        onSpend: function (coinAmount) {
          addCoins(-coinAmount);
          coinsEl.textContent = pet.coins;
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
      if (pet.graduated) return;
      updatePet();
      var grown2 = maybeGrow();
      if (grown2 === 'tween') {
        notify(pet.name + ' is all grown up!');
        setTimeout(sendToCollege, 900);
      } else if (grown2) {
        notify(pet.name + ' grew into a ' + STAGE_LABELS[grown2] + '!');
      }
      render();
    }, 20000);

    setInterval(function () {
      if (pet.graduated) return;
      var evt = rollFieldEvent();
      if (evt) applyFieldEvent(evt, notify);
      render();
    }, 25000);
  }

  document.addEventListener('DOMContentLoaded', initBabyMarkus);
})();
