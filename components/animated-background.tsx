"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface AnimatedBackgroundProps {
  windowDimensions: { width: number; height: number };
  mounted: boolean;
}

export function AnimatedBackground({
  windowDimensions,
  mounted,
}: AnimatedBackgroundProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 pointer-events-none">
      {/* Additional gradient layers for depth */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/90 via-transparent to-purple-950/90" />
      <div className="absolute inset-0 bg-gradient-to-bl from-violet-950/80 via-transparent to-rose-950/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

      {/* Enhanced animated particles with more variety */}
      {mounted &&
        Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className={
              i % 3 === 0
                ? "absolute rounded-full w-2 h-2 bg-purple-300/40"
                : i % 3 === 1
                ? "absolute rounded-full w-1 h-1 bg-blue-300/50"
                : "absolute rounded-full w-1.5 h-1.5 bg-pink-300/30"
            }
            initial={{
              x: Math.random() * windowDimensions.width,
              y: Math.random() * windowDimensions.height,
            }}
            animate={{
              x: Math.random() * windowDimensions.width,
              y: Math.random() * windowDimensions.height,
            }}
            transition={{
              duration: Math.random() * 25 + 15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}

      <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-background/10 to-background/40" />
    </div>
  );
}
