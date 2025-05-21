import React, { useEffect, useState } from 'react';
import { useServices } from '../context';
import BabylonCanvas from './renderer/BabylonCanvas';
// Import ArwesProvider if you plan to use Arwes components globally
// import { ArwesThemeProvider, createTheme, StylesBaseline } from '@arwes/react';

/**
 * The main application component.
 * Handles routing/scene switching based on authentication state.
 * Renders either the LoginScreen or the GameUI and Babylon scene.
 */
const App: React.FC = () => {
    // Get the AuthService from the context
    const { authService, servicesInitialized } = useServices();

    // State to track authentication status
    const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated);

    // Listen for authentication state changes from AuthService
    useEffect(() => {
        if (!servicesInitialized) {
            // Don't set up listeners until services are ready
            return;
        }
        console.log('App: Setting up auth change listener');
        const unsubscribe = authService.onAuthChange(() => {
            console.log('App: Auth state changed to', authService.isAuthenticated);
            setIsAuthenticated(authService.isAuthenticated);
            // If authenticated, potentially join the game room here
            if (authService.isAuthenticated) {
                 // Example: Join a room named 'game_room' with auth token
                 // The room name and options depend on your server setup.
                 // You might need to pass the auth token in the options.
                 // const authToken = authService.authTokens?.accessToken;
                 // if (authToken) {
                 //      services.networkService.joinGameRoom('game_room', { token: authToken })
                 //          .catch(err => console.error('Failed to join game room:', err));
                 // } else {
                 //      console.error('No auth token available to join room.');
                 //      authService.logout(); // Should not happen if isAuthenticated is true, but good practice
                 // }
                 // For now, just log a message:
                 console.log('User authenticated. Ready to join game room.');
            } else {
                 // User logged out, potentially leave the game room
                 // This is handled by AuthService.logout()
            }
        });

        // Clean up the listener when the component unmounts
        return () => {
            console.log('App: Cleaning up auth change listener');
            unsubscribe();
        };
    }, [authService, servicesInitialized]); // Re-run effect if authService or servicesInitialized changes

    // Render different screens based on authentication state
    return (
        // Optionally wrap with ArwesThemeProvider and StylesBaseline
        // <ArwesThemeProvider theme={createTheme()}>
        //     <StylesBaseline />
            <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
                {/* Render the Babylon canvas regardless of auth state, but control its visibility/initialization */}
                {/* The BabylonCanvas component itself checks servicesInitialized */}
                <BabylonCanvas />

                {/* Render UI layer on top */}
                
            </div>
        // </ArwesThemeProvider>
    );
};

export default App;