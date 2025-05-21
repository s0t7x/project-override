import { Schema, type } from '@colyseus/schema';
import { IWorldSummary } from '@project-override/shared/dist/core/WorldSummary';

export class WorldSummary extends Schema implements IWorldSummary {
	@type('string') id: string = '';
	@type('string') name: string = '';
}
