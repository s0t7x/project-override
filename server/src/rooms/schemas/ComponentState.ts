import { Schema, type } from "@colyseus/schema";

export class ComponentState extends Schema {
    @type("string") serializedStateJSON: string = ""
}