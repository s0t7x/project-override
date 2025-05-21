import { Schema, type } from '@colyseus/schema';
import { IVector3 } from '@project-override/shared/dist/math/Vector3';

export class Vector3 extends Schema implements IVector3 {
	@type('number') x: number = 0;
	@type('number') y: number = 0;
	@type('number') z: number = 0;

	constructor(vectorOrX?: number | IVector3, y?: number, z?: number) {
		super();
		if (typeof vectorOrX === 'number' || !vectorOrX) {
			this.x = (vectorOrX as number) || 0;
			this.y = y || 0;
			this.z = z || 0;
		} else {
			this.x = vectorOrX.x || 0;
			this.y = vectorOrX.y || 0;
			this.z = vectorOrX.z || 0;
		}
	}
}
