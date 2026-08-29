"use client";

import React, { useEffect, useRef } from "react";

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  shimmerSpeed: number;
  shimmerPhase: number;
  hueOffset: number;
  excited: number;
}

interface WandSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  decay: number;
  hue: number;
}

interface GradientTrail {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  decay: number;
  hue: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  speed: number;
  life: number;
  decay: number;
  hue: number;
}

export function PhysicsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Respect reduced motion settings
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = window.devicePixelRatio || 1;
    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas || !ctx) return;
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Mouse & Lumos Wand tracking state
    const mouse = {
      x: width * 0.5,
      y: height * 0.4,
      targetX: width * 0.5,
      targetY: height * 0.4,
      vx: 0,
      vy: 0,
      speed: 0,
      isActive: false,
    };

    const wandSparks: WandSpark[] = [];
    const MAX_WAND_SPARKS = 120;

    const trails: GradientTrail[] = [];
    const MAX_TRAILS = 35;

    const ripples: Ripple[] = [];

    let globalHue = 190;
    let localHue = 190;

    const addRipple = (x: number, y: number, maxRadius = 260, strength = 1.0) => {
      const hue = (globalHue + (Math.random() - 0.5) * 90 + 360) % 360;
      ripples.push({
        x,
        y,
        radius: 0,
        maxRadius,
        strength,
        speed: 6.0 + Math.random() * 2.5,
        life: 1.0,
        decay: 0.038,
        hue,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const prevTargetX = mouse.targetX;
      const prevTargetY = mouse.targetY;
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isActive = true;

      const moveDist = Math.hypot(e.clientX - prevTargetX, e.clientY - prevTargetY);

      if (moveDist > 2) {
        // Dynamic color shift influenced by mouse speed
        localHue = (localHue + moveDist * 0.8) % 360;

        // 1. Emit Lumos Wand Stardust Sparks
        const sparkCount = Math.min(4, Math.floor(moveDist / 6) + 1);
        for (let i = 0; i < sparkCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.8 + Math.random() * (moveDist * 0.12 + 2);
          const sparkHue = (localHue + (Math.random() - 0.5) * 45 + 360) % 360;
          wandSparks.push({
            x: e.clientX + (Math.random() - 0.5) * 12,
            y: e.clientY + (Math.random() - 0.5) * 12,
            vx: Math.cos(angle) * spd * 0.6,
            vy: Math.sin(angle) * spd * 0.6 - 0.4,
            size: 0.5 + Math.random() * 0.9,
            life: 1.0,
            decay: 0.025 + Math.random() * 0.03,
            hue: sparkHue,
          });
        }
        if (wandSparks.length > MAX_WAND_SPARKS) {
          wandSparks.splice(0, wandSparks.length - MAX_WAND_SPARKS);
        }

        // 2. Emit Smooth Aurora Gradient Puff
        trails.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: 18 + Math.min(45, moveDist * 1.2),
          life: 1.0,
          decay: 0.042,
          hue: localHue,
        });
        if (trails.length > MAX_TRAILS) {
          trails.shift();
        }
      }

      if (moveDist > 45 && Math.random() < 0.25) {
        addRipple(e.clientX, e.clientY, 180 + moveDist * 1.5, 0.7);
      }
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
    };

    const handleClick = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY, 350, 1.3);
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 5.5;
        const sparkHue = (localHue + i * 10) % 360;
        wandSparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 0.6 + Math.random() * 1.0,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.02,
          hue: sparkHue,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    // Microscopic Stardust swarm
    const dustCount = Math.min(320, Math.floor((width * height) / 4500));
    const dust: DustParticle[] = [];

    for (let i = 0; i < dustCount; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.15 - Math.random() * 0.45,
        size: 0.4 + Math.random() * 0.7,
        baseAlpha: 0.25 + Math.random() * 0.55,
        shimmerSpeed: 0.03 + Math.random() * 0.05,
        shimmerPhase: Math.random() * Math.PI * 2,
        hueOffset: (Math.random() - 0.5) * 120,
        excited: 0,
      });
    }

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(32, now - lastTime) / 16.666;
      lastTime = now;

      // Continuous rich color morphing over time
      globalHue = (globalHue + 0.35 * dt) % 360;
      localHue = (localHue + 0.2 * dt) % 360;

      // Fast responsive wand tracking
      const prevX = mouse.x;
      const prevY = mouse.y;
      mouse.x += (mouse.targetX - mouse.x) * 0.45 * dt;
      mouse.y += (mouse.targetY - mouse.y) * 0.45 * dt;
      mouse.vx = mouse.x - prevX;
      mouse.vy = mouse.y - prevY;
      mouse.speed = Math.hypot(mouse.vx, mouse.vy);

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      // --- LAYER 1: Radiant Lumos Aurora Gradient Puffs ---
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.life -= t.decay * dt;
        t.radius += 1.0 * dt;

        if (t.life <= 0) {
          trails.splice(i, 1);
          continue;
        }

        const alpha = t.life * 0.22;
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.radius);
        grad.addColorStop(0, `hsla(${t.hue}, 95%, 75%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${(t.hue + 45) % 360}, 90%, 65%, ${alpha * 0.45})`);
        grad.addColorStop(1, `hsla(${t.hue}, 80%, 60%, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Active Wand Tip Focus (Lumos aura)
      if (mouse.isActive) {
        const wandRadius = 45 + Math.min(35, mouse.speed * 1.6);
        const wandGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, wandRadius);
        wandGrad.addColorStop(0, `hsla(${localHue}, 95%, 85%, 0.2)`);
        wandGrad.addColorStop(0.45, `hsla(${(localHue + 50) % 360}, 90%, 70%, 0.06)`);
        wandGrad.addColorStop(1, `hsla(${localHue}, 85%, 60%, 0)`);

        ctx.fillStyle = wandGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, wandRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- LAYER 2: Expanding Prismatic Shockwaves ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed * dt;
        r.life -= r.decay * dt;

        if (r.life <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        const ringAlpha = Math.sin(r.life * Math.PI) * 0.35 * r.strength;
        const ringHue = r.hue;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${ringHue}, 95%, 82%, ${ringAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const waveGrad = ctx.createRadialGradient(r.x, r.y, Math.max(0, r.radius - 16), r.x, r.y, r.radius + 12);
        waveGrad.addColorStop(0, `hsla(${ringHue}, 90%, 75%, 0)`);
        waveGrad.addColorStop(0.5, `hsla(${ringHue}, 90%, 75%, ${ringAlpha * 0.4})`);
        waveGrad.addColorStop(1, `hsla(${(ringHue + 40) % 360}, 90%, 65%, 0)`);

        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius + 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- LAYER 3: Lumos Wand Cast Sparks (Wake Particles) ---
      for (let i = wandSparks.length - 1; i >= 0; i--) {
        const s = wandSparks[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.95;
        s.vy *= 0.95;
        s.life -= s.decay * dt;

        if (s.life <= 0) {
          wandSparks.splice(i, 1);
          continue;
        }

        const sparkAlpha = s.life * 0.9;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.8 + (1 - s.life) * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, 85%, ${sparkAlpha})`;
        ctx.shadowColor = `hsla(${s.hue}, 95%, 70%, 0.8)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // --- LAYER 4: Microscopic Stardust Swarm (Awakened & Dispersed by Wand) ---
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }

        // Shimmer twinkle
        p.shimmerPhase += p.shimmerSpeed * dt;
        const twinkle = (Math.sin(p.shimmerPhase) + 1) * 0.5;

        // Wand proximity physics: Disperse, swirl, and ignite luminosity
        if (mouse.isActive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const wandInfluenceRadius = 140;

          if (dist < wandInfluenceRadius && dist > 0) {
            const force = 1 - dist / wandInfluenceRadius;
            p.x += (dx / dist) * force * 3.5 * dt;
            p.y += (dy / dist) * force * 3.5 * dt;

            p.x += (-dy / dist) * force * 1.5 * dt;
            p.y += (dx / dist) * force * 1.5 * dt;

            p.excited = Math.min(1.0, p.excited + force * 0.6);
          }
        }

        p.excited *= 0.94;

        const effectiveAlpha = Math.min(1.0, p.baseAlpha * (0.5 + twinkle * 0.5) + p.excited * 0.55);
        const currentHue = (globalHue + p.hueOffset + p.excited * 60 + 360) % 360;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + p.excited * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${currentHue}, 85%, ${75 + p.excited * 20}%, ${effectiveAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ zIndex: 0 }}
      className="fixed inset-0 pointer-events-none opacity-80"
    />
  );
}
