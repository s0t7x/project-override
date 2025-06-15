// packages/po_server/src/rooms/GameRoom.ts
import { Room, Client, AuthContext } from 'colyseus';

// Services
import { authService } from '../../services/AuthService';
import { characterService } from '../../services/CharacterService'; // To verify character ownership
import { worldService } from '../../services/WorldService';
import { networkService } from '../../services/NetworkService';

// App Errors
import { ServerError, ForbiddenError, NotFoundError, ValidationError } from '@project-override/shared/dist/messages/ServerError';
import { IJwtPayload } from '@project-override/shared/dist/messages/Auth';
import { GameRoomState } from '../states/GameRoomState';
import { CharacterSummary, CharacterSummaryFromDbObject } from '../schemas/CharacterSummary';
import { WorldSummary } from '../schemas/WorldSummary';
import { ArraySchema, MapSchema } from '@colyseus/schema';
import { WorldPlayer } from '../schemas/WorldPlayer';
import { Vector3 } from '../schemas/Vector3';
import { WorldBlock } from '../schemas/WorldBlock';

interface IGameRoomAuthData extends IJwtPayload {
	characterSummary: CharacterSummary;
}

export class GameRoom extends Room<GameRoomState> {
	async onCreate(options: any) {
		if (!options.worldId) throw new ServerError('Missing worldId option');

		this.state = new GameRoomState();

		this.state.worldSummary = new WorldSummary();
		const dbWorld = await worldService.getWorldById(options.worldId);
		if (!dbWorld) throw new ServerError('World not found');
		this.state.worldSummary.id = dbWorld.id;
		this.state.worldSummary.name = dbWorld.name;

		this.state.worldBlocks = new ArraySchema<WorldBlock>();
		const dbBlocks = await worldService.getAllBlocksForWorld(options.worldId);
		for (const block of dbBlocks) {
			const worldBlock = new WorldBlock();
			worldBlock.position = new Vector3(block.x, block.y, block.z);
			worldBlock.type = block.blockType;
			worldBlock.rotation = block.rotation || 0;
			worldBlock.customData = block.customData;
			this.state.worldBlocks.push(worldBlock);
		}

		this.state.worldPlayers = new MapSchema<WorldPlayer>();
		this.state.playerSessions = new MapSchema<String>();

		// Fallback for unhandled messages
		this.onMessage('*', (client, type: any, message) => {
			if (typeof type === 'object' && message === undefined) {
				// Handle cases where Colyseus might pass message as type
				message = type;
				type = (message as any)?.type || 'UNKNOWN'; // Try to get a type from the message object itself
			}
			type = String(type); // Ensure type is a string
			console.warn(`[GameRoom ${this.roomId}] Received unhandled message type "${type}" from ${client.sessionId}:`, message);
			networkService.sendError(client, new ServerError(`Message type "${type}" not recognized in GameRoom.`, 400));
		});

		console.log(`[GameRoom ${this.roomId}] Room created.`);
	}

	async onAuth(client: Client, options: { characterId?: string, token?: string }, context: AuthContext): Promise<IGameRoomAuthData> {
		const token = context?.token || options?.token || undefined;
		const characterId = options?.characterId;

		if (!token) {
			console.error(`[GameRoom ${this.roomId}] Auth failed for ${client.sessionId}: No access token provided.`);
			throw new ForbiddenError('Access token is required.');
		}
		if (!characterId) {
			console.error(`[GameRoom ${this.roomId}] Auth failed for ${client.sessionId}: No characterId provided in options.`);
			throw new ValidationError('Character ID is required to enter the worlds lobby.');
		}

		let jwtPayload: IJwtPayload;
		try {
			jwtPayload = authService.verifyAccessToken(token);
		} catch (e: any) {
			console.error(`[GameRoom ${this.roomId}] Auth failed for ${client.sessionId}: Invalid access token.`, e.message);
			throw new ForbiddenError(e.message || 'Invalid access token.');
		}

		// Verify character ownership and existence
		const character = await characterService.getFullCharacterSheet(characterId); // Or a simpler fetch if full sheet not needed yet
		if (!character) {
			console.error(`[GameRoom ${this.roomId}] Auth failed for ${client.sessionId}: Character ${characterId} not found.`);
			throw new NotFoundError(`Character ${characterId} not found.`);
		}
		if (character.userId !== jwtPayload.userId) {
			console.error(`[GameRoom ${this.roomId}] Auth failed for ${client.sessionId}: Character ${characterId} does not belong to user ${jwtPayload.userId}.`);
			throw new ForbiddenError(`Character ${characterId} does not belong to the authenticated user.`);
		}

		const charSummary = await CharacterSummaryFromDbObject(character);
		if (!charSummary) {
			console.error(`[GameRoom ${this.roomId}] Auth failed for ${client.sessionId}: Character Summary for ${characterId} not found.`);
			throw new NotFoundError(`Character Summary for ${characterId} not found.`);
		}

		console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} authenticated for character ${character.name} (ID: ${character.id}).`);
		return {
			...jwtPayload,
			characterSummary: charSummary,
		};
	}

	async onJoin(client: Client, options: any, authData: IGameRoomAuthData) {
		const player = new WorldPlayer();
		player.assign(authData.characterSummary);
		player.position = new Vector3(0, 0, 0);
		player.rotation = 0;

		this.state.playerSessions.set(client.sessionId, player.id);
		this.state.worldPlayers.set(player.id, player);

		console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} (Character: ${authData.characterSummary.id}) joined.`);
	}

	onLeave(client: Client, _consented: boolean) {
		const playerId = this.state.playerSessions.get(client.sessionId);
		if (!playerId) return;

		this.state.worldPlayers.delete(playerId);
		this.state.playerSessions.delete(client.sessionId);

		// persist player character

		console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} (Character: ${playerId}) left.`);
	}

	onDispose() {
		console.log(`[GameRoom ${this.roomId}] Room ${this.roomId} disposing.`);

		// persist state entities to db

		// persist world blocks
	}
}
