import { create } from 'zustand';

export type StarStatus = 'base' | 'hit' | 'miss' | 'unknown' | 'scanning' | 'opponent-scanned' | 'available';

interface GameState {
  hoveredStarId: number | null;
  clickedStarId: number | null; 
  starStates: Record<number, StarStatus>;
  isSidebarOpen: boolean;
  gamePhase: 'setup' | 'waiting' | 'playing' | 'complete';
  timeRemaining: number;
  
  setHoveredStarId: (id: number | null) => void;
  setClickedStarId: (id: number | null) => void;
  setStarState: (id: number, status: StarStatus) => void;
  setAllStarStates: (states: Record<number, StarStatus>) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setGamePhase: (phase: 'setup' | 'waiting' | 'playing' | 'complete') => void;
  setTimeRemaining: (time: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  hoveredStarId: null,
  clickedStarId: null,
  starStates: {},
  isSidebarOpen: true,
  gamePhase: 'setup',
  timeRemaining: 300,
  
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
  setClickedStarId: (id) => set({ clickedStarId: id }),
  setStarState: (id, status) => set((state) => ({ 
    starStates: { ...state.starStates, [id]: status } 
  })),
  setAllStarStates: (states) => set({ starStates: states }),
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
}));
