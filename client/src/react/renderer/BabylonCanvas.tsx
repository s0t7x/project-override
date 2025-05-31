import React, { useEffect, useRef, useState } from 'react';
import { useServices } from '../../context/Services';
import { useGameEngine } from '@/context/GameEngine';

const BabylonCanvas: React.FC = () => {
	const { gameEngine } = useGameEngine();
	const { servicesInitialized } = useServices();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [initialized, setInitialized] = useState<Boolean>(false);

	useEffect(() => {
		(async () => {
			if (servicesInitialized && canvasRef.current) {
				await gameEngine.initialize(canvasRef.current);
				setInitialized(true);
			}
		})();
		return () => {
			gameEngine.dispose();
			setInitialized(false);
		};
	}, [servicesInitialized, gameEngine]);

	return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: initialized ? 'block' : 'none' }} />;
};

export default BabylonCanvas;
