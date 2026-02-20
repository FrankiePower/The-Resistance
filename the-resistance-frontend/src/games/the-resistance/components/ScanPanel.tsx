import type { ScanResult } from '../TheResistanceGame';

interface ScanPanelProps {
  isMyTurn: boolean;
  scanningStarId: number | null;
  hoveredStar: number | null;
  scannedStars: Map<number, 'hit' | 'miss'>;
  recentScans: ScanResult[];
}

export function ScanPanel({
  isMyTurn,
  scanningStarId,
  hoveredStar,
  scannedStars,
  recentScans
}: ScanPanelProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-4">
      {/* Turn indicator */}
      <div className={`p-3 rounded-lg ${
        isMyTurn
          ? 'bg-blue-500/20 border border-blue-500/30'
          : 'bg-gray-700/50 border border-gray-600'
      }`}>
        <div className={`text-sm font-semibold ${isMyTurn ? 'text-blue-400' : 'text-gray-400'}`}>
          {isMyTurn ? '🎯 Your Turn' : '⏳ Waiting for opponent...'}
        </div>
        {isMyTurn && !scanningStarId && (
          <p className="text-xs text-gray-400 mt-1">
            Click a star to scan for enemy bases
          </p>
        )}
      </div>

      {/* Scanning indicator */}
      {scanningStarId !== null && (
        <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-yellow-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-yellow-400">
                Scanning Star #{scanningStarId}
              </div>
              <div className="text-xs text-yellow-300/70">
                Generating ZK proof...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover preview */}
      {hoveredStar !== null && !scanningStarId && isMyTurn && !scannedStars.has(hoveredStar) && (
        <div className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
          <div className="text-sm text-gray-300">
            <span className="font-mono text-blue-400">Star #{hoveredStar}</span>
            <span className="text-gray-500 ml-2">Click to scan</span>
          </div>
        </div>
      )}

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Scans</h4>
          <div className="space-y-2">
            {recentScans.map((scan, i) => (
              <div
                key={`${scan.starId}-${scan.timestamp}`}
                className={`p-2 rounded-lg flex items-center justify-between ${
                  scan.isBase
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-gray-700/50 border border-gray-600'
                }`}
              >
                <span className="font-mono text-sm text-gray-300">
                  Star #{scan.starId}
                </span>
                <span className={`text-xs font-semibold ${
                  scan.isBase ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {scan.isBase ? 'HIT!' : 'Miss'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-xs text-gray-500">Scanned</div>
            <div className="text-lg font-bold text-white">{scannedStars.size}</div>
          </div>
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-xs text-gray-500">Remaining</div>
            <div className="text-lg font-bold text-white">{200 - scannedStars.size}</div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Each scan reveals if the star is an enemy base</p>
        <p>• ZK proofs ensure no cheating is possible</p>
        <p>• Find all 10 enemy bases to win!</p>
      </div>
    </div>
  );
}
