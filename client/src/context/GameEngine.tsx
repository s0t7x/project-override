import { GameEngine } from '@/babylon/GameEngine';
import { SceneDirector } from '@/game/SceneDirector';
import { UiDirector } from '@/game/UiDirector';
import { useGeneralStore } from '@/stores/GeneralStore';
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface IContext {
	gameEngine: GameEngine;
	sceneDirector: SceneDirector;
	uiDirector: UiDirector;
	uiUpdateCount: number; // Increments when UI-related state in UiDirector changes
}

const GameEngineContext = createContext<IContext | undefined>(undefined);

export const useGameEngine = (): IContext => {
	const context = useContext(GameEngineContext);
	if (context === undefined) {
		throw new Error('useGameEngine must be used within a GameEngineProvider');
	}
	return context;
};

interface GameEngineProviderProps {
	children: ReactNode;
}

export const GameEngineProvider: React.FC<GameEngineProviderProps> = ({ children }) => {
	const gameEngineInstanceRef = useRef<GameEngine | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [uiUpdateCount, setUiUpdateCount] = useState(0);

	useEffect(() => {
		console.log('GameEngineProvider: Initializing GameEngine...');
		const engine = new GameEngine();

		// Setup callback for UiDirector state changes
		engine.uiDirector!.setOnStateChange(() => {
			setUiUpdateCount(c => c + 1);
		});

		useGeneralStore.setState({ gameEngine: engine });
		gameEngineInstanceRef.current = engine;
		setIsInitialized(true);

		console.log('GameEngineProvider: GameEngine initialized and context ready.');

		return () => {
			console.log('GameEngineProvider: Disposing GameEngine...');
			// If GameEngine has a dispose method, call it here
			// engine.dispose();
			// Clear the reference in Zustand store if necessary
			// useGeneralStore.setState({ gameEngine: null });
		};
	}, []);

	if (!isInitialized || !gameEngineInstanceRef.current) {
		return <div>Booting gameEngine...</div>;
	}

	const contextValue: IContext = {
		gameEngine: gameEngineInstanceRef.current,
		sceneDirector: gameEngineInstanceRef.current.sceneDirector!,
		uiDirector: gameEngineInstanceRef.current.uiDirector!,
		uiUpdateCount: uiUpdateCount,
	};

	return <GameEngineContext.Provider value={contextValue}>{children}</GameEngineContext.Provider>;
};
