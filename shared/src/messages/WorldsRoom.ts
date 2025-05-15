import { IMessage } from 'messages/Messages';

export const WorldsRoomMessageTypeEnum = {
	WorldsRoomRefresh: 'WorldsRoom.RefreshRequest',
} as const;

export type WorldsRoomMessageType = (typeof WorldsRoomMessageTypeEnum)[keyof typeof WorldsRoomMessageTypeEnum];

export class WorldsRoomRefreshRequest implements IMessage {
	public readonly type: WorldsRoomMessageType = WorldsRoomMessageTypeEnum.WorldsRoomRefresh;
}
