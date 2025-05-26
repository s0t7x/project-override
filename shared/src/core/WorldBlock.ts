import { IVector3 } from 'math/Vector3';

export interface IWorldBlock {
	position: IVector3;
	type: string;
	rotation: number;
	customData?: any;
	explode?: IVector3;
}
