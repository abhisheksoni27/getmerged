"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
}

export function RelativityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const spacing = 32;
    const mouse = { x: -1000, y: -1000, radius: 180 };

    // Populate relativity grid particles
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        particles.push({
          x,
          y,
          originX: x,
          originY: y,
          size: Math.random() * 1.5 + 0.8,
          opacity: Math.random() * 0.4 + 0.2,
          vx: 0,
          vy: 0,
        });
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // General relativity spacetime distortion force
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * force * 45;
          const pushY = Math.sin(angle) * force * 45;

          p.vx -= pushX * 0.1;
          p.vy -= pushY * 0.1;
        }

        // Gravitational elastic return force back to grid origin
        const returnDx = p.originX - p.x;
        const returnDy = p.originY - p.y;
        p.vx += returnDx * 0.05;
        p.vy += returnDy * 0.05;

        // Friction damping
        p.vx *= 0.85;
        p.vy *= 0.85;

        p.x += p.vx;
        p.y += p.vy;

        // Draw distorted spacetime particle star dot with emerald gravitational glow near cursor
        const isNear = distance < mouse.radius;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isNear ? p.size * 1.8 : p.size, 0, Math.PI * 2);
        ctx.fillStyle = isNear ? `rgba(16, 185, 129, ${p.opacity + 0.4})` : `rgba(161, 161, 170, ${p.opacity})`;
        ctx.fill();
      });

      // Draw constellation connecting lines between distorted particles near cursor
      for (let i = 0; i < particles.length; i += 3) {
        const p1 = particles[i];
        const distToMouse = Math.hypot(mouse.x - p1.x, mouse.y - p1.y);
        if (distToMouse < 140) {
          for (let j = i + 1; j < particles.length; j += 3) {
            const p2 = particles[j];
            const distBetween = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (distBetween < 45) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - distBetween / 45) * 0.25})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60"
    />
  );
}
