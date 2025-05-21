import { ICharacterSummary } from './CharacterSummary';
import { IVector3 } from 'math/Vector3';

export interface IWorldPlayer extends ICharacterSummary {
	position: IVector3;
	rotation: number;
}
