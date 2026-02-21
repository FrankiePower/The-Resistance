import { WalletSwitcher } from './WalletSwitcher';
import './Layout.css';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Galaxy3D } from '../games/the-resistance/components/Galaxy3D';
import { Loader3D } from '../games/the-resistance/components/Loader3D';

interface LayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Layout({ title, subtitle, children }: LayoutProps) {
  const resolvedTitle = title || import.meta.env.VITE_GAME_TITLE || 'The Resistance';
  const resolvedSubtitle = subtitle || import.meta.env.VITE_GAME_TAGLINE || 'Testnet dev sandbox';

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

      <header className="studio-header pointer-events-none">
        <div className="brand pointer-events-auto bg-black/40 p-4 rounded-xl backdrop-blur-md">
          <div className="brand-title">{resolvedTitle}</div>
          <p className="brand-subtitle">{resolvedSubtitle}</p>
        </div>
        <div className="header-actions pointer-events-auto bg-black/40 p-2 rounded-xl backdrop-blur-md">
          <div className="network-pill">Testnet</div>
          <div className="network-pill dev-pill">Dev Wallets</div>
          <WalletSwitcher />
        </div>
      </header>

      <main className="studio-main pointer-events-none">
        <div className="pointer-events-auto h-full">
          {children}
        </div>
      </main>

      <footer className="studio-footer">
        <span>Built with the Stellar Game Studio</span>
      </footer>
    </div>
  );
}
