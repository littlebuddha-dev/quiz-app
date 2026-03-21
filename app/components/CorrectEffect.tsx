/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/unsupported-syntax */
// Path: app/components/CorrectEffect.tsx
// Title: Correct Answer Animation Component
// Purpose: Full-screen overlay with canvas-based firework and confetti animations.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface CorrectEffectProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
  score?: string;
  btnLabel?: string;
}

const COLORS = [
  '#FF6EE7', '#FF4466', '#FFED47', '#47FFC8',
  '#47B8FF', '#FF9D47', '#C847FF', '#47FF8A',
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF99FF', '#FFFFFF'
];

const FLOAT_SYMBOLS = ['⭐', '🎉', '🎊', '💫', '✨', '🌟', '🎈', '🎀', '💥', '🎆'];

export default function CorrectEffect({
  isVisible,
  onClose,
  message = 'すばらしい！正解です！',
  score = '+10 XP',
  btnLabel = 'つぎへすすむ →'
}: CorrectEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const animIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 400);
  };

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      type: 'ribbon' | 'circle' | 'rect';
      x: number = 0;
      y: number = 0;
      color: string = '';
      size: number = 0;
      speedX: number = 0;
      speedY: number = 0;
      rotation: number = 0;
      rotSpeed: number = 0;
      wobble: number = 0;
      wobbleSpd: number = 0;
      scaleX: number = 1;
      length: number = 0;
      width: number = 0;

      constructor() {
        const r = Math.random();
        this.type = r < 0.3 ? 'ribbon' : r < 0.6 ? 'circle' : 'rect';
        this.reset(true);
      }

      reset(fromTop: boolean) {
        this.x = Math.random() * canvas.width;
        this.y = fromTop ? Math.random() * -200 : Math.random() * canvas.height;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.size = Math.random() * 10 + 6;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = Math.random() * 3 + 1.5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpd = Math.random() * 0.1 + 0.02;
        this.scaleX = 1;
        if (this.type === 'ribbon') {
          this.length = Math.random() * 30 + 20;
          this.width = Math.random() * 4 + 2;
        }
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.wobble) * 1.2;
        this.wobble += this.wobbleSpd;
        this.rotation += this.rotSpeed;
        this.scaleX = Math.sin(this.wobble * 2) * 0.8 + 0.2;
        if (this.y > canvas.height + 60) this.reset(true);
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;

        if (this.type === 'circle') {
          ctx.scale(this.scaleX, 1);
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'rect') {
          ctx.scale(this.scaleX, 1);
          ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        } else {
          ctx.scale(this.scaleX, 1);
          ctx.lineWidth = this.width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, -this.length / 2);
          ctx.quadraticCurveTo(this.width * 3, 0, 0, this.length / 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    class Firework {
      alive: boolean = false;
      particles: any[] = [];
      x: number = 0;
      y: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height * 0.6 + 20;
        this.particles = [];
        const count = Math.floor(Math.random() * 30 + 25);
        const color1 = COLORS[Math.floor(Math.random() * COLORS.length)];
        const color2 = COLORS[Math.floor(Math.random() * COLORS.length)];

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          this.particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: Math.random() < 0.5 ? color1 : color2,
            size: Math.random() * 3 + 2,
            trail: []
          });
        }
        this.alive = true;
      }

      update() {
        let deadCount = 0;
        for (const p of this.particles) {
          p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
          if (p.trail.length > 6) p.trail.shift();
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.vx *= 0.97;
          p.alpha -= 0.018;
          if (p.alpha <= 0) deadCount++;
        }
        if (deadCount === this.particles.length) this.alive = false;
      }

      draw() {
        if (!ctx) return;
        for (const p of this.particles) {
          if (p.alpha <= 0) continue;
          for (let t = 0; t < p.trail.length; t++) {
            const tr = p.trail[t];
            ctx.save();
            ctx.globalAlpha = tr.alpha * (t / p.trail.length) * 0.5;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, p.size * (t / p.trail.length), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    const confetti = Array.from({ length: 160 }, () => new Particle());
    const fireworks = [new Firework(), new Firework(), new Firework()];

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of confetti) { p.update(); p.draw(); }
      for (const fw of fireworks) {
        fw.update();
        fw.draw();
        if (!fw.alive && Math.random() < 0.04) fw.reset();
      }
      if (frame % 60 === 0 && Math.random() < 0.7) {
        fireworks.push(new Firework());
        if (fireworks.length > 8) fireworks.shift();
      }
      frame++;
      animIdRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center overflow-hidden transition-all duration-400 ${isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100 pointer-events-all'}`}
    >
      <style jsx>{`
        .overlay-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            rgba(60, 0, 80, 0.85) 0%,
            rgba(0, 10, 40, 0.95) 100%
          );
        }
        canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .center-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popIn {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .star-burst {
          font-size: 80px;
          line-height: 1;
          filter: drop-shadow(0 0 20px #ffee00) drop-shadow(0 0 40px #ff9900);
          animation: starPulse 0.6s ease-in-out infinite alternate;
        }
        @keyframes starPulse {
          from { transform: scale(1) rotate(-5deg); filter: drop-shadow(0 0 20px #ffee00) drop-shadow(0 0 40px #ff9900); }
          to { transform: scale(1.12) rotate(5deg); filter: drop-shadow(0 0 30px #ff00cc) drop-shadow(0 0 60px #ffee00); }
        }
        .correct-text {
          font-size: 56px;
          font-weight: 900;
          letter-spacing: 4px;
          background: linear-gradient(135deg, #FF6EE7, #FFED47, #47FFC8, #FF6EE7);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite, textBounce 0.4s ease-in-out infinite alternate;
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes textBounce {
          from { transform: translateY(0px) scale(1); }
          to { transform: translateY(-6px) scale(1.03); }
        }
        .sub-text {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 0 16px #ff00cc, 0 2px 8px rgba(0,0,0,0.5);
          animation: fadeInUp 0.8s 0.3s both;
        }
        .score-badge {
          background: linear-gradient(135deg, #FF6EE7 0%, #FFED47 100%);
          color: #222;
          font-size: 18px;
          font-weight: 900;
          padding: 8px 28px;
          border-radius: 999px;
          animation: fadeInUp 0.8s 0.6s both;
          box-shadow: 0 4px 20px rgba(255, 100, 200, 0.6);
        }
        .close-btn {
          margin-top: 8px;
          padding: 10px 36px;
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 999px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s, transform 0.1s;
          animation: fadeInUp 0.8s 0.9s both;
          backdrop-filter: blur(8px);
        }
        .close-btn:hover { background: rgba(255,255,255,0.28); transform: scale(1.05); }
        .close-btn:active { transform: scale(0.97); }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .floating-star {
          position: absolute;
          pointer-events: none;
          animation: floatStar linear infinite;
          opacity: 0.8;
          bottom: -60px;
        }
        @keyframes floatStar {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.8; }
          50% { opacity: 1; }
          100% { transform: translateY(-110vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
      `}</style>

      <div className="overlay-bg"></div>
      <canvas ref={canvasRef}></canvas>

      {/* 浮かぶ絵文字 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="floating-star"
            style={{
              left: `${Math.random() * 95}vw`,
              fontSize: `${Math.random() * 20 + 16}px`,
              animationDuration: `${Math.random() * 6 + 5}s`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          >
            {FLOAT_SYMBOLS[Math.floor(Math.random() * FLOAT_SYMBOLS.length)]}
          </div>
        ))}
      </div>

      <div className="center-content text-white">
        <div className="star-burst">
          <Image src="/icons/ranking.svg" alt="" width={96} height={96} className="w-24 h-24 filter drop-shadow-[0_0_20px_#ffee00]" />
        </div>
        <div className="correct-text">CORRECT!</div>
        <div className="sub-text">{message}</div>
        <div className="score-badge">{score}</div>
        <button className="close-btn" onClick={handleClose}>{btnLabel}</button>
      </div>
    </div>
  );
}
