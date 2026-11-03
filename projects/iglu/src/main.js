import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SHOTS, CAPTIONS, DURATION, FADES, NOTES } from './shots.js';
import { snowGround } from './igloo.js';

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').prepend(renderer.domElement);

// ---------- shared environment (reflections for the metal) ----------
const SKY_FRAG = `
  uniform vec3 top, mid, horizon, floorC; varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 c = y > 0.0 ? mix(mix(horizon, mid, smoothstep(0.0,0.12,y)), top, smoothstep(0.1,0.8,y))
                     : mix(horizon, floorC, smoothstep(0.0,-0.08,y));
    gl_FragColor = vec4(c,1.0);
    #include <colorspace_fragment>
  }`;
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(0x2a74d8) }, mid: { value: new THREE.Color(0x63a6ee) },
      horizon: { value: new THREE.Color(0xc4e2fb) }, floorC: { value: new THREE.Color(0xe6f1fb) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
{
  const s = new THREE.Mesh(new THREE.SphereGeometry(20, 64, 32), skyMaterial());
  s.material.toneMapped = true; envScene.add(s);
  const u = s.material.uniforms;
  u.top.value.set(0x9aa6b6); u.mid.value.set(0xb7c2cf); u.horizon.value.set(0xe2e6ea); u.floorC.value.set(0x5c6066);
  const panel = (w, h, pos, inten) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(inten, inten, inten), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); envScene.add(m);
  };
  panel(8, 4, [-6, 8, 6], 3.2);   // key softbox
  panel(4, 10, [9, 3, -2], 1.6); // rim strip
  panel(10, 3, [0, 4, -9], 1.0);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x7d8fa6 }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = -1.2; fl.material.color.set(0x55595f); envScene.add(fl);
}
const envTex = pmrem.fromScene(envScene, 0.02).texture;

export function makeStage({ shadowSize = 3, sunDir = [-3, 6, 4], sun = 2.7, pit = null, ground = true, shadowCenter = [0, 0, 0] } = {}) {
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = 0.3;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), skyMaterial());
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky); scene.userData.sky = sky;
  if (ground) scene.add(snowGround(pit));
  const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x8aa6cc, 0.55); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1e0, sun);
  key.position.set(sunDir[0] + shadowCenter[0], sunDir[1] + shadowCenter[1], sunDir[2] + shadowCenter[2]);
  key.target.position.set(...shadowCenter);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const c = key.shadow.camera; c.left = c.bottom = -shadowSize; c.right = c.top = shadowSize; c.near = 0.5; c.far = 40;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.025; key.shadow.radius = 5;
  key.userData.sunDir = sunDir;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xcfe2ff, 0.7); rim.position.set(4, 3, -5); scene.add(rim);
  scene.userData.key = key; scene.userData.hemi = hemi;
  return scene;
}

// ---------- post ----------
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
const dummyScene = new THREE.Scene(), dummyCam = new THREE.PerspectiveCamera();
const renderPass = new RenderPass(dummyScene, dummyCam);
const bokeh = new BokehPass(dummyScene, dummyCam, { focus: 2, aperture: 0.002, maxblur: 0.01 });
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.25, 0.4, 1.6);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.18 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*7.13) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5; q.x *= 0.5625;
      c.rgb *= 1.0 - uVig * smoothstep(0.18, 0.62, length(q));
      c.rgb += (h(vUv*1920.0) - 0.5) * 0.012;
      gl_FragColor = c; }`,
});
composer.addPass(renderPass);
composer.addPass(bokeh);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(grade);

const V0 = new THREE.Vector3();
// ---------- timeline ----------
const capEl = document.getElementById('cap');
const fadeEl = document.getElementById('fade');
const hud = document.getElementById('hud');
const noteEl = document.getElementById('note');
const built = new Map();
function getShot(i) {
  if (!built.has(i)) built.set(i, SHOTS[i].build({ makeStage, W, H }));
  return built.get(i);
}

window.DURATION = DURATION;
window.renderAt = (t) => {
  let idx = SHOTS.findIndex(s => t >= s.start && t < s.end);
  if (idx < 0) idx = SHOTS.length - 1;
  const def = SHOTS[idx];
  const shot = getShot(idx); window.__shot = shot;
  const lt = t - def.start;
  const r = shot.update(lt, t) || {};
  const cam = shot.camera;
  cam.aspect = W / H; cam.updateProjectionMatrix();
  if (shot.scene.userData.key && r.shadowCenter) { const k = shot.scene.userData.key, sd = k.userData.sunDir; k.target.position.set(...r.shadowCenter); k.position.set(r.shadowCenter[0] + sd[0], r.shadowCenter[1] + sd[1], r.shadowCenter[2] + sd[2]); }
  shot.scene.userData.sky.position.copy(cam.position);
  renderPass.scene = bokeh.scene = shot.scene;
  renderPass.camera = bokeh.camera = cam;
  const dof = r.dof || { focus: 3, aperture: 0, maxblur: 0 };
  if (dof.aperture > 0 && !window.ALLOW_DOF) dof.aperture = 0;
  bokeh.enabled = dof.aperture > 0;
  bokeh.uniforms.focus.value = dof.focus;
  bokeh.uniforms.aperture.value = dof.aperture;
  bokeh.uniforms.maxblur.value = dof.maxblur ?? 0.012;
  bokeh.uniforms.nearClip.value = cam.near; bokeh.uniforms.farClip.value = cam.far;
  bloom.strength = (r.bloom ?? 0.15) * 0.6;
  renderer.toneMappingExposure = r.exposure ?? 1.0;
  grade.uniforms.uTime.value = t;
  composer.render(); window.__rerender = () => composer.render();
  // captions (*word* = highlight, ^word^ = warm highlight, | = line break) + fades + notes
  const c = CAPTIONS.filter(c => t >= c[0]).pop();
  const txt = c && (c[2] == null || t < c[2]) ? c[1] : '';
  if (capEl.dataset.t !== txt) {
    capEl.dataset.t = txt;
    capEl.innerHTML = txt.replace(/\*([^*]+)\*/g, '<span class="hi">$1</span>').replace(/\^([^^]+)\^/g, '<span class="hot">$1</span>').replace(/\|/g, '<br>');
  }
  let f = 0, fc = '#ffffff';
  for (const [a, b, c2, d, col] of FADES) if (t >= a && t < d) { f = Math.max(f, t < b ? (t - a) / (b - a) : t < c2 ? 1 : (d - t) / (d - c2)); fc = col || fc; }
  fadeEl.style.opacity = f; fadeEl.style.background = fc;
  let no = 0, nt = '';
  for (const [a, b, text] of NOTES) if (t >= a && t < b) { nt = text; no = Math.min(1, (t - a) / 0.5, (b - t) / 0.4); }
  noteEl.textContent = nt; noteEl.style.opacity = no;
  hud.textContent = `t=${t.toFixed(2)} shot ${idx}`;
  return idx;
};

// interactive preview: ?t=12.3 for a still, otherwise realtime playback
const qs = new URLSearchParams(location.search);
window.ready = document.fonts.ready.then(() => true);
if (qs.has('t')) window.ready.then(() => window.renderAt(parseFloat(qs.get('t'))));
else if (!qs.has('render')) {
  const audio = new Audio('./audio/vo.wav');
  let t0 = null;
  document.body.addEventListener('click', () => { audio.currentTime = 0; audio.play(); t0 = performance.now(); });
  const loop = () => { const t = t0 ? ((performance.now() - t0) / 1000) % DURATION : 0; window.renderAt(t); requestAnimationFrame(loop); };
  window.ready.then(loop);
}
