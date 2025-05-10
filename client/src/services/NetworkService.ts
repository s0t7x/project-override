// client/src/services/NetworkService.ts
// Manages the single Colyseus Client instance, handles connecting/joining/leaving rooms,
// sending messages, and critically, receiving messages/state updates and updating the Zustand stores.

import * as Colyseus from 'colyseus.js';
import config from '../config'; // Import client config (server endpoint)
import { useGameStore } from '../state/gameStore'; // To update connection status, auth etc.
import { useWorldStore } from '../state/worldStore'; // To update entities, players etc.
import { IGameRoomState, ServerMessageType, IErrorMessagePayload, IInfoMessagePayload, IAuthRoomState } from '../../../shared/types'; // Import shared types

export class NetworkService {
    private client: Colyseus.Client;
    public currentRoom: Colyseus.Room | null = null;

    private messageListeners: Map<string | number, Set<Function>> = new Map();

    constructor() {
        console.log(`[NetworkService] Initializing network client for endpoint: ${config.colyseusEndpoint}`);
        this.client = new Colyseus.Client(config.colyseusEndpoint);
    }

    /** Register a message listener and track it for removal. */
    public addMessageListener<T = any>(type: string | number, handler: (data: T) => void): void {
        if (!this.currentRoom) {
            console.warn(`[NetworkService] Cannot add listener. Not in a room.`);
            return;
        }

        this.currentRoom.onMessage(type, handler);

        if (!this.messageListeners.has(type)) {
            this.messageListeners.set(type, new Set());
        }
        this.messageListeners.get(type)!.add(handler);
    }

    public addMessageListenerRx<T = any>(room: Colyseus.Room, type: string | number, handler: (data: T) => void): void {
        if (!room) {
            console.warn(`[NetworkService] Cannot add listener. Not in a room.`);
            return;
        }

        room.onMessage(type, handler);
    }

    /**
     * Remove a previously registered message listener.
     * If no handler is passed, all listeners for that message type are removed.
     */
    public removeMessageListener(type: string | number, handler?: Function): void {
        if (!this.currentRoom) return;

        const handlers = this.messageListeners.get(type);
        if (!handlers) return;

        if (handler) {
            handlers.delete(handler);
        } else {
            handlers.clear();
        }

        // Cleanup
        if (handlers.size === 0) {
            this.messageListeners.delete(type);
        }
    }

    /** Clear all registered message listeners when leaving the room */
    private clearAllMessageListeners(): void {
        if (!this.currentRoom) return;
        this.messageListeners.clear();
    }

    // --- Connection and Room Management ---

    /** Attempts to join or create a specific room type with options. */
    async joinRoom<T = any>(roomName: string, options: any = {}, forceCreate: boolean = true, parallel: boolean = false): Promise<Colyseus.Room<T> | null> {
        if(!parallel) {
            if (this.currentRoom && this.currentRoom.name === roomName) {
                console.warn(`[NetworkService] Already in room: ${roomName}`);
                return this.currentRoom as Colyseus.Room<T>;
            }
            
            // Leave existing room before joining a new one
            await this.leaveRoom();
        }

        console.log(`[NetworkService] Attempting to join room: ${roomName} with options:`, options);
        if(!parallel) useGameStore.getState().setConnectionStatus('connecting');
        // useGameStore.getState().setCurrentScreen('loading'); // Show loading screen

        try {
            let newRoom: any;
            // Add auth token if available and not joining auth/entry room
            const token = useGameStore.getState().authToken;
            if (token) {
                options.token = token;
                if(!forceCreate)
                    newRoom = await this.client.joinOrCreate<T>(roomName, options);
                else
                    newRoom = await this.client.create<T>(roomName, options);
            } else if(roomName == 'entry' || roomName == 'auth') {
                newRoom = await this.client.create<T>(roomName, options);
            }


            if (newRoom) {
                console.log(`[NetworkService] Successfully joined room: ${newRoom.name} (ID: ${newRoom.roomId}, Session: ${newRoom.sessionId})`);
                useGameStore.getState().setConnectionStatus('connected');
                // Setup generic listeners for the new room
                this.setupRoomListeners(newRoom);

                // Room-specific setup can happen here or based on room name
                if (roomName === 'game') {
                    useWorldStore.getState().setLocalPlayer(newRoom.sessionId, options.characterId ?? null); // Store local player IDs
                    // useGameStore.getState().setCurrentScreen('game'); // Switch UI to game
                } else {
                    // For lobby, char select etc., screen might be set by gameStore reacting to auth status
                }
                if(parallel)
                    return newRoom as Colyseus.Room<T>;
                this.currentRoom = newRoom;
                return this.currentRoom as Colyseus.Room<T>;
            } else {
                throw new Error("create returned undefined room.");
            }

        } catch (error: any) {
            console.error(`[NetworkService] Failed to join room "${roomName}":`, error);
            if(!parallel) {
                useGameStore.getState().setConnectionStatus('error');
            }
            useGameStore.getState().setError(`Failed to join room "${roomName}": ${error?.message || 'Unknown error'}`);
            // useGameStore.getState().setCurrentScreen('error'); // Show error screen
            this.currentRoom = null;
            return null;
        }
    }

    onMessageOnce<T = any>(type: string | number, callback: (payload: T) => void): void {
        const onceWrapper = (payload: T) => {
            this.removeMessageListener(type, onceWrapper);
            callback(payload);
        };
        this.addMessageListener(type, onceWrapper);
    }

    /** Leaves the current room if connected. */
    async leaveRoom(): Promise<void> {
        if (this.currentRoom) {
            console.log(`[NetworkService] Leaving room: ${this.currentRoom.name} (${this.currentRoom.id})`);
             this.clearAllMessageListeners(); // <<< clear tracked listeners
            try {
                // Prevent race conditions by setting to null before await
                const roomToLeave = this.currentRoom;
                this.currentRoom = null;
                await roomToLeave.leave(true); // Pass true for intentional leave
                useWorldStore.getState().clearWorldState(); // Clear world data on leave
                useGameStore.getState().setConnectionStatus('disconnected');
                useGameStore.getState().setRoomState(null);
            } catch (error) {
                console.error(`[NetworkService] Error leaving room:`, error);
                // Handle potential errors during leave if necessary
            }
        }
    }

    // --- Sending Messages ---

    /** Sends a message to the currently connected room. */
    sendMessage(type: string | number, message?: any): void {
        if (!this.currentRoom) {
            console.warn(`[NetworkService] Cannot send message type "${type}", not connected to a room.`);
            return;
        }
        try {
             // console.log(`[NetworkService] Sending message: ${type}`, message); // DEBUG
            this.currentRoom.send(type, message);
        } catch (error) {
             console.error(`[NetworkService] Error sending message type "${type}":`, error);
        }
    }

    sendMessageTx(room: Colyseus.Room, type: string | number, message?: any): void {
        if (!room) {
            console.warn(`[NetworkService] Cannot send message type "${type}", not connected to a room.`);
            return;
        }
        try {
             // console.log(`[NetworkService] Sending message: ${type}`, message); // DEBUG
            room.send(type, message);
        } catch (error) {
             console.error(`[NetworkService] Error sending message type "${type}":`, error);
        }
    }

    // --- Room Event Listeners ---

    private setupRoomListeners(room: Colyseus.Room): void {
        console.log(`[NetworkService] Setting up listeners for room: ${room.name}`);

        // -- Handle State Changes --
        room.onStateChange.once((initialState) => {
             console.log(`[NetworkService] ${room.name}: Initial state received.`);
             this.handleStateUpdate(initialState, true); // Handle initial full state
        });
        room.onStateChange((currentState) => {
             // console.log(`[NetworkService] ${room.name}: State update received.`); // Can be noisy
             this.handleStateUpdate(currentState, false); // Handle subsequent patches
        });


        // -- Handle Specific Messages from Server --
        room.onMessage(ServerMessageType.ERROR_MESSAGE, (payload: IErrorMessagePayload) => {
             console.error(`[NetworkService] Server Error Message:`, payload.message);
             // Display this prominently to the user via UI state?
             useGameStore.getState().setError(`${payload.message}`);
            //  alert(`Server Error: ${payload.message}`); // Simple alert for now
        });

        room.onMessage(ServerMessageType.INFO_MESSAGE, (payload: IInfoMessagePayload) => {
             console.log(`[NetworkService] Server Info Message:`, payload.message);
             // Display this in a chat window or notification area?
        });

        // Handle login/register success messages (specific to AuthRoom)
        room.onMessage("login_success", (payload: { token: string }) => {
             console.log("[NetworkService] Login successful.");
             const decoded = authService.verifyJwt(payload.token); // Use server's authService temporarily for decode shape
             useGameStore.getState().setAuthStatus('authenticated', payload.token, decoded?.userId);
             // Leave auth room after success? Might be handled by server or client logic flow
             // this.leaveRoom(); // Or maybe join charSelect next?
        });

         room.onMessage("register_success", (payload: { message: string }) => {
             console.log("[NetworkService] Registration successful:", payload.message);
            //  alert(payload.message); // Notify user
             // Stay in AuthRoom, user needs to manually trigger login now
        });


        // Add listeners for other specific messages (SOUND_PLAY, VFX_SPAWN, TRADE_REQUEST etc.)
        // These might trigger actions in AssetService, SceneDirector, or update UI state
        // room.onMessage(ServerMessageType.SOUND_PLAY, (payload) => { ... });

        // -- Handle Room Events --
        room.onError((code, message) => {
            console.error(`[NetworkService] Network room error (${room.name}): Code ${code} - ${message}`);
            useGameStore.getState().setError(`Room Error (${code}): ${message || 'Unknown error'}`);
            useGameStore.getState().setConnectionStatus('error');
            // useGameStore.getState().setCurrentScreen('error');
            this.currentRoom = null; // Assume room is unusable
        });

        room.onLeave((code) => {
            console.log(`[NetworkService] Left room ${room.name} (Code: ${code})`);
            // Ignore if currentRoom was already set null (intentional leave)
            if (this.currentRoom && this.currentRoom.roomId === room.roomId) {
                this.currentRoom = null;
                useWorldStore.getState().clearWorldState();
                useGameStore.getState().setConnectionStatus('disconnected');
                // Decide where to navigate the UI based on the leave code
                if (code > 1001) { // Usually indicates an error or kick
                    useGameStore.getState().setError(`Disconnected from room (Code: ${code})`);
                    // useGameStore.getState().setCurrentScreen('error');
                } else {
                    // Normal leave, maybe go back to lobby/login?
                    if (useGameStore.getState().authStatus !== 'authenticated') {
                        //  useGameStore.getState().setCurrentScreen('login');
                    } else {
                        //  useGameStore.getState().setCurrentScreen('lobby'); // Assume lobby is next logical step
                    }
                }
            }
        });
    }

    // --- State Update Handler ---
    private handleStateUpdate(state: any, isInitial: boolean): void {
        // This is where you update the Zustand worldStore based on the received state.
        // This needs to be adapted based on the *actual* structure of your GameRoomState schema.
        // Using .onAdd/.onChange/.onRemove listeners on the schema properties directly
        // within setupRoomListeners is often more efficient than processing the whole state here.
        useGameStore.getState().setRoomState(state);

        // **Example using hypothetical direct state update (less efficient):**
        if (state.entities && this.currentRoom?.name === 'game') {
            // Caution: This replaces the whole map, losing potential local interpolations.
            // useWorldStore.setState({ entities: { ...state.entities } });

             // A better approach would be to diff or use the Schema listeners,
             // which would call addEntity, removeEntity, patchEntity actions.
             console.log("[NetworkService] Received entity state update (processing TBD). Count:", Object.keys(state.entities).length);
        }
         if (state.players && this.currentRoom?.name === 'game') {
            // useWorldStore.setState({ players: { ...state.players } });
             console.log("[NetworkService] Received player state update (processing TBD). Count:", Object.keys(state.players).length);
        }
         if (state.mapChunks && this.currentRoom?.name === 'game') {
            // useWorldStore.setState({ mapChunks: { ...state.mapChunks } });
             console.log("[NetworkService] Received map chunk state update (processing TBD). Count:", Object.keys(state.mapChunks).length);
        }

         // Handle state updates for other room types (Lobby, CharSelect) here if they sync state
          if (state.characters && this.currentRoom?.name === 'character_select') {
               console.log("[NetworkService] Received character list update.");
               // Update a specific part of the gameStore or a dedicated charSelectStore
               // e.g., useGameStore.setState({ characterList: Object.values(state.characters) });
               useGameStore.setState({ characterList: Array.from(state.characters.$items.values()) });
          }
           if (state.publicRooms && this.currentRoom?.name === 'world_lobby') {
               console.log("[NetworkService] Received room list update.");
               // Update lobby state in gameStore or dedicated lobbyStore
               // e.g., useGameStore.setState({ publicRooms: Object.values(state.publicRooms), playerRooms: Object.values(state.playerRooms) });
          }

    }
}

// Placeholder for server's auth service - only used here to decode JWT shape for user ID
const authService = { verifyJwt: (token: string) : { userId: string | null } | null => { try { const payload = JSON.parse(atob(token.split('.')[1])); return { userId: payload?.userId ?? null }; } catch(e) { return null; } } };