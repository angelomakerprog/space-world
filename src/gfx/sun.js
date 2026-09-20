import * as THREE from 'three';
import { buildSunSurface, glowSprite } from './textures.js';
import { SUN_UNITS } from '../core/scale.js';

const CORONA_VERT = /* glsl */`
  varying vec3 vWN;
  varying vec3 vWP;
  void main(){
    vWN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CORONA_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  uniform float uTime;
  varying vec3 vWN;
  varying vec3 vWP;
  void main(){
    vec3 V = normalize(cameraPosition - vWP);
    float rim = pow(1.0 - abs(dot(normalize(vWN), V)), uPower);
    float pulse = 0.94 + 0.06 * sin(uTime * 0.7);
    gl_FragColor = vec4(uColor, rim * uStrength * pulse);
  }
`;

export function buildSun() {
  const group = new THREE.Group();
  group.name = 'sun-group';

  const tex = buildSunSurface(768);

  const geo = new THREE.SphereGeometry(SUN_UNITS, 96, 64);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const core = new THREE.Mesh(geo, mat);
  core.name = 'sun';
  core.userData = { hoverable: true, kind: 'sun', id: 'sol', haloScale: SUN_UNITS * 1.9 };
  group.add(core);

  // chromosphere / limb glow
  const chromo = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_UNITS * 1.06, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffb347) },
        uPower: { value: 2.2 },
        uStrength: { value: 1.5 },
        uTime: { value: 0 },
      },
      vertexShader: CORONA_VERT,
      fragmentShader: CORONA_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  );
  group.add(chromo);

  // layered corona sprites
  const gs = glowSprite(512, 2.6);
  const gs2 = glowSprite(512, 1.5);
  const coronaA = new THREE.Sprite(new THREE.SpriteMaterial({
    map: gs, color: 0xffcf8a, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.55, toneMapped: false,
  }));
  coronaA.scale.setScalar(SUN_UNITS * 3.0);
  group.add(coronaA);

  const coronaB = new THREE.Sprite(new THREE.SpriteMaterial({
    map: gs2, color: 0xff8b2e, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.065, toneMapped: false,
  }));
  coronaB.scale.setScalar(SUN_UNITS * 5.5);
  group.add(coronaB);

  const light = new THREE.PointLight(0xfff2e0, 2.4, 0, 0);
  light.position.set(0, 0, 0);
  group.add(light);

  const ambient = new THREE.AmbientLight(0x0b1220, 0.55);

  return {
    group, core, chromo, coronaA, coronaB, light, ambient,
    update(t, camDist) {
      core.rotation.y = t * 0.012;
      chromo.material.uniforms.uTime.value = t;
      // the corona reads as a fixed angular size; ease it as you fly in
      const k = THREE.MathUtils.clamp(camDist / 240, 0.5, 1.35);
      coronaA.scale.setScalar(SUN_UNITS * 3.0 * k);
      coronaB.scale.setScalar(SUN_UNITS * 5.5 * k);
    },
  };
}
