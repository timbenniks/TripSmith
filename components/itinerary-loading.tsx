"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function ItineraryLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Animated Logo */}
      <motion.div
        className="relative"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Image
          src="/images/tripsmith-logo.png"
          alt="TripSmith"
          width={80}
          height={80}
          className="drop-shadow-2xl"
        />
      </motion.div>

      {/* Pulsing Text */}
      <motion.div
        className="mt-6 text-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <p className="text-white/90 text-lg font-medium">
          Creating your itinerary...
        </p>
        <p className="text-white/60 text-sm mt-1">This may take a moment</p>
      </motion.div>

      {/* Animated Dots */}
      <div className="flex space-x-2 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Gradient Border Animation */}
      <motion.div
        className="mt-6 w-64 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-full overflow-hidden"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}
