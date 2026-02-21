import { WalletSwitcher } from './WalletSwitcher';
import './Layout.css';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Galaxy3D } from '../games/the-resistance/components/Galaxy3D';
import { Loader3D } from '../games/the-resistance/components/Loader3D';
import { useGameStore } from '../store/gameStore';
import { Menu } from 'lucide-react';

interface LayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Layout({ title, subtitle, children }: LayoutProps) {
 
  const isSidebarOpen = useGameStore(state => state.isSidebarOpen);
  const setIsSidebarOpen = useGameStore(state => state.setIsSidebarOpen);
  const gamePhase = useGameStore(state => state.gamePhase);
  const timeRemaining = useGameStore(state => state.timeRemaining);

  return (
    <div className="studio">
      <div className="studio-background" aria-hidden="true" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 50, 100], fov: 60 }} gl={{ antialias: true, alpha: false }}>
          <Suspense fallback={null}>
            <Galaxy3D />
          </Suspense>
        </Canvas>
        <Loader3D />
      </div>

      <header className="studio-header pointer-events-none flex justify-end relative w-full">
        {(gamePhase === 'playing' || gamePhase === 'complete') && (
          <div className="absolute left-[2.5rem] top-0 pointer-events-auto bg-black/60 backdrop-blur-xl rounded-b-2xl border border-t-0 border-[rgba(0,167,181,0.3)] shadow-[0_0_20px_rgba(0,167,181,0.15)] px-8 py-3 flex flex-col items-center justify-center z-50">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-muted)] font-display font-semibold mb-1">Time Remaining</span>
            <span className={`text-3xl font-mono font-bold tracking-widest ${timeRemaining < 60 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-[var(--color-ink)] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'}`}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
        <div className="header-actions pointer-events-auto bg-black/40 p-2 rounded-xl backdrop-blur-md flex items-center">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 bg-gray-900/80 hover:bg-black text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all mr-2"
            >
              <Menu size={16} />
              <span className="font-semibold text-xs md:text-sm tracking-wide hidden sm:inline-block">Command Center</span>
            </button>
          )}
          <div className="network-pill hidden md:block">Testnet</div>
          <div className="network-pill dev-pill hidden md:block">Dev Wallets</div>
          <WalletSwitcher />
        </div>
      </header>

      <main className="pointer-events-none flex-1 w-full relative z-10 flex">
        <div className="flex-1 relative w-full">
          {children}
        </div>
      </main>

      <footer className="studio-footer">
        <span>Built with the Stellar Game Studio</span>
      </footer>
    </div>
  );
}
