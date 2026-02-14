"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const LOGO_SIZE = 160;
const MAX_PARTICLES = 28;
const THROTTLE_MS = 50;
const FADE_DURATION_MS = 800;

type Particle = {
  id: number;
  x: number;
  y: number;
};

export default function MouseLogoTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);
  const lastTimeRef = useRef(0);

  const addParticle = useCallback((clientX: number, clientY: number) => {
    const id = ++idRef.current;
    setParticles((prev) => {
      const next = [...prev, { id, x: clientX, y: clientY }];
      return next.length > MAX_PARTICLES ? next.slice(-MAX_PARTICLES) : next;
    });
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, FADE_DURATION_MS);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTimeRef.current < THROTTLE_MS) return;
      lastTimeRef.current = now;
      addParticle(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [addParticle]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1]"
      aria-hidden="true"
    >
      {particles.map(({ id, x, y }) => (
        <div
          key={id}
          className="logo-trail-particle absolute animate-logo-fade"
          style={{
            left: x,
            top: y,
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            marginLeft: -LOGO_SIZE / 2,
            marginTop: -LOGO_SIZE / 2,
            backgroundImage: "url(/logo-transparent.png)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
      ))}
    </div>
  );
}
