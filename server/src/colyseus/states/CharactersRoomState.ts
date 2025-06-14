import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CharacterSummary } from '../schemas/CharacterSummary';
import { ICharactersRoomState } from '@project-override/shared/dist/states/CharactersRoomState';

export class CharactersRoomState extends Schema implements ICharactersRoomState {
	@type({ array: CharacterSummary }) characterSummaries = new ArraySchema<CharacterSummary>();
	@type('string') lastPlayedCharacterId: string = '';
	@type('number') maxCharacterCount: number = 0;
}
