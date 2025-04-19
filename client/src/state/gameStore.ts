// client/src/state/gameStore.ts
// Zustand store slice managing overall application state: connection status,
// authentication state, current UI screen, selected character ID, etc.

import { create } from 'zustand';
// Optional: If you want persistence (e.g., localStorage)
// import { persist, createJSONStorage } from 'zustand/middleware';

// Define the possible screens/views for the UI Manager
export type ScreenState = 'loading' | 'entry' | 'login' | 'charSelect' | 'lobby' | 'game' | 'disconnected' | 'error';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type AuthStatus = 'pending' | 'authenticated' | 'unauthenticated';

// Define the shape of the store's state
interface GameState {
    connectionStatus: ConnectionStatus;
    authStatus: AuthStatus;
    currentScreen: ScreenState;
    errorMessage: string | null;
    authToken: string | null;
    userId: string | null; // Logged in user's ID
    selectedCharacterId: string | null; // Character chosen to play
    roomState: any;

    // Actions: Define methods to update the state
    setConnectionStatus: (status: ConnectionStatus) => void;
    setAuthStatus: (status: AuthStatus, token?: string | null, userId?: string | null) => void;
    setCurrentScreen: (screen: ScreenState) => void;
    setError: (message: string | null) => void;
    setSelectedCharacter: (characterId: string | null) => void;
    setRoomState: (state: any) => void;
    resetAuth: () => void;
}

// Create the Zustand store
// Optional: Add persist middleware
/*
export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            // --- Initial State ---
            connectionStatus: 'disconnected',
            authStatus: 'unauthenticated', // Assume unauthenticated initially
            currentScreen: 'login',          // Start at login screen usually
            errorMessage: null,
            authToken: null,
            userId: null,
            selectedCharacterId: null,

            // --- Actions ---
            setConnectionStatus: (status) => set({ connectionStatus: status }),

            setAuthStatus: (status, token = null, userId = null) => set({
                authStatus: status,
                authToken: status === 'authenticated' ? token : null,
                userId: status === 'authenticated' ? userId : null,
            }),

            setCurrentScreen: (screen) => set({ currentScreen: screen }),

            setError: (message) => set({ errorMessage: message, currentScreen: message ? 'error' : get().currentScreen }), // Go to error screen if message set

            setSelectedCharacter: (characterId) => set({ selectedCharacterId: characterId }),

            resetAuth: () => set({
                authStatus: 'unauthenticated',
                authToken: null,
                userId: null,
                selectedCharacterId: null,
                currentScreen: 'login', // Go back to login on logout
            }),
        }),
        {
            name: 'projectoverride-gamestate', // Name for localStorage key
            storage: createJSONStorage(() => localStorage), // Use localStorage
            partialize: (state) => ({
                // Only persist specific parts of the state if needed
                authToken: state.authToken,
                userId: state.userId,
                // Avoid persisting connectionStatus or currentScreen directly if they should reset on reload
            }),
        }
    )
);
*/

// Create store WITHOUT persistence initially for simplicity
export const useGameStore = create<GameState>((set, get) => ({
    // --- Initial State ---
    connectionStatus: 'disconnected',
    authStatus: 'unauthenticated', // Assume unauthenticated initially
    currentScreen: 'entry',          // Start at login screen usually
    errorMessage: null,
    authToken: null,
    userId: null,
    selectedCharacterId: null,
    roomState: null,

    // --- Actions ---
    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setAuthStatus: (status, token = null, userId = null) => {
         console.log(`[GameStore] Setting auth status: ${status}, UserID: ${userId}`);
         set({
            authStatus: status,
            authToken: status === 'authenticated' ? token : null,
            userId: status === 'authenticated' ? userId : null,
        });
        // Automatically adjust screen based on auth status changes
        // if (status === 'authenticated' && !get().selectedCharacterId) {
        //     set({ currentScreen: 'charSelect' });
        // } else if (status === 'unauthenticated') {
        //      set({ currentScreen: 'login', selectedCharacterId: null }); // Reset character on logout
        // }
    },

    setCurrentScreen: (screen) => {
        console.log(`[GameStore] Setting current screen: ${screen}`);
        set({ currentScreen: screen });
    },

    setError: (message) => {
        set({ errorMessage: message });
        if (message) {
            console.error(`[GameStore] Setting error: ${message}`);
            // set({ connectionStatus: 'error' }); // Also set connection status maybe
        }
    },

    setSelectedCharacter: (characterId) => {
         console.log(`[GameStore] Setting selected character: ${characterId}`);
         set({ selectedCharacterId: characterId });
        //  // If authenticated and character selected, move to lobby (or game if skipping lobby)
        //  if (get().authStatus === 'authenticated' && characterId) {
        //      set({ currentScreen: 'lobby' });
        //  } else if (!characterId) {
        //      // If character deselected, go back to char select
        //      set({ currentScreen: 'charSelect' });
        //  }
    },

    setRoomState: (state: any) => {
        console.log(`[GameStore] Setting room state: ${state}`);
        set({ roomState: state });
    },

    resetAuth: () => {
        console.log(`[GameStore] Resetting authentication.`);
        set({
            authStatus: 'unauthenticated',
            authToken: null,
            userId: null,
            selectedCharacterId: null,
            currentScreen: 'login', // Go back to login on logout
        });
    },
}));

// Optional: Selector for convenience
export const selectAuthToken = (state: GameState) => state.authToken;