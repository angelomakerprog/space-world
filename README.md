# SPACE WORLD

A real-time Solar System simulation and visual catalogue, built for OLED black.
Every surface in it — planets, the Sun, the Milky Way, galaxies — is generated
procedurally from 3D noise at load time. There are no image assets.

```bash
npm run dev
```

Then open **http://localhost:5173**.

---

## What's actually simulated

**Positions are real.** All nine bodies — the eight planets plus Pluto — are
propagated with JPL's *Keplerian Elements for Approximate Positions of the
Major Planets* (valid 1800–2050), including the per-century rates. Kepler's equation is solved by Newton iteration every frame.
On 25 Aug 2026 the model puts Earth at heliocentric longitude 332.2° — which is
where it is.

**Rotation is real.** Sidereal day lengths drive spin, so Venus turns backwards
over 243 days and Jupiter completes a turn in under 10 hours. Axial tilts are
applied, and the Moon is tidally locked.

**Structure is real.** The main belt carries the Kirkwood gaps — the resonance
lanes Jupiter clears at 2.06, 2.50, 2.82, 2.96 and 3.27 AU. Jupiter's Trojans
ride the L4 and L5 points 60° ahead of and behind it. Saturn's rings carry the
Cassini Division and cast a shadow computed from the planet's real shadow
cylinder.

## The visuals

| Element | How it's made |
| --- | --- |
| Planet surfaces | 3D value-noise fBm sampled at spherical coordinates, so equirectangular maps are seamless at the date line and free of polar smearing |
| Earth | Domain-warped continents, a latitude+moisture climate model, ice caps, a separately-rotating cloud deck banded by circulation cell, and city lights that only emit on the night hemisphere |
| Gas giants | Zonal band profile sheared by strongly zonally-stretched turbulence; the Great Red Spot is a vortex with real swirl |
| Rocky worlds | Impact craters rasterised into a height field with bowl / rim / ejecta profiles; lunar maria; Tharsis and Valles Marineris on Mars |
| Atmospheres | Limb glow derived from the view ray's impact parameter, so brightness peaks just above the surface and decays with altitude — no hard-edged fresnel shell |
| Stars | 120,000 points drawn from the real spectral class distribution (O→M) with their true colour temperatures and a luminosity bias, so a few stars carry the eye and the rest are barely there |
| Milky Way | A painted sky dome — band, star clouds and the dark dust lanes of the Great Rift — rotated onto the galactic plane, which is why it crosses the ecliptic at ~60° |
| Galaxies | 28 real objects with real distances and morphologies, kept out of the galactic plane because dust really does hide that strip (the Zone of Avoidance) |
| Black holes | Accretion disc with relativistic Doppler beaming on the approaching limb, a photon ring at the shadow's edge, and jets on the quasars — the EHT signature. Sgr A*, M87*, Cygnus X-1, TON 618, GW150914 and more |
| Supernovae | Six remnants plus one candidate, each with its own emission signature — the Crab's synchrotron core, SN 1987A's triple ring, Type Ia shells, the Veil's shock filaments, Eta Carinae's bipolar lobes. Galactic objects are placed near the galactic plane, where they actually are |

## Controls

| | |
| --- | --- |
| Click anything | Fly to it — see **Travel** below |
| `/` or `Ctrl-K` | Search |
| Drag | Orbit |
| **WASD** / arrows | Pan left, right, up, down |
| Right-drag | Pan |
| `C` | Recentre on the Sun |
| Scroll | Zoom |
| Hover | Circles a body or galaxy and fills the TARGET panel. Belts show their rim outlines instead of a reticle |
| `Space` | Pause / resume |
| `,` `.` | Halve / double the time rate |
| `R` | Reverse the flow of time |
| `N` | Jump back to real now |
| `O` | Toggle orbit trails |
| `L` | Toggle labels |

The time scale across the top adapts to the rate, from **15 sec/div** at real
time up to **250 yr/div** at ten years per second, and marks both *now* and
J2000. Rate is adjustable by slider, by the ±buttons, or by the six presets
(1 second → 1 year per second).

## Scale

The system is mostly emptiness, so two compression curves make it legible while
keeping every ratio monotonic:

- **Distance** — `38 · √AU`, so Mercury sits at 24 units and Neptune at 208.
- **Body radius** — `1.5 · √(km / 6371)`, Earth = 1.5 units.

Direction is never compressed, only radius. **Every figure in the HUD is the
true one** — radii in km, masses in kg, real orbital periods and velocities.

## Layout

```
src/
  core/     clock, Kepler propagation, scale compression
  data/     the catalogue — orbital elements and physical values
  gfx/      noise, texture generation, sun, planets, starfield,
            galaxies, small bodies, hover reticle
  ui/       HUD, adaptive time scale, navigation, language, formatting
```

`window.__space` is exposed for inspection: `view()`, `shot()`, `run(n)`,
`pickAt(x, y)`, plus direct handles on the scene, camera and clock.
`tools/shot-server.mjs` is a dev-only sink that writes frames captured by
`__space.shot()` to `shots/` — run it with `node tools/shot-server.mjs`.

## Loading

Surfaces cost a few seconds to generate, so the sky and the Sun go up first
(~0.7 s) and the planets stream in behind them while you're already able to
look around.

## Travel

Nothing cuts. Clicking an object, or picking one from the search bar, flies the
camera there: accelerating out, cruising, decelerating in, with the field of
view punching wider at peak speed and a field of streaks scrolling past. That
flight is the only thing that conveys how far apart these objects actually are.

The streaks belong to a *commanded* flight and nothing else. Driving them off raw
camera speed meant every orbit drag and arrow-key pan lit the warp tunnel, which
made the effect meaningless.

The streaks are drawn **after** post-processing rather than through it. Feeding
a screenful of additive lines into the bloom pass poisons its blur chain and
blacks out the entire frame — and they should not bloom anyway, being already
the brightest thing on screen.

What happens on arrival depends on what you picked:

- **The Sun, the eight planets, Pluto and the Moon** open an illustrated page:
  a live, separately-lit, still-rotating copy of the world with its real axial
  tilt and spin direction, its name and headline numbers on the left, and a
  description, a fun fact and full specifications on the right. The camera
  behind the page eases back out to a system-wide view, so what you read
  against is the blurred Solar System.
- **Everything else** — galaxies, black holes, supernova remnants, the belts —
  gets a card with its name, class and a short description, with the object
  itself filling the frame behind it.

**Earth** additionally splits into four clickable regions. They are parented to
the surface, so they turn with it and every longitude comes around as the globe
rotates. Clicking one reads the real latitude and longitude of the point you hit
and drops you into the sky from there.

## The sky

Standing on Earth, looking up. The whole celestial sphere is built in J2000
equatorial coordinates and then rotated by the observer's latitude and the local
sidereal time computed from the simulation clock — so what is above the horizon
is what would really be above it. Change the date, or stand somewhere else, and
different constellations rise.

From 42° N in late August the Summer Triangle sits overhead and Scorpius hugs the
southern horizon; from 33° S the Southern Cross, Centaurus and Carina are up and
the Big Dipper is gone entirely. Both are just consequences of the geometry, not
special cases.

- **46 constellations** with real star coordinates and conventional stick
  figures. Hover one to light it up and read its name, meaning and brightest
  members. (The figures are conventional because there is no official set of
  joining lines — atlases differ.)
- Background stars are placed in galactic coordinates and converted to equatorial
  through the real galactic pole, so the Milky Way band cuts the sky at the angle
  it actually does.
- Drag to look, scroll to zoom, `Esc` to leave. A compass and the observer's
  coordinates and sidereal time sit in the chrome.

There is also a **Constellations** shortcut under *The Stars* in the catalogue,
which opens the sky from a default vantage.

## Search

`/` or `Ctrl-K`. Matches names and designations across every object and the
three catalogue pages, ranked prefix → word-start → substring. Typing
**"solar system"** (or *home*, or *reset*) offers **RESET VIEW**, which flies
you back to the opening framing — the un-lost button.

## The catalogue

All four sections are live. The three article pages open over the canvas — the
star field, Milky Way, galaxies and deep-sky objects keep rendering behind them,
while the Solar System's own objects step aside. `Esc` or the back control
returns you. Each page deep-links by hash (`#/space`, `#/galaxies`, `#/stars`).

They use the full width of the display, and their sections rise and un-blur as
they scroll into view rather than simply being there. A closed overlay is taken
out of painting entirely — a full-screen `backdrop-filter` keeps costing the
compositor even at zero opacity.

**01 · Space** — the origin and evolution of the universe. It opens with the
**expansion cone**: the funnel most people picture, time running left to right,
with inflation as a near-vertical flare on a compressed strip and the mouth of
the trumpet opening again on the right as dark energy takes over. Everything
after inflation is plotted from the real flat-ΛCDM scale factor, so the bell is
computed rather than sketched. Below it, for precision, a two-panel
logarithmic timeline (broken at one second, because five events fall inside a
single decade near the end and no one axis can label them), the composition
donut, the expansion history computed from the exact flat-ΛCDM solution
a(t) = (Ω<sub>m</sub>/Ω<sub>Λ</sub>)<sup>1/3</sup> sinh<sup>2/3</sup>(³⁄₂√Ω<sub>Λ</sub>H₀t),
and the thermal history from 10³² K to 2.725 K. Parameters are Planck 2018.
The open problems — the Hubble tension, the cosmological constant problem — are
stated as unresolved, because they are.

**03 · The Galaxies** — what they contain, how they hold together, and how they
are classified. A drawn Hubble tuning fork with real logarithmic spiral arms
(pitch angle is what separates Sa from Sc), rotation curves showing the dark
matter discrepancy, and a log-scale size chart from a 100 ly dwarf to
Alcyoneus's 16 Mly radio lobes, in light years and kilometres.

**04 · The Stars** — composition, fusion, structure, and the full spectral
sequence. A blackbody spectrum bar computed from the Planckian locus, with every
class O→M plus the sub-stellar L, T and Y drawn at its true relative size and
true colour; select one to read it. Plus an H-R diagram whose main sequence is
interpolated from empirical (mass, temperature, luminosity) anchors rather than
a power law, so it curves the way the real one does.

## Language

Bottom right, an **EN / FR** switch. The choice is remembered in
`localStorage`, so it survives a reload.

English is the source language: it lives in the data files and the page
templates, and `t(key, fallback)` returns the fallback untouched when English
is selected. Only French needs a dictionary, and anything missing from it
falls through to English rather than to a blank.

Long-form prose is not keyed. `src/ui/i18n.js` keeps a map from rendered
English to French and swaps whole blocks by matching their inner HTML, so the
templates stay readable and nothing has to be kept in sync by hand. A
`MutationObserver` runs the same pass over anything injected later — the
spectral class panel, the entity card, a constellation's story — which is why
those translate without any of them knowing the switch exists. Two guards keep
that safe: a block containing an element with an `id` is never rewritten, since
some other module holds a reference to it, and a translation identical to its
source is skipped so the observer cannot chase its own tail.

```
src/data/fr-sky.js       46 constellations — meaning, note, myth, French names
src/data/fr-content.js   body profiles, telescopes, deep sky, galaxies
src/data/fr-pages.js     the three catalogue articles, including chart labels
```

Translated: the whole interface, all three articles and their SVG charts, every
body page, the telescopes and the eyepiece, and the sky — constellation names,
star names, notes and the full myths. Numeric formatting inside spec tables
(`18.66 h`, `0.0539`) stays in the English convention.

## Not built yet

- Nothing outstanding from the current list.
