import { Schema, type } from '@colyseus/schema';
import { Color3 } from './Color3';
import { IEquipmentVisual } from '@project-override/shared/dist/core/EquipmentVisual';
import { IEquipmentSlot } from '@project-override/shared/dist/core/EquipmentSlot';

export class EquipmentVisual extends Schema implements IEquipmentVisual {
  @type('string') slot: IEquipmentSlot = 'chest';
  @type('string') textureURL: string = '';
  @type(Color3) color: Color3 = new Color3(0, 0, 0);
  @type('number') hueShift: number = 0;
  @type('number') saturation: number = 0;
  @type('number') brightness: number = 0;
  @type('number') alpha: number = 1;
}
