import { IColor3 } from 'math/Color3';

export interface ICharacterAppearance {
	hairIdx: number;
	hairColor?: IColor3;
	hairBackIdx: number;
	hairBackColor?: IColor3;
	hairFrontIdx: number;
	hairFrontColor?: IColor3;
	beardIdx: number;
	beardColor?: IColor3;
	bodyIdx: number;
	bodyColor?: IColor3;
	eyesIdx: number;
	eyesColor?: IColor3;
}
