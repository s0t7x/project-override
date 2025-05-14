import { ServerErrorMessageType } from 'messages/ServerError';
import { AuthMessageType } from './Auth';
import { CharacterMessageType } from './Character';

export type IMessageType =
  | 'generic'
  | ServerErrorMessageType
  | AuthMessageType
  | CharacterMessageType;

export type IMessage = {
  type: IMessageType;
};
