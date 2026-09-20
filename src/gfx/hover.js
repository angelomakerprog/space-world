import * as THREE from 'three';
import { ringSprite, glowSprite } from './textures.js';

/**
 * "Ready to be selected" reticle: a thin white annulus plus a soft halo that
 * snaps to whatever the cursor is over, then eases into place.
 */
export class HoverSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 6;
    this.pointer = new THREE.Vector2(-10, -10);
    this.targets = [];
    this.current = null;
    this.strength = 0;
    this.shownScale = 1;

    const grp = new THREE.Group();
    grp.renderOrder = 20;

    this.ring = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ringSprite(512, 0.013),
      color: 0xdaeeff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0,
      toneMapped: false,
    }));
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(256, 2.4),
      color: 0xdceeff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0,
      toneMapped: false,
    }));
    grp.add(this.halo, this.ring);
    this.group = grp;
    scene.add(grp);

    // four corner ticks make it read as a targeting reticle, not a bubble
    this.ticks = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._tickTexture(),
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0,
      toneMapped: false,
    }));
    grp.add(this.ticks);

    this._wp = new THREE.Vector3();
  }

  _tickTexture(size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.strokeStyle = '#ffffff';
    x.lineWidth = size * 0.007;
    x.lineCap = 'round';
    const r = size * 0.40, cx = size / 2, arc = 0.30;
    for (let i = 0; i < 4; i++) {
      const a0 = i * Math.PI / 2 + Math.PI / 4 - arc / 2;
      x.beginPath();
      x.arc(cx, cx, r, a0, a0 + arc);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /**
   * @param {THREE.Object3D} object  raycast surface (may be an invisible proxy)
   * @param {object} meta            info shown in the HUD
   * @param {function} anchor        (Vector3) => world position of the reticle
   * @param {function} radius        () => world-space radius to circle
   */
  register(object, meta, anchor, radius) {
    object.userData = { ...object.userData, ...meta, hoverable: true };
    this.targets.push({ object, meta, anchor, radius });
  }

  setPointer(x, y, w, h) {
    this.pointer.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
  }
  clearPointer() {
    this.pointer.set(-10, -10);
  }

  pick() {
    if (this.pointer.x < -5) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = this.targets.map((t) => t.object);
    const hits = this.raycaster.intersectObjects(objs, false);
    if (!hits.length) return null;

    // Belts are diffuse regions, not surfaces. Their raycast proxies are huge
    // invisible volumes, so without this a belt would swallow every galaxy and
    // black hole behind it. A compact object under the cursor always wins;
    // the belt is only the answer when nothing else is there.
    let belt = null;
    for (const h of hits) {
      const t = this.targets.find((x) => x.object === h.object);
      if (!t) continue;
      if (t.meta.isBelt) { if (!belt) belt = t; continue; }
      return t;
    }
    return belt;
  }

  update(dt, time) {
    const t = this.current;
    // some targets carry their own outline and would look absurd inside a
    // screen-wide circle — belts, for instance
    const goal = t && !t.meta.noReticle ? 1 : 0;
    this.strength += (goal - this.strength) * Math.min(1, dt * 11);

    if (this.strength < 0.002) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    if (t && !t.meta.noReticle) {
      t.anchor(this._wp);
      this.group.position.copy(this._wp);
      const r = t.radius();
      const dist = this.camera.position.distanceTo(this._wp);
      // never let the reticle collapse below a comfortable on-screen size
      const minWorld = dist * 0.026;
      const want = Math.max(r * 2.75, minWorld);
      this.shownScale += (want - this.shownScale) * Math.min(1, dt * 12);
    }

    const pulse = 1 + Math.sin(time * 2.6) * 0.022;
    const s = this.shownScale * pulse * (0.86 + this.strength * 0.14);
    this.ring.scale.setScalar(s);
    this.ticks.scale.setScalar(s * 1.30);
    this.halo.scale.setScalar(s * 1.75);

    this.ring.material.opacity = this.strength * 0.42;
    this.ticks.material.opacity = this.strength * 0.34;
    this.halo.material.opacity = this.strength * 0.07;
    this.ring.material.rotation = time * 0.10;
    this.ticks.material.rotation = -time * 0.22;
  }
}
