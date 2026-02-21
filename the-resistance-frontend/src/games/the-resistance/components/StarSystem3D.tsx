import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Html } from "@react-three/drei"
import { useGameStore } from "../../../store/gameStore"
import { getTriviaForStar } from "../../data/spaceTrivia"

interface StarSystemProps {
  star: {
    id: number
    position: [number, number, number]
    color: string
    size: number
  }
  onBack: () => void
}

export function StarSystem3D({ star, onBack }: StarSystemProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  const status = useGameStore(state => state.starStates[star.id]) || 'unknown'
  const gamePhase = useGameStore(state => state.gamePhase)
  const setClickedStarId = useGameStore(state => state.setClickedStarId)

  // Generate random planetary system
  const planets = [
    { distance: 3, size: 0.3, color: "#8B4513", speed: 1, name: "Rocky-A", moons: 0 },
    { distance: 5, size: 0.5, color: "#4169E1", speed: 0.7, name: "Oceanic-B", moons: 1 },
    { distance: 8, size: 0.8, color: "#FF8C00", speed: 0.5, name: "Gas-C", moons: 3 },
    { distance: 12, size: 0.6, color: "#9370DB", speed: 0.3, name: "Ice-D", moons: 2 },
  ]

  // Determine UI State
  let bannerClass = "bg-[rgba(0,167,181,0.1)] border-[rgba(0,167,181,0.3)] text-[var(--color-teal)] shadow-[0_0_15px_rgba(0,167,181,0.2)]";
  let bannerTitle = "SYSTEM INFO";
  let bannerDesc = "Standard encyclopedia read";

  if (status === 'scanning') {
    bannerClass = "bg-[rgba(253,218,36,0.1)] border-[rgba(253,218,36,0.4)] text-yellow-500 shadow-[0_0_15px_rgba(253,218,36,0.2)]";
    bannerTitle = "SCANNING";
    bannerDesc = "Generating ZK Proof...";
  } else if (status === 'hit') {
    bannerClass = "bg-[rgba(248,113,113,0.15)] border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(248,113,113,0.3)]";
    bannerTitle = "HIT MATCH";
    bannerDesc = "Enemy Fleet Base Detected!";
  } else if (status === 'miss') {
    bannerClass = "bg-gray-800/40 border-gray-600/50 text-gray-400 shadow-[0_0_15px_rgba(0,0,0,0.5)]";
    bannerTitle = "MISS";
    bannerDesc = "No enemy presence found.";
  } else if (status === 'base') {
    bannerClass = "bg-[rgba(16,185,129,0.15)] border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    bannerTitle = "YOUR BASE";
    bannerDesc = "Friendly fleet sector";
  }

  return (
    <group ref={groupRef} position={star.position}>
      {/* Central Star */}
      <mesh>
        <sphereGeometry args={[star.size * 2, 32, 32]} />
        <meshBasicMaterial color={star.color} />
      </mesh>

      {/* Star corona */}
      <mesh scale={1.5}>
        <sphereGeometry args={[star.size * 2, 32, 32]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>

      {/* Planets */}
      {planets.map((planet, index) => (
        <Planet key={index} {...planet} starColor={star.color} />
      ))}

      {/* UI Overlay */}
      <Html fullscreen zIndexRange={[100, 0]}>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md p-5 rounded-2xl border border-gray-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] text-white w-[320px] flex flex-col gap-4 pointer-events-auto">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-800 pb-3">
            <div>
              <h2 className="text-xl font-display uppercase tracking-widest font-bold text-[var(--color-ink)] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                Star #{star.id.toString().padStart(3, '0')}
              </h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-muted)] mt-1 font-semibold">
                Class {star.color === "#ffffaa" ? "G (Yellow)" : star.color === "#aaddff" ? "A (Blue)" : "M (Red)"}
              </p>
            </div>
            {status === 'scanning' && (
              <svg className="animate-spin h-5 w-5 text-yellow-500 mt-1" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>

          {/* Dynamic ZK Status Banner */}
          {(gamePhase === 'playing' || status !== 'unknown') && status !== 'unknown' && (
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${bannerClass}`}>
              <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em]">
                {bannerTitle}
              </div>
              {bannerDesc && (
                <div className="text-[10px] opacity-80 mt-1 uppercase tracking-widest">
                  {bannerDesc}
                </div>
              )}
            </div>
          )}

          {/* Manual Scan Action */}
          {gamePhase === 'playing' && status === 'unknown' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setClickedStarId(star.id)
              }}
              className="mt-1 w-full bg-[rgba(253,218,36,0.15)] hover:bg-[rgba(253,218,36,0.25)] text-yellow-500 border border-[rgba(253,218,36,0.5)] font-display font-bold text-xs uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(253,218,36,0.3)] hover:shadow-[0_0_20px_rgba(253,218,36,0.5)]"
            >
              Initialize ZK Scan
            </button>
          )}

          {/* Trivia Info (Hidden during scanning to focus on the result) */}
          {status !== 'scanning' && (
            <div className="space-y-2 bg-black/40 rounded-xl p-3 border border-gray-800/80">
              <div className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[var(--color-ink-muted)] mb-2 px-1 flex items-center gap-1.5">
                <span className="text-[var(--color-teal)] opacity-70 mt-0.5">❖</span>
                Astrophysics Log
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed px-1 font-sans tracking-wide">
                {getTriviaForStar(star.id)}
              </p>
            </div>
          )}

          {/* Return Button */}
          {status !== 'scanning' && (
            <button 
              onClick={onBack} 
              className="mt-1 w-full border border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-800 text-gray-300 font-display text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            >
              ← Return to Galaxy
            </button>
          )}
        </div>
      </Html>
    </group>
  )
}

interface PlanetProps {
  distance: number
  size: number
  color: string
  speed: number
  name: string
  moons: number
  starColor: string
}

function Planet({ distance, size, color, speed, moons, starColor }: PlanetProps) {
  const planetRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (planetRef.current) {
      planetRef.current.rotation.y = state.clock.elapsedTime * speed * 0.2
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <group ref={planetRef}>
      <group position={[distance, 0, 0]}>
        {/* Planet */}
        <mesh ref={meshRef}>
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>

        {/* Planet atmosphere */}
        <mesh scale={1.1}>
          <sphereGeometry args={[size, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.BackSide} />
        </mesh>

        {/* Moons */}
        {Array.from({ length: moons }).map((_, i) => (
          <Moon key={i} distance={size + 0.5 + i * 0.3} size={size * 0.2} speed={2 + i} offset={i * 2} />
        ))}
      </group>

      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[distance - 0.05, distance + 0.05, 64]} />
        <meshBasicMaterial color={starColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

interface MoonProps {
  distance: number
  size: number
  speed: number
  offset: number
}

function Moon({ distance, size, speed, offset }: MoonProps) {
  const moonRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (moonRef.current) {
      moonRef.current.rotation.y = state.clock.elapsedTime * speed + offset
    }
  })

  return (
    <group ref={moonRef}>
      <mesh position={[distance, 0, 0]}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color="#888888" roughness={0.9} />
      </mesh>
    </group>
  )
}
