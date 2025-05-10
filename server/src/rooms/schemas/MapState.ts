import { MapSchema, Schema, type } from "@colyseus/schema";
import { MapBlockState } from "./MapBlockState";

export class MapState extends Schema {
    @type("string") id: string = ""; // ID of the current map/scene
    @type("string") name: string = ""; // Name of the current map/scene
    @type({ map: MapBlockState }) blockData: MapSchema<MapBlockState> = new MapSchema<MapBlockState>();
}