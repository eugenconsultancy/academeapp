Here are **four complete Three.js UI samples** that you can test directly in VS Code. Each is a single HTML file – just create the file, right‑click and choose **“Open with Live Server”** (or open directly in a browser).  
Every line of code is explained in the comments.

---

## 0. Setup – Live Server in VS Code

1. Install the **Live Server** extension (by Ritwick Dey).
2. Create a new file with `.html` extension.
3. Copy one of the samples below into the file.
4. Right‑click the file and select **“Open with Live Server”**.
5. The browser will open automatically. Any change you save reloads the page instantly.

---

## Sample 1 – Interactive Particle Background

**What it does**  
A starfield of colourful particles that reacts to mouse movement. Perfect for a homepage hero section or a login page background.

**Where to use**  
Academe homepage, login / signup pages, any full‑screen section.

### Full Code – `particle-bg.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Three.js Particle Background</title>
  <style>
    body { margin: 0; overflow: hidden; background: #0a0a1a; }
    canvas { display: block; }
    .overlay {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: white; text-align: center; pointer-events: none;
      font-family: 'Segoe UI', sans-serif;
    }
    .overlay h1 { font-size: 3rem; margin: 0; }
    .overlay p { font-size: 1.2rem; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="overlay">
    <h1>Welcome to Academe</h1>
    <p>Your student affairs platform</p>
  </div>

  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.128.0/build/three.module.js" } }
  </script>
  <script type="module">
    import * as THREE from 'three';

    // ── 1. Create scene, camera, renderer ──────────────────
    const scene = new THREE.Scene();                   // container for all 3D objects
    const camera = new THREE.PerspectiveCamera(         // view angle, aspect, near, far
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // performance
    document.body.appendChild(renderer.domElement);     // add canvas to page

    // ── 2. Create particles (points) ──────────────────────
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // positions: random x, y, z within a cube
      positions[i]     = (Math.random() - 0.5) * 10;
      positions[i + 1] = (Math.random() - 0.5) * 6;
      positions[i + 2] = (Math.random() - 0.5) * 4;
      // colors: random mix of indigo, pink, cyan
      colors[i]     = Math.random() * 0.8 + 0.2; // R
      colors[i + 1] = Math.random() * 0.4;       // G
      colors[i + 2] = Math.random() * 0.8 + 0.2; // B
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,         // use per‑vertex colors
      blending: THREE.AdditiveBlending, // glowing effect
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── 3. Mouse reactivity ──────────────────────────────
    const mouse = { x: 0, y: 0 };
    document.addEventListener('mousemove', (event) => {
      // convert mouse position to normalized range [-1, 1]
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // ── 4. Animation loop ────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);   // call animate repeatedly (60fps)

      // rotate particle cloud towards mouse direction
      particles.rotation.x += (mouse.y * 0.5 - particles.rotation.x) * 0.02;
      particles.rotation.y += (mouse.x * 0.5 - particles.rotation.y) * 0.02;

      renderer.render(scene, camera);
    }
    animate();

    // ── 5. Handle window resize ──────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
```

**Line‑by‑line explanation**  

| Line(s) | Explanation |
|---------|-------------|
| `new THREE.Scene()` | Creates an empty 3D world. |
| `PerspectiveCamera` | Defines the field of view, aspect ratio, and clipping planes. `camera.position.z = 4` moves the camera back. |
| `WebGLRenderer` | Renders the scene using WebGL. `alpha: true` makes background transparent. |
| `renderer.setPixelRatio(min(…)` | Limits pixel ratio to 2 for performance. |
| `Float32Array(particleCount * 3)` | Allocates a typed array for vertex data (x,y,z for each particle). |
| `Math.random()` loops | Generate random positions and colours for each particle. |
| `BufferGeometry.setAttribute` | Attach position and colour data to the geometry. |
| `PointsMaterial` | Material for points: size, vertex colours, additive blending for glow. |
| `new THREE.Points(geometry, material)` | Create the particle system. |
| `mouse.x / mouse.y` | Track mouse position, normalised to [-1, 1]. |
| `animate()` | Request the next frame, then gradually rotate the particle field towards the mouse pointer using linear interpolation. |
| `renderer.render(scene, camera)` | Draw the scene. |
| `window.resize` | Adjust camera and renderer when window size changes. |

**Test** – Open in VS Code with Live Server → move your mouse; the stars follow slowly.

---

## Sample 2 – 3D Product Card (Hover Rotation)

**What it does**  
A 3D card (e.g., a class card, badge, or book) that rotates in 3D space when you hover over it. Useful for interactive dashboard tiles.

**Where to use**  
Dashboard feature cards, profile cards, opportunity cards.

### Full Code – `hover-card.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Hover Card</title>
  <style>
    body {
      margin: 0; display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #1e293b; font-family: 'Segoe UI', sans-serif;
    }
    .card-wrapper {
      perspective: 800px; /* enables 3D perspective */
      width: 280px; height: 360px;
    }
    .card {
      width: 100%; height: 100%;
      position: relative;
      transition: transform 0.3s ease;
      transform-style: preserve-3d;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    canvas {
      position: absolute; top: 0; left: 0;
      border-radius: 20px;
    }
    .content {
      position: relative; z-index: 2;
      color: white; padding: 30px; box-sizing: border-box;
      pointer-events: none;
    }
    .content h2 { margin: 0 0 10px; }
    .content p { opacity: 0.8; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card-wrapper" id="cardWrapper">
    <div class="card" id="card">
      <div class="content">
        <h2>Microbiology</h2>
        <p>Dr. Sarah Akinyi</p>
        <p>Lab 201 · 08:00‑10:00</p>
      </div>
    </div>
  </div>

  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.128.0/build/three.module.js" } }
  </script>
  <script type="module">
    import * as THREE from 'three';

    // ── 1. Setup renderer ────────────────────────────────
    const wrapper = document.getElementById('cardWrapper');
    const card = document.getElementById('card');
    const width = 280, height = 360;

    const scene = new THREE.Scene();
    scene.background = null; // transparent

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    card.appendChild(renderer.domElement);

    // ── 2. Create a 3D object (a floating shield) ──────
    const geometry = new THREE.TorusKnotGeometry(0.8, 0.25, 100, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x2b2ee4,
      emissiveIntensity: 0.4
    });
    const knot = new THREE.Mesh(geometry, material);
    scene.add(knot);

    // lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(1, 1, 2);
    scene.add(dirLight);

    // ── 3. Hover rotation logic ─────────────────────────
    let targetRotX = 0, targetRotY = 0;
    const sensitivity = 0.01;

    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      // Normalize mouse position relative to card center
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1..1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;   // -1..1
      targetRotX = y * 0.5;  // rotate around X axis (tilt up/down)
      targetRotY = x * 0.5;  // rotate around Y axis (pan left/right)
    });

    wrapper.addEventListener('mouseleave', () => {
      targetRotX = 0;
      targetRotY = 0;
    });

    // ── 4. Animation loop ────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);

      // Smooth transition to target rotation
      knot.rotation.x += (targetRotX - knot.rotation.x) * 0.1;
      knot.rotation.y += (targetRotY - knot.rotation.y) * 0.1;

      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>
```

**Line‑by‑line explanation**  

| Line(s) | Explanation |
|---------|-------------|
| `perspective: 800px` | CSS property enabling 3D perspective on child elements. |
| `transform-style: preserve-3d` | Ensures child elements maintain their 3D position. |
| `renderer.setSize(width, height)` | Matches the card dimensions. |
| `TorusKnotGeometry` | A complex 3D shape (a torus knot) – visually appealing. |
| `emissive` | Makes the object glow slightly. |
| `mousemove` event | Calculates normalised cursor position within the card; sets `targetRotX/Y`. |
| `knot.rotation.x += (targetRotX - knot.rotation.x) * 0.1` | Linear interpolation for smooth follow. |
| `animate()` | Continuously updates rotation and renders. |

**Test** – Hover over the card; the 3D knot tilts towards your cursor. The content stays readable because the canvas sits behind the text.

---

## Sample 3 – Animated 3D Text/Logo

**What it does**  
Creates a 3D text heading using `THREE.TextGeometry`. The text spins slowly or can be made interactive. (Requires a font file.)

**Where to use**  
Hero section title, branding, or a loading screen.

### Full Code – `animated-logo.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Animated Logo</title>
  <style>
    body { margin: 0; overflow: hidden; background: #0a0a1a; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.128.0/build/three.module.js" } }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';
    import { FontLoader } from 'https://unpkg.com/three@0.128.0/examples/jsm/loaders/FontLoader.js';
    import { TextGeometry } from 'https://unpkg.com/three@0.128.0/examples/jsm/geometries/TextGeometry.js';

    // ── 1. Scene, camera, renderer ──────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0x6366f1, 1);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // ── 2. Load font and create 3D text ────────────────
    const loader = new FontLoader();
    loader.load(
      'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', // free font
      (font) => {
        const geometry = new TextGeometry('Academe', {
          font: font,
          size: 0.8,
          height: 0.2,         // extrusion depth
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.03,
          bevelOffset: 0,
          bevelSegments: 5
        });
        geometry.center(); // center the text

        const material = new THREE.MeshStandardMaterial({
          color: 0x6366f1,
          roughness: 0.2,
          metalness: 0.8,
          emissive: 0x2b2ee4,
          emissiveIntensity: 0.5
        });
        const textMesh = new THREE.Mesh(geometry, material);
        scene.add(textMesh);
      }
    );

    // ── 3. Add orbit controls for interactivity ──────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controls.enableZoom = false;

    // ── 4. Animation loop ────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      controls.update(); // required if autoRotate or damping enabled
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
```

**Line‑by‑line explanation**  

| Line(s) | Explanation |
|---------|-------------|
| `FontLoader` | Loads a typeface JSON file (Helvetiker Bold, hosted by Three.js). |
| `TextGeometry` | Converts the string “Academe” into 3D geometry using the loaded font. |
| `geometry.center()` | Centers the text so it rotates around its middle. |
| `MeshStandardMaterial` | Gives the text a metallic, glossy look with emissive glow. |
| `OrbitControls` | Enables drag‑to‑rotate, auto‑rotate, and damping for smooth movement. |
| `controls.autoRotate = true` | The text spins slowly on its own. |
| `controls.update()` | Must be called every frame when damping or auto‑rotate are on. |

**Test** – The 3D “Academe” text rotates automatically. Drag with mouse to view from different angles.

---

## Sample 4 – Scroll‑Driven 3D Animation

**What it does**  
A 3D object (a book) that rotates as the user scrolls down the page. Creates a cinematic storytelling effect.

**Where to use**  
About page, landing page with multiple sections, or a “How it works” timeline.

### Full Code – `scroll-3d.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scroll-Driven 3D</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #0a0a1a; color: white; }
    .section { height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; z-index: 2; }
    .section h2 { font-size: 2.5rem; background: rgba(0,0,0,0.5); padding: 1rem 2rem; border-radius: 16px; }
    canvas { position: fixed; top: 0; left: 0; z-index: 1; pointer-events: none; }
  </style>
</head>
<body>
  <div class="section"><h2>Chapter 1: Introduction</h2></div>
  <div class="section"><h2>Chapter 2: Features</h2></div>
  <div class="section"><h2>Chapter 3: Get Started</h2></div>

  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.128.0/build/three.module.js" } }
  </script>
  <script type="module">
    import * as THREE from 'three';

    // ── 1. Setup scene ────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // ── 2. Create a 3D book ──────────────────────────────
    const bookGroup = new THREE.Group();
    // Book cover
    const coverGeo = new THREE.BoxGeometry(1.5, 2, 0.2);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.4 });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    bookGroup.add(cover);
    // Pages
    const pagesGeo = new THREE.BoxGeometry(1.3, 1.9, 0.1);
    const pagesMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.z = 0.1;
    bookGroup.add(pages);

    scene.add(bookGroup);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);

    // ── 3. Scroll‑driven rotation ────────────────────────
    const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;

    function onScroll() {
      const scrollFraction = window.pageYOffset / totalScrollHeight; // 0..1
      // Rotate book from -0.5 to 2.5 radians based on scroll
      bookGroup.rotation.x = -0.5 + scrollFraction * 3;
      bookGroup.rotation.y = scrollFraction * Math.PI * 0.5;
    }

    window.addEventListener('scroll', onScroll);

    // ── 4. Render loop ───────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
```

**Line‑by‑line explanation**  

| Line(s) | Explanation |
|---------|-------------|
| `canvas { position: fixed; }` | Makes the 3D canvas stay fixed behind the scrollable content. |
| `scrollHeight - window.innerHeight` | Maximum scrollable distance. |
| `window.pageYOffset / totalScrollHeight` | Normalised scroll progress (0 to 1). |
| `bookGroup.rotation.x = -0.5 + scrollFraction * 3` | Maps scroll to a rotation range (book opens/rotates). |
| `requestAnimationFrame(animate)` | Continuously renders, even when not scrolling (to keep the book visible). |

**Test** – Scroll down the page; the 3D book rotates as you move through the sections.

---

## 5. Integrating into React (Quick Guide)

After testing the plain HTML versions, you can convert any sample into a React component:

1. **Install Three.js** in your Vite project: `npm install three`
2. Create a new component file (`ThreeParticles.jsx`).  
3. Use `useRef` for the container, `useEffect` for setup and cleanup, and `requestAnimationFrame` inside the effect.  
4. Return a `<div ref={containerRef}>` that will hold the canvas.  
5. Import the component and place it anywhere in your JSX.

Example minimal conversion (particle background):

```jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ParticleBackground() {
  const containerRef = useRef(null);
  useEffect(() => {
    // … same setup code, using containerRef.current
    return () => { /* cleanup */ };
  }, []);
  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
```

Then use `<ParticleBackground />` as a sibling to your content, with `z‑index` layering.

---

These four examples cover the most common Three.js UI patterns. With the line‑by‑line explanations and Live Server testing, you can quickly iterate and adapt them to the Academe interface.