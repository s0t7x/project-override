import { Component } from "../core/Component";
import { Entity } from "../core/Entity";
import { GameRoom } from "../../rooms/GameRoom"; // Room reference might be needed for interpolation triggers etc.
import { IVector2, IVector3, IQuaternion, IColor3 } from "@shared/types"; // Use shared types

export class SpriteComponent extends Component {
    public textureURI:  string;
    public hueShift:    number     = 0;
    public colorize:    IColor3    = { r: 0, g: 0, b: 0 }
    public scale:       IVector2   = { x: 1, y: 1 };
    public grounded:    boolean    = false;

    update(deltaTime: number, room: GameRoom): void {

    }
}