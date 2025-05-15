import { ICharacterAppearance } from 'core/CharacterAppearance';
import { IEquipmentVisual } from './EquipmentVisual';

export interface ICharacterSummary {
	userId: string;
	id: string;
	name: string;
	level: number;
	appearance: ICharacterAppearance;
	equipmentVisuals: IEquipmentVisual[] | any;
	lastPlayed: number;
	isOnline: boolean;
	isDeleted: boolean;
	deletedAt: number;
}
