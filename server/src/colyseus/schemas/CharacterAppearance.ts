import { Schema, type } from '@colyseus/schema';
import { ICharacterAppearance } from '@project-override/shared/dist/core/CharacterAppearance';
import { Color3 } from './Color3';

export class CharacterAppearance extends Schema implements ICharacterAppearance {
  @type('number') hairIdx: number = 0;
  @type(Color3) hairColor?: Color3 = new Color3(0, 0, 0);
  @type('number') hairBackIdx: number = 0;
  @type(Color3) hairBackColor?: Color3 = new Color3(0, 0, 0);
  @type('number') hairFrontIdx: number = 0;
  @type(Color3) hairFrontColor?: Color3 = new Color3(0, 0, 0);
  @type('number') beardIdx: number = 0;
  @type(Color3) beardColor?: Color3 = new Color3(0, 0, 0);
  @type('number') bodyIdx: number = 0;
  @type(Color3) bodyColor?: Color3 = new Color3(0, 0, 0);
  @type('number') eyesIdx: number = 0;
  @type(Color3) eyesColor?: Color3 = new Color3(0, 0, 0);
}
