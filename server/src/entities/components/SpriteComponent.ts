import { Component } from "@/entities/core/Component";
import { Entity } from "@/entities/core/Entity";
import { GameRoom } from "@/rooms/GameRoom"; // Room reference might be needed for interpolation triggers etc.
import { IVector2, IVector3, IQuaternion } from "@shared/types"; // Use shared types

export class SpriteComponent extends Component {
    public textureURI: string;
    public scale: IVector2;
    public grounded: boolean;

    update(deltaTime: number, room: GameRoom): void {

    }
}