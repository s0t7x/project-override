import { Schema, type } from "@colyseus/schema";

export class EntryRoomState extends Schema {
    @type("string") mapDataJson: string | null = null;
}