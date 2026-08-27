"use client";

import React, { useEffect, useRef } from "react";

interface Ball {
  x: number;
  y: number;
  r: number;
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

    // Subtle particles - density calibrated for dark slate backdrop
    const count = Math.min(300, Math.floor((width * height) / 6000));
    const balls: Ball[] = [];

    for (let i = 0; i < count; i++) {
      balls.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5, // 0.5 to 2.0 px
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const b of balls) {
        b.x += b.vx;
        b.y += b.vy;

        // Wrap around edges
        if (b.x < 0) b.x = width;
        if (b.x > width) b.x = 0;
        if (b.y < 0) b.y = height;
        if (b.y > height) b.y = 0;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
