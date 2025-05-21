import { GameEngine } from '@/babylon/GameEngine';
import { SceneDirector, UiDirector } from '@/game/SceneDirector';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface IContext {
    gameEngine: GameEngine
    sceneDirector?: SceneDirector
    uiDirector?: UiDirector
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
    children: React.ReactNode;
}

export const GameEngineProvider: React.FC<GameEngineProviderProps> = ({ children }) => {
    const gameEngineRef = useRef<GameEngine | null>(null);
    const uiDirectorRef = useRef<UiDirector | null>(null);
    const sceneDirectorRef = useRef<SceneDirector | null>(null);

    const [gameEngineInitialized, setGameEngineInitialized] = useState(false);

    useEffect(() => {
        const gameEngine = new GameEngine();
        const sceneDirector = gameEngine.sceneDirector;
        const uiDirector = gameEngine.uiDirector;

        gameEngineRef.current = gameEngine;
        uiDirectorRef.current = uiDirector
        sceneDirectorRef.current = sceneDirector;

        setGameEngineInitialized(true);
        console.log('GameEngineProvider booting');

        return () => {
            console.log('Disposing...');
        };
    }, []);

    const gameEngine: IContext | undefined = gameEngineRef.current ? {
        gameEngine: gameEngineRef.current,
        sceneDirector: sceneDirectorRef.current || undefined,
        uiDirector: uiDirectorRef.current || undefined,
    } : undefined;

    return (
        <GameEngineContext.Provider value={gameEngine}>
            {gameEngineInitialized ? children : <div>Booting gameEngine...</div>}
        </GameEngineContext.Provider>
    );
};