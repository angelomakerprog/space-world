import { figure, logTimeline, donut, lineChart, ACCENT, HOT, LIVE } from './charts.js';
import { expansionCone } from './cone.js';

/**
 * The origin and evolution of the universe.
 * Cosmological parameters are Planck 2018 (TT,TE,EE+lowE+lensing+BAO) unless
 * stated otherwise; the CMB temperature is the COBE/FIRAS measurement.
 */

const YR = 3.156e7;                 // seconds in a Julian year

const EPOCHS = [
  { t: 1e-43, label: 'PLANCK EPOCH', sub: '10⁻⁴³ s · 10³² K', color: HOT },
  { t: 1e-36, label: 'INFLATION BEGINS', sub: '10⁻³⁶ s', color: HOT },
  { t: 1e-32, label: 'INFLATION ENDS', sub: '10⁻³² s · ×10²⁶', color: HOT },
  { t: 1e-12, label: 'ELECTROWEAK SPLIT', sub: '10⁻¹² s · 10¹⁵ K', color: ACCENT },
  { t: 1e-6, label: 'QUARKS CONFINE', sub: '10⁻⁶ s · protons form', color: ACCENT },
  { t: 1, label: 'NEUTRINOS DECOUPLE', sub: '1 s · 10¹⁰ K', color: ACCENT },
  { t: 200, label: 'NUCLEOSYNTHESIS', sub: '10 s – 20 min · He forms', color: LIVE },
  { t: 1.6e12, label: 'MATTER–RADIATION EQUALITY', sub: '≈ 50,000 yr · z ≈ 3400', color: ACCENT },
  { t: 1.18e13, label: 'RECOMBINATION · CMB', sub: '380,000 yr · z ≈ 1090', color: LIVE },
  { t: 4.7e15, label: 'FIRST STARS', sub: '≈ 150 Myr · z ≈ 20', color: HOT },
  { t: 1.6e16, label: 'REIONISATION ENDS', sub: '≈ 1 Gyr · z ≈ 6', color: ACCENT },
  { t: 1.0e17, label: 'PEAK STAR FORMATION', sub: '≈ 3.3 Gyr · z ≈ 2', color: ACCENT },
  { t: 2.4e17, label: 'EXPANSION ACCELERATES', sub: '≈ 7.7 Gyr · z ≈ 0.6', color: HOT },
  { t: 2.9e17, label: 'SOLAR SYSTEM FORMS', sub: '9.2 Gyr · 4.57 Gya', color: LIVE },
  { t: 4.35e17, label: 'TODAY', sub: '13.787 Gyr · 2.725 K', color: '#ffffff' },
];

/** Scale factor a(t) for a flat ΛCDM universe — the actual solution, not a sketch. */
function scaleFactorCurve() {
  const Om = 0.3111, Ol = 0.6889;
  const H0 = 67.66 * 1.02271e-3;                  // km/s/Mpc → per Gyr
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = 0.02 + (i / 120) * 13.767;          // Gyr
    // a(t) = (Ωm/ΩΛ)^(1/3) · sinh^(2/3)(3/2 · √ΩΛ · H0 · t)
    const a = Math.pow(Om / Ol, 1 / 3) * Math.pow(Math.sinh(1.5 * Math.sqrt(Ol) * H0 * t), 2 / 3);
    pts.push([t, a]);
  }
  return pts;
}

/** What a matter-only universe would have done — for contrast. */
function matterOnlyCurve() {
  const pts = [];
  const norm = Math.pow(13.787, 2 / 3);
  for (let i = 0; i <= 120; i++) {
    const t = 0.02 + (i / 120) * 13.767;
    pts.push([t, Math.pow(t, 2 / 3) / norm]);
  }
  return pts;
}

/** Temperature falls as 1/a, so the whole thermal history is one straight-ish line. */
function temperatureCurve() {
  const pts = [];
  // T ≈ 2.725 K × (1 + z); parameterised by time using radiation then matter eras
  const anchors = [
    [1e-43, 1e32], [1e-32, 1e27], [1e-12, 1e15], [1e-6, 1e13], [1, 1e10],
    [200, 1e9], [1.6e12, 9500], [1.18e13, 2970], [4.7e15, 60],
    [1.6e16, 19], [2.9e17, 4.1], [4.35e17, 2.725],
  ];
  for (const [t, T] of anchors) pts.push([t / YR, T]);
  return pts;
}

export function renderSpace() {
  // Five of these events fall inside a single decade near the end, which no
  // single log axis can label legibly — so the history gets two panels, each
  // with its own scale, broken at one second.
  const cone = figure(
    'The shape of the expansion',
    expansionCone(),
    'The width of the funnel is how far apart two points now inside the observable universe were at that moment — so this is the expansion of space itself, not an explosion into it. Inflation is the near-vertical flare at the left, drawn on a compressed strip because it lasted 10<sup>-32</sup> seconds and would otherwise be invisible. Everything after it is plotted from the real flat-ΛCDM scale factor, which is why the trumpet flattens through the middle and then opens again on the right as dark energy takes over. The bright wall at 380,000 years is the surface of last scattering: look far enough in any direction and that is what you see, redshifted into the microwave background.'
  );

  const timelineEarly = figure(
    'Panel 1 — the first second',
    logTimeline(EPOCHS.filter((e) => e.t <= 1), {
      min: 1e-44, max: 3, tickStep: 5, lanes: 6,
      axisLabel: 'SECONDS SINCE THE BIG BANG →',
    }),
    'Forty-four orders of magnitude, all of it inside one second. Each labelled tick is a hundred-thousand-fold jump. By the end of this panel every proton and neutron that exists today has already formed.'
  );

  const timelineLate = figure(
    'Panel 2 — one second to the present',
    logTimeline(EPOCHS.filter((e) => e.t > 1), {
      min: 1, max: 1.4e18, tickStep: 3, lanes: 7,
      axisLabel: 'SECONDS SINCE THE BIG BANG →   (each event carries its age in years)',
    }),
    'Ticks stay in seconds so both panels share one unit; each event carries its own age in years. Note how the late history crowds the right-hand edge — everything from the first stars to today falls inside the last two decades of this axis. Ages are Planck 2018; redshifts <em>z</em> are given where they are the more natural marker.'
  );

  const composition = figure(
    'What the universe is made of',
    donut([
      { value: 68.9, label: 'Dark energy', color: '#8fc6ff', detail: 'A pressure driving expansion apart. Consistent with a cosmological constant Λ; nothing else about it is known.' },
      { value: 26.2, label: 'Dark matter', color: '#7dffb2', detail: 'Gravitates, but neither emits nor absorbs light. Holds galaxies together and seeded all large-scale structure.' },
      { value: 4.9, label: 'Ordinary matter', color: '#ffd48a', detail: 'Every atom — stars, planets, gas, dust, you. Most of it is diffuse intergalactic hydrogen, not stars.' },
    ]),
    'Planck 2018 density parameters: Ω<sub>Λ</sub> = 0.6889 ± 0.0056, Ω<sub>m</sub> = 0.3111, of which baryons contribute Ω<sub>b</sub> ≈ 0.0490. Everything humanity has ever observed directly is the smallest slice.'
  );

  const expansion = figure(
    'Expansion: deceleration, then acceleration',
    lineChart([
      { points: scaleFactorCurve(), color: ACCENT, label: 'ΛCDM (our universe)' },
      { points: matterOnlyCurve(), color: 'rgba(198,214,236,.42)', label: 'Matter only', dashed: true },
    ], {
      xMin: 0, xMax: 13.9, yMin: 0, yMax: 1.05,
      xTicks: [[0, '0'], [2, '2'], [4, '4'], [6, '6'], [8, '8'], [10, '10'], [12, '12'], [13.787, 'now']],
      yTicks: [[0, '0'], [0.25, '0.25'], [0.5, '0.5'], [0.75, '0.75'], [1, '1.0']],
      xLabel: 'BILLIONS OF YEARS SINCE THE BIG BANG',
      yLabel: 'SCALE FACTOR  a(t)',
      legendAlign: 'start',
      annotations: [
        { x: 7.7, y: 0.61, label: 'acceleration begins · z ≈ 0.6', color: HOT },
        { x: 13.787, y: 1.0, label: 'a = 1 today', color: '#fff', flip: true },
      ],
    }),
    'The scale factor is the size of the universe relative to today. Gravity slowed the expansion for the first eight billion years; then dark energy took over and it began speeding up. Curve computed from the exact flat-ΛCDM solution a(t) = (Ω<sub>m</sub>/Ω<sub>Λ</sub>)<sup>1/3</sup> sinh<sup>2/3</sup>(³⁄₂ √Ω<sub>Λ</sub> H₀t).'
  );

  const thermal = figure(
    'Cooling from 10³² K to 2.7 K',
    lineChart([{ points: temperatureCurve(), color: HOT, label: 'Temperature' }], {
      xLog: true, yLog: true,
      xMin: 1e-51, xMax: 2e10, yMin: 1, yMax: 1e32,
      xTicks: [[1e-51, '10⁻⁵¹ yr'], [1e-40, '10⁻⁴⁰'], [1e-30, '10⁻³⁰'], [1e-20, '10⁻²⁰'],
        [1e-10, '10⁻¹⁰'], [1, '1 yr'], [1e5, '10⁵'], [1e10, '10¹⁰ yr']],
      yTicks: [[1, '1 K'], [1e6, '10⁶'], [1e12, '10¹²'], [1e18, '10¹⁸'], [1e24, '10²⁴'], [1e32, '10³² K']],
      xLabel: 'TIME SINCE THE BIG BANG', yLabel: 'TEMPERATURE (K)',
      annotations: [
        { x: 1.18e13 / YR, y: 2970, label: 'atoms form · light escapes', color: LIVE },
        { x: 4.35e17 / YR, y: 2.725, label: '2.725 K today', color: '#fff', flip: true },
      ],
    }),
    'Temperature falls in step with expansion: T ∝ 1/a. The kink at 380,000 years is where the universe became transparent — the photons released at that instant are still arriving, redshifted by a factor of 1,090 into the microwave background.'
  );

  return `
  <div class="page">
    <div class="page-eyebrow">CATALOGUE · 01 · SPACE</div>
    <h1>The universe began<br><b>13.787 billion years ago</b></h1>
    <p class="page-lede">
      Not an explosion in space — an expansion <em>of</em> space, everywhere at once, from a state so hot and dense
      that the known laws of physics stop describing it. Everything that exists was once in causal contact, at a
      temperature of 10³² kelvin, in a volume smaller than an atom. What follows is the best-measured origin story
      in science, and the evidence that supports it.
    </p>

    <dl class="keynums">
      <div><dt>Age</dt><dd>13.787<span>± 0.020 billion years</span></dd></div>
      <div><dt>Observable diameter</dt><dd>93 Gly<span>8.8 × 10²³ km</span></dd></div>
      <div><dt>Hubble constant</dt><dd>67.4<span>km/s per megaparsec</span></dd></div>
      <div><dt>CMB temperature</dt><dd>2.7255 K<span>−270.42 °C</span></dd></div>
      <div><dt>Geometry</dt><dd>Flat<span>Ω<sub>k</sub> = 0.001 ± 0.002</span></dd></div>
      <div><dt>Galaxies</dt><dd>~2 × 10¹²<span>estimated, observable volume</span></dd></div>
    </dl>

    <h2>The shape of it <em>one picture, whole history</em></h2>
    <p>
      Space did not explode into anything. It <em>stretched</em>, everywhere at once, and it is still stretching —
      faster now than it was five billion years ago. Read this left to right: the flare at the far left is inflation,
      the bright wall is the moment the universe turned transparent, and the mouth on the right is today.
    </p>
    ${cone}

    <h2>The first second <em>where nearly everything happened</em></h2>
    <p>
      The universe's entire particle physics played out before you could finish saying the word. Read the timeline
      below from left to right: by the time it reaches the middle, atoms already exist and the cosmos is 380,000
      years old. The remaining 13.8 billion years occupy only the last stretch.
    </p>
    ${timelineEarly}
    ${timelineLate}

    <h2>Epoch by epoch</h2>
    <div class="cards">
      <div class="card">
        <div class="card-tag">t &lt; 10⁻⁴³ s</div>
        <h4>Planck epoch</h4>
        <p>Gravity is as strong as the other three forces and spacetime itself is quantum. No existing theory
        describes this interval — it is the honest edge of what physics can currently say.</p>
        <dl><dt>Temperature</dt><dd>&gt; 10³² K</dd><dt>Size</dt><dd>10⁻³⁵ m scale</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">10⁻³⁶ – 10⁻³² s</div>
        <h4>Inflation</h4>
        <p>Space expands by a factor of at least 10²⁶ in a fraction of a fraction of a second. This is what makes
        the universe flat and uniform, and it stretched quantum fluctuations into the seeds of every galaxy.</p>
        <dl><dt>Growth</dt><dd>≥ 10²⁶ ×</dd><dt>Evidence</dt><dd>CMB anisotropy spectrum</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">10⁻¹² – 10⁻⁶ s</div>
        <h4>Quark epoch</h4>
        <p>The electroweak force splits into electromagnetism and the weak force. A soup of free quarks and gluons
        fills space, too hot to bind. At 10⁻⁶ s it cools enough for quarks to confine into protons and neutrons.</p>
        <dl><dt>Temperature</dt><dd>10¹⁵ → 10¹³ K</dd><dt>State</dt><dd>Quark–gluon plasma</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">10 s – 20 min</div>
        <h4>Nucleosynthesis</h4>
        <p>Protons and neutrons fuse into the first nuclei, then the universe cools below the threshold and fusion
        shuts off. The proportions frozen in during these minutes still match what we measure today.</p>
        <dl><dt>Hydrogen</dt><dd>≈ 75% by mass</dd><dt>Helium-4</dt><dd>≈ 25%</dd><dt>Deuterium</dt><dd>D/H ≈ 2.5 × 10⁻⁵</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">380,000 yr</div>
        <h4>Recombination</h4>
        <p>At 3,000 K, nuclei finally capture electrons. Photons stop scattering off free electrons and fly free for
        the first time. That flash is the cosmic microwave background — the oldest light there is.</p>
        <dl><dt>Redshift</dt><dd>z ≈ 1090</dd><dt>Then</dt><dd>2,970 K</dd><dt>Now</dt><dd>2.7255 K</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">0.4 – 150 Myr</div>
        <h4>The dark ages</h4>
        <p>No stars exist. The universe is neutral hydrogen and helium, slowly clumping under gravity in the
        scaffolding laid down by dark matter. There is nothing to see, because nothing is shining.</p>
        <dl><dt>Radiation</dt><dd>21 cm hydrogen line</dd><dt>Redshift</dt><dd>z ≈ 1100 → 30</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">≈ 150 Myr</div>
        <h4>First light</h4>
        <p>Population III stars ignite — enormous, metal-free, short-lived. Their ultraviolet output reionises the
        surrounding hydrogen, and their supernovae forge the first elements heavier than lithium.</p>
        <dl><dt>Masses</dt><dd>10 – 1000 M☉</dd><dt>Lifetimes</dt><dd>a few Myr</dd></dl>
      </div>
      <div class="card">
        <div class="card-tag">7.7 Gyr – now</div>
        <h4>Dark energy era</h4>
        <p>Matter has thinned out enough that dark energy dominates the energy budget. The expansion stops slowing
        and starts accelerating — the discovery that won the 2011 Nobel Prize in Physics.</p>
        <dl><dt>Transition</dt><dd>z ≈ 0.6</dd><dt>Ω<sub>Λ</sub></dt><dd>0.689</dd></dl>
      </div>
    </div>

    <h2>Composition <em>95% of it is unidentified</em></h2>
    <p>
      Add up everything that emits, absorbs or reflects light — every star, planet, cloud of gas and grain of dust —
      and you have accounted for about <strong>five percent</strong> of the universe. The rest announces itself only
      through gravity and through the expansion history.
    </p>
    ${composition}

    <h2>How space has expanded</h2>
    ${expansion}

    <h2>The thermal history</h2>
    ${thermal}

    <h2>Why we believe it</h2>
    <p>
      The Big Bang model is not one observation but four independent lines of evidence that all converge on the same
      age, the same composition, and the same early temperature.
    </p>
    <ul class="bullets">
      <li><b>The expansion itself.</b> Hubble showed in 1929 that galaxies recede at speeds proportional to their
      distance. Run that backwards and everything meets at a finite time in the past.</li>
      <li><b>The cosmic microwave background.</b> Predicted in 1948, found by accident in 1964. It is a near-perfect
      blackbody at 2.7255 K in every direction — the most precisely measured blackbody spectrum in nature — with
      temperature ripples of one part in 100,000 that encode the composition of the early universe.</li>
      <li><b>Primordial element abundances.</b> Big Bang nucleosynthesis predicts about 75% hydrogen and 25% helium-4
      by mass, plus trace deuterium and lithium. Measurements of the most pristine gas clouds match, and deuterium
      in particular pins down the density of ordinary matter.</li>
      <li><b>Large-scale structure.</b> The galaxy distribution today, including the 490-million-light-year baryon
      acoustic scale, is exactly what the CMB ripples grow into after 13.8 billion years of gravity.</li>
    </ul>

    <h2>Open problems <em>honestly unresolved</em></h2>
    <ul class="bullets">
      <li><b>The Hubble tension.</b> Measuring the expansion rate from the CMB gives 67.4 km/s/Mpc; measuring it from
      nearby supernovae gives about 73.0. Both are precise, and they disagree by roughly five standard deviations.
      Either something is wrong with a measurement, or something is missing from the model.</li>
      <li><b>What dark energy is.</b> A cosmological constant fits the data, but the value predicted by quantum field
      theory is too large by up to 120 orders of magnitude — the worst prediction in the history of physics.</li>
      <li><b>What dark matter is.</b> Decades of direct-detection experiments have found nothing. Its existence is
      inferred entirely from gravitational effects.</li>
      <li><b>What came before.</b> The model describes the universe from 10⁻³² s onward. It says nothing about
      whether "before" is even a meaningful word.</li>
    </ul>

    <h2>Sources</h2>
    <ul class="sources">
      <li><b>Planck Collaboration (2020)</b> — Planck 2018 results VI: Cosmological parameters, A&amp;A 641, A6</li>
      <li><b>Fixsen (2009)</b> — The temperature of the cosmic microwave background, ApJ 707, 916</li>
      <li><b>Riess et al. (2022)</b> — SH0ES: H₀ = 73.04 ± 1.04 km/s/Mpc, ApJL 934, L7</li>
      <li><b>Cyburt, Fields, Olive &amp; Yeh (2016)</b> — Big Bang nucleosynthesis: present status, Rev. Mod. Phys. 88</li>
      <li><b>Perlmutter et al. (1999); Riess et al. (1998)</b> — Accelerating expansion from Type Ia supernovae</li>
      <li><b>Penzias &amp; Wilson (1965)</b> — A measurement of excess antenna temperature at 4080 Mc/s</li>
      <li><b>NASA / IPAC Extragalactic Database; NASA LAMBDA archive</b></li>
    </ul>

    <div class="page-foot">
      <span>SPACE WORLD · CATALOGUE 01</span>
      <span>PARAMETERS: PLANCK 2018 TT,TE,EE+lowE+lensing+BAO</span>
    </div>
  </div>`;
}
