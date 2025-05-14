import { IEquipmentSlot } from './EquipmentSlot';
import { IColor3 } from 'math/Color3';

export interface IEquipmentVisual {
  slot: IEquipmentSlot;
  textureURL: string;
  color: IColor3;
  hueShift: number;
  saturation: number;
  brightness: number;
  alpha: number;
}
