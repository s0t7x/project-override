import { Schema, type } from "@colyseus/schema";
import { ICharacterCustomization, ICharacterEquipment, ICharacterSummary, IColor3, IVector3 } from "@shared/types";
import { Color3Schema } from "./Color3Schema";

// Represents the limited data needed for one character in the selection list
export class CharacterEquipmentState extends Schema implements ICharacterEquipment {
    @type("string") bodyItemId: string = "";
    @type("string") legsItemId: string = "";
    @type("string") hatItemId: string = "";
}