import { Component } from "@/entities/core/Component";
import { Entity } from "@/entities/core/Entity";
import { GameRoom } from "@/rooms/GameRoom"; // Room reference might be needed for interpolation triggers etc.
import { IVector2, IVector3, IQuaternion } from "@shared/types"; // Use shared types
import { SpriteComponent } from "./SpriteComponent";
import { CharacterCustomizationState } from "@/rooms/schemas/CharacterCustomizationState";


export class CharacterComponent extends Component {
    public customization: CharacterCustomizationState;
    public lookAtDirection: string = 'DOWN';

    update(deltaTime: number, room: GameRoom): void {

    }
}