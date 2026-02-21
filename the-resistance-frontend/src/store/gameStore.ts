import { create } from 'zustand';

export type StarStatus = 'base' | 'hit' | 'miss' | 'unknown' | 'scanning' | 'opponent-scanned' | 'available';

interface GameState {
  hoveredStarId: number | null;
  clickedStarId: number | null; 
  starStates: Record<number, StarStatus>;
  
  setHoveredStarId: (id: number | null) => void;
  setClickedStarId: (id: number | null) => void;
  setStarState: (id: number, status: StarStatus) => void;
  setAllStarStates: (states: Record<number, StarStatus>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  hoveredStarId: null,
  clickedStarId: null,
  starStates: {},
  
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
  setClickedStarId: (id) => set({ clickedStarId: id }),
  setStarState: (id, status) => set((state) => ({ 
    starStates: { ...state.starStates, [id]: status } 
  })),
  setAllStarStates: (states) => set({ starStates: states }),
}));
