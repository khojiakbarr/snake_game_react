import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SnakeGame.jsx — animated, single-file React component
 * -----------------------------------------------------
 * - Smooth segment movement with Framer Motion (spring)
 * - Static food (no pulse) + eat burst animation
 * - Game over / pause overlays with subtle transitions
 * - Keyboard: Arrow/WASD, Space=pause, R=restart
 * - Mobile control pad with tap animations
 */

const GRID_SIZE = 20; // 20x20 board
const START_SPEED_MS = 160; // Lower is faster
const MIN_SPEED_MS = 80;
const SPEED_STEP_MS = 6; // Speed up on eat

// Directions
const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

function randInt(n) {
  return Math.floor(Math.random() * n);
}
function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}
function randomFreeCell(occupiedSet) {
  while (true) {
    const p = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
    const key = `${p.x},${p.y}`;
    if (!occupiedSet.has(key)) return p;
  }
}

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

export default function SnakeGame() {
  const [snake, setSnake] = useState(() => [
    { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) },
    { x: Math.floor(GRID_SIZE / 2) - 1, y: Math.floor(GRID_SIZE / 2) },
  ]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [pendingDir, setPendingDir] = useState(null); // prevent double-turn within one tick
  const [food, setFood] = useState({ x: 12, y: 9 });
  const [speed, setSpeed] = useState(START_SPEED_MS);
  const [score, setScore] = useState(0);
  const [best, setBest] = useLocalStorage("snake_best", 0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [eatPulse, setEatPulse] = useState(null); // {x, y, id}
  const containerRef = useRef(null);
  const tickRef = useRef(null);

  // Focus the board for keyboard input
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;
      if (k === " " || k === "Spacebar") {
        e.preventDefault();
        if (gameOver) restart();
        else setPaused((p) => !p);
        return;
      }
      if (k === "r" || k === "R") {
        e.preventDefault();
        restart();
        return;
      }
      if (DIRS[k]) {
        e.preventDefault();
        const nd = DIRS[k];
        // Ignore reverse direction
        if (nd.x === -dir.x && nd.y === -dir.y) return;
        setPendingDir(nd);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dir, gameOver]);

  // Game loop
  useEffect(() => {
    if (paused || gameOver) return;

    tickRef.current = setInterval(() => {
      setSnake((prev) => {
        const curDir = pendingDir || dir;
        setDir(curDir); // lock the pending dir for this tick
        setPendingDir(null);

        const head = prev[0];
        const next = { x: head.x + curDir.x, y: head.y + curDir.y };

        // Wall collision (end game)
        if (next.x < 0 || next.y < 0 || next.x >= GRID_SIZE || next.y >= GRID_SIZE) {
          endGame();
          return prev;
        }

        // Self collision
        for (let i = 0; i < prev.length; i++) {
          if (samePos(prev[i], next)) {
            endGame();
            return prev;
          }
        }

        const newSnake = [next, ...prev];
        // Eat food?
        if (samePos(next, food)) {
          setScore((s) => s + 1);
          setSpeed((ms) => Math.max(MIN_SPEED_MS, ms - SPEED_STEP_MS));
          // place new food not on snake
          const occ = new Set(newSnake.map((p) => `${p.x},${p.y}`));
          const nf = randomFreeCell(occ);
          setFood(nf);
          setEatPulse({ ...nf, id: Date.now() });
          return newSnake; // grow (don't pop tail)
        } else {
          newSnake.pop();
          return newSnake;
        }
      });
    }, speed);

    return () => clearInterval(tickRef.current);
  }, [speed, paused, gameOver, pendingDir, dir, food]);

  function endGame() {
    setGameOver(true);
    setPaused(true);
    setBest((b) => (score > b ? score : b));
  }

  function restart() {
    setSnake([
      { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) },
      { x: Math.floor(GRID_SIZE / 2) - 1, y: Math.floor(GRID_SIZE / 2) },
    ]);
    setDir({ x: 1, y: 0 });
    setPendingDir(null);
    setFood(randomFreeCell(new Set()));
    setScore(0);
    setSpeed(START_SPEED_MS);
    setPaused(false);
    setGameOver(false);
    setEatPulse(null);
    containerRef.current?.focus();
  }

  // Helpers for percentage-based absolute positioning
  const cellPct = 100 / GRID_SIZE;
  const segTransition = { type: "spring", stiffness: 420, damping: 28, mass: 0.6 };

  // Touch controls
  function setDirectionByPad(dirName) {
    const nd = dirName === "up" ? { x: 0, y: -1 } : dirName === "down" ? { x: 0, y: 1 } : dirName === "left" ? { x: -1, y: 0 } : { x: 1, y: 0 };
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    setPendingDir(nd);
  }

  // Occupied set (for potential future features)
  const occupied = useMemo(() => {
    const s = new Set();
    snake.forEach((p) => s.add(`${p.x},${p.y}`));
    return s;
  }, [snake]);

  return (
    <div className="w-full max-w-xl mx-auto p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span className="inline-block">Snake</span>
          <motion.span
            initial={{ rotate: -10 }}
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 3.6 }}
            className="text-lg">
            🐍
          </motion.span>
        </h1>
        <div className="flex items-center gap-2 text-sm *:text-white">
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Score: {score}</span>
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Best: {best}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            onClick={() => (gameOver ? restart() : setPaused((p) => !p))}
            className="px-3 py-1 rounded-xl shadow hover:shadow-md border bg-white dark:bg-gray-900 text-white">
            {gameOver ? "Restart" : paused ? "Resume" : "Pause"}
          </motion.button>
        </div>
      </div>

      <div ref={containerRef} tabIndex={0} className="outline-none">
        {/* BOARD */}
        <div
          className="relative rounded-2xl shadow-inner overflow-hidden"
          style={{
            aspectRatio: "1 / 1",
            backgroundImage:
              "radial-gradient(1200px 400px at -20% -20%, rgba(16,185,129,0.08), transparent 40%)," +
              "radial-gradient(800px 500px at 120% 120%, rgba(239,68,68,0.06), transparent 40%)," +
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: `auto, auto, ${cellPct}% ${cellPct}%, ${cellPct}% ${cellPct}%`,
            backgroundPosition: "0 0, 0 0, 0 0, 0 0",
            backgroundColor: "rgba(17,24,39,0.9)", // dark base looks nice even in light mode
          }}>
          {/* SNAKE LAYER (animated absolute segments) */}
          {snake.map((seg, i) => (
            <motion.div
              key={`seg-${i}`}
              layoutId={`seg-${i}`}
              initial={false}
              animate={{
                top: `${seg.y * cellPct}%`,
                left: `${seg.x * cellPct}%`,
                scale: i === 0 ? 0.96 : 0.92,
              }}
              transition={segTransition}
              className={(i === 0 ? "bg-emerald-500" : "bg-emerald-400") + " absolute rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.35)]"}
              style={{
                width: `${cellPct}%`,
                height: `${cellPct}%`,
              }}>
              {/* Head eyes */}
              {i === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-1 translate-y-[-10%]">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* FOOD (static) */}
          <div
            key={`food-${food.x}-${food.y}`}
            className="absolute rounded-xl bg-gradient-to-br from-rose-500 to-red-500"
            style={{
              width: `${cellPct}%`,
              height: `${cellPct}%`,
              top: `${food.y * cellPct}%`,
              left: `${food.x * cellPct}%`,
            }}
          />

          {/* Eat burst */}
          <AnimatePresence>
            {eatPulse && (
              <motion.div
                key={eatPulse.id}
                initial={{ opacity: 0.5, scale: 0 }}
                animate={{ opacity: 0, scale: 2.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute rounded-full border-2 border-white/50"
                style={{
                  width: `${cellPct}%`,
                  height: `${cellPct}%`,
                  top: `${eatPulse.y * cellPct}%`,
                  left: `${eatPulse.x * cellPct}%`,
                }}
                onAnimationComplete={() => setEatPulse(null)}
              />
            )}
          </AnimatePresence>

          {/* Overlays */}
          <AnimatePresence>
            {(gameOver || paused) && (
              <motion.div
                className="absolute inset-0 backdrop-blur-[2px] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}>
                <motion.div
                  initial={{ y: 10, scale: 0.98 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 10, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="px-4 py-3 rounded-2xl bg-white/90 dark:bg-gray-900/90 shadow-xl border text-center">
                  {gameOver ? (
                    <div className="text-white">
                      <div className="text-lg font-semibold mb-1">Game over</div>
                      <div className="text-sm mb-3">
                        Press <kbd className="px-1 py-0.5 border rounded">R</kbd> or tap Restart
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={restart}
                        className="px-3 py-1.5 rounded-xl shadow border bg-white dark:bg-gray-900">
                        Restart
                      </motion.button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm">Paused</div>
                      <div className="text-xs text-gray-500">Press Space to resume</div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HUD */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            {/* Speed meter (right = faster) */}
            <motion.div
              className="h-full bg-emerald-500"
              initial={false}
              animate={{ width: `${((START_SPEED_MS - speed) / (START_SPEED_MS - MIN_SPEED_MS)) * 100}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 20 }}
            />
          </div>
          <div className="text-xs text-gray-500">speed</div>
        </div>

        {/* Touch controls */}
        <div className="mt-4 grid grid-cols-3 gap-2 w-44 mx-auto">
          <div></div>
          <PadButton label="↑" onClick={() => setDirectionByPad("up")} />
          <div></div>
          <PadButton label="←" onClick={() => setDirectionByPad("left")} />
          <PadButton label="↓" onClick={() => setDirectionByPad("down")} />
          <PadButton label="→" onClick={() => setDirectionByPad("right")} />
        </div>

        <div className="mt-3 text-xs text-center text-gray-500">Controls: Arrow keys / WASD · Space = pause/resume · R = restart</div>
      </div>
    </div>
  );
}

function PadButton({ label, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className="rounded-2xl border px-4 py-2 shadow bg-white/95 dark:bg-gray-900/95 text-white">
      {label}
    </motion.button>
  );
}
