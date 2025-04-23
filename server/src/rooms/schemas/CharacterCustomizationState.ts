import { Schema, type } from "@colyseus/schema";
import { ICharacterCustomization, ICharacterSummary, IColor3, IVector3 } from "@shared/types";
import { Color3Schema } from "./Color3Schema";

// Represents the limited data needed for one character in the selection list
export class CharacterCustomizationState extends Schema implements ICharacterCustomization {
    @type("string") baseSpriteSheet: string = "/assets/sprites/char_test.png";
    @type(Color3Schema) baseColor = new Color3Schema();
    @type("string") eyesSpriteSheet: string = "";
    @type(Color3Schema) eyesColor = new Color3Schema();
    @type("string") hairSpriteSheet: string = "";
    @type(Color3Schema) hairColor = new Color3Schema();
}