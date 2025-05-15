import { ServerErrorMessageType } from 'messages/ServerError';
import { AuthMessageType } from './Auth';
import { CharacterMessageType } from './Character';
import { WorldsRoomMessageType } from './WorldsRoom';

export type IMessageType = 'generic' | ServerErrorMessageType | AuthMessageType | CharacterMessageType | WorldsRoomMessageType;

export type IMessage = {
	type: IMessageType;
};
