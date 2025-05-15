import { IWorldSummary } from 'core/WorldSummary';
import { ICharacterSummary } from '../core/CharacterSummary';

export interface IWorldsRoomState {
	characterSummary: ICharacterSummary | any;
	availableWorlds: IWorldSummary[] | any;
}
