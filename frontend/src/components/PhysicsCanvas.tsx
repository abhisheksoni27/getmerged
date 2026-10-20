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
    // Respect reduced motion settings or mobile touch screens to save GPU/CPU and prevent scroll lag
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 768) {
      return;
    }

    let isCancelled = false;
    let cleanupFn: (() => void) | undefined;

    const startAnimation = () => {
      if (isCancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR to 2 to prevent 3x/4x mobile render stall
    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    // Pre-allocated object pools
    const MAX_WAND_SPARKS = 60;
    const wandSparks: WandSpark[] = [];

    const MAX_RIPPLES = 8;
    const ripples: Ripple[] = [];

    let globalHue = 190;
    let localHue = 190;

    const addRipple = (x: number, y: number, maxRadius = 220, strength = 0.8) => {
      if (ripples.length >= MAX_RIPPLES) {
        ripples.shift();
      }
      const hue = Math.round((globalHue + (Math.random() - 0.5) * 80 + 360) % 360);
      ripples.push({
        x,
        y,
        radius: 0,
        maxRadius,
        strength,
        speed: 7.0,
        life: 1.0,
        decay: 0.045,
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

      if (moveDist > 3) {
        localHue = (localHue + moveDist * 0.6) % 360;

        // Emit lightweight wand sparks
        const count = Math.min(2, Math.floor(moveDist / 12) + 1);
        for (let i = 0; i < count; i++) {
          if (wandSparks.length >= MAX_WAND_SPARKS) {
            wandSparks.shift();
          }
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.8 + Math.random() * 2.5;
          wandSparks.push({
            x: e.clientX + (Math.random() - 0.5) * 8,
            y: e.clientY + (Math.random() - 0.5) * 8,
            vx: Math.cos(angle) * spd * 0.5,
            vy: Math.sin(angle) * spd * 0.5 - 0.3,
            size: 0.5 + Math.random() * 0.8,
            life: 1.0,
            decay: 0.035 + Math.random() * 0.02,
            hue: Math.round((localHue + (Math.random() - 0.5) * 40 + 360) % 360),
          });
        }
      }

      if (moveDist > 55 && Math.random() < 0.2) {
        addRipple(e.clientX, e.clientY, 160 + moveDist * 1.2, 0.6);
      }
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
    };

    const handleClick = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY, 260, 1.0);
      // Fast burst without shadow blur
      const count = 16;
      for (let i = 0; i < count; i++) {
        if (wandSparks.length >= MAX_WAND_SPARKS) {
          wandSparks.shift();
        }
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const spd = 2.0 + Math.random() * 3.5;
        wandSparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 0.6 + Math.random() * 0.8,
          life: 1.0,
          decay: 0.03 + Math.random() * 0.02,
          hue: Math.round((localHue + i * 15) % 360),
        });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        mouse.targetX = t.clientX;
        mouse.targetY = t.clientY;
        mouse.x = t.clientX;
        mouse.y = t.clientY;
        mouse.isActive = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const prevTargetX = mouse.targetX;
        const prevTargetY = mouse.targetY;
        mouse.targetX = t.clientX;
        mouse.targetY = t.clientY;
        mouse.isActive = true;

        const moveDist = Math.hypot(t.clientX - prevTargetX, t.clientY - prevTargetY);
        if (moveDist > 4) {
          localHue = (localHue + moveDist * 0.6) % 360;
          if (wandSparks.length < MAX_WAND_SPARKS) {
            wandSparks.push({
              x: t.clientX,
              y: t.clientY,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5 - 0.2,
              size: 0.5 + Math.random() * 0.7,
              life: 1.0,
              decay: 0.04,
              hue: Math.round((localHue + (Math.random() - 0.5) * 40 + 360) % 360),
            });
          }
        }
      }
    };

    const handleTouchEnd = () => {
      mouse.isActive = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Calibrated Stardust Swarm (N=140 for smooth 60fps)
    const dustCount = Math.min(140, Math.floor((width * height) / 10000));
    const dust: DustParticle[] = [];

    for (let i = 0; i < dustCount; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.12 - Math.random() * 0.35,
        size: 0.4 + Math.random() * 0.6,
        baseAlpha: 0.25 + Math.random() * 0.45,
        shimmerSpeed: 0.03 + Math.random() * 0.04,
        shimmerPhase: Math.random() * Math.PI * 2,
        hueOffset: Math.round((Math.random() - 0.5) * 100),
        excited: 0,
      });
    }

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(32, now - lastTime) / 16.666;
      lastTime = now;

      globalHue = (globalHue + 0.3 * dt) % 360;
      localHue = (localHue + 0.2 * dt) % 360;

      // Mouse lerp
      const prevX = mouse.x;
      const prevY = mouse.y;
      mouse.x += (mouse.targetX - mouse.x) * 0.45 * dt;
      mouse.y += (mouse.targetY - mouse.y) * 0.45 * dt;
      mouse.vx = mouse.x - prevX;
      mouse.vy = mouse.y - prevY;
      mouse.speed = Math.hypot(mouse.vx, mouse.vy);

      ctx.clearRect(0, 0, width, height);

      // --- LAYER 1: Active Wand Glow (Single lightweight radial gradient) ---
      if (mouse.isActive) {
        const wandRadius = 35 + Math.min(25, mouse.speed * 1.2);
        const wandGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, wandRadius);
        const h = Math.round(localHue);
        wandGrad.addColorStop(0, `hsla(${h}, 90%, 80%, 0.16)`);
        wandGrad.addColorStop(0.5, `hsla(${(h + 40) % 360}, 85%, 70%, 0.04)`);
        wandGrad.addColorStop(1, `hsla(${h}, 80%, 60%, 0)`);

        ctx.fillStyle = wandGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, wandRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- LAYER 2: Expanding Delicate Shockwaves ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed * dt;
        r.life -= r.decay * dt;

        if (r.life <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        const ringAlpha = (Math.sin(r.life * Math.PI) * 0.3 * r.strength).toFixed(3);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue}, 90%, 80%, ${ringAlpha})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // --- LAYER 3: Lumos Wand Sparks (Hardware-accelerated arc draws, zero shadowBlur) ---
      for (let i = wandSparks.length - 1; i >= 0; i--) {
        const s = wandSparks[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= s.decay * dt;

        if (s.life <= 0) {
          wandSparks.splice(i, 1);
          continue;
        }

        const alpha = (s.life * 0.85).toFixed(2);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, 82%, ${alpha})`;
        ctx.fill();
      }

      // --- LAYER 4: Microscopic Stardust Swarm ---
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }

        p.shimmerPhase += p.shimmerSpeed * dt;
        const twinkle = (Math.sin(p.shimmerPhase) + 1) * 0.5;

        // Proximity repulsion
        if (mouse.isActive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const wandRadiusSq = 14400; // 120^2

          if (distSq < wandRadiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = 1 - dist / 120;
            p.x += (dx / dist) * force * 2.8 * dt;
            p.y += (dy / dist) * force * 2.8 * dt;
            p.excited = Math.min(1.0, p.excited + force * 0.5);
          }
        }

        p.excited *= 0.94;

        const alpha = Math.min(1.0, (p.baseAlpha * (0.5 + twinkle * 0.5)) + p.excited * 0.5).toFixed(2);
        const hue = Math.round((globalHue + p.hueOffset + p.excited * 50 + 360) % 360);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 85%, 78%, ${alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    cleanupFn = () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  };

  // Defer canvas startup until after main thread settles (LCP optimization)
  if ("requestIdleCallback" in window) {
    const idleId = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(startAnimation, { timeout: 1500 });
    return () => {
      isCancelled = true;
      if ("cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (cleanupFn) cleanupFn();
    };
  } else {
    const timeoutId = setTimeout(startAnimation, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      if (cleanupFn) cleanupFn();
    };
  }
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
