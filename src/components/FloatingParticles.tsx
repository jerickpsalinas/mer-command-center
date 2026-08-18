import { useEffect, useRef, useCallback } from "react";

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  isHub: boolean;
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  driftRadius: number;
}

interface Pulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
}

interface Colors {
  primary: string;
  glow1: string;
  glow2: string;
  isDark: boolean;
}

function hsla(raw: string, alpha: number): string {
  return "hsla(" + raw.trim() + " / " + alpha + ")";
}

const FloatingParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const colorsRef = useRef<Colors>({ primary: "0 84% 58%", glow1: "0 84% 58%", glow2: "14 90% 56%", isDark: true });

  const readColors = useCallback(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const isDark = !root.classList.contains("light");
    colorsRef.current = {
      primary: cs.getPropertyValue("--primary").trim() || "0 84% 58%",
      glow1: cs.getPropertyValue("--glow-indigo").trim() || "0 84% 58%",
      glow2: cs.getPropertyValue("--glow-cyan").trim() || "14 90% 56%",
      isDark,
    };
  }, []);

  const initNodes = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const isMobile = w < 768;
    const count = isMobile ? 12 : 20;
    const hubs = isMobile ? 2 : 3;

    const nodes: Node[] = [];
    for (let i = 0; i < count; i++) {
      const isHub = i < hubs;
      nodes.push({
        x: 0,
        y: 0,
        baseX: Math.random() * w,
        baseY: Math.random() * h,
        radius: isHub ? 5 + Math.random() * 3 : 2 + Math.random() * 2.5,
        isHub,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: 0.15 + Math.random() * 0.25,
        speedY: 0.12 + Math.random() * 0.2,
        driftRadius: 20 + Math.random() * 30,
      });
    }
    nodesRef.current = nodes;
    pulsesRef.current = [];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      initNodes();
    };

    resize();
    readColors();

    const onResize = () => {
      resize();
      readColors();
    };
    window.addEventListener("resize", onResize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("mouseleave", onLeave);

    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let lastPulseTime = 0;

    const draw = (time: number) => {
      const { w, h } = sizeRef.current;
      const colors = colorsRef.current;
      const nodes = nodesRef.current;
      const pulses = pulsesRef.current;
      const mouse = mouseRef.current;
      const baseAlpha = colors.isDark ? 1 : 0.5;

      ctx.clearRect(0, 0, w, h);

      const t = time * 0.001;

      for (const n of nodes) {
        n.x = n.baseX + Math.sin(t * n.speedX + n.phaseX) * n.driftRadius;
        n.y = n.baseY + Math.cos(t * n.speedY + n.phaseY) * n.driftRadius;

        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = ((120 - dist) / 120) * 15;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      }

      const maxDist = w < 768 ? 150 : 200;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.25 * baseAlpha;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = hsla(colors.primary, alpha);
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      if (time - lastPulseTime > 800 && nodes.length > 1) {
        lastPulseTime = time;
        for (let attempt = 0; attempt < 5; attempt++) {
          const i = Math.floor(Math.random() * nodes.length);
          const j = Math.floor(Math.random() * nodes.length);
          if (i === j) continue;
          const a = nodes[i];
          const b = nodes[j];
          const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
          if (dist < maxDist) {
            pulses.push({
              fromIdx: i,
              toIdx: j,
              progress: 0,
              speed: 0.008 + Math.random() * 0.006,
            });
            break;
          }
        }
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const a = nodes[p.fromIdx];
        const b = nodes[p.toIdx];
        if (!a || !b) {
          pulses.splice(i, 1);
          continue;
        }
        const px = a.x + (b.x - a.x) * p.progress;
        const py = a.y + (b.y - a.y) * p.progress;
        const pulseAlpha = Math.sin(p.progress * Math.PI) * 0.8 * baseAlpha;

        const color = p.fromIdx % 2 === 0 ? colors.glow1 : colors.glow2;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 8);
        grad.addColorStop(0, hsla(color, pulseAlpha));
        grad.addColorStop(1, hsla(color, 0));
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      for (const n of nodes) {
        const glowSize = n.isHub ? 20 : 10;
        const nodeAlpha = (n.isHub ? 0.6 : 0.35) * baseAlpha;
        const color = n.isHub ? colors.glow1 : colors.primary;

        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
        grad.addColorStop(0, hsla(color, nodeAlpha * 0.6));
        grad.addColorStop(1, hsla(color, 0));
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = hsla(color, nodeAlpha);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mouseleave", onLeave);
      observer.disconnect();
    };
  }, [initNodes, readColors]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12] dark:opacity-[0.2]"
        style={{ background: "hsl(var(--glow-indigo))" }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.08] dark:opacity-[0.15]"
        style={{ background: "hsl(var(--glow-cyan))" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ opacity: 0.85 }}
      />
    </div>
  );
};

export default FloatingParticles;
