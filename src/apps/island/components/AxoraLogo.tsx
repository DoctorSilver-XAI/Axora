import { motion } from 'framer-motion'
import { cn } from '@shared/utils/cn'

interface AxoraLogoProps {
  size?: number
  className?: string
}

export function AxoraLogo({ size = 42, className }: AxoraLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn('relative flex items-center justify-center', className)}
    >
      {/* SVG Filter for Gooey/Liquid Effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="fluid-glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Container - Matching the rounded square shape */}
      <div className="relative w-full h-full rounded-[28%] bg-[#0B0F19] shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 backdrop-blur-xl">
        {/* 1. Deep Energy Core (Rotating Background) - Variable Speed */}
        <motion.div
          className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,#0f172a_0deg,#312e81_100deg,#0891b2_180deg,#312e81_260deg,#0f172a_360deg)] opacity-50"
          animate={{ rotate: 360 }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ filter: 'blur(20px)' }}
        />

        {/* 2. Fluid Blobs Layer (Using SVG Filter) - Diagonal Dynamic Flow */}
        <div
          style={{ filter: 'url(#fluid-glow)' }}
          className="absolute inset-0 w-full h-full opacity-100"
        >
          {/* Main Group Rotation for Speed Variation */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: [0, 180, 360] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.4, 1],
            }}
          >
            {/* Upper Blob (Blue/Purple) */}
            <motion.div
              className="absolute w-[70%] h-[70%] bg-indigo-600 rounded-full top-[-10%] left-[-10%] mix-blend-screen"
              animate={{
                scale: [1, 1.1, 0.9, 1],
                x: [0, 5, -5, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Lower Blob (Cyan/Teal) */}
            <motion.div
              className="absolute w-[70%] h-[70%] bg-cyan-600 rounded-full bottom-[-10%] right-[-10%] mix-blend-screen"
              animate={{
                scale: [1, 0.9, 1.1, 1],
                x: [0, -5, 5, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
            />
          </motion.div>
        </div>

        {/* 3. Central "Pupil" Structure - Bright, Focused, Futuristic */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Energy Ring */}
          <motion.div
            className="absolute w-[45%] h-[45%] rounded-full border border-indigo-300/30 bg-indigo-500/10 backdrop-blur-[1px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Core Glow */}
          <div className="relative w-[28%] h-[28%] rounded-full bg-white shadow-[0_0_25px_rgba(99,102,241,0.6)] flex items-center justify-center">
            {/* Pupille Interne */}
            <motion.div
              className="w-[70%] h-[70%] bg-slate-100 rounded-full shadow-inner"
              animate={{ scale: [0.95, 1, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* 4. Gloss/Reflection Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-60 pointer-events-none rounded-[28%]" />
      </div>

      {/* External Pulse Ring - Dynamic Speed Burst */}
      <motion.div
        className="absolute -inset-2 rounded-[32%] border border-cyan-400/20"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0, 0.3, 0],
          rotate: [0, 90],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'circOut',
        }}
      />
    </div>
  )
}
