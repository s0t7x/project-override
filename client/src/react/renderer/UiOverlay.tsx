import React, { useEffect, useState } from 'react';
import { useGameEngine } from '@/context/GameEngine';
import { Alert, AlertProps } from '../common/Alert';
import ToastComponent, { ToastProps as ExternalToastProps, ToastCorner } from '../common/Toast';
import { LoginScreen } from '../screens/LoginScreen';
import { CharacterSelectionScreen } from '../screens/CharacterSelectionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const SCREEN_MAP: { [key: string]: React.FC<any> } = {
  login: LoginScreen,
  characterSelection: CharacterSelectionScreen,
  settings: SettingsScreen
};

// Placeholder component until actual scenes are created
const PlaceholderUI: React.FC<{ screenName: string }> = ({ screenName }) => (
	<div style={{ position: 'absolute', top: '50px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px', pointerEvents: 'auto', zIndex: 100 }}>
		Screen Placeholder:
		<br />
		{screenName || "No Active Screen"}
	</div>
);

const UiOverlay: React.FC = () => {
	const { uiDirector, uiUpdateCount, sceneDirector, gameEngine } = useGameEngine();
	const [activeScreenId, setActiveScreenId] = useState<string | null>('initializing');

	const [currentAlerts, setCurrentAlerts] = useState<AlertProps[]>([]);
	const [currentToasts, setCurrentToasts] = useState<ExternalToastProps[]>([]);

	useEffect(() => {
		if (uiDirector) {
			const screenId = uiDirector.getActiveScreen(); // <-- YOU NEED TO IMPLEMENT THIS METHOD
			setActiveScreenId(screenId);

			// Update alerts
			const alerts = uiDirector.getAlerts();
			setCurrentAlerts(alerts);

			// Update toasts
			const toasts = uiDirector.getToasts();
			setCurrentToasts(toasts);
		}
	}, [uiDirector, uiUpdateCount]); // Re-run when uiDirector instance or uiUpdateCount changes

	const [fps, setFps] = useState<number>(0);

	useEffect(() => {
		const fpsUpdater = setInterval(() => {
			if(gameEngine && gameEngine.engine)
				setFps(Math.trunc(gameEngine.engine.getFps()));
		}, 500);
		return () => {
			clearInterval(fpsUpdater);
		}
	}, [])

	const renderToastsForCorner = (corner: ToastCorner) => {
		return currentToasts
			.filter(toast => (toast.corner || 'top-right') === corner)
			.map((toast, index: number) => (
				<ToastComponent
					key={toast.id}
					{...toast}
					onDismiss={() => uiDirector.removeToast(toast.id)}
					noBackground={index > 0}
				/>
			));
	};

	const toastContainerBaseStyle: React.CSSProperties = {
		position: 'fixed',
		zIndex: 1000, // Ensure toasts are above most other UI elements
		display: 'flex',
		columnGap: '10px',
		flexDirection: 'column',
		pointerEvents: 'none', // Container itself should not catch events
	};

	const toastContainers: Record<ToastCorner, React.CSSProperties> = {
		'top-right': { ...toastContainerBaseStyle, top: '20px', right: '20px', alignItems: 'flex-end' },
		'top-left': { ...toastContainerBaseStyle, top: '20px', left: '20px', alignItems: 'flex-start' },
		'bottom-right': { ...toastContainerBaseStyle, bottom: '20px', right: '20px', alignItems: 'flex-end' },
		'bottom-left': { ...toastContainerBaseStyle, bottom: '20px', left: '20px', alignItems: 'flex-start' },
	};

	const ActiveScreenComponent = activeScreenId ? SCREEN_MAP[activeScreenId] : null;

	return (
		<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none', zIndex: 10 }}>
			{ActiveScreenComponent ? (
                <ActiveScreenComponent />
            ) : (
				<PlaceholderUI screenName={activeScreenId || "None"} />
            )}

			{currentAlerts.map((alert) => (
				<Alert
					key={alert.title} // Assuming title is unique for active alerts
					title={alert.title}
					message={alert.message}
					callback={alert.callback}
					x={alert.x || '50%'}
					y={alert.y || '50%'}
				/>
			))}

			{/* Toast Containers */}
			{Object.entries(toastContainers).map(([corner, style]) => (
				<div key={corner} style={style}>
					{renderToastsForCorner(corner as ToastCorner)}
				</div>
			))}

			{/* Debugging output: */}
			<div style={{ position: 'fixed', bottom: '10px', left: '10px', background: 'rgba(200,200,200,0.8)', color: 'black', padding: '5px', pointerEvents: 'auto', zIndex: 200, fontSize: '12px' }}>
				Active Scene: { sceneDirector.getActiveScene()?.constructor.name || 'None' }
				<br/>FPS: { fps }
				<br/>
				<br/>Active Screen: { activeScreenId ? activeScreenId : 'None' }
				<br/>Update Count: {uiUpdateCount} | Alive Screen: {uiDirector?.currentScreens?.length} | Alerts: {currentAlerts.length} | Toasts: {currentToasts.length}
			</div>
		</div>
	);
};

export default UiOverlay;
