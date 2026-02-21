import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Html } from "@react-three/drei"

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

  // Generate random planetary system
  const planets = [
    { distance: 3, size: 0.3, color: "#8B4513", speed: 1, name: "Rocky-A", moons: 0 },
    { distance: 5, size: 0.5, color: "#4169E1", speed: 0.7, name: "Oceanic-B", moons: 1 },
    { distance: 8, size: 0.8, color: "#FF8C00", speed: 0.5, name: "Gas-C", moons: 3 },
    { distance: 12, size: 0.6, color: "#9370DB", speed: 0.3, name: "Ice-D", moons: 2 },
  ]

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
      <Html position={[0, 15, 0]} center>
        <div className="bg-black/80 backdrop-blur-md p-4 rounded-lg text-white font-mono min-w-[300px]">
          <h2 className="text-lg font-bold mb-2">Star System #{star.id}</h2>
          <p className="text-xs opacity-80 mb-3">
            Class{" "}
            {star.color === "#ffffaa" ? "G (Yellow)" : star.color === "#aaddff" ? "A (Blue)" : "M (Red)"}{" "}
            Star
          </p>
          <div className="space-y-1 mb-3">
            {planets.map((planet, i) => (
              <div key={i} className="text-xs flex justify-between">
                <span>{planet.name}</span>
                <span className="opacity-60">{planet.moons} moon(s)</span>
              </div>
            ))}
          </div>
          <button 
            onClick={onBack} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 mt-2 rounded transition-colors text-sm"
          >
            ← Return to Galaxy View
          </button>
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
