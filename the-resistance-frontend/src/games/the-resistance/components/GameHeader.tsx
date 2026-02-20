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
  timeRemaining
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
    <div className="bg-[rgba(0,167,181,0.15)] rounded-2xl p-6 border-2 border-[rgba(0,167,181,0.6)] text-[var(--color-ink)] mb-6 shadow-[0_0_20px_rgba(0,167,181,0.2)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and Phase */}
        <div>
          <h2 className="text-2xl font-bold mb-1">
            Shadow Fleet
          </h2>
          <div className={`inline-block px-3 py-1 rounded-full bg-gray-900/10 text-sm font-semibold border border-gray-900/20`}>
            {getPhaseLabel()}
          </div>
        </div>

        {/* Score Display */}
        {(gamePhase === 'playing' || gamePhase === 'complete') && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-800 mb-1 font-medium">Your Hits</div>
              <div className="text-2xl font-bold text-emerald-700">
                {myFoundCount}
                <span className="text-gray-700 text-lg">/{basesPerPlayer}</span>
              </div>
            </div>
            
            {/* Timer */}
            <div className="flex flex-col items-center justify-center min-w-[100px]">
               <div className="text-2xl font-mono font-bold text-gray-900 bg-gray-900/5 px-4 py-1 rounded-lg border border-gray-900/10">
                 {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
               </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-gray-800 mb-1 font-medium">Enemy Hits</div>
              <div className="text-2xl font-bold text-red-700">
                {opponentFoundCount}
                <span className="text-gray-700 text-lg">/{basesPerPlayer}</span>
              </div>
            </div>
          </div>
        )}

        {/* Session ID */}
        <div className="text-right">
          <div className="text-xs text-gray-800 font-medium">Session</div>
          <div className="font-mono text-sm text-gray-900 font-bold">{sessionId}</div>
        </div>
      </div>

      {/* Progress bars */}
      {(gamePhase === 'playing' || gamePhase === 'complete') && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="h-2 bg-gray-900/10 rounded-full overflow-hidden border border-gray-900/5">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${(myFoundCount / basesPerPlayer) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="h-2 bg-gray-900/10 rounded-full overflow-hidden border border-gray-900/5">
              <div
                className="h-full bg-red-600 transition-all duration-500"
                style={{ width: `${(opponentFoundCount / basesPerPlayer) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
