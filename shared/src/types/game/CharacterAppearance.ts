import { IVector3 } from "types/math/Vector3";

export interface ICharacterAppearance {
    hairIdx: number;
    hairColor?: IVector3;
    hairBackIdx: number;
    hairBackColor?: IVector3;
    hairFrontIdx: number;
    hairFrontColor?: IVector3;
    beardIdx: number;
    beardColor?: IVector3;
    bodyIdx: number;
    bodyColor?: IVector3;
    eyesIdx: number;
    eyesColor?: IVector3;
}