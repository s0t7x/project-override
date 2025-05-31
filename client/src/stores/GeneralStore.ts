import { GameEngine } from '@/babylon/GameEngine';
import { Client } from 'colyseus.js';
import { create } from 'zustand';

export interface IGeneralStore {
	gameEngine: GameEngine | null;
	client: Client | null;
}

export const useGeneralStore = create<IGeneralStore>((_set: (state: Partial<IGeneralStore>) => void) => ({
	gameEngine: null,
	client: null,
}));
