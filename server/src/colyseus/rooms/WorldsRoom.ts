// packages/po_server/src/rooms/WorldsRoom.ts
import { Room, Client, AuthContext } from 'colyseus';

// Services
import { authService } from '../../services/AuthService';
import { characterService } from '../../services/CharacterService'; // To verify character ownership
import { worldService } from '../../services/WorldService';
import { networkService } from '../../services/NetworkService';

// App Errors
import { ServerError, ForbiddenError, NotFoundError, ValidationError } from '@project-override/shared/dist/messages/ServerError';
import { IJwtPayload } from '@project-override/shared/dist/messages/Auth';
import { WorldsRoomState } from '../states/WorldsRoomState';
import { CharacterSummary, CharacterSummaryFromDbObject } from '../schemas/CharacterSummary';
import { WorldSummary } from '../schemas/WorldSummary';
import { ArraySchema } from '@colyseus/schema';
import { WorldsRoomMessageTypeEnum, WorldsRoomRefreshRequest, WorldsRoomRefreshResponse } from '@project-override/shared/dist/messages/WorldsRoom';

interface IWorldsRoomAuthData extends IJwtPayload {
	characterSummary: CharacterSummary;
}

export class WorldsRoom extends Room<WorldsRoomState> {
	maxClients: number = 1; // Only one character session in this lobby at a time

	async onCreate(_options: any) {
		console.log(`[WorldsRoom ${this.roomId}] Room created.`);

		this.state = new WorldsRoomState();
		this.state.availableWorlds = new ArraySchema<WorldSummary>();

		this.onMessage(WorldsRoomMessageTypeEnum.WorldsRoomRefreshRequest, (client: Client, _message: WorldsRoomRefreshRequest) => {
			this.fetchAvailableWorlds(client).then(() => 
				networkService.sendMessage(client, new WorldsRoomRefreshResponse())
			)
		});

		// Fallback for unhandled messages
		this.onMessage('*', (client, type: any, message) => {
			if (typeof type === 'object' && message === undefined) {
				// Handle cases where Colyseus might pass message as type
				message = type;
				type = (message as any)?.type || 'UNKNOWN'; // Try to get a type from the message object itself
			}
			type = String(type); // Ensure type is a string
			console.warn(`[WorldsRoom ${this.roomId}] Received unhandled message type "${type}" from ${client.sessionId}:`, message);
			networkService.sendError(client, new ServerError(`Message type "${type}" not recognized in WorldsRoom.`, 400));
		});
	}

	async onAuth(client: Client, options: { characterId?: string }, context: AuthContext): Promise<IWorldsRoomAuthData> {
		const { token } = context; // Access token from client's `joinOrCreate` options or context
		const characterId = options?.characterId;

		if (!token) {
			console.error(`[WorldsRoom ${this.roomId}] Auth failed for ${client.sessionId}: No access token provided.`);
			throw new ForbiddenError('Access token is required.');
		}
		if (!characterId) {
			console.error(`[WorldsRoom ${this.roomId}] Auth failed for ${client.sessionId}: No characterId provided in options.`);
			throw new ValidationError('Character ID is required to enter the worlds lobby.');
		}

		let jwtPayload: IJwtPayload;
		try {
			jwtPayload = authService.verifyAccessToken(token);
		} catch (e: any) {
			console.error(`[WorldsRoom ${this.roomId}] Auth failed for ${client.sessionId}: Invalid access token.`, e.message);
			throw new ForbiddenError(e.message || 'Invalid access token.');
		}

		// Verify character ownership and existence
		const character = await characterService.getFullCharacterSheet(characterId); // Or a simpler fetch if full sheet not needed yet
		if (!character) {
			console.error(`[WorldsRoom ${this.roomId}] Auth failed for ${client.sessionId}: Character ${characterId} not found.`);
			throw new NotFoundError(`Character ${characterId} not found.`);
		}
		if (character.userId !== jwtPayload.userId) {
			console.error(`[WorldsRoom ${this.roomId}] Auth failed for ${client.sessionId}: Character ${characterId} does not belong to user ${jwtPayload.userId}.`);
			throw new ForbiddenError(`Character ${characterId} does not belong to the authenticated user.`);
		}

		const charSummary = await CharacterSummaryFromDbObject(character);
		if (!charSummary) {
			console.error(`[WorldsRoom ${this.roomId}] Auth failed for ${client.sessionId}: Character Summary for ${characterId} not found.`);
			throw new NotFoundError(`Character Summary for ${characterId} not found.`);
		}

		console.log(`[WorldsRoom ${this.roomId}] Client ${client.sessionId} authenticated for character ${character.name} (ID: ${character.id}).`);
		return {
			...jwtPayload,
			characterSummary: charSummary,
		};
	}

	async onJoin(client: Client, options: any, authData: IWorldsRoomAuthData) {
		console.log(`[WorldsRoom ${this.roomId}] Client ${client.sessionId} (Character: ${authData.characterSummary.id}) joined.`);

		this.state.characterSummary = authData.characterSummary;
		return this.fetchAvailableWorlds(client);
	}

	onLeave(client: Client, _consented: boolean) {
		console.log(`[WorldsRoom ${this.roomId}] Client ${client.sessionId} (Character: ${this.state.characterSummary.id}) left.`);
	}

	onDispose() {
		console.log(`[WorldsRoom ${this.roomId}] Room ${this.roomId} disposing.`);
	}

	async fetchAvailableWorlds(client: Client) {
		// Fetch and populate available worlds
		try {
			const worldsFromDb = await worldService.getAllWorlds({}, { isPrivate: false }, { name: 'asc' }, true); // Include counts
			const worldSummaries = worldsFromDb.map((w) => {
				const summary = new WorldSummary();
				summary.id = w.id;
				summary.name = w.name;
				return summary;
			});
			this.state.availableWorlds.clear(); // Clear before pushing new items
			worldSummaries.forEach((ws) => this.state.availableWorlds.push(ws));
		} catch (error: any) {
			console.dir(error);
			console.error(`[WorldsRoom ${this.roomId}] Failed to fetch worlds for ${client.sessionId}:`, error.message);
			networkService.sendError(client, new ServerError('Failed to load available worlds. Please try again.'));
		}
	}
}
