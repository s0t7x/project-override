import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './react/App';
import { ServiceProvider } from './context';

// Find the root element where the React app will be mounted
const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element with ID "root" not found in the DOM.');
}

// Create a React root
const root = ReactDOM.createRoot(rootElement);

// Render the application
root.render(
    <React.StrictMode>
        {/* Wrap the App component with the ServiceProvider */}
        {/* This makes all the services available to any component within the App tree */}
        <ServiceProvider>
            <App />
        </ServiceProvider>
    </React.StrictMode>
);

// Optional: Add basic styling to body/html to ensure full viewport usage
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.documentElement.style.margin = '0';
document.documentElement.style.overflow = 'hidden';
document.documentElement.style.width = '100%';
document.documentElement.style.height = '100%';
document.body.style.width = '100%';
document.body.style.height = '100%';