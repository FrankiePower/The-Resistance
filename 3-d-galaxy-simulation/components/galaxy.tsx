"use client"

import { useRef, useState, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars, Environment } from "@react-three/drei"
import * as THREE from "three"
import { StarSystem } from "./star-system"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

interface StarData {
  id: number
  position: [number, number, number]
  color: string
  size: number
  hasSystem: boolean
}

export function Galaxy() {
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null)
  const [isZooming, setIsZooming] = useState(false)
  const { camera } = useThree()
  const controlsRef = useRef<any>()

  // Generate galaxy stars in spiral pattern
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
    if (!star.hasSystem || isZooming) return

    setIsZooming(true)
    setSelectedStar(star)

    // Animate camera to star
    const targetPosition = new THREE.Vector3(...star.position)
    const offset = new THREE.Vector3(0, 5, 15)
    const finalPosition = targetPosition.clone().add(offset)

    const startPosition = camera.position.clone()
    const startTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0)

    let progress = 0
    const duration = 2000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      progress = Math.min(elapsed / duration, 1)

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3)

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
      {selectedStar && <StarSystem star={selectedStar} onBack={handleReset} />}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
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
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + data.id) * 0.2
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={data.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          if (data.hasSystem) onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (data.hasSystem) {
            setHovered(true)
            document.body.style.cursor = "pointer"
          }
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "auto"
        }}
      >
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered ? 1 : 0.9} />
      </mesh>

      {/* Glow effect */}
      <mesh scale={hovered ? 2.5 : 2}>
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered ? 0.3 : 0.2} />
      </mesh>

      {/* Indicator for systems with planets */}
      {data.hasSystem && (
        <mesh position={[0, data.size + 0.5, 0]} scale={hovered ? 0.3 : 0.2}>
          <ringGeometry args={[0.5, 0.7, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
