import { Schema, type } from '@colyseus/schema';

export class WorldSummary extends Schema {
	@type('string') id: string = '';
	@type('string') name: string = '';
}
