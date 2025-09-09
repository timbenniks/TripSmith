"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Loader2 } from "lucide-react";
import { EarthGlobe } from "./earth-globe";

interface EarthVisualizationProps {
  mounted: boolean;
  isClient: boolean;
}

export function EarthVisualization({
  mounted,
  isClient,
}: EarthVisualizationProps) {
  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[70%] w-[72rem] h-[72rem] z-0 pointer-events-auto">
      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-900/10 to-purple-900/10 backdrop-blur-sm border border-white/10 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:scale-105 group cursor-pointer">
        {mounted && isClient ? (
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            }
          >
            <Canvas
              camera={{ position: [0, 0, 3], fov: 45 }}
              className="w-full h-full"
              gl={{ antialias: true, alpha: true }}
              onCreated={() => {
                // Canvas is ready
              }}
            >
              <EarthGlobe />
            </Canvas>
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-purple-600/20">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 animate-pulse" />
          </div>
        )}
        {/* Hover overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:via-blue-500/10 group-hover:to-purple-500/10 transition-all duration-500 rounded-full" />
      </div>
    </div>
  );
}
