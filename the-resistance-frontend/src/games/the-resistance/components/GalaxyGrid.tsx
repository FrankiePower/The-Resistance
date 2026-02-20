import { useMemo } from 'react';
import type { GamePhase, ScanResult } from '../TheResistanceGame';

interface GalaxyGridProps {
  totalStars: number;
  selectedBases: Set<number>;
  scannedStars: Map<number, 'hit' | 'miss'>;
  opponentScans: number[];
  hoveredStar: number | null;
  scanningStarId: number | null;
  gamePhase: GamePhase;
  onStarClick: (starId: number) => void;
  onStarHover: (starId: number | null) => void;
}

export function GalaxyGrid({
  totalStars,
  selectedBases,
  scannedStars,
  opponentScans,
  hoveredStar,
  scanningStarId,
  gamePhase,
  onStarClick,
  onStarHover
}: GalaxyGridProps) {
  // Generate star positions in a grid (20 columns x 10 rows)
  const stars = useMemo(() => {
    const cols = 20;
    const rows = 10;
    return Array.from({ length: totalStars }, (_, i) => ({
      id: i,
      col: i % cols,
      row: Math.floor(i / cols),
      // Add some visual variation
      size: 0.8 + Math.random() * 0.4,
      brightness: 0.7 + Math.random() * 0.3
    }));
  }, [totalStars]);

  const getStarStatus = (starId: number) => {
    if (scanningStarId === starId) return 'scanning';
    if (gamePhase === 'setup') {
      if (selectedBases.has(starId)) return 'base';
      return 'available';
    }
    if (scannedStars.has(starId)) return scannedStars.get(starId)!;
    if (opponentScans.includes(starId)) return 'opponent-scanned';
    return 'unknown';
  };

  const getStarClasses = (starId: number) => {
    const status = getStarStatus(starId);
    const isHovered = hoveredStar === starId;

    let baseClasses = 'rounded-full transition-all duration-200 cursor-pointer ';

    switch (status) {
      case 'base':
        baseClasses += 'bg-emerald-400 shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-300 ';
        break;
      case 'hit':
        baseClasses += 'bg-red-500 shadow-lg shadow-red-500/50 ring-2 ring-red-300 animate-pulse ';
        break;
      case 'miss':
        baseClasses += 'bg-gray-600 opacity-50 ';
        break;
      case 'scanning':
        baseClasses += 'bg-yellow-400 shadow-lg shadow-yellow-500/50 animate-pulse ';
        break;
      case 'opponent-scanned':
        baseClasses += 'bg-purple-500/30 ring-1 ring-purple-400 ';
        break;
      case 'available':
        baseClasses += 'bg-blue-400 hover:bg-blue-300 ';
        break;
      default:
        baseClasses += 'bg-white/80 hover:bg-white hover:shadow-lg hover:shadow-white/30 ';
    }

    if (isHovered && status !== 'miss' && status !== 'hit') {
      baseClasses += 'scale-150 z-10 ';
    }

    return baseClasses;
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 overflow-hidden">
      {/* Galaxy header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Galaxy Map
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/80"></span>
            Unknown
          </span>
          {gamePhase === 'setup' && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Your Base
            </span>
          )}
          {gamePhase === 'playing' && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Hit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                Miss
              </span>
            </>
          )}
        </div>
      </div>

      {/* Star grid */}
      <div
        className="relative w-full aspect-[2/1] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-xl"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 40%)
          `
        }}
      >
        {/* Ambient nebula effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1/4 h-1/4 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Stars */}
        <div className="absolute inset-0 p-4">
          <div className="grid grid-cols-20 grid-rows-10 gap-1 h-full">
            {stars.map(star => (
              <div
                key={star.id}
                className="flex items-center justify-center"
                onMouseEnter={() => onStarHover(star.id)}
                onMouseLeave={() => onStarHover(null)}
                onClick={() => onStarClick(star.id)}
              >
                <div
                  className={getStarClasses(star.id)}
                  style={{
                    width: `${star.size * 8}px`,
                    height: `${star.size * 8}px`,
                    opacity: star.brightness
                  }}
                  title={`Star ${star.id}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover info */}
      {hoveredStar !== null && (
        <div className="mt-3 p-2 bg-gray-800/50 rounded-lg text-sm text-gray-300">
          <span className="font-mono">Star #{hoveredStar}</span>
          {gamePhase === 'setup' && (
            <span className="ml-2 text-gray-400">
              {selectedBases.has(hoveredStar) ? '(Selected as base)' : '(Click to select)'}
            </span>
          )}
          {gamePhase === 'playing' && (
            <span className="ml-2 text-gray-400">
              {scannedStars.has(hoveredStar)
                ? `(${scannedStars.get(hoveredStar) === 'hit' ? 'HIT!' : 'Miss'})`
                : '(Click to scan)'
              }
            </span>
          )}
        </div>
      )}
    </div>
  );
}
