import BabylonCanvas from './renderer/BabylonCanvas';
import UiOverlay from './renderer/UiOverlay';

import { ServiceProvider } from '../context/Services';
import { ArwesProvider } from '@/context/Arwes';
import { GameEngineProvider } from '@/context/GameEngine';

function App() {
	console.log('[App] Rendering main application component.');

	//   const originalConsoleWarn = console.warn;
	//   console.warn = (...args) => {
	//     if (args[0] && args[0].includes('colyseus.js')) return;
	//     originalConsoleWarn(...args)
	//   }

	return (
		<ServiceProvider>
			<GameEngineProvider>
				<BabylonCanvas />
				<ArwesProvider>
					<UiOverlay />
				</ArwesProvider>
			</GameEngineProvider>
		</ServiceProvider>
	);
}

export default App;
