import { Schema, type } from "@colyseus/schema";

export class MapBlockState extends Schema {
    @type("string") type: string = ""
}