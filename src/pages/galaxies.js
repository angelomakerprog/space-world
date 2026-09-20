import { figure, donut, lineChart, logBars, ACCENT, HOT, LIVE, AX, INK, GRID } from './charts.js';

/**
 * What galaxies are, what they contain, how they hold together, and how they
 * are classified. Sizes are quoted in light years with a kilometre conversion,
 * since a light year is 9.4607 × 10¹² km.
 */

const LY_KM = 9.4607e12;

/** Hubble's tuning fork, drawn rather than described. */
function tuningFork() {
  const w = 880, h = 300;
  const ell = [
    ['E0', 60, 150, 21, 21], ['E3', 128, 150, 22, 18], ['E5', 196, 150, 24, 15], ['E7', 264, 150, 26, 12],
  ];
  const s0 = ['S0', 344, 150, 25, 13];

  let out = `<defs>
      <radialGradient id="bulge" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff3dc" stop-opacity=".85"/>
        <stop offset="55%" stop-color="#ffd9a8" stop-opacity=".38"/>
        <stop offset="100%" stop-color="#ffd9a8" stop-opacity=".05"/>
      </radialGradient>
    </defs>
    <line x1="88" y1="150" x2="330" y2="150" stroke="${GRID}"/>
    <line x1="360" y1="150" x2="430" y2="150" stroke="${GRID}"/>
    <path d="M 430 150 Q 470 150 500 96" fill="none" stroke="${GRID}"/>
    <path d="M 430 150 Q 470 150 500 204" fill="none" stroke="${GRID}"/>
    <line x1="500" y1="96" x2="800" y2="96" stroke="${GRID}"/>
    <line x1="500" y1="204" x2="800" y2="204" stroke="${GRID}"/>`;

  const label = (x, y, t, sub) =>
    `<text x="${x}" y="${y}" fill="${INK}" font-size="10" text-anchor="middle" font-family="var(--mono)">${t}</text>` +
    (sub ? `<text x="${x}" y="${y + 11}" fill="${AX}" font-size="7.5" text-anchor="middle" font-family="var(--mono)">${sub}</text>` : '');

  for (const [name, cx, cy, rx, ry] of ell) {
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#bulge)" stroke="#ffd9a8" stroke-opacity=".45"/>`;
    out += label(cx, cy + ry + 18, name);
  }
  out += `<ellipse cx="${s0[1]}" cy="${s0[2]}" rx="${s0[3]}" ry="${s0[4]}" fill="url(#bulge)" stroke="#ffe6c0" stroke-opacity=".5"/>
    <line x1="${s0[1] - s0[3]}" y1="150" x2="${s0[1] + s0[3]}" y2="150" stroke="#fff" stroke-opacity=".35"/>`;
  out += label(s0[1], 150 + s0[4] + 18, 'S0', 'lenticular');

  /*
   * A logarithmic spiral, pinned to a fixed outer radius so every galaxy in
   * the diagram occupies the same cell. What distinguishes Sa from Sc is not
   * how far the arms reach but how many times they wrap on the way out —
   * that is the pitch angle.
   */
  const spiral = (cx, cy, rStart, rEnd, turns, phase) => {
    const thMax = turns * Math.PI;
    const k = Math.log(rEnd / rStart) / thMax;
    let d = '';
    for (const sgn of [1, -1]) {
      let path = '';
      for (let i = 0; i <= 44; i++) {
        const th = (i / 44) * thMax;
        const r = rStart * Math.exp(k * th);
        const a = th + phase;
        const x = cx + sgn * r * Math.cos(a);
        const y = cy + sgn * r * Math.sin(a) * 0.78;
        path += `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      d += `<path d="${path}" fill="none" stroke="#a9cdff" stroke-opacity=".7" stroke-width="1.5"
        stroke-linecap="round"/>`;
    }
    return d;
  };

  const rows = [
    { y: 96, prefix: 'S', bar: 0 },
    { y: 204, prefix: 'SB', bar: 1 },
  ];
  const kinds = [
    { x: 560, turns: 2.5, name: 'a', sub: 'tight arms' },
    { x: 665, turns: 1.5, name: 'b', sub: 'moderate' },
    { x: 775, turns: 0.9, name: 'c', sub: 'open, loose' },
  ];
  const R_OUT = 32;
  for (const row of rows) {
    for (const k of kinds) {
      const barLen = row.bar ? 13 : 0;
      const bulge = row.bar ? 5 : 8;
      out += `<circle cx="${k.x}" cy="${row.y}" r="${bulge}" fill="#ffe6c0" fill-opacity=".85"/>`;
      if (row.bar) {
        out += `<rect x="${k.x - barLen}" y="${row.y - 3}" width="${barLen * 2}" height="6" rx="3"
          fill="#ffe6c0" fill-opacity=".75"/>`;
      }
      // barred arms launch from the tips of the bar; normal arms from the bulge
      out += spiral(k.x, row.y, row.bar ? barLen : bulge + 1, R_OUT, k.turns, row.bar ? 0 : Math.PI / 2);
      out += label(k.x, row.y + 48, row.prefix + k.name, k.sub);
    }
    out += `<text x="500" y="${row.y + 4}" fill="${AX}" font-size="8" text-anchor="end"
      font-family="var(--mono)">${row.bar ? 'BARRED' : 'NORMAL'}</text>`;
  }

  out += `<text x="60" y="34" fill="${AX}" font-size="8" font-family="var(--mono)" letter-spacing="1.6">ELLIPTICALS — increasingly flattened →</text>
    <text x="560" y="34" fill="${AX}" font-size="8" font-family="var(--mono)" letter-spacing="1.6">SPIRALS — arms open outward →</text>
    <text x="344" y="248" fill="${HOT}" font-size="8" text-anchor="middle" font-family="var(--mono)">the hinge</text>`;

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">${out}</svg>`;
}

/** Observed flat rotation curve vs what the visible mass alone predicts. */
function rotationCurves() {
  const observed = [], keplerian = [], disc = [], halo = [];
  for (let i = 1; i <= 60; i++) {
    const r = (i / 60) * 30;                       // kpc
    // flat curve: rises then plateaus near 220 km/s
    const v = 220 * Math.sqrt(1 - Math.exp(-r / 2.4));
    observed.push([r, v]);
    // visible disc alone falls away as √(1/r) beyond the bulk of the light
    const vd = 190 * Math.sqrt(Math.min(1, Math.pow(r / 4.2, 2)) / Math.max(r / 4.2, 1));
    disc.push([r, vd]);
    keplerian.push([r, r < 4.2 ? vd : 190 * Math.sqrt(4.2 / r)]);
    halo.push([r, Math.sqrt(Math.max(0, v * v - keplerian[i - 1][1] ** 2))]);
  }
  return lineChart([
    { points: observed, color: ACCENT, label: 'Observed' },
    { points: keplerian, color: HOT, label: 'Visible matter alone', dashed: true },
    { points: halo, color: LIVE, label: 'Dark matter halo', dashed: true },
  ], {
    xMin: 0, xMax: 30, yMin: 0, yMax: 260,
    xTicks: [[0, '0'], [5, '5'], [10, '10'], [15, '15'], [20, '20'], [25, '25'], [30, '30 kpc']],
    yTicks: [[0, '0'], [50, '50'], [100, '100'], [150, '150'], [200, '200'], [250, '250']],
    xLabel: 'DISTANCE FROM GALACTIC CENTRE (kiloparsecs)',
    yLabel: 'ORBITAL SPEED (km/s)',
    legendAlign: 'start',
    annotations: [{ x: 24, y: 218, label: 'stays flat — the discrepancy', color: ACCENT, flip: true }],
  });
}

const SIZES = [
  { label: 'Segue 1 (dwarf)', ly: 100, color: '#8fc6ff' },
  { label: 'Sagittarius dwarf', ly: 10000, color: '#8fc6ff' },
  { label: 'Small Magellanic Cloud', ly: 18900, color: '#a9cdff' },
  { label: 'Large Magellanic Cloud', ly: 32200, color: '#a9cdff' },
  { label: 'Triangulum · M33', ly: 60000, color: '#ffd48a' },
  { label: 'Milky Way', ly: 100000, color: '#7dffb2' },
  { label: 'Andromeda · M31', ly: 152000, color: '#ffd48a' },
  { label: 'IC 1101 (stellar body)', ly: 600000, color: '#ff9e7a' },
  { label: 'Alcyoneus (radio lobes)', ly: 16300000, color: '#ff7a9e' },
];

export function renderGalaxies() {
  const fork = figure(
    'The Hubble sequence',
    `<div class="fork-scroll">${tuningFork()}</div>`,
    'Hubble proposed this in 1926 and believed it was an evolutionary track — it is not. Ellipticals are not young spirals; if anything the arrow runs the other way, with mergers turning discs into ellipticals. The shape stuck because it is still the most useful shorthand we have. About two-thirds of large spirals, including ours, have a bar.'
  );

  const rotation = figure(
    'Rotation curves and the dark matter problem',
    rotationCurves(),
    'If a galaxy\'s mass were where its light is, orbital speeds would fall off with distance the way the planets do around the Sun. They do not — they stay flat out to the last measurable gas cloud. Vera Rubin and Kent Ford established this for dozens of spirals in the 1970s. Either roughly 85% of the mass is invisible, or gravity does not work as we think at these scales.'
  );

  const sizes = figure(
    'How big galaxies get',
    logBars(SIZES.map((s) => ({
      label: s.label,
      value: s.ly,
      color: s.color,
      display: s.ly >= 1e6
        ? `${(s.ly / 1e6).toFixed(1)} Mly · ${(s.ly * LY_KM).toExponential(2).replace('e+', ' × 10')} km`
        : `${s.ly.toLocaleString('en-US')} ly · ${(s.ly * LY_KM).toExponential(2).replace('e+', ' × 10')} km`,
    })), { min: 60, max: 3e7 }),
    'A logarithmic scale — each step right is a tenfold increase. The span from the smallest known dwarf galaxy to the largest structure is a factor of 160,000. One light year = 9.4607 × 10¹² km, so the Milky Way is roughly 9.5 × 10¹⁷ km across.'
  );

  const mass = figure(
    'Where a spiral galaxy\'s mass actually sits',
    donut([
      { value: 85, label: 'Dark matter halo', color: '#7dffb2', detail: 'An extended, roughly spherical halo reaching far beyond the visible disc. Detected only through its gravity.' },
      { value: 11, label: 'Stars', color: '#ffd48a', detail: 'The part that glows. For the Milky Way, 100–400 billion of them, almost all in the disc and bulge.' },
      { value: 3.5, label: 'Gas', color: '#8fc6ff', detail: 'Atomic and molecular hydrogen — the raw material for future stars, concentrated in the spiral arms.' },
      { value: 0.5, label: 'Dust & the black hole', color: '#ff9e7a', detail: 'Dust is a fraction of a percent by mass but blocks most of the visible light. Sagittarius A* is only 4.3 million M☉ — about 0.0003% of the galaxy.' },
    ]),
    'Approximate mass budget for a Milky Way–type spiral within its virial radius. The central black hole, despite dominating the popular image of a galaxy, is gravitationally irrelevant beyond a few light years.'
  );

  return `
  <div class="page">
    <div class="page-eyebrow">CATALOGUE · 03 · THE GALAXIES</div>
    <h1>Galaxies are how<br><b>matter organises itself</b></h1>
    <p class="page-lede">
      A galaxy is a gravitationally bound system of stars, stellar remnants, interstellar gas, dust and dark matter.
      They range from dwarfs of a few thousand stars to supergiants of a hundred trillion, and they are not scattered
      at random — they sit on filaments and sheets around vast voids, in the largest pattern that exists.
    </p>

    <dl class="keynums">
      <div><dt>In the observable universe</dt><dd>~2 × 10¹²<span>estimated; 200 billion confirmed-class</span></dd></div>
      <div><dt>Milky Way diameter</dt><dd>~100,000 ly<span>9.5 × 10¹⁷ km</span></dd></div>
      <div><dt>Milky Way mass</dt><dd>1.5 × 10¹² M☉<span>including the dark halo</span></dd></div>
      <div><dt>Our stars</dt><dd>100–400 bn<span>most are red dwarfs</span></dd></div>
      <div><dt>One light year</dt><dd>9.4607 × 10¹² km<span>63,241 AU</span></dd></div>
      <div><dt>Nearest large galaxy</dt><dd>2.537 Mly<span>Andromeda · approaching</span></dd></div>
    </dl>

    <h2>What a galaxy contains</h2>
    <p>
      Almost everything you can see in a galaxy is a rounding error on its mass. The stars, the glowing nebulae, the
      dust lanes — all of it rides inside a halo of something that emits no light at all.
    </p>
    ${mass}

    <h2>The components, in order of what they do</h2>
    <ul class="bullets">
      <li><b>Dark matter halo.</b> Roughly 85–90% of the mass, extending several times further than the visible disc.
      It formed first, and ordinary matter fell into the gravitational wells it had already dug.</li>
      <li><b>Stars.</b> Arranged in a flattened rotating disc, a central bulge, and a sparse spherical halo of ancient
      globular clusters. Disc stars orbit in an ordered way; halo stars do not.</li>
      <li><b>Interstellar medium.</b> Gas and dust between the stars — neutral hydrogen (H I), ionised regions (H II)
      around hot young stars, and cold molecular clouds where new stars actually form.</li>
      <li><b>A supermassive black hole.</b> Nearly every large galaxy has one. Its mass tracks the bulge's velocity
      dispersion so tightly (the M–σ relation) that the two must have grown together.</li>
      <li><b>Cosmic rays and magnetic fields.</b> Often forgotten, but they carry comparable energy density to the
      gas and help regulate how quickly a galaxy can turn that gas into stars.</li>
    </ul>

    <h2>Classification <em>the Hubble sequence</em></h2>
    ${fork}

    <div class="cards">
      <div class="card">
        <div class="card-tag">Sa · Sb · Sc</div>
        <h4>Spiral</h4>
        <p>A thin rotating disc with arms, a central bulge, and plenty of cold gas — so they are still forming stars.
        The arms are not fixed structures but density waves: a traffic jam that stars orbit through.</p>
        <dl><dt>Share</dt><dd>≈ 60% of bright galaxies</dd><dt>Mass</dt><dd>10⁹ – 10¹² M☉</dd>
        <dt>Colour</dt><dd>Blue in the arms</dd><dt>Example</dt><dd>M33, M81</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">SBa · SBb · SBc</div>
        <h4>Barred spiral</h4>
        <p>A spiral with a straight bar of stars across the centre, from which the arms trail. The bar is an orbital
        resonance that funnels gas inward, feeding both starbursts and the central black hole. Ours is one.</p>
        <dl><dt>Share</dt><dd>two-thirds of spirals</dd><dt>Bar length</dt><dd>Milky Way: ~27,000 ly</dd>
        <dt>Example</dt><dd>NGC 1300, M83</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">E0 – E7</div>
        <h4>Elliptical</h4>
        <p>Featureless ellipsoids of old red stars on randomly oriented orbits, with little gas and almost no new
        star formation. Generally the product of major mergers. The largest galaxies known are all ellipticals.</p>
        <dl><dt>Share</dt><dd>≈ 10–15%</dd><dt>Mass</dt><dd>10⁷ – 10¹³ M☉</dd>
        <dt>Colour</dt><dd>Red and dead</dd><dt>Example</dt><dd>M87, IC 1101</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">S0</div>
        <h4>Lenticular</h4>
        <p>A disc galaxy that has used up or lost its gas: it still has the flattened rotating shape of a spiral, but
        no arms and no star formation. The transitional case sitting at the hinge of the tuning fork.</p>
        <dl><dt>Share</dt><dd>≈ 20%</dd><dt>Gas</dt><dd>Largely depleted</dd><dt>Example</dt><dd>M104 Sombrero</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">Irr I · Irr II</div>
        <h4>Irregular</h4>
        <p>No symmetry, usually small, usually gas-rich and vigorously forming stars. Many have been pulled out of
        shape by a larger neighbour — the Magellanic Clouds are being distorted by the Milky Way right now.</p>
        <dl><dt>Share</dt><dd>≈ 25% by number</dd><dt>Mass</dt><dd>10⁸ – 10¹⁰ M☉</dd>
        <dt>Example</dt><dd>LMC, SMC, M82</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">AGN · QSO</div>
        <h4>Active galaxies</h4>
        <p>Not a shape but a state: the central black hole is actively feeding, and the infalling matter outshines
        every star in the galaxy combined. Seyferts, radio galaxies, blazars and quasars are the same engine viewed
        from different angles and at different feeding rates.</p>
        <dl><dt>Power</dt><dd>up to 10⁴⁰ W</dd><dt>Jets</dt><dd>up to millions of ly</dd><dt>Example</dt><dd>M87, 3C 273</dd></dl>
      </div>
    </div>

    <h2>How they hold together</h2>
    <p>
      A galaxy should fly apart. Measure how fast the outer gas orbits, work out how much mass must lie inside that
      orbit to hold it, and you get a number several times larger than everything visible. This is the single most
      direct evidence for dark matter, and it has survived fifty years of scrutiny.
    </p>
    ${rotation}

    <h2>How big they get</h2>
    ${sizes}

    <h2>Where ours sits</h2>
    <ul class="bullets">
      <li><b>The Local Group</b> — about 80 galaxies within 10 million light years, dominated by Andromeda and the
      Milky Way. Almost all the rest are dwarf satellites of those two.</li>
      <li><b>The Virgo Supercluster</b> — roughly 110 million light years across, containing about 100 galaxy groups.</li>
      <li><b>Laniakea</b> — the supercluster defined in 2014 by mapping galaxy flows rather than positions: 520
      million light years wide, 10¹⁷ solar masses, and all of it draining toward the Great Attractor.</li>
      <li><b>The collision.</b> Andromeda is closing at 110 km/s. In roughly 4.5 billion years the two will merge
      into a single elliptical. Stellar collisions will be essentially nil — galaxies are mostly empty space.</li>
    </ul>

    <h2>Sources</h2>
    <ul class="sources">
      <li><b>Hubble (1926)</b> — Extragalactic nebulae, ApJ 64, 321</li>
      <li><b>Rubin &amp; Ford (1970)</b> — Rotation of the Andromeda nebula, ApJ 159, 379</li>
      <li><b>Conselice et al. (2016)</b> — The evolution of galaxy number density, ApJ 830, 83</li>
      <li><b>Tully et al. (2014)</b> — The Laniakea supercluster of galaxies, Nature 513, 71</li>
      <li><b>Bland-Hawthorn &amp; Gerhard (2016)</b> — The galaxy in context, ARA&amp;A 54, 529</li>
      <li><b>Event Horizon Telescope Collaboration (2019, 2022)</b> — M87* and Sgr A* results</li>
      <li><b>NASA/IPAC Extragalactic Database (NED); Sloan Digital Sky Survey</b></li>
    </ul>

    <div class="page-foot">
      <span>SPACE WORLD · CATALOGUE 03</span>
      <span>1 ly = 9.4607 × 10¹² km · 1 pc = 3.2616 ly</span>
    </div>
  </div>`;
}
