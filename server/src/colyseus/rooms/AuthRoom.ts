import { Room, Client, Server } from 'colyseus';
import { Unused } from '../schemas/Unused';
import { IServerErrorMessage, ServerError, ServerErrorMessageType, ValidationError } from '@project-override/shared/dist/misc/ServerError';
import { networkService } from '../../services/NetworkService';
import { AuthLoginRequest, AuthLoginResponse, AuthMessageTypeEnum, AuthRegisterRequest, AuthRegisterResponse } from '@project-override/shared/dist/game/Auth';
import { authService } from '../../services/AuthService';
import { userService } from '../../services/UserService';
import { hashSync } from 'bcryptjs';
import { config } from 'src/config';
import { IMessage } from '@project-override/shared/game/Messages';

export class AuthRoom extends Room<Unused> {
    onCreate(options: any) {
        console.log(`[AuthRoom ${this.roomId}] Room created.`);

        this.onMessage(AuthMessageTypeEnum.AuthLoginRequest, async (client, message: AuthLoginRequest) => {
            console.log(`[AuthRoom ${this.roomId}] Received AuthLoginRequest from ${client.sessionId}:`, message);
            if (message.username && message.password) {
                try {
                    const authTokens = await authService.login(message.username, message.password);
                    console.log(`[AuthRoom ${this.roomId}] Authentication successful for ${client.sessionId}.`);
                    networkService.sendMessage(client, new AuthLoginResponse(authTokens));
                } catch (error: Error | any) {
                    console.error(`[AuthRoom ${this.roomId}] Authentication failed for ${client.sessionId}:`, error);
                    networkService.sendError(client, error instanceof ServerError ? error : new ServerError(error.message));
                }
            } else {
                networkService.sendError(client, new ValidationError('Username and password are required.') as ServerError);
            }
        });

        this.onMessage(AuthMessageTypeEnum.AuthRegisterRequest, async (client, message: AuthRegisterRequest) => {
            console.log(`[AuthRoom ${this.roomId}] Received AuthRegisterRequest from ${client.sessionId}:`, message);
            if (message.username && message.password) {
                try {
                    await userService.registerUser({ username: message.username, passwordHash: message.password });
                    console.log(`[AuthRoom ${this.roomId}] Registration successful for ${client.sessionId}.`);
                    networkService.sendMessage(client, new AuthRegisterResponse());
                } catch (error: any) {
                    console.error(`[AuthRoom ${this.roomId}] Registration failed for ${client.sessionId}:`, error);
                    networkService.sendError(client, error);
                }
            } else {
                networkService.sendError(client, new ValidationError('Username and password are required.'));
            }
        });

        // Fallback
        this.onMessage("*", (client, type: any, message) => {
            if(typeof(type) == 'object') {
                message = type;
                type = undefined;
            }
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