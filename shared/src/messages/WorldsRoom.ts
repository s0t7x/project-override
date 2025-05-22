import { IMessage } from 'messages/Messages';

export const WorldsRoomMessageTypeEnum = {
	WorldsRoomRefreshRequest: 'WorldsRoom.RefreshRequest',
	WorldsRoomRefreshResponse: 'WorldsRoom.RefreshResponse',
} as const;

export type WorldsRoomMessageType = (typeof WorldsRoomMessageTypeEnum)[keyof typeof WorldsRoomMessageTypeEnum];

export class WorldsRoomRefreshRequest implements IMessage {
	public readonly type: WorldsRoomMessageType = WorldsRoomMessageTypeEnum.WorldsRoomRefreshRequest;
}

export class WorldsRoomRefreshResponse implements IMessage {
	public readonly type: WorldsRoomMessageType = WorldsRoomMessageTypeEnum.WorldsRoomRefreshResponse;
}
