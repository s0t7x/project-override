// server/src/rooms/AuthRoom.ts
// Handles user login and registration requests. Uses AuthService for validation/creation,
// issues JWTs on success, updates minimal AuthRoomState.

import { Room, Client } from 'colyseus';
import { Schema, type } from "@colyseus/schema";

// Import services and types
import { authService, AuthService } from '../services/AuthService'; // Use singleton instance
import {
    ILoginRequestPayload,
    IRegisterRequestPayload,
    IAuthRoomState,
    ServerMessageType,
    IErrorMessagePayload,
    IInfoMessagePayload
} from 'shared/types';

// Define a simple state for this room
class AuthRoomState extends Schema implements IAuthRoomState {
    // No synchronized state needed usually, communication is via messages
    // Could add a status if desired:
    @type("string") statusMessage?: string;
}

export class AuthRoom extends Room<AuthRoomState> {

    // Inject services or use singletons
    private authService: AuthService = authService;

    onCreate(options: any) {
        console.log(`[AuthRoom] Room ${this.roomId} created.`);
        this.setState(new AuthRoomState()); // Initialize the (minimal) state

        // --- Message Handlers ---

        // Handle 'login' message from client
        this.onMessage<ILoginRequestPayload>("login", async (client, payload) => {
            console.log(`[AuthRoom] Received 'login' request from ${client.sessionId} for user "${payload.username}"`);
            try {
                const token = await this.authService.login(payload);

                if (token) {
                    // Send token directly back to the requesting client
                    client.send("login_success", { token });
                    console.log(`[AuthRoom] Login success for ${client.sessionId}`);
                    // Optionally leave the client after successful login
                    // client.leave();
                } else {
                    // Send error message back
                    client.send(ServerMessageType.ERROR_MESSAGE, { message: "Login failed: Invalid username or password." } as IErrorMessagePayload);
                    console.warn(`[AuthRoom] Login failed for ${client.sessionId}`);
                }
            } catch (error) {
                console.error("[AuthRoom] Internal server error during login:", error);
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Internal server error during login." } as IErrorMessagePayload);
            }
        });

        // Handle 'register' message from client
        this.onMessage<IRegisterRequestPayload>("register", async (client, payload) => {
            console.log(`[AuthRoom] Received 'register' request from ${client.sessionId} for user "${payload.username}"`);
            // Add input validation here (e.g., username length, password complexity)
            if (!payload.username || payload.username.length < 3) {
                 client.send(ServerMessageType.ERROR_MESSAGE, { message: "Registration failed: Username must be at least 3 characters." });
                 return;
            }
             if (!payload.password || payload.password.length < 4) {
                 client.send(ServerMessageType.ERROR_MESSAGE, { message: "Registration failed: Password must be at least 4 characters." });
                 return;
            }

            try {
                const newUser = await this.authService.register(payload);

                if (newUser) {
                    client.send("register_success", { message: `User "${newUser.username}" registered successfully. Please login.` } as IInfoMessagePayload);
                    console.log(`[AuthRoom] Registration success for ${client.sessionId}, user: ${newUser.username}`);
                } else {
                    // AuthService returns null if username taken or DB error handled there
                    client.send(ServerMessageType.ERROR_MESSAGE, { message: "Registration failed: Username might already be taken or server error." } as IErrorMessagePayload);
                     console.warn(`[AuthRoom] Registration failed for ${client.sessionId}`);
                }
            } catch (error) {
                console.error("[AuthRoom] Internal server error during registration:", error);
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Internal server error during registration." } as IErrorMessagePayload);
            }
        });

         // Catch-all for unhandled message types
         this.onMessage("*", (client, type, message) => {
             console.warn(`[AuthRoom] Received unhandled message type "${type}" from ${client.sessionId}`);
             client.send(ServerMessageType.ERROR_MESSAGE, { message: `AuthRoom does not handle message type: ${type}`});
         });
    }

    // No authentication needed to JOIN this room
    // onAuth(client: Client, options: any, request?: any): Promise<any> | any {
    //     console.log(`[AuthRoom] onAuth attempt for ${client.sessionId}`);
    //     return true; // Allow anyone to join initially
    // }

    onJoin(client: Client, options?: any) {
        console.log(`[AuthRoom] Client ${client.sessionId} joined.`);
        client.send("info", { message: "Welcome to the Auth Room. Send 'login' or 'register' message." });
    }

    onLeave(client: Client, consented?: boolean) {
        console.log(`[AuthRoom] Client ${client.sessionId} left.`);
    }

    onDispose() {
        console.log(`[AuthRoom] Room ${this.roomId} disposing.`);
    }
}