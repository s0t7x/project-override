import { Schema, type } from "@colyseus/schema";
import { ICharacterSummary } from "@shared/types";
import { CharacterCustomizationState } from "./CharacterCustomizationState";
import { CharacterEquipmentVisualsState } from "./CharacterEquipmentVisualsState";

// Represents the limited data needed for one character in the selection list
export class CharacterSummaryState extends Schema implements ICharacterSummary {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("int32") level: number = 1;

    @type(CharacterCustomizationState) customization: CharacterCustomizationState;
    @type(CharacterEquipmentVisualsState) equipmentVisuals: CharacterEquipmentVisualsState;
}