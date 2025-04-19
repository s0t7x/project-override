// client/src/index.tsx
// Entry point for the ProjectOverride React application.
// Initializes Zustand stores (if needed before Provider), renders the App component into the DOM.

import React from 'react';
import ReactDOM from 'react-dom/client'; // Use the new client API

import App from './App'; // Import the main App component

// Import global styles and Arwes theme setup (create these files next)
import './styles/global.css'; // Import global CSS first
import { BgmPlayer } from './services/BgmPlayer';

// --- Zustand Store Initialization (Optional: If persistence/middleware needed early) ---
// import { initializeStores } from './state'; // Example: if you have an init function
// initializeStores();
// --- End Store Initialization ---


// Find the root element in the HTML
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Fatal Error: Root element with ID 'root' not found in index.html");
}

// Create a React root
const root = ReactDOM.createRoot(rootElement);

BgmPlayer.initialize();

// Render the main App component
root.render(
    <>
      <App />
    </>
);

console.log("[ProjectOverride Client] Application mounted.");