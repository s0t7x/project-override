import { Schema, type } from '@colyseus/schema';
import { IColor3 } from '@project-override/shared/math/Color3';

export class Color3 extends Schema implements IColor3 {
	@type('number') r: number = 0;
	@type('number') g: number = 0;
	@type('number') b: number = 0;

	constructor(colorOrR?: number | IColor3, g?: number, b?: number) {
		super();
		if (typeof colorOrR == 'number' || !colorOrR) {
			this.r = (colorOrR as number) || 0;
			this.g = g || 0;
			this.b = b || 0;
		} else {
			this.r = colorOrR.r || 0;
			this.g = colorOrR.g || 0;
			this.b = colorOrR.b || 0;
		}
	}
}
