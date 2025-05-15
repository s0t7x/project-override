import { ICharacterAppearance } from 'core/CharacterAppearance';
import { IMessage } from 'messages/Messages';

export const CharacterMessageTypeEnum = {
	CharacterCreateRequest: 'Character.CreateRequest',
	CharacterCreateResponse: 'Character.CreateResponse',
	CharacterDeleteRequest: 'Character.DeleteRequest',
	CharacterDeleteResponse: 'Character.DeleteResponse',
} as const;

export type CharacterMessageType = (typeof CharacterMessageTypeEnum)[keyof typeof CharacterMessageTypeEnum];

export class CharacterCreateRequest implements IMessage {
	public readonly type: CharacterMessageType = CharacterMessageTypeEnum.CharacterCreateRequest;
	public readonly name: string;
	public readonly appearance: ICharacterAppearance;

	constructor(name: string, appearance: ICharacterAppearance) {
		this.name = name;
		this.appearance = appearance;
	}
}

export class CharacterCreateResponse implements IMessage {
	public readonly type: CharacterMessageType = CharacterMessageTypeEnum.CharacterCreateResponse;
	public readonly characterId: string;
	constructor(characterId: string) {
		this.characterId = characterId;
	}
}

export class CharacterDeleteRequest implements IMessage {
	public readonly type: CharacterMessageType = CharacterMessageTypeEnum.CharacterDeleteRequest;
	public readonly characterId: string;
	constructor(characterId: string) {
		this.characterId = characterId;
	}
}

export class CharacterDeleteResponse implements IMessage {
	public readonly type: CharacterMessageType = CharacterMessageTypeEnum.CharacterDeleteResponse;
}
