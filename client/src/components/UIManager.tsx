// client/src/components/UIManager.tsx
// React component that acts as a router/switch, rendering the appropriate UI overlay scene
// (LoginUI, GameHUD, etc.) based on the current application state (from gameStore).

import React from 'react';

// Import Zustand store hook (create store file next)
import { useGameStore } from '@/state/gameStore';
import { LoginUI } from '../scenes/LoginUI';
import { EntryUI } from '../scenes/EntryUI';
import { CharacterSelectUI } from '../scenes/CharacterSelectUI';
import { CharacterCreationUI } from '../scenes/CharacterCreationUI';

// Import UI Scene components (create these later)
// import LoadingUI from '@/scenes/LoadingUI';
// import LoginUI from '@/scenes/LoginUI';
// import CharacterSelectUI from '@/scenes/CharacterSelectUI';
// import WorldLobbyUI from '@/scenes/WorldLobbyUI';
// import GameHUD from '@/scenes/GameHUD';

// Placeholder component until actual scenes are created
const PlaceholderUI: React.FC<{ screenName: string }> = ({ screenName }) => (
    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', pointerEvents: 'auto', zIndex: 10 }}>
       Current UI Screen: {screenName} (Placeholder)
    </div>
);


const UIManager: React.FC = () => {
    // Get the current screen state from the Zustand store
    // Default to 'loading' or 'login' initially
    const currentScreen = useGameStore((state: { currentScreen: any; }) => state.currentScreen ?? 'loading');

    console.log(`[UIManager] Rendering UI for screen: ${currentScreen}`);

    let ActiveComponent: React.ReactNode = null;

    // Conditionally render the correct UI based on the state
    switch (currentScreen) {
        case 'loading':
            // ActiveComponent = <LoadingUI />;
            ActiveComponent = <PlaceholderUI screenName="Loading" />;
            break;
        case 'entry':
            ActiveComponent = <EntryUI />;
            break;
        case 'login':
            ActiveComponent = <LoginUI />;
            break;
        case 'charSelect':
            ActiveComponent = <CharacterSelectUI />;
            break;
        case 'charCreation':
            ActiveComponent = <CharacterCreationUI />;
            break;
        case 'lobby':
            // ActiveComponent = <WorldLobbyUI />;
            ActiveComponent = <PlaceholderUI screenName="World Lobby" />;
            break;
        case 'game':
            // ActiveComponent = <GameHUD />;
            ActiveComponent = <PlaceholderUI screenName="Game HUD" />;
            break;
        // Add cases for other UI states (inventory, editor, etc.)
        default:
            console.warn(`[UIManager] Unknown screen state: ${currentScreen}`);
             ActiveComponent = <PlaceholderUI screenName={`Unknown (${currentScreen})`} />;
    }

    return (
        <div className="ui-manager-container"> {/* Use class from global.css */}
            {/* Render the active UI component */}
            {ActiveComponent}
        </div>
    );
};

export default UIManager;