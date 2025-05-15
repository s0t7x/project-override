import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CharacterSummary } from '../schemas/CharacterSummary';
import { IWorldsRoomState } from '@project-override/shared/dist/states/WorldsRoomState';
import { WorldSummary } from '../schemas/WorldSummary';

export class WorldsRoomState extends Schema implements IWorldsRoomState {
	@type(CharacterSummary) characterSummary: CharacterSummary | any;
	@type({ array: WorldSummary }) availableWorlds: ArraySchema<WorldSummary> | any;
}
