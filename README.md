<div align="center">

# ✨ Lumina Particle Forge

### Real-Time 3D Particle Art, Sculpted by Your Hands

**An interactive WebGL particle system that you conduct with nothing but webcam-tracked hand gestures — powered by Three.js and MediaPipe.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](#)
[![Three.js](https://img.shields.io/badge/Three.js-0.184-000000?logo=three.js&logoColor=white)](#)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Landmarker-0097A7?logo=google&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178C6?logo=typescript&logoColor=white)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#-license)

</div>

---

## 📸 Preview

<div align="center">
  <img src="assets/Screenshot 2026-06-19 120141.png" alt="Lumina Particle Forge interface showing the Saturn Rings particle preset with live tension and gesture HUD" width="850"/>
  <p><em>The Saturn Rings preset in Intercessor (manual slider) mode, with live FPS, particle count, and tension telemetry.</em></p>
</div>

---

## 📖 Overview

**Lumina Particle Forge** (internally codenamed *Gesture Particle System*) turns your webcam into a sculpting tool. Using **MediaPipe's Hand Landmarker** for real-time, dual-hand tracking and a **Three.js**-driven GPU particle field, you mold glowing geometric structures — a spiral galaxy, Saturn's rings, blooming digital flora, firework bursts — by simply moving, spreading, and closing your hands in the air.

No mouse required: spread your palms apart to scale a structure up, bring them together to compress it, and close a fist to introduce turbulence and tension into the simulation. A full manual-control sidebar is also available for when you'd rather use sliders than gestures.

---

## ✨ Key Features

- 🖐️ **Dual-Hand Gesture Tracking** — Real-time, in-browser hand landmark detection via `@mediapipe/tasks-vision`, with no server round-trip
- 🌌 **Four Live Particle Templates** — *Galaxy Core* (spiral galaxy), *Saturn Rings*, *Digital Flora* (blooming lotus petals), and *Pyrotechnic Burst* (firework sparks), each with unique physics
- 🎨 **Six Curated Color Themes** — Plus full custom hex color pickers for primary and secondary particle colors
- 🤏 **Gesture-Mapped Physics** — Hand spread controls scale/zoom, fist closure injects turbulence/tension, and per-preset behaviors (pulsing, swaying, blooming) respond to your motion
- 🎚️ **Manual Control Fallback** — Scale, tension, and speed sliders let you drive the simulation without a camera ("Intercessor Mode")
- 📊 **Live Tracking HUD** — On-screen readouts for hand presence, fist-closure percentage, and confidence score per hand
- 📘 **Built-in Gesture Guide** — In-app modal explaining how to control each preset
- ⚡ **GPU-Friendly Particle Engine** — Up to thousands of particles animated smoothly via Three.js buffer geometries

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 + TypeScript + Vite |
| 3D Rendering | Three.js |
| Hand Tracking | MediaPipe Tasks Vision (`HandLandmarker`) |
| Styling | Tailwind CSS v4 |
| Icons / Motion | `lucide-react`, `motion` |
| AI Integration | `@google/genai` (Gemini API) |
| Dev Server | Vite + Express |

---

## 📁 Project Structure

```
Lumina-Particle/
├── assets/
│   ├── .aistudio/                 # Local AI Studio scratch assets (git-ignored)
│   └── screenshots/               # README preview images
│       └── dashboard-saturn-rings.png
├── src/
│   ├── components/
│   │   ├── HandWebcam.tsx         # Webcam capture + MediaPipe hand landmark tracking
│   │   └── ParticleSystem.tsx     # Three.js particle engine & preset physics
│   ├── App.tsx                    # Main layout, control sidebar, preset/theme selection
│   ├── types.ts                   # Shared TypeScript types (HandData, ParticleConfig, etc.)
│   ├── index.css                  # Tailwind entrypoint & global styles
│   └── main.tsx                   # React root mount
├── index.html
├── metadata.json                  # AI Studio app metadata & permissions
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js** 18+
- A webcam (for live gesture tracking — the app also works in manual slider mode without one)
- A [Gemini API key](https://aistudio.google.com/) (only required if you extend the app's Gemini-powered features)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sudeshna-24/Lumina-Particle.git
cd Lumina-Particle

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# then edit .env.local and set GEMINI_API_KEY

# 4. Run the dev server
npm run dev
```

The app runs at **http://localhost:3000**. On first load, your browser will prompt for camera access — grant it to enable live gesture tracking, or dismiss it to use the manual slider controls instead.

### Other scripts

```bash
npm run build     # Production build
npm run preview   # Preview the production build locally
npm run lint       # Type-check with tsc --noEmit
```

---

## 🎮 How to Use

1. **Choose a template** from the *Geometric Templates* panel — Galaxy Core, Saturn Rings, Digital Flora, or Pyrotechnic Burst.
2. **Pick a color theme** or set a custom primary/secondary color pair.
3. **Move your hands** in front of the camera:
   - Spread both hands apart → scale/zoom the structure outward
   - Bring hands together → compress/shrink the structure
   - Close your left hand into a fist → introduce turbulence or noise
   - Close your right hand into a fist → increase pulse/sway rate (preset-dependent)
4. Click **Gesture Guide** in the header any time for a contextual reminder of the controls for your active preset.
5. No camera? Toggle to manual mode and use the **Scale**, **Tension**, and **Speed** sliders in the sidebar instead.

---

## 🔒 Privacy

All hand-tracking inference runs **entirely client-side** in the browser via MediaPipe's WASM/WebGL runtime. Camera frames are never uploaded or persisted — landmark coordinates exist only in memory for the current session.

---

## 🗺️ Roadmap

- [ ] Expose the in-engine **Hearts** preset (already implemented in `ParticleSystem.tsx`) in the UI
- [ ] Record/export particle animations as video or GIF
- [ ] Additional gesture vocabulary (pinch, swipe, two-finger rotate)
- [ ] Mobile/touch fallback controls

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss what you'd like to change, then submit a pull request.

```bash
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
```

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ by **[Sudeshna Roy](https://github.com/sudeshna-24)**

</div>
