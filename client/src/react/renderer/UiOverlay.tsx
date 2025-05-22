import React, { useEffect, useRef, useState } from 'react';
import { useGameEngine } from '@/context/GameEngine';
import { BaseScreen } from '../screens/BaseScreen';

// Placeholder component until actual scenes are created
const PlaceholderUI: React.FC<{ screenName: string }> = ({ screenName }) => (
	<div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', pointerEvents: 'auto', zIndex: 10 }}>
		Placeholder
		<br />
		{screenName}
	</div>
);

const UiOverlay: React.FC = () => {
	const { uiDirector } = useGameEngine();
	const overlayRef = useRef<HTMLDivElement>(null);
	const [currentScreen, setCurrentScreen] = useState<BaseScreen | null>(null);

	useEffect(() => {
		const udas = uiDirector?.getActiveScreen();
		if (udas) {
			setCurrentScreen(udas);
		} else {
			setCurrentScreen(PlaceholderUI({ screenName: '' }));
		}
	}, [uiDirector]);

	return (
		<div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none', zIndex: 10 }}>
			{currentScreen}
		</div>
	);
};

export default UiOverlay;
