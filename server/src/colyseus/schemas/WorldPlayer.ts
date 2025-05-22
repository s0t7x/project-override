import { type } from '@colyseus/schema';
import { IWorldPlayer } from '@project-override/shared/dist/core/WorldPlayer';
import { Vector3 } from './Vector3';
import { CharacterSummary } from './CharacterSummary';

export class WorldPlayer extends CharacterSummary implements IWorldPlayer {
	@type(Vector3) position: Vector3 | any;
	@type('number') rotation: number = 0;
}
