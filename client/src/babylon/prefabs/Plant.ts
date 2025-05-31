import { Scene } from "@babylonjs/core";
import * as BABYLON from "@babylonjs/core";
import { SpriteSheetPlane } from "./SpriteSheetPlane";

export class Plant extends SpriteSheetPlane {
    constructor(name: string, scene: Scene, position: BABYLON.Vector3) {
        super('plant_' + name + (Math.random() * 1000), scene,position);
        this.billboard = true;
    }
}