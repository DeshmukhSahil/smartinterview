"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

// Chirayu logo indigo, solar gold, and their lighter supporting shades.
const palette = ["#2b3a8f", "#fbc122", "#7282c0", "#ffe39b", "#bdc8ed"];
type IconType = "plain" | "sun" | "panel" | "building" | "roof";
type Cell = { x: number; y: number };
type Block = { id: number; color: string; icon: IconType; auto: boolean; leaving?: boolean };
type Grid = Record<string, Block>;

export default function BlockPlayground() {
  const surface = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<Grid>({});
  const [cursor, setCursor] = useState<Cell | null>(null);
  const [dimensions, setDimensions] = useState({ cols: 1, rows: 1, size: 32 });
  const currentGrid = useRef<Grid>({});
  const nextColor = useRef(0);
  const nextId = useRef(0);
  const press = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const size = entry.contentRect.width <= 760 ? 20 : 32;
      setDimensions({ cols: Math.ceil(entry.contentRect.width / size), rows: Math.ceil(entry.contentRect.height / size), size });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function toggle(cell: Cell) {
    if (cell.x < 0 || cell.y < 0 || cell.x >= dimensions.cols || cell.y >= dimensions.rows) return;
    const key = `${cell.x},${cell.y}`;
    const next = { ...currentGrid.current };
    if (next[key]) delete next[key];
    else {
      next[key] = { id: nextId.current++, color: palette[nextColor.current], icon: "plain", auto: false };
      nextColor.current = (nextColor.current + 1) % palette.length;
    }
    currentGrid.current = next;
    setGrid(next);
  }

  // Continuously pop up Minecraft-style sun / solar-panel tiles and rising building
  // towers that ripple out from the centre column toward the left and right edges,
  // behind the application form.
  useEffect(() => {
    if (dimensions.cols <= 1 || dimensions.rows <= 1) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const centerCol = Math.floor(dimensions.cols / 2);
    const maxOffset = Math.ceil(dimensions.cols / 2) + 2;
    let step = 0;
    const timers: number[] = [];

    function place(key: string, block: Block) {
      currentGrid.current = { ...currentGrid.current, [key]: block };
      setGrid(currentGrid.current);
    }

    function scheduleRemoval(key: string, id: number, after: number) {
      timers.push(
        window.setTimeout(() => {
          if (currentGrid.current[key]?.id !== id) return;
          currentGrid.current = { ...currentGrid.current, [key]: { ...currentGrid.current[key], leaving: true } };
          setGrid(currentGrid.current);
          timers.push(
            window.setTimeout(() => {
              if (currentGrid.current[key]?.id !== id) return;
              const next = { ...currentGrid.current };
              delete next[key];
              currentGrid.current = next;
              setGrid(next);
            }, 280)
          );
        }, after)
      );
    }

    function spawnSingle(col: number, row: number) {
      const key = `${col},${row}`;
      if (currentGrid.current[key]) return;
      const id = nextId.current++;
      place(key, { id, color: "", icon: Math.random() < 0.5 ? "sun" : "panel", auto: true });
      scheduleRemoval(key, id, 4200 + Math.random() * 1800);
    }

    function spawnTower(col: number, baseRow: number) {
      const height = Math.max(1, Math.min(2 + Math.floor(Math.random() * 4), baseRow + 1));
      const lifetime = 5400 + Math.random() * 2200;
      for (let i = 0; i < height; i++) {
        const row = baseRow - i;
        const key = `${col},${row}`;
        const isTop = i === height - 1;
        timers.push(
          window.setTimeout(() => {
            if (currentGrid.current[key]) return;
            const id = nextId.current++;
            place(key, { id, color: "", icon: isTop ? "roof" : "building", auto: true });
            scheduleRemoval(key, id, lifetime);
          }, i * 90)
        );
      }
    }

    function spawnOne() {
      const direction = step % 2 === 0 ? 1 : -1;
      const offset = Math.floor(step / 2) % maxOffset;
      step++;
      const col = Math.max(0, Math.min(dimensions.cols - 1, centerCol + direction * offset));
      if (Math.random() < 0.35) {
        spawnTower(col, Math.floor(Math.random() * dimensions.rows));
      } else {
        spawnSingle(col, Math.floor(Math.random() * dimensions.rows));
      }
    }

    const interval = window.setInterval(spawnOne, 380);
    return () => {
      clearInterval(interval);
      timers.forEach(t => clearTimeout(t));
    };
  }, [dimensions.cols, dimensions.rows]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const cell = cursor || { x: 0, y: 0 };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setCursor({ x: Math.max(0, Math.min(dimensions.cols - 1, cell.x + dx)), y: Math.max(0, Math.min(dimensions.rows - 1, cell.y + dy)) });
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) toggle(cell);
    } else if (event.key === "Escape") event.currentTarget.blur();
  }

  return (
    <div className="block-playground">
      <div ref={surface} className="block-surface" tabIndex={0} role="group" aria-label="Interactive solar grid" aria-describedby="grid-help"
        onKeyDown={onKeyDown}
        onFocus={() => setCursor({ x: Math.floor(dimensions.cols * .7), y: Math.min(10, dimensions.rows - 1) })}
        onBlur={() => { setCursor(null); press.current = null; }}
        onPointerDown={event => { if (event.button === 0) press.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; }}
        onPointerMove={event => {
          if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 8) press.current = null;
        }}
        onPointerUp={event => {
          const start = press.current;
          press.current = null;
          if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
          const rect = event.currentTarget.getBoundingClientRect();
          toggle({ x: Math.floor((event.clientX - rect.left) / dimensions.size), y: Math.floor((event.clientY - rect.top) / dimensions.size) });
          setCursor(null);
        }}
        onPointerCancel={() => { press.current = null; }}
        onPointerLeave={() => { press.current = null; }}>
        {Object.entries(grid).map(([key, block]) => {
          const [x, y] = key.split(",").map(Number);
          if (x >= dimensions.cols || y >= dimensions.rows) return null;
          return (
            <span
              key={key}
              aria-hidden="true"
              className={`placed-block icon-${block.icon} ${block.leaving ? "is-leaving" : ""}`}
              style={{ left: x * dimensions.size, top: y * dimensions.size, backgroundColor: block.icon === "plain" ? block.color : undefined }}
            />
          );
        })}
        {cursor && <span aria-hidden="true" className="block-cursor" style={{ left: cursor.x * dimensions.size, top: cursor.y * dimensions.size }} />}
      </div>
      <p id="grid-help" className="grid-help">Click an empty grid cell to add the next solar colour. Click a coloured cell to clear it. Keyboard: use arrow keys and Enter or Space. Escape leaves the grid.</p>
    </div>
  );
}
