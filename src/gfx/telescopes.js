import * as THREE from 'three';
import { TELESCOPES } from '../data/telescopes.js';
import { auToUnits } from '../core/scale.js';

/**
 * The three famous telescopes, drawn small and placed where they really are.
 *
 * Two of them need an honest exaggeration to be visible: Hubble orbits 535 km
 * above a planet that is 1.5 scene units wide, and JWST sits 0.01 AU beyond
 * Earth, which at this scale is a fifth of a unit. Their cards give the real
 * figures; the scene gives them enough room to be seen and clicked.
 */

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, x: c.getContext('2d') };
}

function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A silvered tube with two solar wings. */
function hubbleSprite(size = 128) {
  const { c, x } = canvas(size);
  const s = size / 128;
  x.translate(size / 2, size / 2);
  x.rotate(-0.35);

  x.fillStyle = 'rgba(120,150,190,.85)';
  x.fillRect(-34 * s, -3.5 * s, 26 * s, 7 * s);      // port wing
  x.fillRect(8 * s, -3.5 * s, 26 * s, 7 * s);        // starboard wing
  x.fillStyle = 'rgba(60,90,140,.9)';
  for (let i = 0; i < 5; i++) {
    x.fillRect((-33 + i * 5) * s, -3.5 * s, 1.4 * s, 7 * s);
    x.fillRect((9 + i * 5) * s, -3.5 * s, 1.4 * s, 7 * s);
  }

  const g = x.createLinearGradient(0, -9 * s, 0, 9 * s);
  g.addColorStop(0, '#e9eef6');
  g.addColorStop(0.5, '#aab6c6');
  g.addColorStop(1, '#6d7787');
  x.fillStyle = g;
  x.fillRect(-9 * s, -9 * s, 18 * s, 18 * s);        // body
  x.fillStyle = '#11161f';
  x.fillRect(-9 * s, -7 * s, 3 * s, 14 * s);         // open aperture door
  x.strokeStyle = 'rgba(255,255,255,.55)';
  x.lineWidth = 1 * s;
  x.strokeRect(-9 * s, -9 * s, 18 * s, 18 * s);
  return texture(c);
}

/** Gold hexagons over a diamond sunshield. */
function jwstSprite(size = 128) {
  const { c, x } = canvas(size);
  const s = size / 128;
  x.translate(size / 2, size / 2 + 6 * s);

  // sunshield: five stacked kite-shaped layers
  for (let i = 4; i >= 0; i--) {
    x.beginPath();
    x.moveTo(0, (14 + i * 2.2) * s);
    x.lineTo(-40 * s, (2 + i * 2.2) * s);
    x.lineTo(0, (-10 + i * 2.2) * s);
    x.lineTo(40 * s, (2 + i * 2.2) * s);
    x.closePath();
    x.fillStyle = `rgba(150,168,196,${0.20 + i * 0.06})`;
    x.fill();
    x.strokeStyle = 'rgba(200,220,255,.32)';
    x.lineWidth = 0.7 * s;
    x.stroke();
  }

  // the mirror: eighteen hexagons in a honeycomb
  const hex = (cx, cy, r) => {
    x.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k + Math.PI / 6;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      k ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath();
    x.fillStyle = '#ffca4a';
    x.fill();
    x.strokeStyle = 'rgba(120,80,10,.7)';
    x.lineWidth = 0.6 * s;
    x.stroke();
  };
  const r = 5.4 * s, dx = r * Math.sqrt(3), dy = r * 1.5;
  const rows = [[-2, 2], [-2, 2], [-3, 3], [-2, 2], [-2, 2]];
  let placed = 0;
  rows.forEach((range, ri) => {
    const ry = (ri - 2) * dy - 20 * s;
    for (let q = range[0]; q <= range[1]; q++) {
      if (ri === 2 && q === 0) continue;             // the centre is the hole
      const rx = q * dx + (ri % 2 ? dx / 2 : 0);
      if (placed++ < 18) hex(rx, ry, r * 0.94);
    }
  });

  // secondary mirror on its struts
  x.strokeStyle = 'rgba(220,235,255,.6)';
  x.lineWidth = 0.9 * s;
  for (const ox of [-11 * s, 11 * s]) {
    x.beginPath(); x.moveTo(ox, -22 * s); x.lineTo(0, -44 * s); x.stroke();
  }
  x.beginPath(); x.arc(0, -45 * s, 4 * s, 0, Math.PI * 2);
  x.fillStyle = '#d9e6f7'; x.fill();
  return texture(c);
}

/** A plain barrel with one solar array — Kepler was a photometer, not a camera. */
function keplerSprite(size = 128) {
  const { c, x } = canvas(size);
  const s = size / 128;
  x.translate(size / 2, size / 2);
  x.rotate(0.3);

  x.fillStyle = 'rgba(96,128,170,.85)';
  x.fillRect(10 * s, -14 * s, 30 * s, 28 * s);
  x.fillStyle = 'rgba(50,78,124,.9)';
  for (let i = 0; i < 4; i++) x.fillRect((12 + i * 7) * s, -14 * s, 2 * s, 28 * s);

  const g = x.createLinearGradient(0, -13 * s, 0, 13 * s);
  g.addColorStop(0, '#dfe6ef');
  g.addColorStop(0.55, '#9aa6b6');
  g.addColorStop(1, '#616b7a');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(-30 * s, -13 * s); x.lineTo(9 * s, -10 * s);
  x.lineTo(9 * s, 10 * s); x.lineTo(-30 * s, 13 * s);
  x.closePath(); x.fill();
  x.fillStyle = '#0e1219';
  x.beginPath(); x.ellipse(-30 * s, 0, 3.4 * s, 13 * s, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.5)';
  x.lineWidth = 0.9 * s;
  x.beginPath(); x.ellipse(-30 * s, 0, 3.4 * s, 13 * s, 0, 0, Math.PI * 2); x.stroke();
  return texture(c);
}

const SPRITES = { hubble: hubbleSprite, jwst: jwstSprite, kepler: keplerSprite };

export function buildTelescopes() {
  const group = new THREE.Group();
  group.name = 'telescopes';
  const targets = [];

  for (const t of TELESCOPES) {
    const mat = new THREE.SpriteMaterial({
      map: SPRITES[t.look](128),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const sp = new THREE.Sprite(mat);
    const size = 2.4;
    sp.scale.set(size, size, 1);
    sp.userData = {
      hoverable: true,
      kind: 'telescope',
      id: t.id,
      name: t.name,
      designation: t.designation,
      className: t.className,
      note: t.note,
      stats: t.stats,
      scope: t,
      baseSize: size,
    };
    group.add(sp);
    targets.push(sp);
  }

  return { group, targets };
}

/**
 * Move the fleet. Hubble circles Earth, JWST holds station beyond it on the
 * anti-Sun line, and Kepler drifts further behind Earth's orbit every year —
 * which is exactly what the real one does.
 */
export function updateTelescopes(group, earthPos, jd) {
  const day = jd - 2451545.0;
  for (const sp of group.children) {
    const p = sp.userData.scope.place;

    if (p.mode === 'earth-orbit') {
      const a = (day / p.period) * Math.PI * 2;
      const inc = p.incl * Math.PI / 180;
      sp.position.set(
        earthPos.x + Math.cos(a) * p.radius,
        earthPos.y + Math.sin(a) * Math.sin(inc) * p.radius,
        earthPos.z + Math.sin(a) * Math.cos(inc) * p.radius
      );
    } else if (p.mode === 'l2') {
      // L2 lies on the Sun–Earth line, beyond Earth
      const away = earthPos.clone().normalize();
      sp.position.copy(earthPos).addScaledVector(away, p.offset);
    } else {
      // trailing Earth around the Sun, in the ecliptic
      const lon = Math.atan2(-earthPos.z, earthPos.x) - p.lagDeg * Math.PI / 180;
      const r = auToUnits(p.au);
      sp.position.set(Math.cos(lon) * r, earthPos.y * 0.2, -Math.sin(lon) * r);
    }
  }
}
