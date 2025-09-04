
# 🐍 React Snake Game

A modern **Snake Game** built with **React.js**, featuring smooth segment animations powered by **Framer Motion** and clean styling with **Tailwind CSS** (optional).  
The food is **static (no pulsing)** by default, with a subtle **eat-burst** effect when collected. Works great on desktop and mobile.

---

## ✨ Features

- Smooth animated snake movement (spring physics via Framer Motion)
- **Static food** (no pulse) + subtle eat-burst ring
- Pause and game-over overlays with gentle transitions
- Speed meter HUD that increases as you eat
- Mobile-friendly D‑Pad controls (tap/hover animations)
- Persistent high score (saved in `localStorage`)
- Single-file drop‑in component

---

## 📦 Requirements

- React 18+
- `framer-motion` (for animations)  
- **Optional:** Tailwind CSS (used in the component’s class names, but you can swap for your own styles)

---

## 🚀 Installation

1. Add the component file to your project (save as `src/SnakeGame.jsx`).  
2. Install the dependency:

```bash
npm install framer-motion
# or
yarn add framer-motion
