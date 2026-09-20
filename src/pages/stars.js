import { figure, donut, blackbodyCSS, ACCENT, HOT, LIVE, AX, INK, GRID } from './charts.js';

/**
 * What stars are, what they are made of, and the full spectral sequence.
 * Harvard classification values follow the standard main-sequence tables;
 * solar abundances are Asplund et al. (2009).
 */

export const CLASSES = [
  {
    id: 'O', name: 'Class O', title: 'Blue giants',
    tempK: [33000, 45000], tempLabel: '≥ 33,000 K',
    mass: '≥ 16 M☉', radius: '≥ 6.6 R☉', lum: '≥ 30,000 L☉',
    lifetime: '1 – 10 Myr', share: '0.00003%', shareNum: 0.00003,
    discRadius: 46, swatchK: 38000,
    examples: 'Zeta Ophiuchi · Mintaka · Plaskett\'s Star',
    lines: 'Ionised helium (He II) present; hydrogen lines weak',
    colour: 'Blue-violet. The peak of its emission is deep in the ultraviolet, so what reaches the eye is only the tail of the curve — which is why it reads blue rather than white.',
    body: 'The rarest and most extreme stars on the main sequence. An O-type star can pour out a million times the Sun\'s energy and burn through its hydrogen in a few million years — less time than it took hominids to evolve. Their ultraviolet output ionises entire nebulae, carving the glowing cavities you see in star-forming regions, and their stellar winds strip away solar masses of material. Every one of them ends as a supernova, leaving a neutron star or a black hole. There is no O-type star anywhere near the Sun, because none live long enough to drift far from where they were born.',
  },
  {
    id: 'B', name: 'Class B', title: 'Blue-white',
    tempK: [10000, 33000], tempLabel: '10,000 – 33,000 K',
    mass: '2.1 – 16 M☉', radius: '1.8 – 6.6 R☉', lum: '25 – 30,000 L☉',
    lifetime: '10 – 400 Myr', share: '0.12%', shareNum: 0.12,
    discRadius: 34, swatchK: 18000,
    examples: 'Rigel · Spica · Regulus · Achernar',
    lines: 'Neutral helium strong; hydrogen lines moderate',
    colour: 'Blue-white. Still hot enough that blue dominates, but with enough green and red emission to wash toward white.',
    body: 'B-type stars dominate the appearance of the night sky out of all proportion to their numbers — Rigel, Spica and most of Orion are class B. They are massive enough to end in core collapse, and they too live fast: a hundred million years at most. Many rotate so quickly that they throw off a disc of gas around the equator, producing emission lines and earning the "Be" designation. They are usually found close to where they formed, in loose OB associations that will disperse long before the stars themselves die.',
  },
  {
    id: 'A', name: 'Class A', title: 'White',
    tempK: [7300, 10000], tempLabel: '7,300 – 10,000 K',
    mass: '1.4 – 2.1 M☉', radius: '1.4 – 1.8 R☉', lum: '5 – 25 L☉',
    lifetime: '0.4 – 3 Gyr', share: '0.61%', shareNum: 0.61,
    discRadius: 25, swatchK: 8600,
    examples: 'Sirius A · Vega · Altair · Deneb',
    lines: 'Hydrogen Balmer lines at maximum strength',
    colour: 'White, with a faint blue cast. The emission peak sits in the near-ultraviolet, giving a fairly even spread across the visible band.',
    body: 'Class A produces the brightest stars in the near sky: Sirius, Vega and Altair are all A-type, and Vega was the original zero point of the magnitude system. Their spectra show the strongest hydrogen absorption lines of any class, which is why they anchored the original classification — the alphabetical scheme was built around Balmer line strength before anyone realised it was really a temperature sequence. Many spin extremely fast; Altair is flattened by about 22% by its own rotation.',
  },
  {
    id: 'F', name: 'Class F', title: 'Yellow-white',
    tempK: [6000, 7300], tempLabel: '6,000 – 7,300 K',
    mass: '1.04 – 1.4 M☉', radius: '1.15 – 1.4 R☉', lum: '1.5 – 5 L☉',
    lifetime: '3 – 7 Gyr', share: '3.0%', shareNum: 3.0,
    discRadius: 20, swatchK: 6700,
    examples: 'Procyon A · Polaris · Canopus',
    lines: 'Hydrogen weakening; ionised metals (Ca II) strengthening',
    colour: 'Yellow-white — slightly warmer than the Sun to the eye, though the difference is almost impossible to judge without a comparison.',
    body: 'F stars sit just above the Sun in mass and temperature, and they are where the classic Cepheid variables live when they leave the main sequence — the pulsating stars whose period-luminosity relation gave Hubble the distance ladder. They have shallower convective envelopes than the Sun and shorter lives, around five billion years. Their habitable zones are wide, but they emit substantially more ultraviolet, which complicates the question of whether anything could live there.',
  },
  {
    id: 'G', name: 'Class G', title: 'Yellow dwarfs',
    tempK: [5300, 6000], tempLabel: '5,300 – 6,000 K',
    mass: '0.8 – 1.04 M☉', radius: '0.96 – 1.15 R☉', lum: '0.6 – 1.5 L☉',
    lifetime: '≈ 10 Gyr', share: '7.6%', shareNum: 7.6,
    discRadius: 17, swatchK: 5770,
    examples: 'The Sun (G2V) · Alpha Centauri A · Tau Ceti',
    lines: 'Ionised calcium prominent; neutral metals strengthening',
    colour: 'The Sun is white. It appears yellow from the ground only because Earth\'s atmosphere scatters the blue end of its light away — that scattered blue is the sky. Seen from space, it is a plain white star.',
    body: 'Our own class. A G-type star fuses hydrogen steadily for about ten billion years, which is long enough for planetary systems to settle and, at least once, for life to appear. The Sun converts 600 million tonnes of hydrogen every second, losing about 4.3 million tonnes of that as pure energy, and it has done so for 4.6 billion years with the output varying by only about 0.1%. In roughly five billion years it will exhaust its core hydrogen, swell into a red giant, and end as a white dwarf about the size of Earth.',
  },
  {
    id: 'K', name: 'Class K', title: 'Orange dwarfs',
    tempK: [3900, 5300], tempLabel: '3,900 – 5,300 K',
    mass: '0.45 – 0.8 M☉', radius: '0.7 – 0.96 R☉', lum: '0.08 – 0.6 L☉',
    lifetime: '15 – 45 Gyr', share: '12%', shareNum: 12,
    discRadius: 13, swatchK: 4400,
    examples: 'Alpha Centauri B · Epsilon Eridani · Arcturus (K1 giant)',
    lines: 'Neutral metals dominant; molecular bands appearing',
    colour: 'Pale orange. Cool enough that the red end of the spectrum clearly wins, but not so cool that blue and green vanish.',
    body: 'Often argued to be the best place to look for life. K dwarfs live far longer than the Sun — tens of billions of years, longer than the universe has existed — while emitting far less damaging ultraviolet than hotter stars and far fewer violent flares than red dwarfs. They are also common and stable. Their habitable zones sit close enough in that planets there may become tidally locked, but not nearly as reliably as around M dwarfs.',
  },
  {
    id: 'M', name: 'Class M', title: 'Red dwarfs',
    tempK: [2300, 3900], tempLabel: '2,300 – 3,900 K',
    mass: '0.08 – 0.45 M☉', radius: '≤ 0.7 R☉', lum: '≤ 0.08 L☉',
    lifetime: '100 Gyr – 10 Tyr', share: '76%', shareNum: 76,
    discRadius: 10, swatchK: 3200,
    examples: 'Proxima Centauri · Barnard\'s Star · TRAPPIST-1',
    lines: 'Titanium oxide molecular bands dominate',
    colour: 'Deep orange-red. Most of the output is infrared, invisible to the eye entirely — a red dwarf radiates far more heat than light.',
    body: 'Three out of every four stars in the galaxy are red dwarfs, and not one of them is visible to the naked eye from Earth. They are so frugal with their fuel, and so thoroughly convective that they can burn nearly all of it, that their main-sequence lifetimes run to trillions of years — no red dwarf has ever died of old age, because the universe is not old enough. The nearest star to the Sun is one. Their drawback is temperament: young M dwarfs throw enormous flares that can strip the atmosphere off a close-in planet, and their habitable zones are close enough that tidal locking is essentially guaranteed.',
  },
];

/** Below the hydrogen-burning limit — not stars, but they belong on the sequence. */
export const SUBSTELLAR = [
  {
    id: 'L', name: 'Class L', title: 'Brown dwarfs',
    tempK: [1300, 2100], tempLabel: '1,300 – 2,100 K',
    mass: '0.015 – 0.08 M☉', radius: '≈ 0.1 R☉', lum: '10⁻⁴ – 10⁻⁵ L☉',
    lifetime: 'Cools forever', share: '—', shareNum: 0,
    discRadius: 8, swatchK: 1700, substellar: true,
    examples: 'Luhman 16 A · Teide 1',
    lines: 'Metal hydrides and alkali metals; TiO gone',
    colour: 'Dull red, shading toward magenta. Almost all of the output is infrared.',
    body: 'Below about 0.08 solar masses — roughly 80 Jupiters — an object can never sustain hydrogen fusion. Brown dwarfs briefly fuse deuterium, then simply radiate away their formation heat and cool for the rest of time. Class L objects still have clouds of iron and silicate dust in their atmospheres.',
  },
  {
    id: 'T', name: 'Class T', title: 'Methane dwarfs',
    tempK: [700, 1300], tempLabel: '700 – 1,300 K',
    mass: '0.012 – 0.075 M☉', radius: '≈ 0.1 R☉', lum: '10⁻⁵ – 10⁻⁶ L☉',
    lifetime: 'Cools forever', share: '—', shareNum: 0,
    discRadius: 7, swatchK: 1100, substellar: true,
    examples: 'Gliese 229 B · Luhman 16 B',
    lines: 'Strong methane absorption in the infrared',
    colour: 'Deep magenta to near-black in visible light.',
    body: 'Cool enough for methane to survive in the atmosphere, which produces an unmistakable infrared signature. Some show weather: patchy clouds that rotate in and out of view, changing the brightness measurably over a few hours.',
  },
  {
    id: 'Y', name: 'Class Y', title: 'Cold dwarfs',
    tempK: [200, 700], tempLabel: '< 700 K',
    mass: '≈ 0.01 M☉', radius: '≈ 0.1 R☉', lum: '< 10⁻⁶ L☉',
    lifetime: 'Cools forever', share: '—', shareNum: 0,
    discRadius: 6, swatchK: 500, substellar: true,
    examples: 'WISE 0855−0714 (≈ 250 K)',
    lines: 'Ammonia absorption; water clouds',
    colour: 'Emits essentially no visible light at all.',
    body: 'The coldest class known. WISE 0855−0714, seven light years away, is around 250 K — colder than the North Pole. It may have clouds of water ice. These objects are the bridge between stars and giant planets, and the distinction between the two is genuinely blurry.',
  },
];

const ALL = [...CLASSES, ...SUBSTELLAR];

/** Blackbody gradient from hottest (left) to coolest (right). */
function spectrumGradient() {
  const stops = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    // log-spaced from 42,000 K down to 1,000 K
    const K = Math.pow(10, Math.log10(42000) + t * (Math.log10(900) - Math.log10(42000)));
    stops.push(`${blackbodyCSS(K)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function starButton(c, i) {
  const col = blackbodyCSS(c.swatchK);
  const d = c.discRadius * 2;
  return `
    <button class="star-pick${i === 4 ? ' on' : ''}" data-star="${c.id}" type="button"
      aria-label="${c.name} — ${c.tempLabel}">
      <span class="star-disc" style="width:${d}px;height:${d}px;background:${col};
        box-shadow:0 0 ${c.discRadius * 1.5}px ${col}${c.substellar ? '55' : '99'},
                   inset -${c.discRadius * 0.35}px -${c.discRadius * 0.3}px ${c.discRadius * 0.7}px rgba(0,0,0,.45)"></span>
      <span class="star-meta"><b>${c.id}</b><span>${c.tempLabel.replace(' K', '')}</span></span>
    </button>`;
}

function detailFor(c) {
  const col = blackbodyCSS(c.swatchK);
  const d = Math.max(38, c.discRadius * 1.5);
  return `
    <div class="sd-head">
      <span class="sd-orb" style="width:${d}px;height:${d}px;background:${col};
        box-shadow:0 0 ${d * 0.8}px ${col}aa, inset -${d * 0.22}px -${d * 0.18}px ${d * 0.45}px rgba(0,0,0,.5)"></span>
      <div class="sd-title">
        <h3>${c.name} — ${c.title}</h3>
        <p>${c.tempLabel}${c.substellar ? ' · SUB-STELLAR' : ''}</p>
      </div>
    </div>
    <dl class="sd-grid">
      <div><dt>SURFACE TEMP</dt><dd>${c.tempLabel}</dd></div>
      <div><dt>MASS</dt><dd>${c.mass}</dd></div>
      <div><dt>RADIUS</dt><dd>${c.radius}</dd></div>
      <div><dt>LUMINOSITY</dt><dd>${c.lum}</dd></div>
      <div><dt>MAIN-SEQUENCE LIFE</dt><dd>${c.lifetime}</dd></div>
      <div><dt>SHARE OF STARS</dt><dd>${c.share}</dd></div>
    </dl>
    <p class="sd-body"><b>Why this colour.</b> ${c.colour}</p>
    <p class="sd-body">${c.body}</p>
    <p class="sd-body"><b>Spectral lines.</b> ${c.lines}<br><b>Examples.</b> ${c.examples}</p>`;
}

/** Hertzsprung–Russell diagram: the single most important plot in stellar astronomy. */
function hrDiagram() {
  const w = 700, h = 420;
  const padL = 62, padR = 92, padT = 20, padB = 46;
  const iw = w - padL - padR, ih = h - padT - padB;
  // temperature runs backwards, by convention
  const tMax = 45000, tMin = 2200;
  const fx = (T) => padL + (1 - (Math.log10(T) - Math.log10(tMin)) / (Math.log10(tMax) - Math.log10(tMin))) * iw;
  const fy = (L) => padT + (1 - (Math.log10(L) + 5) / (7 + 5)) * ih;

  let grid = '';
  for (const T of [40000, 20000, 10000, 5000, 3000]) {
    grid += `<line x1="${fx(T).toFixed(1)}" y1="${padT}" x2="${fx(T).toFixed(1)}" y2="${padT + ih}" stroke="${GRID}"/>
      <text x="${fx(T).toFixed(1)}" y="${padT + ih + 15}" fill="${AX}" font-size="8.5" text-anchor="middle"
        font-family="var(--mono)">${(T / 1000)}k</text>`;
  }
  for (const L of [1e-4, 1e-2, 1, 1e2, 1e4, 1e6]) {
    grid += `<line x1="${padL}" y1="${fy(L).toFixed(1)}" x2="${w - padR}" y2="${fy(L).toFixed(1)}" stroke="${GRID}"/>
      <text x="${padL - 7}" y="${(fy(L) + 3).toFixed(1)}" fill="${AX}" font-size="8.5" text-anchor="end"
        font-family="var(--mono)">10${L === 1 ? '⁰' : ('' + Math.log10(L)).replace('-', '⁻').replace(/\d/g, (m) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+m])}</text>`;
  }

  /*
   * The main sequence is not a straight line in log–log space, so a single
   * power law draws it wrong at both ends. These are empirical anchors
   * (mass, effective temperature, luminosity) from standard main-sequence
   * tables, interpolated logarithmically between.
   */
  const MS = [
    [0.10, 2800, 0.0008], [0.20, 3200, 0.0055], [0.45, 3700, 0.030],
    [0.65, 4400, 0.15], [0.80, 5200, 0.42], [1.00, 5772, 1.0],
    [1.25, 6500, 2.5], [1.60, 7200, 6.5], [2.00, 9000, 25],
    [3.00, 11000, 80], [5.00, 16000, 600], [10.0, 24000, 8000],
    [20.0, 33000, 54000], [40.0, 42000, 320000],
  ];
  let ms = '';
  for (let seg = 0; seg < MS.length - 1; seg++) {
    const [, T0, L0] = MS[seg];
    const [, T1, L1] = MS[seg + 1];
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const f = i / steps;
      const T = Math.pow(10, Math.log10(T0) + f * (Math.log10(T1) - Math.log10(T0)));
      const L = Math.pow(10, Math.log10(L0) + f * (Math.log10(L1) - Math.log10(L0)));
      ms += `<circle cx="${fx(T).toFixed(1)}" cy="${fy(L).toFixed(1)}" r="2.6"
        fill="${blackbodyCSS(T)}" fill-opacity=".9"/>`;
    }
  }

  // giants, supergiants and white dwarfs sit off the main sequence
  const blob = (cx, cy, rx, ry, colour, label, lx, ly) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${colour}" fill-opacity=".12"
       stroke="${colour}" stroke-opacity=".4" stroke-dasharray="4 3"/>
     <text x="${lx}" y="${ly}" fill="${colour}" font-size="9" font-family="var(--mono)">${label}</text>`;

  const named = [
    ['Sun', 5772, 1, LIVE], ['Sirius A', 9940, 25.4, ACCENT], ['Vega', 9602, 40, ACCENT],
    ['Rigel', 12100, 120000, ACCENT], ['Betelgeuse', 3600, 126000, '#ff8a5c'],
    ['Arcturus', 4286, 170, HOT], ['Proxima', 3042, 0.0017, '#ff8a5c'],
    ['Sirius B', 25200, 0.056, '#cfe4ff'], ['Aldebaran', 3910, 439, HOT],
  ];
  let dots = '';
  for (const [n, T, L, col] of named) {
    const x = fx(T), y = fy(L);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${col}"/>
      <text x="${(x + 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${col}" font-size="8.5"
        font-family="var(--mono)">${n}</text>`;
  }

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">
    ${grid}
    ${blob(fx(4200), fy(150), 74, 34, HOT, 'GIANTS', fx(4200) - 30, fy(150) - 40)}
    ${blob(fx(7000), fy(60000), 150, 26, '#a9cdff', 'SUPERGIANTS', fx(7000) - 46, fy(60000) - 32)}
    ${(() => {
      // white dwarfs span a wide temperature range at very low luminosity —
      // Sirius B sits at 25,000 K, far hotter than the Sun
      const x0 = fx(40000), x1 = fx(5000), y0 = fy(1e-1), y1 = fy(3e-5);
      return blob((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2,
        '#cfe4ff', 'WHITE DWARFS', (x0 + x1) / 2 - 44, (y1 + y0) / 2 + 46);
    })()}
    ${ms}${dots}
    <text x="${fx(20000).toFixed(1)}" y="${fy(600).toFixed(1)}" fill="${INK}" font-size="9"
      font-family="var(--mono)" transform="rotate(28 ${fx(20000).toFixed(1)} ${fy(600).toFixed(1)})">MAIN SEQUENCE</text>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + ih}" stroke="${AX}"/>
    <line x1="${padL}" y1="${padT + ih}" x2="${w - padR}" y2="${padT + ih}" stroke="${AX}"/>
    <text x="${padL + iw / 2}" y="${h - 6}" fill="${AX}" font-size="8" text-anchor="middle"
      font-family="var(--mono)" letter-spacing="1.4">SURFACE TEMPERATURE (K) — HOTTER TO THE LEFT</text>
    <text x="12" y="${padT + ih / 2}" fill="${AX}" font-size="8" text-anchor="middle"
      font-family="var(--mono)" letter-spacing="1.4"
      transform="rotate(-90 12 ${padT + ih / 2})">LUMINOSITY (L☉)</text>
  </svg>`;
}

export function renderStars() {
  const composition = figure(
    'What the Sun is made of',
    donut([
      { value: 73.8, label: 'Hydrogen', color: '#8fc6ff', detail: 'The fuel. Four protons fuse into one helium nucleus, releasing 26.73 MeV and converting 0.7% of the mass into energy.' },
      { value: 24.9, label: 'Helium', color: '#ffd48a', detail: 'The ash — plus a primordial share inherited from Big Bang nucleosynthesis. It accumulates in the core.' },
      { value: 1.3, label: 'Everything else', color: '#ff9e7a', detail: 'Oxygen, carbon, neon, iron and the rest. Astronomers call all of it "metals". It came from earlier generations of stars.' },
    ]),
    'By mass fraction: X = 0.738, Y = 0.249, Z = 0.013 (Asplund et al. 2009). By number of atoms the picture is even more lopsided — about 91% of the Sun\'s particles are hydrogen nuclei.'
  );

  const hr = figure(
    'The Hertzsprung–Russell diagram',
    hrDiagram(),
    'Plot temperature against luminosity and stars do not scatter — they fall onto a narrow diagonal band. That band is the main sequence, and a star\'s position along it is set almost entirely by its mass. The clumps off the band are stars that have finished with core hydrogen: giants and supergiants above, white dwarf corpses below. Both axes are logarithmic, and temperature runs backwards by historical convention.'
  );

  const seq = ALL.map(starButton).join('');

  return `
  <div class="page">
    <div class="page-eyebrow">CATALOGUE · 04 · THE STARS</div>
    <h1>A star is gravity<br><b>fighting a losing battle</b></h1>
    <p class="page-lede">
      Take enough hydrogen, let gravity pull it together, and the centre gets hot and dense enough that atomic nuclei
      begin to fuse. The energy released pushes outward exactly hard enough to halt the collapse. That standoff —
      hydrostatic equilibrium — is what a star <em>is</em>, and it lasts until the fuel runs out.
    </p>

    <dl class="keynums">
      <div><dt>Fusion threshold</dt><dd>0.08 M☉<span>below this, nothing ignites</span></dd></div>
      <div><dt>Core temperature</dt><dd>15.7 M K<span>the Sun, at its centre</span></dd></div>
      <div><dt>Energy per reaction</dt><dd>26.73 MeV<span>4 H → He + 2e⁺ + 2ν</span></dd></div>
      <div><dt>Sun's fuel burn</dt><dd>600 Mt/s<span>4.3 Mt/s becomes energy</span></dd></div>
      <div><dt>Most common class</dt><dd>M · 76%<span>none visible to the naked eye</span></dd></div>
      <div><dt>Stars in the galaxy</dt><dd>100–400 bn<span>Milky Way estimate</span></dd></div>
    </dl>

    <h2>Composition</h2>
    <p>
      Stars are overwhelmingly hydrogen and helium, because the universe is overwhelmingly hydrogen and helium — the
      proportions were set in the first twenty minutes after the Big Bang and have barely shifted since. Everything
      else, the one percent that includes every atom in your body, was manufactured inside stars that died before the
      Sun was born.
    </p>
    ${composition}

    <h3>How the energy is made</h3>
    <ul class="bullets">
      <li><b>The proton–proton chain.</b> Dominant in stars up to about 1.3 solar masses, including ours. Four protons
      become one helium-4 nucleus through a sequence of steps, the first of which is so improbable that a given proton
      waits about a billion years for it. That slowness is exactly why stars last.</li>
      <li><b>The CNO cycle.</b> Takes over in hotter, more massive cores. Carbon, nitrogen and oxygen act as catalysts,
      shuttling protons and emerging unchanged. It is extraordinarily temperature-sensitive — the rate scales roughly
      as T¹⁵ — which makes massive stars burn violently.</li>
      <li><b>Energy escaping.</b> A photon released in the Sun's core takes on the order of 100,000 years to random-walk
      out to the surface, then 8 minutes 19 seconds to reach Earth.</li>
    </ul>

    <h3>Structure, from the inside out</h3>
    <ul class="bullets">
      <li><b>Core</b> — 15.7 million K, 150 g/cm³. The only place fusion occurs; it is about a quarter of the Sun's radius.</li>
      <li><b>Radiative zone</b> — energy crawls outward as radiation, absorbed and re-emitted endlessly.</li>
      <li><b>Convective zone</b> — the plasma becomes opaque enough that bulk motion takes over; hot cells rise, cool, and sink.</li>
      <li><b>Photosphere</b> — 5,772 K. The visible surface, and the only part of a star anyone has ever seen directly.</li>
      <li><b>Chromosphere and corona</b> — the tenuous outer atmosphere, which somehow reaches over a million kelvin.
      Why the corona is 200 times hotter than the surface beneath it remains genuinely unsolved.</li>
    </ul>

    <h2>The spectral sequence <em>hottest left · coolest right</em></h2>
    <p>
      Every star gets a letter. The order looks arbitrary — <strong>O B A F G K M</strong> — because it is a historical
      accident: the classes were originally sorted by the strength of their hydrogen lines, and only later reordered
      when Annie Jump Cannon and Cecilia Payne-Gaposchkin worked out that the real variable underneath was temperature.
      Below the bar, each class is drawn at its true relative size and its true blackbody colour.
      <em>Select one to read it.</em>
    </p>

    <div class="spectrum-bar" style="background:${spectrumGradient()}"></div>
    <div class="spectrum-ticks">
      <span>42,000 K</span><span>20,000</span><span>10,000</span><span>6,000</span><span>4,000</span><span>2,000</span><span>900 K</span>
    </div>

    <div class="star-row" id="star-row">${seq}</div>
    <div id="star-detail">${detailFor(CLASSES[4])}</div>

    <p class="sd-hint" style="margin-top:14px">
      MNEMONIC — "OH BE A FINE GIRL/GUY, KISS ME" · CANNON'S ORIGINAL ORDER WAS ALPHABETICAL BY HYDROGEN LINE STRENGTH
    </p>

    <div class="table-scroll">
      <table class="dtable">
        <thead><tr>
          <th>Class</th><th>Temperature</th><th>Mass</th><th>Radius</th><th>Luminosity</th>
          <th>Lifetime</th><th>Share</th><th>Example</th>
        </tr></thead>
        <tbody>
          ${ALL.map((c) => `<tr>
            <td><span class="swatch" style="background:${blackbodyCSS(c.swatchK)}"></span>${c.id}</td>
            <td>${c.tempLabel}</td><td>${c.mass}</td><td>${c.radius}</td><td>${c.lum}</td>
            <td>${c.lifetime}</td><td>${c.share}</td><td>${c.examples.split(' · ')[0]}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h2>The diagram that organised everything</h2>
    ${hr}

    <h2>How a star ends <em>mass decides everything</em></h2>
    <div class="cards">
      <div class="card">
        <div class="card-tag">&lt; 0.08 M☉</div>
        <h4>Never ignites</h4>
        <p>A brown dwarf. Fuses deuterium briefly, then radiates away its formation heat and cools indefinitely.
        It has no ending, only a very slow fade.</p>
      </div>
      <div class="card">
        <div class="card-tag">0.08 – 0.5 M☉</div>
        <h4>Red dwarf → helium white dwarf</h4>
        <p>Fully convective, so it can burn nearly all of its hydrogen rather than just the core's worth. Lifetimes run
        into the trillions of years. None has ever finished — the universe is far too young.</p>
      </div>
      <div class="card">
        <div class="card-tag">0.5 – 8 M☉</div>
        <h4>Red giant → planetary nebula → white dwarf</h4>
        <p>The core contracts and the envelope swells enormously; the outer layers drift away as a glowing shell,
        leaving an Earth-sized carbon-oxygen ember that cools for the rest of time. The Sun's path.</p>
      </div>
      <div class="card">
        <div class="card-tag">8 – 20 M☉</div>
        <h4>Supergiant → supernova → neutron star</h4>
        <p>Fuses progressively heavier elements in shells until it builds an iron core, which cannot release energy by
        fusing. The core collapses in under a second and the star tears itself apart, leaving a city-sized neutron star.</p>
      </div>
      <div class="card">
        <div class="card-tag">&gt; 20 M☉</div>
        <h4>Supernova → black hole</h4>
        <p>The same collapse, but nothing can hold the remnant up. It falls inside its own event horizon. The most
        massive may skip the explosion entirely and collapse directly.</p>
      </div>
      <div class="card">
        <div class="card-tag">Binary white dwarf</div>
        <h4>Type Ia supernova</h4>
        <p>A white dwarf pulling matter from a companion reaches the Chandrasekhar limit at 1.44 M☉ and detonates.
        Because that threshold is always the same, these explosions have a standard brightness — which is how the
        accelerating expansion of the universe was discovered.</p>
      </div>
    </div>

    <h2>Sources</h2>
    <ul class="sources">
      <li><b>Asplund, Grevesse, Sauval &amp; Scott (2009)</b> — The chemical composition of the Sun, ARA&amp;A 47, 481</li>
      <li><b>Cannon &amp; Pickering (1918–24)</b> — The Henry Draper Catalogue</li>
      <li><b>Payne (1925)</b> — Stellar Atmospheres, Harvard PhD thesis</li>
      <li><b>Morgan, Keenan &amp; Kellman (1943)</b> — An Atlas of Stellar Spectra (the MK system)</li>
      <li><b>Habets &amp; Heintze (1981)</b> — Empirical bolometric corrections for the main sequence, A&amp;AS 46, 193</li>
      <li><b>Charity, M.</b> — What colour is a blackbody? (Planckian locus sRGB reference)</li>
      <li><b>NASA/IPAC; SIMBAD; Gaia DR3</b></li>
    </ul>

    <div class="page-foot">
      <span>SPACE WORLD · CATALOGUE 04</span>
      <span>DISC COLOURS COMPUTED FROM THE PLANCKIAN LOCUS</span>
    </div>
  </div>`;
}

/** Wire the spectral sequence buttons after the page is in the DOM. */
export function bindStars(root) {
  const row = root.querySelector('#star-row');
  const detail = root.querySelector('#star-detail');
  if (!row || !detail) return;
  row.addEventListener('click', (e) => {
    const btn = e.target.closest('.star-pick');
    if (!btn) return;
    const c = ALL.find((x) => x.id === btn.dataset.star);
    if (!c) return;
    row.querySelectorAll('.star-pick').forEach((b) => b.classList.toggle('on', b === btn));
    detail.innerHTML = detailFor(c);
  });
}
