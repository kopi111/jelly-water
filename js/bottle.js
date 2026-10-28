/* =========================================================
   Jelly Water — the 3D bottle
   A clear PET bottle full of coconut water, wearing the real
   Jelly Water label, with cold condensation drops that slide
   down the outside. It floats beside each section as you scroll
   and can be spun with the mouse or a finger in the hero.
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* ---------- Sizes of the bottle (in 3D units, bottle is about 3.85 tall) ---------- */
const BODY_RADIUS = 0.7;
const LABEL_RADIUS = 0.714;          // label sits just outside the plastic
const LABEL_BOTTOM = 0.6;
const LABEL_HEIGHT = 1.58;           // keeps the label picture's real width-to-height shape
const LABEL_FRONT_CENTRE = 0.478;    // where the front panel sits across the label picture (0–1)
const DROP_COUNT = 150;              // how many water drops are on the bottle
const STREAK_COUNT = 40;             // how many wet trails running drops can leave

/* Where the bottle sits for each section: x/y are fractions of the screen (−1 left … 1 right). */
const DESKTOP_POSES = {
  hero: { x: 0.5, y: -0.06, scale: 0.9, opacity: 1 },
  why: { x: -0.52, y: 0.0, scale: 0.95, opacity: 1 },
  promise: { x: 0.56, y: 0.0, scale: 0.9, opacity: 1 },
  order: { x: 0.8, y: 0.1, scale: 0.7, opacity: 0 },
};
const PHONE_POSES = {
  hero: { x: 0.0, y: 0.36, scale: 0.5, opacity: 1 },
  why: { x: 0.6, y: -0.6, scale: 0.5, opacity: 0 },
  promise: { x: 0.6, y: -0.6, scale: 0.5, opacity: 0 },
  order: { x: 0.6, y: -0.6, scale: 0.5, opacity: 0 },
};

/* ---------- Renderer, scene and camera ---------- */
const canvas = document.getElementById("bottle-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 9);

// a soft studio "room" that the shiny plastic and drops reflect, so they look wet and glassy
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// extra lights: a warm sun from the top right and a cool fill from the left
const sun = new THREE.DirectionalLight(0xfff3d6, 2.2);
sun.position.set(4, 6, 5);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xc8f5ff, 0.9);
fill.position.set(-5, 1, 3);
scene.add(fill);

/* ---------- Bottle shape ---------- */

/** The outline of half the bottle, from the base up to the neck. It gets spun around to make the 3D shape. */
function bottleOutline(inset = 0) {
  const points = [
    [0.0, 0.0], [0.56, 0.0], [0.66, 0.04], [0.7, 0.14],       // base
    [0.7, 0.46], [0.67, 0.52], [0.7, 0.58],                  // small grip ring under the label
    [0.7, 2.2], [0.67, 2.26], [0.7, 2.32],                   // grip ring above the label
    [0.7, 2.42], [0.66, 2.66], [0.55, 2.9], [0.4, 3.14],     // shoulder curving in
    [0.29, 3.32], [0.27, 3.4], [0.27, 3.56],                 // neck
  ];
  return points.map(([radius, height]) => new THREE.Vector2(Math.max(0, radius - inset), height));
}

/** Clear, glossy PET plastic. */
function makePlastic() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf4fbff,
    roughness: 0.03,
    metalness: 0,
    opacity: 0.22,            // mostly see-through, so the page shows through the plastic
    transparent: true,
    clearcoat: 1,             // the shiny outer layer that catches highlights
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** The coconut water inside — very slightly cloudy and pale, like the real thing. */
function makeCoconutWater() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xeef6dc,
    roughness: 0.1,
    opacity: 0.38,            // slightly cloudy, pale coconut water
    transparent: true,
    clearcoat: 0.5,
    depthWrite: false,
  });
}

/** The liquid inside: same outline as the bottle, slightly smaller, filled up to the shoulder. */
function makeLiquid() {
  const fillLine = 2.72;
  const outline = bottleOutline(0.035).filter((point) => point.y <= fillLine);
  const last = outline[outline.length - 1];
  outline.push(new THREE.Vector2(last.x, fillLine), new THREE.Vector2(0, fillLine)); // flat top of the water
  return new THREE.Mesh(new THREE.LatheGeometry(outline, 64), makeCoconutWater());
}

/** The green screw cap with little grip ridges. */
function makeCap() {
  const cap = new THREE.Group();
  const capMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0b8f3d, roughness: 0.35, clearcoat: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.34, 48), capMaterial);
  body.position.y = 3.72;
  cap.add(body);
  // gold ring under the cap (the tamper ring), matching the label gold
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.025, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.3, metalness: 0.2 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3.53;
  cap.add(ring);
  // vertical ridges around the cap so it reads as a real screw cap
  const ridgeGeometry = new THREE.BoxGeometry(0.03, 0.3, 0.03);
  for (let index = 0; index < 36; index++) {
    const angle = (index / 36) * Math.PI * 2;
    const ridge = new THREE.Mesh(ridgeGeometry, capMaterial);
    ridge.position.set(Math.sin(angle) * 0.315, 3.72, Math.cos(angle) * 0.315);
    ridge.rotation.y = angle;
    cap.add(ridge);
  }
  return cap;
}

/** The Jelly Water label wrapped around the bottle, using the real label picture. */
function makeLabel() {
  const texture = new THREE.TextureLoader().load("assets/label.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geometry = new THREE.CylinderGeometry(LABEL_RADIUS, LABEL_RADIUS, LABEL_HEIGHT, 128, 1, true);
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.45,
    clearcoat: 0.35,         // light gloss, like printed plastic film
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.35,   // keep reflections low so the label colours stay strong
    toneMapped: false,       // show the label's real green and gold, not a washed-out version
  });
  const label = new THREE.Mesh(geometry, material);
  label.position.y = LABEL_BOTTOM + LABEL_HEIGHT / 2;
  // turn the label so its front panel (the coconut and the word "Jelly") faces the viewer
  label.rotation.y = -LABEL_FRONT_CENTRE * Math.PI * 2;
  return label;
}

/* ---------- Condensation drops ---------- */

/** Picks a fresh random drop: where it sits around the bottle, how big, and whether it will run. */
function newDrop(drop = {}) {
  drop.angle = Math.random() * Math.PI * 2;
  drop.y = 0.3 + Math.random() * 2.1;
  drop.size = 0.012 + Math.random() ** 2 * 0.04;
  drop.speed = 0;
  drop.runner = drop.size > 0.03 && Math.random() < 0.5;   // only the bigger drops run down
  drop.wait = Math.random() * 6;                             // seconds before it starts to slide
  drop.startY = drop.y;
  drop.streak = -1;
  return drop;
}

/** Glassy water drops; one InstancedMesh draws all of them in one go. */
function makeDrops() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0,
    opacity: 0.6,
    transparent: true,
    clearcoat: 1,
    envMapIntensity: 2.2,    // strong reflections make each drop sparkle like real water
  });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), material, DROP_COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const drops = Array.from({ length: DROP_COUNT }, () => newDrop());
  return { mesh, drops };
}

/** The faint wet trail a running drop leaves behind it. */
function makeStreaks() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    transparent: true,
    opacity: 0.35,
    clearcoat: 1,
    envMapIntensity: 2,
  });
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1), material, STREAK_COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const streaks = Array.from({ length: STREAK_COUNT }, () => ({ inUse: false, angle: 0, top: 0, bottom: 0, width: 0, fade: 0 }));
  return { mesh, streaks };
}

/** The outer radius at a given height, so drops hug the label or the plastic. */
function surfaceRadius(y) {
  const onLabel = y >= LABEL_BOTTOM && y <= LABEL_BOTTOM + LABEL_HEIGHT;
  return onLabel ? LABEL_RADIUS : BODY_RADIUS;
}

/* ---------- Floating ice cubes and coconut halves around the bottle ---------- */

/** A clear, slightly blue ice cube with soft rounded edges. */
function makeIceCube(size) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xdff6ff,
    roughness: 0.08,
    opacity: 0.55,
    transparent: true,
    clearcoat: 1,
    envMapIntensity: 2,
    depthWrite: false,
  });
  return new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 4, size * 0.18), material);
}

/** Half a cut green coconut: green shell outside, white jelly flesh inside. */
function makeCoconutHalf(radius) {
  const half = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x2f9e3a, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide })
  );
  shell.rotation.x = Math.PI;                       // open side faces up
  const flesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.97, 40),
    new THREE.MeshStandardMaterial({ color: 0xf1ecd6, roughness: 0.55 })
  );
  flesh.rotation.x = -Math.PI / 2;
  const rim = new THREE.Mesh(                        // thin white rim between shell and flesh
    new THREE.TorusGeometry(radius * 0.97, radius * 0.04, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xf3f0dc, roughness: 0.5 })
  );
  rim.rotation.x = Math.PI / 2;
  half.add(shell, flesh, rim);
  return half;
}

/* Where each floating piece hangs around the bottle (x, y, z), its size, and its own bob/spin speed */
const FLOATERS = [
  { kind: "ice", size: 0.42, at: [-1.35, 0.95, 0.5], spin: 0.5, bob: 1.1 },
  { kind: "ice", size: 0.3, at: [1.3, 1.45, 0.3], spin: -0.7, bob: 1.4 },
  { kind: "ice", size: 0.36, at: [1.45, -0.95, 0.6], spin: 0.6, bob: 0.9 },
  { kind: "ice", size: 0.24, at: [-1.1, -1.55, 0.8], spin: -0.9, bob: 1.7 },
  { kind: "coconut", size: 0.4, at: [-1.5, -0.4, -0.2], spin: 0.25, bob: 0.8 },
  { kind: "coconut", size: 0.3, at: [1.3, 0.3, -0.4], spin: -0.3, bob: 1.2 },
];

/** Builds all the floating pieces and remembers how each one should move. */
function makeFloaters() {
  return FLOATERS.map((spec, index) => {
    const mesh = spec.kind === "ice" ? makeIceCube(spec.size) : makeCoconutHalf(spec.size);
    mesh.position.set(...spec.at);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    // coconut halves tilt toward the viewer so you can see the white jelly inside
    if (spec.kind === "coconut") mesh.rotation.set(0.42, index, -0.35);
    return { mesh, spec, phase: Math.random() * Math.PI * 2 };
  });
}

/** Makes the pieces bob up and down and turn slowly, each at its own pace. */
function updateFloaters(time) {
  floaters.forEach(({ mesh, spec, phase }) => {
    mesh.position.y = spec.at[1] + Math.sin(time * spec.bob + phase) * 0.12;
    if (spec.kind === "ice") {
      mesh.rotation.x += spec.spin * 0.006;
      mesh.rotation.y += spec.spin * 0.008;
    } else {
      mesh.rotation.y += spec.spin * 0.006;
    }
  });
}

/* ---------- Build the bottle ---------- */
const bottle = new THREE.Group();          // everything that spins together
const plastic = new THREE.Mesh(new THREE.LatheGeometry(bottleOutline(), 96), makePlastic());
bottle.add(plastic, makeLiquid(), makeCap(), makeLabel());
const dropLayer = makeDrops();
const streakLayer = makeStreaks();
bottle.add(dropLayer.mesh, streakLayer.mesh);
bottle.position.y = -1.9;                  // centre the bottle on its middle, not its base

const holder = new THREE.Group();          // moves/scales the bottle between sections
holder.add(bottle);
const floaters = makeFloaters();
floaters.forEach(({ mesh }) => holder.add(mesh));   // they float with the bottle but do not spin with it
scene.add(holder);

/* ---------- Drop animation ---------- */
const placer = new THREE.Object3D();       // helper used to build each drop's position/size

/** Grabs a free trail for a drop that has just started running. */
function claimStreak(drop) {
  const index = streakLayer.streaks.findIndex((streak) => !streak.inUse);
  if (index === -1) return -1;
  Object.assign(streakLayer.streaks[index], { inUse: true, angle: drop.angle, top: drop.y, bottom: drop.y, width: drop.size * 0.35, fade: 1 });
  return index;
}

/** Moves every drop for this frame: waiting drops sit still, runners speed up and slide down. */
function updateDrops(seconds) {
  dropLayer.drops.forEach((drop, index) => {
    if (drop.runner) {
      drop.wait -= seconds;
      if (drop.wait <= 0) {
        if (drop.streak === -1) drop.streak = claimStreak(drop);
        drop.speed = Math.min(drop.speed + seconds * 0.9, 0.9);      // gravity, with a top speed
        drop.y -= drop.speed * seconds;
        if (drop.streak !== -1) streakLayer.streaks[drop.streak].bottom = drop.y;
      }
    }
    // a drop that reaches the bottom lets go of its trail and starts again somewhere new
    if (drop.y < 0.18) {
      if (drop.streak !== -1) streakLayer.streaks[drop.streak].released = true;
      newDrop(drop);
    }
    const radius = surfaceRadius(drop.y) + drop.size * 0.35;
    const stretch = 1 + drop.speed * 1.4;                           // moving drops get long, like real ones
    placer.position.set(Math.sin(drop.angle) * radius, drop.y, Math.cos(drop.angle) * radius);
    placer.rotation.set(0, drop.angle, 0);
    placer.scale.set(drop.size, drop.size * stretch, drop.size * 0.45);   // flattened against the bottle
    placer.updateMatrix();
    dropLayer.mesh.setMatrixAt(index, placer.matrix);
  });
  dropLayer.mesh.instanceMatrix.needsUpdate = true;
}

/** Draws the wet trails; once their drop has gone they slowly dry up and disappear. */
function updateStreaks(seconds) {
  streakLayer.streaks.forEach((streak, index) => {
    if (streak.released) {
      streak.fade -= seconds * 0.35;
      if (streak.fade <= 0) Object.assign(streak, { inUse: false, released: false });
    }
    const length = Math.max(0.0001, streak.top - streak.bottom);
    const visible = streak.inUse ? streak.fade : 0;
    const radius = surfaceRadius((streak.top + streak.bottom) / 2) + 0.002;
    placer.position.set(Math.sin(streak.angle) * radius, (streak.top + streak.bottom) / 2, Math.cos(streak.angle) * radius);
    placer.rotation.set(0, streak.angle, 0);
    placer.scale.set(streak.width * visible, length, streak.width * 0.3 * visible);
    placer.updateMatrix();
    streakLayer.mesh.setMatrixAt(index, placer.matrix);
  });
  streakLayer.mesh.instanceMatrix.needsUpdate = true;
}

/* ---------- Scroll: blend the bottle between section poses ---------- */
const sections = [...document.querySelectorAll("[data-bottle]")];
const current = { x: 0.5, y: 0, scale: 0.6, opacity: 0 };      // starts small and grows in
const isPhone = () => window.innerWidth <= 860;

/** Smooth 0→1 curve, so moves start and stop gently. */
function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Finds the middle of a section's empty "stage" area across the screen (−1 left … 1 right). */
function stageX(sectionKey) {
  const stage = document.querySelector(`[data-stage="${sectionKey}"]`);
  const box = stage?.getBoundingClientRect();
  if (!box || box.width === 0) return null;          // stage hidden (e.g. on phones)
  return ((box.left + box.width / 2) / window.innerWidth) * 2 - 1;
}

/** A section's pose, with x moved to sit right in the middle of its stage. */
function poseFor(section, poses) {
  const key = section.dataset.bottle;
  const x = stageX(key);
  return x === null ? poses[key] : { ...poses[key], x };
}

/** Works out where the bottle should be, based on which section is in the middle of the screen. */
function targetPose() {
  const poses = isPhone() ? PHONE_POSES : DESKTOP_POSES;
  const middle = window.scrollY + window.innerHeight * 0.5;
  let index = 0;
  while (index < sections.length - 1 && sections[index + 1].offsetTop <= middle) index++;
  const from = poseFor(sections[index], poses);
  const next = sections[index + 1];
  if (!next) return from;
  const to = poseFor(next, poses);
  const sectionTop = sections[index].offsetTop;
  // hold the pose for the first half of the section, then glide to the next one
  const blend = smoothstep(0.45, 1, (middle - sectionTop) / (next.offsetTop - sectionTop));
  const mix = (key) => from[key] + (to[key] - from[key]) * blend;
  return { x: mix("x"), y: mix("y"), scale: mix("scale"), opacity: mix("opacity") };
}

/** On phones the bottle sits above the headline, so fade it away as soon as the visitor scrolls. */
function phoneFade(pose) {
  if (!isPhone()) return pose;
  const fade = 1 - smoothstep(0, window.innerHeight * 0.35, window.scrollY);
  return { ...pose, opacity: pose.opacity * fade };
}

/* ---------- Spin with mouse / finger (only in the hero) ---------- */
const spin = { angle: 0, velocity: 0.35, dragging: false, lastX: 0, tiltTarget: 0, tilt: 0 };
const hero = document.querySelector(".hero");

hero.addEventListener("pointerdown", (event) => {
  // ignore clicks on buttons and links so they still work
  if (event.target.closest("a, button")) return;
  spin.dragging = true;
  spin.lastX = event.clientX;
});
window.addEventListener("pointermove", (event) => {
  // gentle tilt toward the mouse, for depth
  spin.tiltTarget = (event.clientY / window.innerHeight - 0.5) * 0.25;
  if (!spin.dragging) return;
  const moved = event.clientX - spin.lastX;
  spin.lastX = event.clientX;
  spin.angle += moved * 0.01;
  spin.velocity = moved * 0.6;
});
window.addEventListener("pointerup", () => { spin.dragging = false; });

/* ---------- Resize ---------- */

/** Keeps the 3D view sharp and the right shape when the window changes size. */
function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

/* ---------- Main loop: runs every frame ---------- */
const clock = new THREE.Clock();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animate() {
  const seconds = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // slide the bottle toward its pose for the section on screen
  const target = phoneFade(targetPose());
  const ease = 1 - Math.pow(0.002, seconds);
  for (const key of ["x", "y", "scale", "opacity"]) current[key] += (target[key] - current[key]) * ease;

  // turn screen fractions into 3D positions using how wide the camera can see
  const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewWidth = viewHeight * camera.aspect;
  holder.position.set((current.x * viewWidth) / 2, (current.y * viewHeight) / 2 + Math.sin(time * 1.2) * 0.06, 0);
  holder.scale.setScalar(current.scale);
  canvas.style.opacity = current.opacity.toFixed(3);

  // slow idle spin that picks up after a drag and settles back down
  if (!spin.dragging && !reduceMotion) {
    spin.velocity += (0.35 - spin.velocity) * (1 - Math.pow(0.15, seconds));
    spin.angle += spin.velocity * seconds;
  }
  spin.tilt += (spin.tiltTarget - spin.tilt) * ease;
  bottle.rotation.set(spin.tilt, spin.angle + window.scrollY * 0.0015, Math.sin(time * 0.8) * 0.03);

  if (!reduceMotion) {
    updateFloaters(time);
    updateDrops(seconds);
    updateStreaks(seconds);
  }

  // skip drawing when the bottle is hidden, to save battery
  if (current.opacity > 0.01) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateDrops(0);
updateStreaks(0);
animate();
