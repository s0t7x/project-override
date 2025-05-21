import { Schema, type } from '@colyseus/schema';
import { IWorldBlock } from '@project-override/shared/dist/core/WorldBlock';
import { Vector3 } from './Vector3';

export class WorldBlock extends Schema implements IWorldBlock {
	@type(Vector3) position: Vector3 | any;
	@type('string') type: string = '';
	@type('number') rotation: number = 0;
	@type('string') customData: any;
}
