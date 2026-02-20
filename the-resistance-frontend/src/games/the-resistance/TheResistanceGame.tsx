import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { DevWalletService } from '@/services/devWalletService';
import { GalaxyGrid } from './components/GalaxyGrid';
import { GameHeader } from './components/GameHeader';
import { BaseSelector } from './components/BaseSelector';
import { ScanPanel } from './components/ScanPanel';
import { hashBases } from './zkUtils';

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
}

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
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [selectedBases, setSelectedBases] = useState<Set<number>>(new Set());
  const [basesCommitment, setBasesCommitment] = useState<string | null>(null);
  const [myScans, setMyScans] = useState<ScanResult[]>([]);
  const [opponentScans, setOpponentScans] = useState<number[]>([]);
  const [myFoundCount, setMyFoundCount] = useState(0);
  const [opponentFoundCount, setOpponentFoundCount] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  // UI state
  const [loading, setLoading] = useState(false);
  const [scanningStarId, setScanningStarId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const isBusy = loading || scanningStarId !== null;

  const quickstartAvailable = walletType === 'dev'
    && DevWalletService.isDevModeAvailable()
    && DevWalletService.isPlayerAvailable(1)
    && DevWalletService.isPlayerAvailable(2);

  // Calculate scanned stars for visualization
  const scannedStars = useMemo(() => {
    const scanned = new Map<number, 'hit' | 'miss'>();
    myScans.forEach(scan => {
      scanned.set(scan.starId, scan.isBase ? 'hit' : 'miss');
    });
    return scanned;
  }, [myScans]);

  // Timer effect
  useEffect(() => {
    if (gamePhase === 'playing' && timeRemaining > 0 && !winner) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gamePhase, timeRemaining, winner]);

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
        setTimeRemaining(300); // Reset timer
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

      const result: ScanResult = {
        starId,
        isBase,
        timestamp: Date.now()
      };

      setMyScans(prev => [...prev, result]);

      if (isBase) {
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
    <div className="max-w-6xl mx-auto p-4">
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
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-2 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Galaxy View */}
        <div className="lg:col-span-3">
          <GalaxyGrid
            totalStars={TOTAL_STARS}
            selectedBases={selectedBases}
            scannedStars={scannedStars}
            opponentScans={opponentScans}
            hoveredStar={hoveredStar}
            scanningStarId={scanningStarId}
            gamePhase={gamePhase}
            onStarClick={gamePhase === 'setup' ? handleToggleBase : handleScanStar}
            onStarHover={setHoveredStar}
          />
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1">
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
              hoveredStar={hoveredStar}
              scannedStars={scannedStars}
              recentScans={myScans.slice(-5).reverse()}
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                New Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Start for Dev */}
      {quickstartAvailable && gamePhase === 'setup' && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-yellow-400 font-semibold">Dev Mode</h4>
              <p className="text-yellow-300/70 text-sm">
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
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
            >
              Random Bases
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
