// client/src/App.tsx
// Main React application component. Sets up the GameProvider,
// renders the persistent BabylonRenderer and the dynamic UIManager overlay.
// Orchestrates the top-level layout.

import React from 'react';

// Import Core UI layout components (create these next)
import Renderer from './components/Renderer';
import UIManager from './components/UIManager';

// Import the context provider (create this next)
import { GameProvider } from './contexts/GameContext';
import { BleepsProvider, BleepsProviderSettings } from '@arwes/react';

// --- Arwes Setup (Will need theme and global styles) ---
// import { ArwesThemeProvider, StylesBaseline } from '@arwes/core';
// import { rootTheme } from './styles/theme'; // Assuming theme definition exists
// --- End Arwes Setup ---

type BleepsNames = 'hover' | 'click' | 'assemble' | 'type' | 'intro' | 'error'
const bleepsSettings: BleepsProviderSettings<BleepsNames> = {
  master: { volume: 1.0 },
  categories: {
    background: { volume: 0.5 },
    transition: { volume: 0.5 },
    interaction: { volume: 0.75 },
    notification: { volume: 1 }
  },
  bleeps: {
    hover: {
      category: 'background',
      sources: [
        { src: 'https://next.arwes.dev/assets/sounds/hover.webm', type: 'audio/webm' },
        { src: 'https://next.arwes.dev/assets/sounds/hover.mp3', type: 'audio/mpeg' }
      ]
    },
    click: {
      category: 'interaction',
      sources: [
        { src: 'https://next.arwes.dev/assets/sounds/click.webm', type: 'audio/webm' },
        { src: 'https://next.arwes.dev/assets/sounds/click.mp3', type: 'audio/mpeg' }
      ],
    },
    assemble: {
      category: 'transition',
      sources: [
        { src: 'https://next.arwes.dev/assets/sounds/assemble.webm', type: 'audio/webm' },
        { src: 'https://next.arwes.dev/assets/sounds/assemble.mp3', type: 'audio/mpeg' }
      ]
    },
    type: {
      category: 'transition',
      sources: [
        { src: 'https://next.arwes.dev/assets/sounds/type.webm', type: 'audio/webm' },
        { src: 'https://next.arwes.dev/assets/sounds/type.mp3', type: 'audio/mpeg' }
      ]
    },
    intro: {
      category: 'notification',
      sources: [
        { src: 'https://next.arwes.dev/assets/sounds/intro.webm', type: 'audio/webm' },
        { src: 'https://next.arwes.dev/assets/sounds/intro.mp3', type: 'audio/mpeg' }
      ]
    },
    error: {
      category: 'notification',
      sources: [
        { src: 'https://next.arwes.dev/assets/sounds/error.webm', type: 'audio/webm' },
        { src: 'https://next.arwes.dev/assets/sounds/error.mp3', type: 'audio/mpeg' }
      ]
    }
  }
}


function App() {
  console.log("[App] Rendering main application component.");

  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && args[0].includes('colyseus.js')) return;
    originalConsoleWarn(...args)
  }

  return (
    // Wrap the entire application in the GameProvider
    // This makes core services (Network, SceneDirector etc.) available via context
    <GameProvider>
      {/* --- Arwes Theme Provider (Uncomment when theme is ready) --- */}
      {/* <ArwesThemeProvider theme={rootTheme}> */}
      {/* <StylesBaseline /> */} {/* Applies base Arwes styles */}
      <BleepsProvider {...bleepsSettings}>

        {/* The persistent BabylonJS canvas renderer */}
        <Renderer />

        {/* The UI Manager, responsible for rendering UI overlays */}
        {/* It will internally switch UI based on game state from context/store */}
        <UIManager />

      </BleepsProvider>
      {/* </ArwesThemeProvider> */}
      {/* --- End Arwes Theme Provider --- */}
    </GameProvider>
  );
}

export default App;