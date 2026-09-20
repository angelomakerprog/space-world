/**
 * Long-form content for the individual body pages.
 * `madeOf` is the dominant constituent by mass with the runners-up; for the
 * gas giants that means the atmosphere, since there is no surface to speak of.
 */

export const PROFILES = {
  sol: {
    distText: '0 AU — the barycentre',
    distSub: 'Everything else orbits this',
    madeOf: 'Hydrogen 73.8%',
    madeOfSub: 'Helium 24.9% · oxygen, carbon, iron 1.3%',
    descrip: `A ball of plasma 1.39 million kilometres across, held together by its own gravity and held up by the energy of nuclear fusion in its core. It contains 99.86% of all the mass in the Solar System — everything else, every planet, moon, asteroid and comet, is a rounding error on what was left over. At its centre, 15.7 million kelvin and 250 billion atmospheres of pressure force hydrogen nuclei close enough to fuse, converting 600 million tonnes of hydrogen into helium every second and losing 4.3 million tonnes of that as pure energy. It has been doing this for 4.6 billion years and has enough fuel for roughly five billion more.`,
    funFact: `A photon born in the core takes on the order of 100,000 years to fight its way to the surface, absorbed and re-emitted countless times along the way — then crosses the 150 million kilometres to Earth in 8 minutes and 19 seconds. The sunlight on your skin left the core before humans existed.`,
  },

  mercury: {
    distText: '0.387 AU',
    distSub: '57.9 million km from the Sun',
    madeOf: 'Iron core — 85% of its radius',
    madeOfSub: 'Silicate mantle and crust · trace sodium exosphere',
    descrip: `The smallest planet and the closest to the Sun, Mercury is essentially a huge iron core wearing a thin rock shell — its metallic heart makes up about 85% of its radius, proportionally the largest of any planet. It is also the fastest, sweeping around the Sun at 47.4 km/s in just 88 days. With almost no atmosphere to move heat around, the difference between its sunlit and shadowed surfaces is the most extreme of any planet: 430 °C in the day, −180 °C at night. Its cratered face has barely changed in billions of years.`,
    funFact: `Mercury is locked in a 3:2 spin–orbit resonance: it turns exactly three times for every two orbits. The upshot is that a single solar day there — sunrise to sunrise — lasts 176 Earth days, which is two full Mercurian years. Stand in the right place and you can watch the Sun rise, stop, reverse briefly, and then continue.`,
  },

  venus: {
    distText: '0.723 AU',
    distSub: '108.2 million km from the Sun',
    madeOf: 'Carbon dioxide 96.5% (atmosphere)',
    madeOfSub: 'Nitrogen 3.5% · sulphuric acid clouds · basalt surface',
    descrip: `Almost exactly Earth's twin in size and density, and about as different a world as it is possible to be. A carbon dioxide atmosphere ninety-two times heavier than Earth's traps heat so effectively that the surface sits at 464 °C — hotter than Mercury's, despite being twice as far from the Sun — and hot enough to melt lead. The clouds are sulphuric acid. Surface pressure equals being 900 metres under Earth's ocean. Every probe ever landed there died within two hours.`,
    funFact: `Venus turns backwards, and it does so more slowly than it orbits: one rotation takes 243 Earth days, one year takes 225. Its day is longer than its year. If you could see through the clouds, the Sun would rise in the west and set in the east, twice per Venusian year.`,
  },

  earth: {
    distText: '1.000 AU',
    distSub: '149.6 million km from the Sun',
    madeOf: 'Iron 32.1% (whole planet)',
    madeOfSub: 'Oxygen 30.1% · silicon 15.1% · magnesium 13.9%',
    descrip: `The only place in the universe known to carry life. Seventy-one percent of the surface is liquid water, held there by a temperature range that exists because Earth sits in a narrow orbital band and holds an atmosphere thick enough to keep it. A molten iron outer core generates a magnetic field that deflects the solar wind, without which the atmosphere would have been stripped away long ago — as Mars's was. Plate tectonics, unique among known worlds, continuously recycles the crust and regulates carbon over geological time.`,
    funFact: `Earth's oversized Moon — a quarter of its diameter — stabilises the planet's 23.4° axial tilt. Without it, that tilt would wander chaotically over tens of degrees, and the seasons with it. Mars, with only two tiny captured moons, has swung between 13° and 45° in the past.`,
  },

  mars: {
    distText: '1.524 AU',
    distSub: '227.9 million km from the Sun',
    madeOf: 'Iron oxide dust — the rust',
    madeOfSub: 'Basalt crust · CO₂ atmosphere at 0.6% of Earth’s pressure',
    descrip: `A cold desert half the width of Earth, red because its surface is quite literally rusted — iron oxide dust coats everything. It once had rivers, lakes and possibly an ocean covering its northern third; the dried channels and delta deposits are still there, and rovers have found the clays and sulphates that only form in water. Then it lost its magnetic field, the solar wind stripped the atmosphere, and the water froze or escaped. What is left is 0.6% of Earth's air pressure and an average temperature of −63 °C.`,
    funFact: `Mars has the tallest volcano in the Solar System — Olympus Mons, 21.9 km high and roughly the size of France — and the largest canyon, Valles Marineris, which runs 4,000 km, a fifth of the way around the planet. Grand Canyon would be a side channel.`,
  },

  jupiter: {
    distText: '5.203 AU',
    distSub: '778.5 million km from the Sun',
    madeOf: 'Hydrogen ~90% by volume',
    madeOfSub: 'Helium ~10% · methane, ammonia, water traces',
    descrip: `More massive than every other planet combined, and then doubled. Jupiter is a failed star in the sense that it is made of the same hydrogen and helium as the Sun — it simply never gathered enough mass to ignite fusion. It has no surface: the atmosphere just gets denser until hydrogen is compressed into a metallic liquid that conducts electricity and generates a magnetic field 20,000 times stronger than Earth's. Its gravity has shaped the entire Solar System, clearing and shepherding the asteroid belt and deflecting comets.`,
    funFact: `The Great Red Spot is a storm that has been running for at least 190 years and probably 350 — wide enough to swallow the Earth whole, with winds of 430 km/h. It is slowly shrinking; in the 1800s it was more than twice as wide as it is now.`,
  },

  saturn: {
    distText: '9.537 AU',
    distSub: '1.434 billion km from the Sun',
    madeOf: 'Hydrogen ~96% by volume',
    madeOfSub: 'Helium ~3% · rings are 99.9% water ice',
    descrip: `The least dense planet in the Solar System — its average density is 0.687 g/cm³, which is to say that if you found a bathtub big enough, Saturn would float. What makes it unmistakable is the ring system: 282,000 km across yet, on average, only about ten metres thick, made of billions of chunks of nearly pure water ice ranging from grains of dust to houses. They are held in place and carved into gaps by the gravity of dozens of small shepherd moons.`,
    funFact: `There is a hexagon at Saturn's north pole. A genuine six-sided jet stream, 30,000 km across, each side longer than Earth's diameter, that has held its shape since Voyager first photographed it in 1981. Nothing else like it is known anywhere.`,
  },

  uranus: {
    distText: '19.19 AU',
    distSub: '2.871 billion km from the Sun',
    madeOf: 'Water, methane and ammonia ices',
    madeOfSub: 'Hydrogen/helium envelope · methane gives the cyan',
    descrip: `An ice giant, tipped on its side. Uranus's axis is inclined 97.8°, meaning it effectively rolls around its orbit rather than spinning upright — almost certainly the result of a colossal collision early in its history. The consequence is the most extreme seasons anywhere: each pole spends 42 years in continuous sunlight, then 42 years in continuous darkness. Methane in the upper atmosphere absorbs red light, which is why the disc is that flat, featureless cyan.`,
    funFact: `It is the coldest planet in the Solar System — colder than Neptune, which is 1.6 billion kilometres further out. Uranus's minimum recorded temperature is −224 °C. Whatever the collision that knocked it over did, it seems to have also driven out most of the planet's internal heat.`,
  },

  neptune: {
    distText: '30.07 AU',
    distSub: '4.495 billion km from the Sun',
    madeOf: 'Water, methane and ammonia ices',
    madeOfSub: 'Hydrogen/helium envelope · methane gives the blue',
    descrip: `The outermost planet, and the only one found by mathematics before anyone looked. Discrepancies in Uranus's orbit implied an unseen body pulling on it; Urbain Le Verrier calculated where it must be, and Johann Galle found it there within an hour of looking, on the night of 23 September 1846. It is the densest of the giant planets and radiates 2.6 times more energy than it receives from the Sun, from a heat source that is still not fully explained.`,
    funFact: `Neptune has the fastest winds measured anywhere in the Solar System — up to 2,100 km/h, supersonic, on a planet receiving 1/900th of Earth's sunlight. There is nowhere near enough solar energy to drive them, which remains an open problem.`,
  },

  pluto: {
    distText: '39.48 AU (mean)',
    distSub: '4.4 – 7.4 billion km — a very eccentric orbit',
    madeOf: 'Water-ice bedrock, 50–70% rock by mass',
    madeOfSub: 'Nitrogen, methane and CO ice surface · thin N₂ atmosphere',
    descrip: `Discovered in 1930, reclassified as a dwarf planet in 2006, and photographed properly for the first time in July 2015 when New Horizons flew past at 14 km/s. What it found was not the dead ice ball everyone expected: nitrogen glaciers flowing like Earth's ice sheets, water-ice mountains 3.5 km high, a haze layer in the thin atmosphere reaching 200 km up, and a plain so young that it has no impact craters at all — meaning something is still resurfacing it today.`,
    funFact: `Pluto and its largest moon Charon are close enough in size that they orbit a point in empty space between them. They are also mutually tidally locked: each keeps the same face permanently turned toward the other, so from one side of Pluto, Charon hangs motionless in the sky forever, and from the other side it is never visible at all.`,
  },

  luna: {
    distText: '384,400 km from Earth',
    distSub: '0.00257 AU · 1.28 light-seconds',
    madeOf: 'Oxygen 43% (locked in silicates)',
    madeOfSub: 'Silicon 21% · aluminium 10% · calcium, iron, magnesium',
    descrip: `Almost certainly the debris of a collision: about 4.5 billion years ago a Mars-sized body struck the young Earth, and the material thrown into orbit coalesced. The dark patches are maria — vast basaltic plains flooded by ancient lava, which is why they are smoother and less cratered than the bright highlands. With no atmosphere and no plate tectonics, its surface is a near-perfect record of 4 billion years of impacts, including footprints that will outlast every structure on Earth.`,
    funFact: `The Moon is tidally locked, so we only ever see one face — but it is also drifting away at 3.8 cm per year, and Earth's rotation is slowing to pay for it. Four hundred million years ago an Earth day was about 22 hours long. Eventually the Moon will be too far away to produce total solar eclipses at all.`,
  },
};
