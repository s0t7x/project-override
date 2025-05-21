import { IWorldSummary } from '../core/WorldSummary';
import { IWorldBlock } from '../core/WorldBlock';
import { IWorldPlayer } from '../core/WorldPlayer';

export interface IGameRoomState {
	worldSummary: IWorldSummary | any;
	worldBlocks: IWorldBlock[] | any;
	worldPlayers: { [key: string]: IWorldPlayer } | any;
	worldEntities: any;
	playerSessions: { [key: string]: string } | any;
}
