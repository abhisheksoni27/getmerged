"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  glow: string;
}

const COLORS = [
  { color: "rgba(16, 185, 129, 0.75)", glow: "rgba(16, 185, 129, 0.4)" }, // S - Emerald
  { color: "rgba(56, 189, 248, 0.75)", glow: "rgba(56, 189, 248, 0.4)" }, // A - Sky
  { color: "rgba(192, 132, 252, 0.75)", glow: "rgba(192, 132, 252, 0.4)" }, // B - Violet
  { color: "rgba(255, 107, 0, 0.75)", glow: "rgba(255, 107, 0, 0.4)" }, // Primary Orange
];

export function PhysicsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Respect reduced motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse interactive state
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 140, // Repulsion radius
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Initialize nodes
    const nodeCount = Math.min(45, Math.max(25, Math.floor((width * height) / 28000)));
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const col = COLORS[i % COLORS.length];
      const rad = 1.5 + Math.random() * 2.5;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: rad,
        baseRadius: rad,
        color: col.color,
        glow: col.glow,
      });
    }

    // Physics render loop
    const maxLinkDistance = 140;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update node physics
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Mouse repulsion physics
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.hypot(dx, dy);

        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          n.vx += Math.cos(angle) * force * 0.8;
          n.vy += Math.sin(angle) * force * 0.8;
          n.radius = n.baseRadius * (1 + force * 1.2);
        } else {
          n.radius += (n.baseRadius - n.radius) * 0.05;
        }

        // Friction dampening
        n.vx *= 0.985;
        n.vy *= 0.985;

        // Base velocity
        n.x += n.vx;
        n.y += n.vy;

        // Soft bounce against bounds
        if (n.x < 0) {
          n.x = 0;
          n.vx *= -1;
        } else if (n.x > width) {
          n.x = width;
          n.vx *= -1;
        }

        if (n.y < 0) {
          n.y = 0;
          n.vy *= -1;
        } else if (n.y > height) {
          n.y = height;
          n.vy *= -1;
        }

        // Draw connections between nearby nodes (laser-like spring mesh)
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist2 = Math.hypot(n.x - n2.x, n.y - n2.y);

          if (dist2 < maxLinkDistance) {
            const alpha = (1 - dist2 / maxLinkDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Draw node particle with specular glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.glow;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-15 opacity-70"
    />
  );
}
