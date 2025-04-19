// client/src/components/BabylonRenderer.tsx
import React, { useRef, useEffect } from 'react';
import { useGameContext } from '../contexts/GameContext';

const Renderer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { gameEngine, sceneDirector } = useGameContext(); // Get both instances

    useEffect(() => {
        const canvas = canvasRef.current;
        // Ensure both canvas and services are ready
        if (canvas && gameEngine && sceneDirector && !gameEngine.isInitialized()) {
            console.log("[Renderer] Initializing GameEngine...");
            // Pass sceneDirector to initialize
            gameEngine.initialize(canvas, sceneDirector);

            return () => {
                console.log("[Renderer] Disposing GameEngine...");
                 // SceneDirector should handle disposing its scenes *before* engine dispose is called
                 // Maybe add gameEngine.disposeSceneDirectorScenes(sceneDirector) or similar?
                 // For now, assume SceneDirector cleans up its own scenes on component unmount or state change
                gameEngine.dispose();
            };
        }
    // Add sceneDirector to dependency array
    }, [gameEngine, sceneDirector]);

    return (
        <div className="babylon-canvas-container">
            <canvas ref={canvasRef} id="renderCanvas" touch-action="none" style={{zIndex: -10}} />
        </div>
    );
};

export default Renderer;