"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Environment } from "@react-three/drei";
import * as THREE from "three";

export function EarthGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const earthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [textureLoaded, setTextureLoaded] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);

  // Load texture in useEffect to avoid state updates during render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(
        "/images/texture_earth.jpg",
        // onLoad callback
        () => {
          setTextureLoaded(true);
          // Dispatch custom event to notify parent component using requestAnimationFrame
          // to avoid blocking the animation thread
          requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent("earthTextureLoaded"));
          });
        },
        // onProgress callback (optional)
        undefined,
        // onError callback (optional)
        (error) => {
          console.error("Error loading earth texture:", error);
          setTextureLoaded(true); // Still fade in even if texture fails
          // Dispatch event even on error so canvas doesn't stay invisible
          // Use requestAnimationFrame to avoid blocking animation thread
          requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent("earthTextureLoaded"));
          });
        }
      );
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      setEarthTexture(texture);
    }
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2; // Slower, more realistic rotation
      groupRef.current.rotation.x += delta * 0.05; // Very subtle x rotation
    }

    // Fade in the globe after texture is loaded
    if (textureLoaded && opacity < 1) {
      setOpacity((prev) => Math.min(prev + delta * 2, 1)); // Fade in over 0.5 seconds
    }
  });

  return (
    <group ref={groupRef} visible={opacity > 0}>
      <Sphere args={[1, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial
          ref={earthMaterialRef}
          map={earthTexture}
          color="#666666"
          roughness={0.8}
          metalness={0.1}
          envMapIntensity={0.3}
          transparent={true}
          opacity={opacity}
        />
      </Sphere>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={0.6} color="#4f46e5" />
      <Environment preset="sunset" />
    </group>
  );
}
