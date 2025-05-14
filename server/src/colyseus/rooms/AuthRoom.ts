import { Room, Client } from 'colyseus';
import { Unused } from '../schemas/Unused';
import { ServerError } from '@project-override/shared/dist/errors/server';
import { networkService } from '../../services/NetworkService';

export class AuthRoom extends Room<Unused> {
    onCreate(options: any) {
        console.log(`[AuthRoom ${this.roomId}] Room created.`);

        // Room creation logic

        // Fallback
        this.onMessage("*", (client, type, message) => {
            console.log(`[AuthRoom ${this.roomId}] Received message type "${type}" from ${client.sessionId}:`, message);
            networkService.sendError(client, new ServerError(`Message type "${type}" not recognized`));
        });
    }

    onJoin(client: Client, options?: any) {
        console.log(`[AuthRoom ${this.roomId}] Client ${client.sessionId} joined.`);
    }

    onLeave(client: Client, consented?: boolean) {
        console.log(`[AuthRoom ${this.roomId}] Client ${client.sessionId} left.`);
    }

    onDispose() {
        console.log(`[AuthRoom ${this.roomId}] Room ${this.roomId} disposing.`);
    }
}