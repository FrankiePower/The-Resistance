import { useState } from 'react';
import type { ScanResult, ActionType } from '../TheResistanceGame';

interface ScanPanelProps {
  isMyTurn: boolean;
  scanningStarId: number | null;
  hoveredStar: number | null;
  scannedStars: Map<number, 'hit' | 'miss'>;
  recentScans: ScanResult[];
  selectedAction: ActionType;
  onActionSelect: (action: ActionType) => void;
}

export function ScanPanel({
  isMyTurn,
  scanningStarId,
  hoveredStar,
  scannedStars,
  recentScans,
  selectedAction,
  onActionSelect
}: ScanPanelProps) {
  return (
    <div className="bg-[rgba(0,167,181,0.05)] rounded-2xl p-6 border border-[rgba(0,167,181,0.3)] shadow-[0_0_20px_rgba(0,167,181,0.1)] flex flex-col gap-5">
      
      {/* Turn indicator */}
      <div className={`p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
        isMyTurn
          ? 'bg-[rgba(0,167,181,0.1)] border border-[rgba(0,167,181,0.4)] shadow-[0_0_15px_rgba(0,167,181,0.2)]'
          : 'bg-black/30 border border-gray-800'
      }`}>
        <div className={`text-lg font-display uppercase tracking-widest font-bold ${isMyTurn ? 'text-[var(--color-teal)] drop-shadow-[0_0_8px_rgba(0,167,181,0.5)]' : 'text-gray-500'}`}>
          {isMyTurn ? 'Your Turn' : 'Waiting for opponent...'}
        </div>
        {isMyTurn && !scanningStarId && (
          <p className="text-xs text-[var(--color-ink-muted)] mt-2 font-medium">
            Select a command and click a star coordinate
          </p>
        )}
      </div>

      {/* Arsenal Commands Box */}
      {isMyTurn && !scanningStarId && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-[0.2em] font-display font-semibold text-[var(--color-ink-muted)] ml-1">Command Arsenal</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onActionSelect(0)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                selectedAction === 0
                  ? 'bg-[var(--color-teal)]/10 border-[var(--color-teal)]/50 shadow-[0_0_10px_rgba(0,167,181,0.2)]'
                  : 'bg-black/30 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className={`text-base mb-1 ${selectedAction === 0 ? 'text-[var(--color-teal)] drop-shadow-[0_0_5px_rgba(0,167,181,0.5)]' : 'text-gray-500'}`}>🎯</div>
              <div className={`text-[9px] uppercase tracking-widest font-bold ${selectedAction === 0 ? 'text-[var(--color-teal)]' : 'text-gray-500'}`}>Solar Scan</div>
            </button>
            <button
              onClick={() => onActionSelect(1)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                selectedAction === 1
                  ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                  : 'bg-black/30 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className={`text-base mb-1 ${selectedAction === 1 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-gray-500'}`}>📡</div>
              <div className={`text-[9px] uppercase tracking-widest font-bold ${selectedAction === 1 ? 'text-yellow-500' : 'text-gray-500'}`}>Radar</div>
            </button>

            <button
              onClick={() => onActionSelect(2)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                selectedAction === 2
                  ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                  : 'bg-black/30 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className={`text-base mb-1 ${selectedAction === 2 ? 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-gray-500'}`}>☄️</div>
              <div className={`text-[9px] uppercase tracking-widest font-bold ${selectedAction === 2 ? 'text-red-500' : 'text-gray-500'}`}>Arm Strike</div>
            </button>
          </div>
          
          <div className="bg-black/30 mt-1 rounded-lg p-2.5 border border-gray-800">
            {selectedAction === 0 && (
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-relaxed"><span className="text-[var(--color-teal)] font-bold">SOLAR SCAN:</span> Standard zoom lens. Allows you to fly into a star system and scan it directly.</p>
            )}
            {selectedAction === 1 && (
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-relaxed"><span className="text-yellow-500 font-bold">DEEP RADAR:</span> Scans the deep space sector. Reveals the total number of enemy signatures within a localized lightyear radius around the target.</p>
            )}
            {selectedAction === 2 && (
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-relaxed"><span className="text-red-500 font-bold">GALACTIC ARM STRIKE:</span> Devastating cosmic blast. Incinerates all stars along the entire spiral arm of the selected target.</p>
            )}
          </div>
        </div>
      )}

      {/* Scanning indicator */}
      {scanningStarId !== null && (
        <div className="p-4 bg-[rgba(253,218,36,0.1)] border border-[rgba(253,218,36,0.3)] rounded-xl flex items-center justify-center gap-3">
          <svg className="animate-spin h-5 w-5 text-yellow-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-yellow-400 uppercase tracking-widest font-display">
              Scanning #{scanningStarId.toString().padStart(3, '0')}
            </div>
            <div className="text-[10px] text-yellow-500/70 uppercase tracking-widest">
              Generating ZK proof...
            </div>
          </div>
        </div>
      )}

      {/* Hover preview */}
      {hoveredStar !== null && !scanningStarId && isMyTurn && !scannedStars.has(hoveredStar) && (
        <div className="p-3 bg-black/40 border border-gray-800 rounded-xl text-center">
          <div className="text-sm">
            <span className="font-mono text-[var(--color-teal)] font-bold">Star #{hoveredStar.toString().padStart(3, '0')}</span>
            <span className="text-[var(--color-ink-muted)] ml-2 text-xs uppercase tracking-widest font-semibold">Click to scan</span>
          </div>
        </div>
      )}

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <div className="bg-black/30 rounded-xl border border-gray-800 p-4">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-display font-semibold text-[var(--color-ink-muted)] mb-3">Recent Scans</h4>
          <div className="space-y-2">
            {recentScans.map((scan, i) => (
              <div
                key={`${scan.starId}-${scan.timestamp}`}
                className={`p-2.5 rounded-lg flex items-center justify-between ${
                  scan.actionType === 2
                    ? 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                    : scan.actionType === 1 
                      ? 'bg-[rgba(253,218,36,0.1)] border border-[rgba(253,218,36,0.3)] shadow-[0_0_10px_rgba(253,218,36,0.1)]'
                      : scan.isBase
                        ? 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'bg-black/40 border border-gray-800'
                }`}
              >
                <span className={`font-mono text-xs ${
                  scan.actionType === 2 ? 'text-red-400 font-bold'
                  : scan.actionType === 1 ? 'text-yellow-400 font-bold' 
                  : scan.isBase ? 'text-emerald-400 font-bold' 
                  : 'text-gray-400'
                }`}>
                  {scan.actionType === 2 ? `ARM STRIKE @ #${scan.starId.toString().padStart(3, '0')}` : scan.actionType === 1 ? `RADAR @ #${scan.starId.toString().padStart(3, '0')}` : `Star #${scan.starId.toString().padStart(3, '0')}`}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  scan.actionType === 2 ? 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                  : scan.actionType === 1 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(253,218,36,0.5)]'
                  : scan.isBase ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' 
                  : 'text-gray-500'
                }`}>
                  {scan.actionType === 2 ? `${scan.countFound} DESTROYED` : scan.actionType === 1 ? `${scan.countFound} FOUND` : scan.isBase ? 'HIT' : 'MISS'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="text-center p-3 bg-black/40 border border-gray-800 rounded-xl relative overflow-hidden">
          <div className="text-[10px] uppercase tracking-[0.2em] font-display font-semibold text-[var(--color-ink-muted)] mb-1">Scanned</div>
          <div className="text-xl font-bold text-[var(--color-ink)] font-mono">{scannedStars.size}</div>
        </div>
        <div className="text-center p-3 bg-black/40 border border-gray-800 rounded-xl relative overflow-hidden">
          <div className="text-[10px] uppercase tracking-[0.2em] font-display font-semibold text-[var(--color-ink-muted)] mb-1">Remaining</div>
          <div className="text-xl font-bold text-[var(--color-ink)] font-mono">{200 - scannedStars.size}</div>
        </div>
      </div>

      {/* Tips */}
      <div className="flex flex-col gap-2 p-4 bg-gray-900/40 rounded-xl border border-gray-800/50">
        <p className="text-[10px] text-[var(--color-ink-muted)] flex items-start gap-2 leading-relaxed">
          <span className="text-[var(--color-accent)] mt-0.5 opacity-70">❖</span>
          Each scan generates a ZK proof against the opponent.
        </p>
        <p className="text-[10px] text-[var(--color-ink-muted)] flex items-start gap-2 leading-relaxed">
          <span className="text-[var(--color-accent)] mt-0.5 opacity-70">❖</span>
          Find all 10 enemy bases to win.
        </p>
      </div>
    </div>
  );
}
