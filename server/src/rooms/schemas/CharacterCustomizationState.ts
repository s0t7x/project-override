import { Schema, type } from "@colyseus/schema";
import { ICharacterCustomization, ICharacterSummary } from "@shared/types";

// Represents the limited data needed for one character in the selection list
export class CharacterCustomizationState extends Schema implements ICharacterCustomization {
    @type("string") baseSpriteSheet: string = "/assets/sprites/char_test.png";
    @type("int32") baseHue: number = 0;
    @type("string") eyesSpriteSheet: string = "";
    @type("int32") eyesHue: number = 0;
    @type("string") hairSpriteSheet: string = "";
    @type("int32") hairHue: number = 0;
}