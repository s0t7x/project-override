import { Schema, type, ArraySchema, MapSchema } from '@colyseus/schema';
import { IGameRoomState } from '@project-override/shared/dist/states/GameRoomState';
import { WorldSummary } from '../schemas/WorldSummary';
import { WorldBlock } from '../schemas/WorldBlock';
import { WorldPlayer } from '../schemas/WorldPlayer';

export class GameRoomState extends Schema implements IGameRoomState {
	@type(WorldSummary) worldSummary: WorldSummary | any;
	@type({ array: WorldBlock }) worldBlocks: ArraySchema<WorldBlock> | any;
	@type({ map: WorldPlayer }) worldPlayers: MapSchema<WorldPlayer> | any;
	@type({ map: WorldPlayer }) playerSessions: MapSchema<String> | any;
	@type('string') worldEntities: any;
}
