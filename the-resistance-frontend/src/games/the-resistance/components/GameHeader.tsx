import type { GamePhase } from '../TheResistanceGame';

interface GameHeaderProps {
  sessionId: number;
  gamePhase: GamePhase;
  isMyTurn: boolean;
  myFoundCount: number;
  opponentFoundCount: number;
  basesPerPlayer: number;
  winner: string | null;
  userAddress: string;
  timeRemaining: number;
}

export function GameHeader({
  sessionId,
  gamePhase,
  isMyTurn,
  myFoundCount,
  opponentFoundCount,
  basesPerPlayer,
  winner,
  userAddress,
}: GameHeaderProps) {
  const getPhaseLabel = () => {
    switch (gamePhase) {
      case 'setup':
        return 'Place Your Bases';
      case 'waiting':
        return 'Waiting for Opponent';
      case 'playing':
        return isMyTurn ? 'Your Turn - Scan a Star' : "Opponent's Turn";
      case 'complete':
        return winner === userAddress ? 'Victory!' : 'Defeat';
    }
  };

  const getPhaseColor = () => {
    switch (gamePhase) {
      case 'setup':
        return 'from-emerald-500 to-teal-500';
      case 'waiting':
        return 'from-yellow-500 to-orange-500';
      case 'playing':
        return isMyTurn ? 'from-blue-500 to-cyan-500' : 'from-gray-500 to-gray-600';
      case 'complete':
        return winner === userAddress ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500';
    }
  };

  return (
    <div className="bg-[rgba(0,167,181,0.05)] rounded-2xl p-6 border border-[rgba(0,167,181,0.3)] text-[var(--color-ink)] mb-6 shadow-[0_0_20px_rgba(0,167,181,0.1)]">
      <div className="flex flex-col gap-5">
        
        {/* Top Info Row */}
        <div className="flex items-center justify-between">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[rgba(0,167,181,0.15)] text-[var(--color-teal)] text-xs font-semibold border border-[rgba(0,167,181,0.3)] tracking-wider uppercase font-display">
            {getPhaseLabel()}
          </div>
          
          <div className="text-right">
            <div className="text-[10px] text-[var(--color-ink-muted)] mb-0.5 tracking-[0.2em] uppercase font-semibold font-display">Session</div>
            <div className="font-mono text-sm font-bold text-[rgba(255,255,255,0.9)] bg-black/40 px-3 py-1 rounded-md border border-gray-800">{sessionId}</div>
          </div>
        </div>

        {/* Score Display (playing/complete) */}
        {(gamePhase === 'playing' || gamePhase === 'complete') && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            
            {/* Player Hits */}
            <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-emerald-900/50 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
              <div className="text-[10px] text-[var(--color-ink-muted)] mb-1 font-semibold uppercase tracking-widest font-display z-10">Your Hits</div>
              <div className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)] font-mono z-10">
                {myFoundCount}
                <span className="text-emerald-900 text-xl">/{basesPerPlayer}</span>
              </div>
            </div>
            
            {/* Enemy Hits */}
            <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-red-900/50 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none" />
              <div className="text-[10px] text-[var(--color-ink-muted)] mb-1 font-semibold uppercase tracking-widest font-display z-10">Enemy Hits</div>
              <div className="text-3xl font-bold text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.4)] font-mono z-10">
                {opponentFoundCount}
                <span className="text-red-900 text-xl">/{basesPerPlayer}</span>
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* Progress bars */}
      {(gamePhase === 'playing' || gamePhase === 'complete') && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-gray-800">
              <div
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-500 ease-out"
                style={{ width: `${(myFoundCount / basesPerPlayer) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-gray-800">
              <div
                className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all duration-500 ease-out"
                style={{ width: `${(opponentFoundCount / basesPerPlayer) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
