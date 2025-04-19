// client/src/contexts/GameContext.tsx
// Creates and provides singleton instances of core services (NetworkService, SceneDirector, AssetService, GameEngine)
// and potentially state accessors/actions via React Context API.

import React, { createContext, useContext, useMemo } from 'react';

// Import core services (create these files next)
import { GameEngine } from '../babylon/GameEngine';
import { SceneDirector } from '../babylon/SceneDirector';
import { NetworkService } from '../services/NetworkService';
import { AssetService } from '../services/AssetService';
import { BgmPlayer } from '../services/BgmPlayer';

// Define the shape of the context data
interface GameContextProps {
    networkService: NetworkService;
    assetService: AssetService;
    gameEngine: GameEngine;
    sceneDirector: SceneDirector;
    // Add access to Zustand stores/actions if needed directly here
    // e.g., useGameStore: () => useGameStore()
}

// Create the context with a placeholder default value (will cause error if used without Provider)
const GameContext = createContext<GameContextProps>(null!);

// Define the Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Create singleton instances of services using useMemo to ensure they are created only once
    const networkService = useMemo(() => new NetworkService(), []);
    const assetService = useMemo(() => new AssetService(), []);
    const gameEngine = useMemo(() => new GameEngine(), []);
    // SceneDirector needs GameEngine and potentially others
    const sceneDirector = useMemo(() => new SceneDirector(gameEngine, networkService, assetService), [gameEngine, networkService, assetService]);

    // Prepare the context value
    const contextValue: GameContextProps = useMemo(() => ({
        networkService,
        assetService,
        gameEngine,
        sceneDirector,
    }), [networkService, assetService, gameEngine, sceneDirector]);

    console.log("[GameContext] Provider initialized.");

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

// Custom hook for easy access to the context
export const useGameContext = (): GameContextProps => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};