import { ArraySchema, Schema, type } from '@colyseus/schema';
import { ICharacterSummary } from '@project-override/shared/dist/game/CharacterSummary';
import { CharacterAppearance } from './CharacterAppearance';
import { EquipmentVisual } from './EquipmentVisual';
import { equipmentEntityRepository } from '../../db/repos/EquipmentEntityRepository';
import { entityRepository } from '../../db/repos/EntityRepository';
import { EntityComponentsTypeEnum, IEntityComponents } from '@project-override/shared/dist/components/EntityComponents';
import { IEquipmentComponent } from '@project-override/shared/dist/components/EquipmentComponent';
import { Color3 } from './Color3';

export class CharacterSummary extends Schema implements ICharacterSummary {
	@type('string') userId: string = '';
	@type('string') id: string = '';
	@type('string') name: string = '';
	@type('number') level: number = 0;
	@type('number') lastPlayed: number = 0;
	@type('boolean') isOnline: boolean = false;
	@type(CharacterAppearance) appearance: CharacterAppearance = new CharacterAppearance();
	@type({ array: EquipmentVisual }) equipmentVisuals: ArraySchema<EquipmentVisual> = new ArraySchema<EquipmentVisual>();
}

export async function CharacterSummaryFromDbObject(character: any) {
	const that = new CharacterSummary();
	that.userId = character.userId || that.userId;
	that.id = character.id || that.id;
	that.name = character.name || that.name;
	that.level = character.level || that.level;
	that.lastPlayed = Math.floor(Date.parse(character.lastPlayedAt?.toString()) / 1000) || that.lastPlayed;
	try {
		const appearance = new CharacterAppearance();
		appearance.assign({
			bodyIdx: character.appearance?.bodyIdx || that.appearance.bodyIdx,
			bodyColor: new Color3(character.appearance?.bodyColor || that.appearance.bodyColor),
			beardIdx: character.appearance?.beardIdx || that.appearance.beardIdx,
			beardColor: new Color3(character.appearance?.beardColor || that.appearance.beardColor),
			hairBackIdx: character.appearance?.hairBackIdx || that.appearance.hairBackIdx,
			hairBackColor: new Color3(character.appearance?.hairBackColor || that.appearance.hairBackColor),
			hairIdx: character.appearance?.hairIdx || that.appearance.hairIdx,
			hairColor: new Color3(character.appearance?.hairColor || that.appearance.hairColor),
			hairFrontIdx: character.appearance?.hairFrontIdx || that.appearance.hairFrontIdx,
			hairFrontColor: new Color3(character.appearance?.hairFrontColor || that.appearance.hairFrontColor),
			eyesIdx: character.appearance?.eyesIdx || that.appearance.eyesIdx,
			eyesColor: new Color3(character.appearance?.eyesColor || that.appearance.eyesColor),
		});
		that.appearance = appearance;

		that.equipmentVisuals = new ArraySchema<EquipmentVisual>();
		const equipment = await equipmentEntityRepository.findByCharacterId(that.id);
		for (const equipmentEntityRelation of equipment) {
			if (!equipmentEntityRelation.entityId || !equipmentEntityRelation.isActive) continue;
			const entity = await entityRepository.findById(equipmentEntityRelation.entityId);
			if (!entity) continue;
			const equipmentComponent = (entity.components as unknown as IEntityComponents)?.get(EntityComponentsTypeEnum.equipment) as IEquipmentComponent;
			if (!equipmentComponent) continue;
			const equipmentVisual = new EquipmentVisual();
			equipmentVisual.assign({
				slot: equipmentComponent.slot,
				textureURL: equipmentComponent.textureURL,
				color: new Color3(equipmentComponent.color),
				alpha: equipmentComponent.alpha,
				brightness: equipmentComponent.brightness,
				hueShift: equipmentComponent.hueShift,
				saturation: equipmentComponent.saturation,
			});
			that.equipmentVisuals.push(equipmentVisual);
		}
		return that;
	} catch (error) {
		console.log(error);
		return null;
	}
}
