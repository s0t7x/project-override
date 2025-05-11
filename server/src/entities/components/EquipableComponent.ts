import { Component } from "../core/Component";
import { Entity } from "../core/Entity";
import { GameRoom } from "../../rooms/GameRoom"; // Room reference might be needed for interpolation triggers etc.
import { IVector2, IVector3, IQuaternion, ICharacterEquipment, ICharacterCustomization } from "@shared/types"; // Use shared types
import { SpriteComponent } from "./SpriteComponent";
import { CharacterCustomizationState } from "../../rooms/schemas/CharacterCustomizationState";


export class EquipableComponent extends Component {
    // Requirements
    public requiredCharacterLevel?: number;
    public requiredCharacterBase?: string;

    // Stat changes, buffs etc.
    // ...

    update(deltaTime: number, room: GameRoom): void {

    }
}