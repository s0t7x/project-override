import React, { useEffect, useState } from 'react';
import { useGameEngine } from '@/context/GameEngine';
import { BaseScreen } from '../screens/BaseScreen';
import { Alert, AlertProps } from '../common/Alert';
import ToastComponent, { ToastProps as ExternalToastProps, ToastCorner } from '../common/Toast'; // Renamed to avoid conflict with local variables

// Placeholder component until actual scenes are created
const PlaceholderUI: React.FC<{ screenName: string }> = ({ screenName }) => (
	<div style={{ position: 'absolute', top: '50px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px', pointerEvents: 'auto', zIndex: 100 }}>
		Current Screen Placeholder:
		<br />
		{screenName || "No Active Screen"}
	</div>
);

const UiOverlay: React.FC = () => {
	const { uiDirector, uiUpdateCount } = useGameEngine();
	const [currentScreenNode, setCurrentScreenNode] = useState<React.ReactNode>(<PlaceholderUI screenName="Initializing..." />);
	const [currentAlerts, setCurrentAlerts] = useState<AlertProps[]>([]);
	const [currentToasts, setCurrentToasts] = useState<ExternalToastProps[]>([]);

	useEffect(() => {
		if (uiDirector) {
			// Update active screen
			const activeScreenInstance = uiDirector.getActiveScreen();
			if (activeScreenInstance) {
				// Here you would typically map the BaseScreen instance to a specific React component.
				// For now, we'll use the PlaceholderUI with the screen's class name.
				setCurrentScreenNode(<PlaceholderUI screenName={activeScreenInstance.constructor.name} />);
			} else {
				setCurrentScreenNode(<PlaceholderUI screenName="" />);
			}

			// Update alerts
			const alerts = uiDirector.getAlerts();
			setCurrentAlerts(alerts);

			// Update toasts
			const toasts = uiDirector.getToasts();
			setCurrentToasts(toasts);
		}
	}, [uiDirector, uiUpdateCount]); // Re-run when uiDirector instance or uiUpdateCount changes

	const renderToastsForCorner = (corner: ToastCorner) => {
		return currentToasts
			.filter(toast => (toast.corner || 'top-right') === corner)
			.map(toast => (
				<ToastComponent
					key={toast.id}
					{...toast}
					onDismiss={() => uiDirector.removeToast(toast.id)}
				/>
			));
	};

	const toastContainerBaseStyle: React.CSSProperties = {
		position: 'fixed',
		zIndex: 1000, // Ensure toasts are above most other UI elements
		display: 'flex',
		flexDirection: 'column',
		pointerEvents: 'none', // Container itself should not catch events
	};

	const toastContainers: Record<ToastCorner, React.CSSProperties> = {
		'top-right': { ...toastContainerBaseStyle, top: '20px', right: '20px', alignItems: 'flex-end' },
		'top-left': { ...toastContainerBaseStyle, top: '20px', left: '20px', alignItems: 'flex-start' },
		'bottom-right': { ...toastContainerBaseStyle, bottom: '20px', right: '20px', alignItems: 'flex-end' },
		'bottom-left': { ...toastContainerBaseStyle, bottom: '20px', left: '20px', alignItems: 'flex-start' },
	};


	return (
		<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none', zIndex: 10 }}>
			{currentScreenNode}

			{currentAlerts.map((alert) => (
				<Alert
					key={alert.title} // Assuming title is unique for active alerts
					title={alert.title}
					message={alert.message}
					callback={() => {
						alert.callback();
						// Optionally, close the alert after the callback if it's a dismissive action
						// uiDirector?.closeAlert(alert.title);
					}}
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
				UI Update Count: {uiUpdateCount} | Alerts: {JSON.stringify(currentAlerts.map(a => a.title))} | Toasts: {currentToasts.length}
			</div>
		</div>
	);
};

export default UiOverlay;
