/* =============================================================
   AURELIS - ART
   Procedural SVG product renderings + icon set.
   Everything is drawn in-browser so the boutique is fully
   self-contained (no external imagery, no broken links).
   ============================================================= */

  var seq = 0;
  function uid(p) { seq += 1; return p + seq; }

  /* ---------- palettes ---------- */
  var PALETTES = {
    /* monochrome — the black-and-white product register, high contrast */
    violet:   { a: '#d6d6d6', b: '#7a7a7a', c: '#1c1717', bg: '#f0f0f0', accent: '#f6f6f6' },
    platinum: { a: '#ededed', b: '#9a9a9a', c: '#2a2a2a', bg: '#f0f0f0', accent: '#fafafa' },
    obsidian: { a: '#c8c8c8', b: '#5e5e5e', c: '#1c1717', bg: '#efefef', accent: '#e8e8e8' },
    noir:     { a: '#c2c2c2', b: '#565656', c: '#1c1717', bg: '#ededed', accent: '#e2e2e2' },
    sapphire: { a: '#dfe2e5', b: '#828a91', c: '#242a30', bg: '#eff1f2', accent: '#f4f6f7' },

    /* warm earth — the full-colour lifestyle register */
    gold:     { a: '#e6cfab', b: '#a67f42', c: '#4a3216', bg: '#f2ece3', accent: '#f6ead4' },
    amber:    { a: '#dfbb8e', b: '#96602c', c: '#42260f', bg: '#f1eae1', accent: '#f0d8ba' },
    rose:     { a: '#ded9d3', b: '#968f86', c: '#3d3830', bg: '#f1efec', accent: '#f4f1ed' },
    jade:     { a: '#cdd2cc', b: '#7c847b', c: '#2c322b', bg: '#eef0ed', accent: '#e6eae4' }
  };

  function pal(name) { return PALETTES[name] || PALETTES.gold; }

  /* ---------- shared scaffolding ---------- */
  function backdrop(p, ids) {
    return (
      '<rect width="400" height="400" fill="url(#' + ids.bg + ')"/>' +
      '<ellipse cx="200" cy="196" rx="132" ry="132" fill="url(#' + ids.halo + ')" opacity=".55"/>' +
      '<ellipse class="art-atelier__shadow" cx="200" cy="342" rx="126" ry="12" fill="#1c1717" opacity=".13"/>' +
      '<ellipse class="art-atelier__shadow-core" cx="200" cy="340" rx="64" ry="6" fill="' + p.c + '" opacity=".10"/>'
    );
  }

  function baseDefs(p, ids) {
    return (
      '<radialGradient id="' + ids.bg + '" cx="50%" cy="28%" r="86%">' +
        '<stop offset="0%" stop-color="#ffffff"/>' +
        '<stop offset="58%" stop-color="' + p.bg + '"/>' +
        '<stop offset="100%" stop-color="' + p.bg + '"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + ids.halo + '" cx="50%" cy="42%" r="52%">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>' +
        '<stop offset="70%" stop-color="#ffffff" stop-opacity=".18"/>' +
        '<stop offset="100%" stop-color="' + p.b + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + ids.metal + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="' + p.a + '"/>' +
        '<stop offset="26%" stop-color="' + p.b + '"/>' +
        '<stop offset="48%" stop-color="' + p.a + '"/>' +
        '<stop offset="72%" stop-color="' + p.c + '"/>' +
        '<stop offset="100%" stop-color="' + p.b + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + ids.glass + '" x1="0" y1="0" x2="0.7" y2="1">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>' +
        '<stop offset="38%" stop-color="' + p.a + '" stop-opacity=".60"/>' +
        '<stop offset="100%" stop-color="' + p.c + '" stop-opacity=".42"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + ids.liquid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + p.a + '" stop-opacity=".60"/>' +
        '<stop offset="100%" stop-color="' + p.c + '" stop-opacity=".92"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + ids.sheen + '" x1="0" y1="0" x2="1" y2="0.6">' +
        '<stop offset="0%" stop-color="#fff" stop-opacity=".55"/>' +
        '<stop offset="45%" stop-color="#fff" stop-opacity=".06"/>' +
        '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<filter id="' + ids.soft + '" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feGaussianBlur stdDeviation="7"/>' +
      '</filter>'
    );
  }

  function lighten(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, (n >> 16) + amt);
    var g = Math.min(255, ((n >> 8) & 255) + amt);
    var b = Math.min(255, (n & 255) + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function ids() {
    return {
      bg: uid('bg'), halo: uid('halo'), metal: uid('mt'), glass: uid('gl'),
      liquid: uid('lq'), sheen: uid('sh'), soft: uid('sf'), extra: uid('ex')
    };
  }

  /* =========================================================
     SHAPE LIBRARY
     ========================================================= */
  var SHAPES = {};

  /* -- perfume flacon -- */
  SHAPES.flacon = function (p, d) {
    return (
      '<g>' +
      '<path d="M148 344 L148 176 Q148 156 162 146 L172 138 L172 108 L228 108 L228 138 L238 146 Q252 156 252 176 L252 344 Z"' +
        ' fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".38" stroke-width="1.1"/>' +
      '<path d="M156 336 L156 196 Q156 186 164 182 L236 182 Q244 186 244 196 L244 336 Z"' +
        ' fill="url(#' + d.liquid + ')" opacity=".76"/>' +
      '<rect x="166" y="66" width="68" height="46" rx="9" fill="url(#' + d.metal + ')"/>' +
      '<rect x="172" y="72" width="56" height="10" rx="5" fill="#fff" opacity=".26"/>' +
      '<rect x="176" y="108" width="48" height="10" rx="4" fill="url(#' + d.metal + ')" opacity=".9"/>' +
      '<path d="M164 168 Q158 240 164 320" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M232 190 Q238 250 232 312" stroke="' + p.a + '" stroke-opacity=".3" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<rect x="176" y="238" width="48" height="34" rx="3" fill="#0a0c14" opacity=".34"/>' +
      '<text x="200" y="255" text-anchor="middle" font-family="Georgia,serif" font-size="11" letter-spacing="3" fill="' + p.a + '" opacity=".85">AURELIS</text>' +
      '<text x="200" y="267" text-anchor="middle" font-family="Georgia,serif" font-size="7" letter-spacing="2.4" fill="' + p.a + '" opacity=".5">EXTRAIT</text>' +
      '</g>'
    );
  };

  /* -- wristwatch -- */
  SHAPES.watch = function (p, d) {
    var i, out = '';
    for (i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      var x1 = 200 + Math.cos(a) * 62, y1 = 196 + Math.sin(a) * 62;
      var x2 = 200 + Math.cos(a) * 70, y2 = 196 + Math.sin(a) * 70;
      out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + p.a + '" stroke-opacity="' + (i % 3 === 0 ? '.95' : '.45') + '" stroke-width="' + (i % 3 === 0 ? 2.6 : 1.2) + '" stroke-linecap="round"/>';
    }
    return (
      '<g>' +
      '<path d="M168 128 L164 44 Q164 32 176 32 L224 32 Q236 32 236 44 L232 128 Z" fill="url(#' + d.metal + ')" opacity=".92"/>' +
      '<path d="M168 264 L164 348 Q164 360 176 360 L224 360 Q236 360 236 348 L232 264 Z" fill="url(#' + d.metal + ')" opacity=".92"/>' +
      '<g opacity=".5">' +
        '<line x1="168" y1="60" x2="232" y2="60" stroke="#000" stroke-opacity=".4"/>' +
        '<line x1="168" y1="88" x2="232" y2="88" stroke="#000" stroke-opacity=".4"/>' +
        '<line x1="168" y1="308" x2="232" y2="308" stroke="#000" stroke-opacity=".4"/>' +
        '<line x1="168" y1="336" x2="232" y2="336" stroke="#000" stroke-opacity=".4"/>' +
      '</g>' +
      '<circle cx="200" cy="196" r="92" fill="url(#' + d.metal + ')"/>' +
      '<circle cx="200" cy="196" r="80" fill="#0b0e16"/>' +
      '<circle cx="200" cy="196" r="80" fill="url(#' + d.glass + ')" opacity=".5"/>' +
      '<rect x="288" y="184" width="16" height="24" rx="5" fill="url(#' + d.metal + ')"/>' +
      out +
      '<circle cx="200" cy="240" r="19" fill="none" stroke="' + p.a + '" stroke-opacity=".3" stroke-width="1"/>' +
      '<line x1="200" y1="196" x2="200" y2="146" stroke="' + p.a + '" stroke-width="3.4" stroke-linecap="round"/>' +
      '<line x1="200" y1="196" x2="238" y2="216" stroke="' + p.a + '" stroke-width="3.4" stroke-linecap="round"/>' +
      '<line x1="200" y1="204" x2="176" y2="164" stroke="' + p.accent + '" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>' +
      '<circle cx="200" cy="196" r="4" fill="' + p.a + '"/>' +
      '<path d="M132 150 A80 80 0 0 1 236 122" stroke="#fff" stroke-opacity=".34" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<text x="200" y="176" text-anchor="middle" font-family="Georgia,serif" font-size="9" letter-spacing="3" fill="' + p.a + '" opacity=".8">AURELIS</text>' +
      '</g>'
    );
  };

  /* -- ring -- */
  SHAPES.ring = function (p, d) {
    return (
      '<g>' +
      '<ellipse cx="200" cy="240" rx="86" ry="88" fill="none" stroke="url(#' + d.metal + ')" stroke-width="17"/>' +
      '<ellipse cx="200" cy="240" rx="86" ry="88" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3.4"/>' +
      '<g transform="translate(200,124)">' +
        '<path d="M0 -54 L36 -14 L0 54 L-36 -14 Z" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".8" stroke-width="1.3"/>' +
        '<path d="M0 -54 L0 54" stroke="#fff" stroke-opacity=".38" stroke-width="1"/>' +
        '<path d="M-36 -14 L36 -14" stroke="#fff" stroke-opacity=".38" stroke-width="1"/>' +
        '<path d="M0 -54 L-36 -14 L0 -2 Z" fill="#fff" opacity=".26"/>' +
        '<path d="M0 -54 L36 -14 L0 -2 Z" fill="' + p.a + '" opacity=".34"/>' +
        '<path d="M0 -2 L36 -14 L0 54 Z" fill="' + p.c + '" opacity=".3"/>' +
      '</g>' +
      '<g fill="#fff" opacity=".9">' +
        '<path d="M258 96 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z"/>' +
        '<path d="M132 150 l2.2 6.6 6.6 2.2 -6.6 2.2 -2.2 6.6 -2.2 -6.6 -6.6 -2.2 6.6 -2.2z"/>' +
        '<path d="M286 214 l1.8 5.4 5.4 1.8 -5.4 1.8 -1.8 5.4 -1.8 -5.4 -5.4 -1.8 5.4 -1.8z"/>' +
      '</g>' +
      '<ellipse cx="168" cy="212" rx="12" ry="28" fill="#fff" opacity=".2" transform="rotate(-24 168 212)"/>' +
      '</g>'
    );
  };

  /* -- necklace / pendant -- */
  SHAPES.necklace = function (p, d) {
    var i, beads = '';
    for (i = 0; i <= 42; i++) {
      var t = i / 42;
      var x = 92 + t * 216;
      var y = 106 + Math.sin(t * Math.PI) * 122;
      var r = 3.2 + Math.sin(t * Math.PI) * 1.6;
      beads += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="url(#' + d.metal + ')"/>';
    }
    return (
      '<g>' +
      '<path d="M92 106 Q200 268 308 106" fill="none" stroke="' + p.c + '" stroke-opacity=".5" stroke-width="2"/>' +
      beads +
      '<g transform="translate(200,232)">' +
        '<path d="M0 -16 L18 6 L0 46 L-18 6 Z" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".8" stroke-width="1.2"/>' +
        '<circle cx="0" cy="-24" r="7" fill="none" stroke="url(#' + d.metal + ')" stroke-width="3"/>' +
        '<path d="M0 -16 L0 46" stroke="#fff" stroke-opacity=".34" stroke-width=".9"/>' +
        '<path d="M-18 6 L18 6" stroke="#fff" stroke-opacity=".34" stroke-width=".9"/>' +
      '</g>' +
      '<circle cx="92" cy="106" r="6" fill="url(#' + d.metal + ')"/>' +
      '<circle cx="308" cy="106" r="6" fill="url(#' + d.metal + ')"/>' +
      '</g>'
    );
  };

  /* -- cuff / bangle -- */
  SHAPES.cuff = function (p, d) {
    return (
      '<g>' +
      '<path d="M118 200 A82 82 0 1 1 282 200" fill="none" stroke="url(#' + d.metal + ')" stroke-width="30" stroke-linecap="round"/>' +
      '<path d="M118 200 A82 82 0 1 1 282 200" fill="none" stroke="#fff" stroke-opacity=".26" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M118 200 L118 258 Q118 272 132 272" fill="none" stroke="url(#' + d.metal + ')" stroke-width="30" stroke-linecap="round"/>' +
      '<path d="M282 200 L282 258 Q282 272 268 272" fill="none" stroke="url(#' + d.metal + ')" stroke-width="30" stroke-linecap="round"/>' +
      '<circle cx="132" cy="272" r="13" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".7"/>' +
      '<circle cx="268" cy="272" r="13" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".7"/>' +
      '<ellipse cx="200" cy="122" rx="46" ry="9" fill="#fff" opacity=".22"/>' +
      '</g>'
    );
  };

  /* -- handbag -- */
  SHAPES.bag = function (p, d) {
    return (
      '<g>' +
      '<path d="M158 148 Q158 88 200 88 Q242 88 242 148" fill="none" stroke="url(#' + d.metal + ')" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M112 146 L288 146 Q300 146 298 158 L282 316 Q280 330 266 330 L134 330 Q120 330 118 316 L102 158 Q100 146 112 146 Z"' +
        ' fill="url(#' + d.metal + ')" opacity=".95"/>' +
      '<path d="M112 146 L288 146 Q300 146 298 158 L292 214 L108 214 L102 158 Q100 146 112 146 Z" fill="#fff" opacity=".10"/>' +
      '<path d="M108 214 L292 214" stroke="' + p.c + '" stroke-opacity=".55" stroke-width="1.4"/>' +
      '<rect x="176" y="196" width="48" height="36" rx="8" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".8" stroke-width="1.3"/>' +
      '<circle cx="200" cy="214" r="8" fill="none" stroke="' + p.a + '" stroke-width="2.4" stroke-opacity=".95"/>' +
      '<path d="M124 158 Q128 250 138 320" stroke="#fff" stroke-opacity=".2" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<g stroke="' + p.c + '" stroke-opacity=".4" stroke-width="1" stroke-dasharray="4 5">' +
        '<path d="M118 240 L282 240" fill="none"/>' +
        '<path d="M124 300 L276 300" fill="none"/>' +
      '</g>' +
      '</g>'
    );
  };

  /* -- decanter -- */
  SHAPES.decanter = function (p, d) {
    return (
      '<g>' +
      '<path d="M186 132 L186 96 L214 96 L214 132 Q214 142 224 150 Q272 182 272 250 Q272 330 200 330 Q128 330 128 250 Q128 182 176 150 Q186 142 186 132 Z"' +
        ' fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".4" stroke-width="1.2"/>' +
      '<path d="M142 246 Q142 320 200 320 Q258 320 258 246 Q230 232 200 232 Q170 232 142 246 Z" fill="url(#' + d.liquid + ')" opacity=".8"/>' +
      '<path d="M180 62 Q200 40 220 62 Q228 74 214 82 L186 82 Q172 74 180 62 Z" fill="url(#' + d.metal + ')"/>' +
      '<rect x="182" y="82" width="36" height="16" rx="4" fill="url(#' + d.metal + ')" opacity=".9"/>' +
      '<path d="M162 176 Q146 226 152 292" stroke="#fff" stroke-opacity=".46" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M246 210 Q254 254 246 296" stroke="' + p.a + '" stroke-opacity=".24" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="200" cy="232" rx="58" ry="8" fill="' + p.a + '" opacity=".22"/>' +
      '</g>'
    );
  };

  /* -- candle vessel -- */
  SHAPES.candle = function (p, d) {
    return (
      '<g>' +
      '<g opacity=".85">' +
        '<ellipse cx="200" cy="120" rx="30" ry="46" fill="' + p.a + '" opacity=".22" filter="url(#' + d.soft + ')"/>' +
        '<path d="M200 96 Q214 122 206 142 Q200 152 194 142 Q186 122 200 96 Z" fill="' + p.a + '" opacity=".95"/>' +
        '<path d="M200 116 Q206 130 202 140 Q200 145 198 140 Q194 130 200 116 Z" fill="#fff" opacity=".85"/>' +
      '</g>' +
      '<line x1="200" y1="142" x2="200" y2="168" stroke="#2a2118" stroke-width="2.6"/>' +
      '<path d="M136 168 L264 168 Q272 168 271 178 L262 318 Q261 330 249 330 L151 330 Q139 330 138 318 L129 178 Q128 168 136 168 Z"' +
        ' fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".38" stroke-width="1.1"/>' +
      '<path d="M134 178 L266 178 L262 198 Q200 210 138 198 Z" fill="' + p.a + '" opacity=".2"/>' +
      '<ellipse cx="200" cy="176" rx="65" ry="9" fill="' + p.a + '" opacity=".3"/>' +
      '<path d="M150 196 Q146 260 152 312" stroke="#fff" stroke-opacity=".4" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<rect x="162" y="248" width="76" height="42" rx="3" fill="#0a0c14" opacity=".26"/>' +
      '<text x="200" y="268" text-anchor="middle" font-family="Georgia,serif" font-size="10" letter-spacing="3" fill="' + p.a + '" opacity=".85">AURELIS</text>' +
      '<text x="200" y="281" text-anchor="middle" font-family="Georgia,serif" font-size="6.6" letter-spacing="2.2" fill="' + p.a + '" opacity=".5">CIRE PARFUMEE</text>' +
      '</g>'
    );
  };

  /* -- silk scarf -- */
  SHAPES.scarf = function (p, d) {
    return (
      '<g>' +
      '<path d="M96 118 Q200 76 304 118 Q288 214 304 312 Q200 352 96 312 Q112 214 96 118 Z"' +
        ' fill="url(#' + d.metal + ')" opacity=".72"/>' +
      '<path d="M96 118 Q200 76 304 118 Q288 214 304 312 Q200 352 96 312 Q112 214 96 118 Z"' +
        ' fill="url(#' + d.sheen + ')"/>' +
      '<path d="M124 148 Q200 116 276 148 Q266 214 276 282 Q200 314 124 282 Q134 214 124 148 Z"' +
        ' fill="none" stroke="' + p.c + '" stroke-opacity=".5" stroke-width="1.4"/>' +
      '<g fill="none" stroke="' + p.a + '" stroke-opacity=".55" stroke-width="1.2">' +
        '<circle cx="200" cy="215" r="34"/><circle cx="200" cy="215" r="21"/>' +
        '<path d="M200 168 L200 262 M153 215 L247 215"/>' +
        '<path d="M166 181 L234 249 M234 181 L166 249"/>' +
      '</g>' +
      '<circle cx="200" cy="215" r="7" fill="' + p.a + '" opacity=".9"/>' +
      '<path d="M96 118 Q120 210 96 312" stroke="#fff" stroke-opacity=".28" stroke-width="5" fill="none"/>' +
      '</g>'
    );
  };

  /* -- eyewear -- */
  SHAPES.glasses = function (p, d) {
    return (
      '<g>' +
      '<path d="M40 178 L104 168" stroke="url(#' + d.metal + ')" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M360 178 L296 168" stroke="url(#' + d.metal + ')" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M104 166 Q104 152 122 150 L172 150 Q186 150 186 166 L184 210 Q182 240 148 242 Q112 244 106 210 Z"' +
        ' fill="url(#' + d.glass + ')" stroke="url(#' + d.metal + ')" stroke-width="6"/>' +
      '<path d="M296 166 Q296 152 278 150 L228 150 Q214 150 214 166 L216 210 Q218 240 252 242 Q288 244 294 210 Z"' +
        ' fill="url(#' + d.glass + ')" stroke="url(#' + d.metal + ')" stroke-width="6"/>' +
      '<path d="M186 166 Q200 158 214 166" fill="none" stroke="url(#' + d.metal + ')" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M118 168 Q124 196 140 214" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M228 168 Q234 196 250 214" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="200" cy="300" rx="120" ry="10" fill="#000" opacity=".26"/>' +
      '</g>'
    );
  };

  /* -- atelier / editorial abstract -- */
  SHAPES.atelier = function (p, d) {
    var i, rays = '';
    for (i = 0; i < 26; i++) {
      var a = (i / 26) * Math.PI * 2;
      rays += '<line class="art-atelier__ray" x1="' + (200 + Math.cos(a) * 78).toFixed(1) + '" y1="' + (200 + Math.sin(a) * 78).toFixed(1) +
        '" x2="' + (200 + Math.cos(a) * 158).toFixed(1) + '" y2="' + (200 + Math.sin(a) * 158).toFixed(1) +
        '" stroke="' + p.a + '" stroke-opacity="' + (0.07 + (i % 4) * 0.06).toFixed(2) + '" stroke-width="1.2"/>';
    }
    return (
      '<g class="art-atelier">' +
      '<g class="art-atelier__rays">' + rays + '</g>' +
      '<circle class="art-atelier__ring-outer" cx="200" cy="200" r="112" fill="none" stroke="' + p.a + '" stroke-opacity=".2" stroke-width="1" stroke-dasharray="3 6"/>' +
      '<circle class="art-atelier__ring-inner" cx="200" cy="200" r="82" fill="none" stroke="' + p.a + '" stroke-opacity=".28" stroke-width="1.2"/>' +
      '<g class="art-atelier__orb-group">' +
      '<circle class="art-atelier__orb" cx="200" cy="200" r="52" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".55"/>' +
      '<circle class="art-atelier__sheen" cx="200" cy="200" r="52" fill="url(#' + d.sheen + ')"/>' +
      '<path class="art-atelier__highlight" d="M200 148 A52 52 0 0 1 252 200" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>' +
      '<circle class="art-atelier__core" cx="200" cy="200" r="9" fill="' + p.a + '" opacity=".95"/>' +
      '</g>' +
      '</g>'
    );
  };

  /* -- boutique facade (store pages) -- */
  SHAPES.boutique = function (p, d) {
    var i, panes = '';
    for (i = 0; i < 3; i++) {
      panes += '<rect x="' + (96 + i * 72) + '" y="176" width="56" height="118" rx="4" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".34"/>';
      panes += '<path d="M' + (100 + i * 72) + ' 288 L' + (140 + i * 72) + ' 184" stroke="#fff" stroke-opacity=".18" stroke-width="8"/>';
    }
    return (
      '<g>' +
      '<rect x="64" y="120" width="272" height="200" rx="6" fill="#0d1018" opacity=".8"/>' +
      '<path d="M56 124 L200 62 L344 124 Z" fill="url(#' + d.metal + ')" opacity=".82"/>' +
      '<rect x="64" y="120" width="272" height="14" fill="url(#' + d.metal + ')" opacity=".9"/>' +
      panes +
      '<rect x="176" y="196" width="48" height="98" rx="3" fill="url(#' + d.glass + ')" stroke="' + p.a + '" stroke-opacity=".5"/>' +
      '<circle cx="214" cy="248" r="3" fill="' + p.a + '"/>' +
      '<text x="200" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="15" letter-spacing="6" fill="' + p.a + '">AURELIS</text>' +
      '<rect x="64" y="316" width="272" height="8" fill="' + p.c + '" opacity=".6"/>' +
      '<ellipse cx="200" cy="332" rx="150" ry="10" fill="#000" opacity=".34"/>' +
      '</g>'
    );
  };

  /* =========================================================
     PUBLIC RENDERERS
     ========================================================= */
  function product(shape, paletteName, opts) {
    opts = opts || {};
    var p = pal(paletteName);
    var d = ids();
    var draw = SHAPES[shape] || SHAPES.atelier;
    return (
      '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' +
        (opts.label || 'Product rendering') + '">' +
      '<defs>' + baseDefs(p, d) + '</defs>' +
      backdrop(p, d) +
      draw(p, d) +
      ''  +
      '</svg>'
    );
  }

  function frame(shape, paletteName, cls, label) {
    return '<figure class="art ' + (cls || '') + '">' + product(shape, paletteName, { label: label }) +
      '<span class="art__glow"></span></figure>';
  }

  /* ---------- icon set (stroke, 1.2px, 20x20 grid) ---------- */
  var ICONS = {
    search: '<circle cx="9" cy="9" r="6.2"/><path d="M13.6 13.6 17.5 17.5"/>',
    user: '<circle cx="10" cy="7" r="3.4"/><path d="M3.8 17c.7-3.4 3.2-5.2 6.2-5.2S15.5 13.6 16.2 17"/>',
    bag: '<path d="M4.6 6.5h10.8l.9 10.2a1.2 1.2 0 0 1-1.2 1.3H4.9a1.2 1.2 0 0 1-1.2-1.3Z"/><path d="M7.4 8.6V5.9a2.6 2.6 0 0 1 5.2 0v2.7"/>',
    heart: '<path d="M10 16.4S3.6 12.6 3.6 8.4A3.4 3.4 0 0 1 10 6.7a3.4 3.4 0 0 1 6.4 1.7c0 4.2-6.4 8-6.4 8Z"/>',
    close: '<path d="M5 5l10 10M15 5 5 15"/>',
    arrow: '<path d="M3.5 10h13M12 5.4l4.6 4.6L12 14.6"/>',
    arrowLeft: '<path d="M16.5 10h-13M8 5.4 3.4 10 8 14.6"/>',
    chevron: '<path d="M7.6 4.4 13.2 10l-5.6 5.6"/>',
    chevronDown: '<path d="M4.4 7.6 10 13.2l5.6-5.6"/>',
    check: '<path d="M4.2 10.4 8 14.2l7.8-8.4"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    minus: '<path d="M4 10h12"/>',
    star: '<path d="M10 3.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 14l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7Z"/>',
    shield: '<path d="M10 3.2 16 5.4v4.4c0 3.6-2.4 6.4-6 7.4-3.6-1-6-3.8-6-7.4V5.4Z"/><path d="M7.6 10.2 9.4 12l3.2-3.4"/>',
    truck: '<path d="M2.6 6h9v8h-9z"/><path d="M11.6 9h3l2.4 2.6V14h-5.4z"/><circle cx="5.6" cy="15.4" r="1.6"/><circle cx="13.6" cy="15.4" r="1.6"/>',
    refresh: '<path d="M16.2 8.4A6.4 6.4 0 0 0 4.6 6.6"/><path d="M3.8 11.6a6.4 6.4 0 0 0 11.6 1.8"/><path d="M4.4 3.6v3.2h3.2M15.6 16.4v-3.2h-3.2"/>',
    pin: '<path d="M10 17.4s5.4-5.2 5.4-9a5.4 5.4 0 1 0-10.8 0c0 3.8 5.4 9 5.4 9Z"/><circle cx="10" cy="8.4" r="2.1"/>',
    phone: '<path d="M6.4 3.4 8.6 7 6.9 8.9a9.4 9.4 0 0 0 4.2 4.2L13 11.4l3.6 2.2-.6 2.6a1.4 1.4 0 0 1-1.6 1.1C8.6 16.4 3.6 11.4 2.7 5.6A1.4 1.4 0 0 1 3.8 4Z"/>',
    mail: '<rect x="2.6" y="4.8" width="14.8" height="10.4" rx="1.6"/><path d="m3.4 6.2 6.6 4.6 6.6-4.6"/>',
    chat: '<path d="M17 10.2c0 3.3-3.1 6-7 6a8 8 0 0 1-2.6-.4L3.2 17l1.2-3A5.7 5.7 0 0 1 3 10.2c0-3.3 3.1-6 7-6s7 2.7 7 6Z"/>',
    clock: '<circle cx="10" cy="10" r="6.8"/><path d="M10 5.8V10l2.8 1.8"/>',
    lock: '<rect x="4.4" y="8.8" width="11.2" height="8" rx="1.8"/><path d="M6.9 8.8V6.6a3.1 3.1 0 0 1 6.2 0v2.2"/>',
    card: '<rect x="2.6" y="5" width="14.8" height="10" rx="1.8"/><path d="M2.6 8.4h14.8"/>',
    box: '<path d="M10 3.2 16.6 6v8L10 16.8 3.4 14V6Z"/><path d="M3.4 6 10 8.8 16.6 6M10 8.8v8"/>',
    gift: '<rect x="3.2" y="7.8" width="13.6" height="9" rx="1.4"/><path d="M2.6 7.8h14.8v3H2.6zM10 7.8v9"/><path d="M10 7.8S9 4 7.2 4a1.8 1.8 0 0 0 0 3.8ZM10 7.8S11 4 12.8 4a1.8 1.8 0 0 1 0 3.8Z"/>',
    sparkle: '<path d="M10 2.8 11.7 8 17 9.8 11.7 11.6 10 16.8 8.3 11.6 3 9.8 8.3 8Z"/>',
    leaf: '<path d="M16.4 3.6c0 7-4.2 11-9.6 11a6.4 6.4 0 0 1-3-.6c0-7 4.6-10.4 12.6-10.4Z"/><path d="M4 16.4C6.4 12 9.6 9.2 13.6 7.6"/>',
    globe: '<circle cx="10" cy="10" r="6.8"/><path d="M3.2 10h13.6M10 3.2a12 12 0 0 1 0 13.6 12 12 0 0 1 0-13.6Z"/>',
    settings: '<circle cx="10" cy="10" r="2.6"/><path d="M15.8 12a1.4 1.4 0 0 0 .3 1.6l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.4 1.4 0 0 0-2.4 1v.2a1.7 1.7 0 1 1-3.4 0V17a1.4 1.4 0 0 0-2.4-1l-.1.1A1.7 1.7 0 1 1 3 13.7l.1-.1a1.4 1.4 0 0 0-1-2.4H2a1.7 1.7 0 0 1 0-3.4h.2a1.4 1.4 0 0 0 1-2.4L3 5.3A1.7 1.7 0 1 1 5.4 3l.1.1a1.4 1.4 0 0 0 2.4-1V2a1.7 1.7 0 1 1 3.4 0v.2a1.4 1.4 0 0 0 2.4 1l.1-.1A1.7 1.7 0 1 1 16.1 5.4l-.1.1a1.4 1.4 0 0 0 1 2.4h.2a1.7 1.7 0 0 1 0 3.4H17a1.4 1.4 0 0 0-1.2.7Z"/>',
    logout: '<path d="M7.4 16.4H4.6a1.6 1.6 0 0 1-1.6-1.6V5.2a1.6 1.6 0 0 1 1.6-1.6h2.8"/><path d="m12.4 13.4 3.6-3.4-3.6-3.4M16 10H7.4"/>',
    filter: '<path d="M3 5h14l-5.4 6.2v4.4l-3.2 1.4v-5.8Z"/>',
    grid: '<rect x="3.2" y="3.2" width="5.6" height="5.6" rx="1"/><rect x="11.2" y="3.2" width="5.6" height="5.6" rx="1"/><rect x="3.2" y="11.2" width="5.6" height="5.6" rx="1"/><rect x="11.2" y="11.2" width="5.6" height="5.6" rx="1"/>',
    zoom: '<circle cx="9" cy="9" r="5.6"/><path d="M13.2 13.2 17.4 17.4M9 6.8v4.4M6.8 9h4.4"/>',
    play: '<path d="M6.8 4.4 15 10l-8.2 5.6Z"/>',
    scissors: '<circle cx="5.4" cy="5.4" r="2.2"/><circle cx="5.4" cy="14.6" r="2.2"/><path d="M7 6.9 16 15M16 5 7 13.1"/>',
    crown: '<path d="M3 6.4 6.4 10 10 4l3.6 6L17 6.4l-1.4 9H4.4Z"/>',
    key: '<circle cx="6.6" cy="10" r="3.4"/><path d="M10 10h7M14.4 10v2.6M16.4 10v2"/>',
    doc: '<path d="M5 2.8h6.4L15 6.4v10.8H5Z"/><path d="M11.4 2.8v3.6H15M7.4 10.4h5.2M7.4 13.2h5.2"/>'
  };

  function icon(name, size, extraCls) {
    var d = ICONS[name] || ICONS.sparkle;
    var s = size || 20;
    return '<svg class="ico ' + (extraCls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 20 20" fill="none" ' +
      'stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  function stars(rating, size) {
    var out = '<span class="stars" aria-label="' + rating + ' out of 5">';
    for (var i = 1; i <= 5; i++) {
      var fill = rating >= i - 0.25 ? 'currentColor' : 'none';
      out += '<svg width="' + (size || 12) + '" height="' + (size || 12) + '" viewBox="0 0 20 20" fill="' + fill +
        '" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" aria-hidden="true">' + ICONS.star + '</svg>';
    }
    return out + '</span>';
  }

  /* ---------- decorative map (store locator) ---------- */
  function mapCanvas() {
    var i, grid = '';
    for (i = 1; i < 14; i++) {
      grid += '<line x1="' + (i * 7.2) + '%" y1="0" x2="' + (i * 7.2) + '%" y2="100%" stroke="#fff" stroke-opacity=".045"/>';
    }
    for (i = 1; i < 12; i++) {
      grid += '<line x1="0" y1="' + (i * 8.4) + '%" x2="100%" y2="' + (i * 8.4) + '%" stroke="#fff" stroke-opacity=".045"/>';
    }
    return (
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + grid +
      '<path d="M0 62 Q22 48 38 56 T68 44 T100 52" fill="none" stroke="#1c1717" stroke-opacity=".18" stroke-width=".4"/>' +
      '<path d="M0 78 Q26 70 46 76 T100 68" fill="none" stroke="#1c1717" stroke-opacity=".12" stroke-width=".4"/>' +
      '<path d="M16 0 Q22 30 14 58 T22 100" fill="none" stroke="#1c1717" stroke-opacity=".12" stroke-width=".4"/>' +
      '<path d="M72 0 Q66 34 78 62 T70 100" fill="none" stroke="#1c1717" stroke-opacity=".10" stroke-width=".4"/>' +
      '<circle cx="30" cy="40" r="14" fill="#1c1717" fill-opacity=".04"/>' +
      '<circle cx="70" cy="66" r="18" fill="#a9aea9" fill-opacity=".22"/>' +
      '</svg>'
    );
  }

const Art = {
    product: product,
    frame: frame,
    icon: icon,
    stars: stars,
    mapCanvas: mapCanvas,
    palettes: PALETTES,
    shapes: Object.keys(SHAPES)
  };

export { product, frame, icon, stars, mapCanvas };
export const palettes = PALETTES;
export default Art;
