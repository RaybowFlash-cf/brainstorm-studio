'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';

interface OrbProps {
  size?: number;
}

export function VoiceOrb({ size = 280 }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useAppStore((s) => s.phase);

  const config = useMemo(() => {
    switch (phase) {
      case 'speaking':
        return { targetSize: size + 60, hueBase: 265, hueRange: 18, speed: 2.5, amp: 0.95, shadowColor: 'rgba(168,139,250,.25)' };
      case 'listening':
        return { targetSize: size + 30, hueBase: 215, hueRange: 12, speed: 1.6, amp: 0.55, shadowColor: 'rgba(96,165,250,.2)' };
      case 'thinking':
        return { targetSize: size + 10, hueBase: 280, hueRange: 15, speed: 1.8, amp: 0.35, shadowColor: 'rgba(167,139,250,.15)' };
      case 'searching':
        return { targetSize: size + 20, hueBase: 200, hueRange: 20, speed: 2, amp: 0.45, shadowColor: 'rgba(56,189,248,.2)' };
      case 'error':
        return { targetSize: size, hueBase: 0, hueRange: 10, speed: 3, amp: 0.3, shadowColor: 'rgba(239,68,68,.2)' };
      default:
        return { targetSize: size, hueBase: 240, hueRange: 8, speed: 0.4, amp: 0.12, shadowColor: 'rgba(107,114,128,.1)' };
    }
  }, [phase, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640, H = 640, cx = W / 2, cy = H / 2, R = 130;
    let t = 0;
    let amp = 0.12;
    let animId: number;

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 0.8, a: Math.random() * 0.4 + 0.1,
    }));

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      amp += (config.amp - amp) * 0.07;

      const g1 = ctx!.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2);
      g1.addColorStop(0, `hsla(${config.hueBase},55%,72%,.12)`);
      g1.addColorStop(1, 'transparent');
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, W, H);

      ctx!.beginPath();
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        const n =
          Math.sin(a * 3 + t * 0.8) * 10 * amp +
          Math.cos(a * 5 + t * 1.2) * 6 * amp +
          Math.sin(a * 7 + t * 0.5) * 4 * amp;
        const r = R + n;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();

      const g2 = ctx!.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, R + 30);
      g2.addColorStop(0, `hsla(${config.hueBase + 20},65%,88%,.96)`);
      g2.addColorStop(0.5, `hsla(${config.hueBase},55%,78%,.92)`);
      g2.addColorStop(1, `hsla(${config.hueBase - 15},48%,68%,.88)`);
      ctx!.fillStyle = g2;
      ctx!.fill();

      const g3 = ctx!.createRadialGradient(cx - 18, cy - 18, 4, cx, cy, R * 0.55);
      g3.addColorStop(0, 'rgba(255,255,255,.55)');
      g3.addColorStop(1, 'rgba(255,255,255,0)');
      ctx!.fillStyle = g3;
      ctx!.fill();

      ctx!.save();
      ctx!.globalAlpha = 0.25 + amp * 0.25;
      for (let i = 0; i < 8; i++) {
        const wx = cx + Math.sin(t * 0.3 + i * 1.3) * 45;
        const wy = cy + Math.cos(t * 0.35 + i * 1.1) * 35;
        const wr = 28 + Math.sin(t * 0.45 + i) * 12;
        const wg = ctx!.createRadialGradient(wx, wy, 0, wx, wy, wr);
        wg.addColorStop(0, 'rgba(255,255,255,.45)');
        wg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx!.fillStyle = wg;
        ctx!.beginPath();
        ctx!.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();

      for (const p of particles) {
        p.x += p.vx + Math.sin(t + p.y * 0.008) * 0.25;
        p.y += p.vy + Math.cos(t + p.x * 0.008) * 0.25;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < R * 0.88) {
          ctx!.globalAlpha = p.a * amp * 2.5;
          ctx!.fillStyle = '#fff';
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
      t += 0.018;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [config]);

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={640}
        height={640}
        className="rounded-full transition-all duration-300"
        style={{
          width: config.targetSize,
          height: config.targetSize,
          filter: phase === 'speaking'
            ? `drop-shadow(0 0 40px ${config.shadowColor})`
            : phase === 'searching'
            ? `drop-shadow(0 0 30px ${config.shadowColor})`
            : undefined,
        }}
      />
    </div>
  );
}
