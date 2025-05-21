import React, { useEffect, useRef } from 'react';
import { useServices } from '../../context/Services';
import { useGameEngine } from '@/context/GameEngine';

const BabylonCanvas: React.FC = () => {
    const { gameEngine } = useGameEngine();
    const { servicesInitialized } = useServices();

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (servicesInitialized && canvasRef.current) {
            gameEngine.initialize(canvasRef.current);
        }

        return () => {
            gameEngine.dispose();
        };
    }, [servicesInitialized, gameEngine]); 

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: gameEngine.isInitialized() ? 'block' : 'none' }}
        />
    );
};

export default BabylonCanvas;