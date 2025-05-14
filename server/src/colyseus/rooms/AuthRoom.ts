import { Room, Client, Server } from 'colyseus';
import { UnusedState } from '../states/UnusedState';
import { ServerError, ValidationError } from '@project-override/shared/dist/messages/ServerError';
import { networkService } from '../../services/NetworkService';
import {
	AuthLoginRequest,
	AuthLoginResponse,
	AuthMessageTypeEnum,
	AuthRefreshRequest,
	AuthRefreshResponse,
	AuthRegisterRequest,
	AuthRegisterResponse,
} from '@project-override/shared/dist/messages/Auth';
import { authService } from '../../services/AuthService';
import { userService } from '../../services/UserService';

export class AuthRoom extends Room<UnusedState> {
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
					await userService.registerUser({
						username: message.username,
						passwordHash: message.password,
					});
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

		this.onMessage(AuthMessageTypeEnum.AuthRefreshRequest, async (client, message: AuthRefreshRequest) => {
			console.log(`[AuthRoom ${this.roomId}] Received AuthRefreshRequest from ${client.sessionId}:`, message);
			if (message.token) {
				try {
					const authTokens = await authService.refreshToken(message.token);
					console.log(`[AuthRoom ${this.roomId}] Refresh successful for ${client.sessionId}.`);
					networkService.sendMessage(client, new AuthRefreshResponse(authTokens));
				} catch (error: any) {
					console.error(`[AuthRoom ${this.roomId}] Refresh failed for ${client.sessionId}:`, error);
					networkService.sendError(client, error);
				}
			} else {
				networkService.sendError(client, new ValidationError('Username and password are required.'));
			}
		});

		// Fallback
		this.onMessage('*', (client, type: any, message) => {
			if (typeof type == 'object') {
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
