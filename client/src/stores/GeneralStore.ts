import { GameEngine } from '@/babylon/GameEngine';
import { create } from 'zustand';

export interface IGeneralStore {
	gameEngine: GameEngine | null;
	setGameEngine: (gameEngine: GameEngine) => void;
}

export const useGeneralStore = create<IGeneralStore>((set: (state: Partial<IGeneralStore>) => void) => ({
	gameEngine: null,
	setGameEngine: (gameEngine: GameEngine) => set({ gameEngine }),
}));
