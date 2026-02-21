import { useRef, useState, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars, Environment } from "@react-three/drei"
import * as THREE from "three"
import { StarSystem3D } from "./StarSystem3D"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import { useGameStore } from "../../../store/gameStore"

interface StarData {
  id: number
  position: [number, number, number]
  color: string
  size: number
  hasSystem: boolean
}

export function Galaxy3D() {
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null)
  const [isZooming, setIsZooming] = useState(false)
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  // Generate galaxy stars in spiral pattern (200 total stars = 4 arms * 50 to match The Resistance grid if desired)
  const stars = useMemo(() => {
    const starArray: StarData[] = []
    const arms = 4
    const starsPerArm = 50

    for (let arm = 0; arm < arms; arm++) {
      for (let i = 0; i < starsPerArm; i++) {
        const angle = (arm * Math.PI * 2) / arms + (i / starsPerArm) * Math.PI * 2
        const radius = 20 + i * 1.5 + Math.random() * 10
        const spread = Math.random() * 8 - 4

        const x = Math.cos(angle) * radius + spread
        const y = (Math.random() - 0.5) * 15
        const z = Math.sin(angle) * radius + spread

        const colors = ["#ffffff", "#ffffaa", "#ffddaa", "#aaddff", "#ffaaaa"]
        const hasSystem = Math.random() > 0.7 // 30% of stars have planetary systems

        starArray.push({
          id: arm * starsPerArm + i,
          position: [x, y, z],
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 0.3 + Math.random() * 0.5,
          hasSystem,
        })
      }
    }

    return starArray
  }, [])

  const handleStarClick = (star: StarData) => {
    if (isZooming) return

    setIsZooming(true)
    setSelectedStar(star)

    // Animate camera to star
    const targetPosition = new THREE.Vector3(...star.position)
    
    // Closer, more dynamic swoop angle
    const offset = new THREE.Vector3(2, 2, 8)
    const finalPosition = targetPosition.clone().add(offset)

    const startPosition = camera.position.clone()
    const startTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0)

    let progress = 0
    const duration = 1500 // Faster, snappier swoop
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      progress = Math.min(elapsed / duration, 1)

      // Epic easeInOutQuint easing curve
      const eased = progress < 0.5 
        ? 16 * progress * progress * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 5) / 2;

      camera.position.lerpVectors(startPosition, finalPosition, eased)

      if (controlsRef.current) {
        const currentTarget = new THREE.Vector3().lerpVectors(startTarget, targetPosition, eased)
        controlsRef.current.target.copy(currentTarget)
        controlsRef.current.update()
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsZooming(false)
      }
    }

    animate()
  }

  const handleReset = () => {
    setSelectedStar(null)
    setIsZooming(true)

    const targetPosition = new THREE.Vector3(0, 50, 100)
    const targetLookAt = new THREE.Vector3(0, 0, 0)
    const startPosition = camera.position.clone()
    const startTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0)

    let progress = 0
    const duration = 2000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      camera.position.lerpVectors(startPosition, targetPosition, eased)

      if (controlsRef.current) {
        const currentTarget = new THREE.Vector3().lerpVectors(startTarget, targetLookAt, eased)
        controlsRef.current.target.copy(currentTarget)
        controlsRef.current.update()
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsZooming(false)
      }
    }

    animate()
  }

  return (
    <>
      <color attach="background" args={["#000000"]} />

      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" />

      {/* Background stars */}
      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Environment for reflections */}
      <Environment preset="night" />

      {/* Galaxy center glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} />
      </mesh>

      {/* Render all stars */}
      {!selectedStar && stars.map((star) => <Star key={star.id} data={star} onClick={() => handleStarClick(star)} />)}

      {/* Show selected star system */}
      {selectedStar && <StarSystem3D star={selectedStar} onBack={handleReset} />}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
        enabled={!isZooming}
      />
    </>
  )
}

interface StarProps {
  data: StarData
  onClick: () => void
}

function Star({ data, onClick }: StarProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Zustand store integration
  const status = useGameStore(state => state.starStates[data.id]) || 'unknown'
  const setHoveredStarId = useGameStore(state => state.setHoveredStarId)
  const setClickedStarId = useGameStore(state => state.setClickedStarId)
  const hoveredStarId = useGameStore(state => state.hoveredStarId)
  
  const hovered = hoveredStarId === data.id

  // Visuals based on Game State
  const renderColor = useMemo(() => {
    if (status === 'base') return "#00ff00" // Neon Green for my bases
    if (status === 'hit') return "#ff0000" // Red for hits
    if (status === 'miss') return "#555555" // Dull grey for misses
    if (status === 'scanning') return "#ffff00" // Yellow for scanning
    if (status === 'opponent-scanned') return "#ffaa00" // Orange for enemy scans
    return data.color // Default color for available/unknown
  }, [status, data.color])

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing effect based on status
      const pulseSpeed = status === 'scanning' ? 10 : status === 'base' ? 4 : 2;
      const scaleBase = status === 'hit' ? 0.8 : status === 'scanning' ? 1.5 : 1;
      const scale = scaleBase + Math.sin(state.clock.elapsedTime * pulseSpeed + data.id) * 0.2
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={data.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          setClickedStarId(data.id)
          
          // Only trigger cinematic zoom during gameplay phases
          const gamePhase = useGameStore.getState().gamePhase;
          if (gamePhase === 'playing') {
            onClick()
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHoveredStarId(data.id)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          setHoveredStarId(null)
          document.body.style.cursor = "auto"
        }}
      >
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshBasicMaterial color={renderColor} transparent opacity={hovered ? 1 : 0.9} />
      </mesh>

      {/* Glow effect */}
      <mesh scale={hovered ? 3 : 2}>
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshBasicMaterial color={renderColor} transparent opacity={hovered ? 0.3 : 0.15} />
      </mesh>

      {/* Indicator for systems with planets */}
      {data.hasSystem && (
        <mesh position={[0, data.size + 0.5, 0]} scale={hovered ? 0.3 : 0.2}>
          <ringGeometry args={[0.3, 0.4, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
