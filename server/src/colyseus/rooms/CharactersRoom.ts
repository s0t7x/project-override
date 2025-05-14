import { Room, Client, Server, AuthContext } from 'colyseus';
import { UnusedState } from '../states/UnusedState';
import { ServerError, ValidationError } from '@project-override/shared/dist/messages/ServerError';
import { networkService } from '../../services/NetworkService';
import {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthMessageTypeEnum,
  AuthRegisterRequest,
  AuthRegisterResponse,
  IJwtPayload,
} from '@project-override/shared/dist/messages/Auth';
import { authService } from '../../services/AuthService';
import { userService } from '../../services/UserService';
import { CharactersRoomState } from '../states/CharactersRoomState';
import { characterService } from '../../services/CharacterService';
import { characterRepository } from '../../db/repos/CharacterRepository';
import { ArraySchema, MapSchema } from '@colyseus/schema';
import { CharacterSummary, CharacterSummaryFromDbObject } from '../schemas/CharacterSummary';
import {
  CharacterCreateRequest,
  CharacterCreateResponse,
  CharacterDeleteRequest,
  CharacterDeleteResponse,
  CharacterMessageTypeEnum,
} from '@project-override/shared/dist/messages/Character';
import { CharacterAppearance } from '../schemas/CharacterAppearance';

export class CharactersRoom extends Room<CharactersRoomState> {
  maxClients: number = 1;

  onCreate(options: any) {
    console.log(`[CharactersRoom ${this.roomId}] Room created.`);
    this.state = new CharactersRoomState();

    this.onMessage(
      CharacterMessageTypeEnum.CharacterCreateRequest,
      async (client, message: CharacterCreateRequest) => {
        if (!client.auth) return;
        const authData = client.auth as IJwtPayload;
        try {
          const appearance = new CharacterAppearance();
          appearance.assign(message.appearance as any);
          const char = await characterService.createCharacter(authData.userId, {
            name: message.name,
            appearance: appearance,
          });
          const charSummary = await CharacterSummaryFromDbObject(char);
          if (!charSummary) throw new ServerError("Can't get Character Summary");
          this.state.characterSummaries.push(charSummary);
          console.log(
            `[CharactersRoom ${this.roomId}] Client ${client.sessionId} created Character "${char.name}" - ${char.id}.`,
          );
          networkService.sendMessage(client, new CharacterCreateResponse(char.id));
        } catch (error: Error | any) {
          networkService.sendError(
            client,
            error instanceof ServerError ? error : new ServerError(error.message),
          );
        }
      },
    );

    this.onMessage(
      CharacterMessageTypeEnum.CharacterDeleteRequest,
      async (client, message: CharacterDeleteRequest) => {
        if (!client.auth) return;
        const authData = client.auth as IJwtPayload;
        try {
          const char = await characterService.deleteCharacter(authData.userId, message.characterId);
          this.state.characterSummaries.splice(
            this.state.characterSummaries.findIndex((cm) => cm.id == message.characterId),
            1
          );
          networkService.sendMessage(client, new CharacterDeleteResponse());
          console.log(
            `[CharactersRoom ${this.roomId}] Client ${client.sessionId} deleted Character "${char.name}" - ${char.id}.`,
          );
        } catch (error: Error | any) {
          networkService.sendError(
            client,
            error instanceof ServerError ? error : new ServerError(error.message),
          );
        }
      },
    );

    // Fallback
    this.onMessage('*', (client, type: any, message) => {
      if (typeof type == 'object') {
        message = type;
        type = undefined;
      }
      console.log(
        `[CharactersRoom ${this.roomId}] Received message type "${type}" from ${client.sessionId}:`,
        message,
      );
      networkService.sendError(client, new ServerError(`Message type "${type}" not recognized`));
    });
  }

  onAuth(client: Client<any, any>, options: any, context: AuthContext) {
    const { token } = context;
    if (!token) {
      console.error(
        `[CharactersRoom ${this.roomId}] Client ${client.sessionId} failed authentication: no access token provided.`,
      );
      throw new ValidationError('Access token is required.');
    }
    const jwtPayload = authService.verifyAccessToken(token);
    console.log(
      `[CharactersRoom ${this.roomId}] Client ${client.sessionId} authenticated with user ID ${jwtPayload.userId}.`,
    );
    return { ...jwtPayload } as IJwtPayload;
  }

  async onJoin(client: Client, options?: any, authData?: IJwtPayload) {
    if (!authData) return false;
    const user = await userService.getUserById(authData.userId);
    const characters = await characterRepository.findByUserId(authData.userId);
    this.state.characterSummaries = new ArraySchema<CharacterSummary>();
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const charSummary = await CharacterSummaryFromDbObject(char);
      if (!charSummary) continue;
      this.state.characterSummaries.push(charSummary);
    }
    this.state.maxCharacterCount = user?.maxCharacters || 0;
    console.log(`[CharactersRoom ${this.roomId}] Client ${client.sessionId} joined.`);
  }

  onLeave(client: Client, consented?: boolean) {
    console.log(`[CharactersRoom ${this.roomId}] Client ${client.sessionId} left.`);
  }

  onDispose() {
    console.log(`[CharactersRoom ${this.roomId}] Room ${this.roomId} disposing.`);
  }
}
