// Schema defining the state for WorldLobbyRoom (e.g., MapSchema<RoomListingSchema> mapping room instance ID to details like name, owner, player count).
import { MapSchema, Schema, type } from "@colyseus/schema";
import { ICharacterSummary, IRoomListing, IWorldLobbyState } from "@shared/types";
import { RoomListingState } from "./RoomListingState";
import { CharacterSummaryState } from "./CharacterSummaryState";

export class WorldLobbyState extends Schema {
    @type({ map: RoomListingState }) publicRooms = new MapSchema<RoomListingState>();
    @type({ map: RoomListingState }) playerRooms = new MapSchema<RoomListingState>();

    @type(CharacterSummaryState) characterSummary: CharacterSummaryState;
}