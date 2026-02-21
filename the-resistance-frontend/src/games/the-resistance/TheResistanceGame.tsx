import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { DevWalletService } from '@/services/devWalletService';
import { GalaxyGrid } from './components/GalaxyGrid';
import { GameHeader } from './components/GameHeader';
import { BaseSelector } from './components/BaseSelector';
import { ScanPanel } from './components/ScanPanel';
import { hashBases } from './zkUtils';
import { useGameStore, StarStatus } from '../../store/gameStore';
import { Menu, X } from 'lucide-react';

// Constants from contract
const TOTAL_STARS = 200;
const BASES_PER_PLAYER = 10;

const createRandomSessionId = (): number => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    let value = 0;
    const buffer = new Uint32Array(1);
    while (value === 0) {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    }
    return value;
  }
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
};

export type GamePhase = 'setup' | 'waiting' | 'playing' | 'complete';

export interface ScanResult {
  starId: number;
  isBase: boolean;
  timestamp: number;
  actionType?: ActionType;
  countFound?: number;
}

export type ActionType = 0 | 1 | 2; // 0: Strike, 1: Radar, 2: Orbital

interface TheResistanceGameProps {
  userAddress: string;
  currentEpoch: number;
  availablePoints: bigint;
  initialXDR?: string | null;
  initialSessionId?: number | null;
  onStandingsRefresh: () => void;
  onGameComplete: () => void;
}

export function TheResistanceGame({
  userAddress,
  initialSessionId,
  onStandingsRefresh,
  onGameComplete
}: TheResistanceGameProps) {
  const { walletType } = useWallet();

  // Game state
  const [sessionId, setSessionId] = useState<number>(() => initialSessionId || createRandomSessionId());
  const [selectedBases, setSelectedBases] = useState<Set<number>>(new Set());
  const [basesCommitment, setBasesCommitment] = useState<string | null>(null);
  const [myScans, setMyScans] = useState<ScanResult[]>([]);
  const [opponentScans, setOpponentScans] = useState<number[]>([]);
  const [myFoundCount, setMyFoundCount] = useState(0);
  const [opponentFoundCount, setOpponentFoundCount] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [scanningStarId, setScanningStarId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hoveredStarId = useGameStore(state => state.hoveredStarId);
  const clickedStarId = useGameStore(state => state.clickedStarId);
  const setClickedStarId = useGameStore(state => state.setClickedStarId);
  const setAllStarStates = useGameStore(state => state.setAllStarStates);
  const isSidebarOpen = useGameStore(state => state.isSidebarOpen);
  const setIsSidebarOpen = useGameStore(state => state.setIsSidebarOpen);
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const timeRemaining = useGameStore(state => state.timeRemaining);
  const setTimeRemaining = useGameStore(state => state.setTimeRemaining);
  const selectedAction = useGameStore(state => state.selectedAction);
  const setSelectedAction = useGameStore(state => state.setSelectedAction);

  const isBusy = loading || scanningStarId !== null;

  const quickstartAvailable = walletType === 'dev'
    && DevWalletService.isDevModeAvailable()
    && DevWalletService.isPlayerAvailable(1)
    && DevWalletService.isPlayerAvailable(2);

  // Calculate scanned stars for visualization
  const scannedStars = useMemo(() => {
    const scanned = new Map<number, 'hit' | 'miss'>();
    myScans.forEach(scan => {
      // Only precision strikes change the color of the star
      if (scan.actionType === 0 || scan.actionType === undefined) {
        scanned.set(scan.starId, scan.isBase ? 'hit' : 'miss');
      }
    });
    return scanned;
  }, [myScans]);

  // Auto-hide sidebar during gameplay for immersion, but allow toggling
  useEffect(() => {
    if (gamePhase === 'playing') {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [gamePhase, setIsSidebarOpen]);

  // Auto-pop the sidebar back open during setup once 10 bases are picked
  useEffect(() => {
    if (gamePhase === 'setup' && selectedBases.size === BASES_PER_PLAYER) {
      setIsSidebarOpen(true);
    }
  }, [selectedBases.size, gamePhase, setIsSidebarOpen]);

  // Timer effect
  useEffect(() => {
    if (gamePhase === 'playing' && timeRemaining > 0 && !winner) {
      const timer = setInterval(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gamePhase, timeRemaining, winner, setTimeRemaining]);

  // Sync star states to store for 3D UI
  useEffect(() => {
    const states: Record<number, StarStatus> = {};
    for (let i = 0; i < TOTAL_STARS; i++) {
      if (scanningStarId === i) {
        states[i] = 'scanning';
        continue;
      }
      if (gamePhase === 'setup') {
        states[i] = selectedBases.has(i) ? 'base' : 'available';
        continue;
      }
      if (scannedStars.has(i)) {
        states[i] = scannedStars.get(i)!;
        continue;
      }
      if (opponentScans.includes(i)) {
        states[i] = 'opponent-scanned';
        continue;
      }
      states[i] = 'unknown';
    }
    setAllStarStates(states);
  }, [gamePhase, selectedBases, scannedStars, opponentScans, scanningStarId, setAllStarStates]);

  // Handle base selection
  const handleToggleBase = useCallback((starId: number) => {
    if (gamePhase !== 'setup') return;

    setSelectedBases(prev => {
      const next = new Set(prev);
      if (next.has(starId)) {
        next.delete(starId);
      } else if (next.size < BASES_PER_PLAYER) {
        next.add(starId);
      }
      return next;
    });
  }, [gamePhase]);

  // Commit bases and create game
  const handleCommitBases = async () => {
    if (selectedBases.size !== BASES_PER_PLAYER) {
      setError(`Please select exactly ${BASES_PER_PLAYER} bases`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Hash the bases using Poseidon2
      const basesArray = Array.from(selectedBases).sort((a, b) => a - b);
      const commitment = await hashBases(basesArray);
      setBasesCommitment(commitment);

      // TODO: Create game on-chain with this commitment
      // For now, move to waiting phase
      setSuccess('Bases committed! Waiting for opponent...');
      setGamePhase('waiting');

      // Simulate opponent joining (remove in production)
      setTimeout(() => {
        setGamePhase('playing');
        setTimeRemaining(600); // Reset timer to 10 minutes
        setIsMyTurn(true);
        setSuccess('Game started! Your turn to scan.');
      }, 2000);

    } catch (err) {
      setError(`Failed to commit bases: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle star scan
  const handleScanStar = async (starId: number) => {
    if (!isMyTurn || isBusy || gamePhase !== 'playing') return;
    if (scannedStars.has(starId)) {
      setError('You already scanned this star!');
      return;
    }

    setScanningStarId(starId);
    setError(null);

    try {
      // TODO: Generate ZK proof
      // For now, simulate with random result
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate proof generation

      // TODO: Submit scan to contract
      // For now, simulate random result
      const isBase = Math.random() < 0.05; // 5% chance (10 bases / 200 stars)
      
      // If Radar, simulate finding a few signatures around
      let countFound = 0;
      if (selectedAction === 1) {
        countFound = Math.floor(Math.random() * 4); // 0 to 3 signatures
      }

      const result: ScanResult = {
        starId,
        isBase,
        timestamp: Date.now(),
        actionType: selectedAction,
        countFound
      };

      setMyScans(prev => [...prev, result]);

      if (selectedAction === 1) {
        setSuccess(`[RADAR LOG] Scan complete at Star ${starId}. Detected ${countFound} enemy signatures in local proximity.`);
      } else if (isBase) {
        const newCount = myFoundCount + 1;
        setMyFoundCount(newCount);
        setSuccess(`HIT! Found enemy base at Star ${starId}! (${newCount}/${BASES_PER_PLAYER})`);

        if (newCount >= BASES_PER_PLAYER) {
          setWinner(userAddress);
          setGamePhase('complete');
          onGameComplete();
          return;
        }
      } else {
        setSuccess(`Miss. No base at Star ${starId}.`);
      }

      // Switch turns
      setIsMyTurn(false);

      // Simulate opponent's turn (remove in production)
      setTimeout(() => {
        simulateOpponentTurn();
      }, 1500);

    } catch (err) {
      setError(`Scan failed: ${err}`);
    } finally {
      setScanningStarId(null);
    }
  };

  // Listen to 3D clicks from Zustand store
  useEffect(() => {
    if (clickedStarId !== null) {
      if (gamePhase === 'setup') {
        handleToggleBase(clickedStarId);
      } else if (gamePhase === 'playing') {
        handleScanStar(clickedStarId);
      }
      // Immediately reset so we can click again
      setClickedStarId(null);
    }
  }, [clickedStarId, gamePhase, handleToggleBase, handleScanStar, setClickedStarId]);

  // Simulate opponent turn (for demo purposes)
  const simulateOpponentTurn = useCallback(() => {
    // Pick a random star that hasn't been scanned
    const available = [];
    for (let i = 0; i < TOTAL_STARS; i++) {
      if (!opponentScans.includes(i)) {
        available.push(i);
      }
    }

    if (available.length === 0) return;

    const randomStar = available[Math.floor(Math.random() * available.length)];
    setOpponentScans(prev => [...prev, randomStar]);

    // Check if opponent hit one of our bases
    const isHit = selectedBases.has(randomStar);
    if (isHit) {
      setOpponentFoundCount(prev => {
        const newCount = prev + 1;

        if (newCount >= BASES_PER_PLAYER) {
          setWinner('opponent');
          setGamePhase('complete');
          onGameComplete();
        }

        return newCount;
      });
    }

    setIsMyTurn(true);
  }, [opponentScans, selectedBases, onGameComplete]);

  // Reset game
  const handleNewGame = () => {
    setSessionId(createRandomSessionId());
    setGamePhase('setup');
    setSelectedBases(new Set());
    setBasesCommitment(null);
    setMyScans([]);
    setOpponentScans([]);
    setMyFoundCount(0);
    setOpponentFoundCount(0);
    setIsMyTurn(false);
    setWinner(null);
    setError(null);
    setSuccess(null);
    setTimeRemaining(300);
  };

  return (
    <div className="fixed inset-y-0 left-0 h-screen pointer-events-none flex z-50">
      
      {/* Sidebar Panel */}
      <div 
        className={`pointer-events-auto h-full w-full sm:w-[26rem] bg-black/80 backdrop-blur-2xl border-r border-gray-700/80 shadow-[10px_0_30px_rgba(0,0,0,0.5)] flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Controls */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700/50 bg-gray-900/40 shrink-0">
          <h2 className="text-white font-serif font-semibold text-lg flex items-center gap-2">
            <span className="text-blue-400">❖</span> Command Center
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-colors border-none bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5 flex-1 relative">
            <GameHeader
              sessionId={sessionId}
              gamePhase={gamePhase}
              isMyTurn={isMyTurn}
              myFoundCount={myFoundCount}
              opponentFoundCount={opponentFoundCount}
              basesPerPlayer={BASES_PER_PLAYER}
              winner={winner}
              userAddress={userAddress}
              timeRemaining={timeRemaining}
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-2 rounded-lg">
                {success}
              </div>
            )}

            {gamePhase === 'setup' && (
              <BaseSelector
                selectedCount={selectedBases.size}
                maxBases={BASES_PER_PLAYER}
                selectedBases={selectedBases}
                onCommit={handleCommitBases}
                loading={loading}
              />
            )}

            {gamePhase === 'waiting' && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Waiting for Opponent</h3>
                <p className="text-gray-400 text-sm">
                  Share the session ID with your opponent to start the game.
                </p>
                <div className="mt-4 p-3 bg-gray-900/50 rounded font-mono text-sm text-gray-300">
                  Session: {sessionId}
                </div>
                {basesCommitment && (
                  <div className="mt-3 p-2 bg-gray-900/50 rounded text-xs text-gray-500 font-mono break-all">
                    Commitment: {basesCommitment.slice(0, 16)}...
                  </div>
                )}
              </div>
            )}

            {gamePhase === 'playing' && (
              <ScanPanel
                isMyTurn={isMyTurn}
                scanningStarId={scanningStarId}
                hoveredStar={hoveredStarId}
                scannedStars={scannedStars}
                recentScans={myScans.slice(-5).reverse()}
                selectedAction={selectedAction}
                onActionSelect={setSelectedAction}
              />
            )}

            {gamePhase === 'complete' && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {winner === userAddress ? '🎉 Victory!' : '💀 Defeat'}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {winner === userAddress
                    ? 'You found all enemy bases!'
                    : 'The enemy found all your bases.'}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your hits:</span>
                    <span className="text-emerald-400 font-bold">{myFoundCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Enemy hits:</span>
                    <span className="text-red-400 font-bold">{opponentFoundCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Stars scanned:</span>
                    <span className="text-gray-300">{myScans.length}</span>
                  </div>
                </div>
                <button
                  onClick={handleNewGame}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors border-none"
                >
                  New Game
                </button>
              </div>
            )}
          </div>

        {/* Quick Start for Dev */}
        {quickstartAvailable && gamePhase === 'setup' && (
          <div className="pointer-events-auto p-5 border-t border-gray-700/50 bg-black/40 shrink-0">
            <div className="flex flex-col gap-3">
              <div>
                <h4 className="text-yellow-400 font-semibold text-sm">Dev Mode</h4>
                <p className="text-yellow-300/70 text-xs">
                  Quickstart available for testing with dev wallets
                </p>
              </div>
              <button
                onClick={() => {
                  // Auto-select random bases for demo
                  const randomBases = new Set<number>();
                  while (randomBases.size < BASES_PER_PLAYER) {
                    randomBases.add(Math.floor(Math.random() * TOTAL_STARS));
                  }
                  setSelectedBases(randomBases);
                }}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors text-sm border-none shadow-[0_0_15px_rgba(253,218,36,0.3)]"
              >
                Random Bases
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
