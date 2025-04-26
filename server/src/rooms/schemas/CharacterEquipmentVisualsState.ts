import { Schema, type } from "@colyseus/schema";
import { ICharacterCustomization, ICharacterEquipment, ICharacterEquipmentVisuals, ICharacterSummary, IColor3, IVector3 } from "@shared/types";
import { Color3Schema } from "./Color3Schema";

// Represents the limited data needed for one character in the selection list
export class CharacterEquipmentVisualsState extends Schema implements ICharacterEquipmentVisuals {
    @type("string") bodySpriteSheet: string = "";
    @type(Color3Schema) bodyColor = new Color3Schema();
    @type("string") legsSpriteSheet: string = "";
    @type(Color3Schema) legsColor = new Color3Schema();
    @type("string") hatSpriteSheet: string = "";
    @type(Color3Schema) hatColor = new Color3Schema();
}