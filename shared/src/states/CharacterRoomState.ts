import { ICharacterSummary } from '../core/CharacterSummary';

export interface ICharactersRoomState {
	characterSummaries: ICharacterSummary[] | any;
	lastPlayedCharacterId: string;
	maxCharacterCount: number;
}
