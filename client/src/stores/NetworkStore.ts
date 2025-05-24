import { create } from 'zustand';
import { ICharactersRoomState } from '@project-override/shared/dist/states/CharactersRoomState'
import { IWorldsRoomState } from '@project-override/shared/dist/states/WorldsRoomState'
import { IGameRoomState } from '@project-override/shared/dist/states/GameRoomState'
import { IUnused } from '@project-override/shared/dist/states/Unused'
import { NetworkService } from '@/services/NetworkService';


export type RoomState = ICharactersRoomState | IWorldsRoomState | IWorldsRoomState | IGameRoomState | IUnused | null;

export interface INetworkStore {
    networkService: NetworkService | null;
    primaryRoomState: RoomState;
}

export const useNetworkStore = create<INetworkStore>((set: (state: Partial<INetworkStore>) => void) => ({
    networkService: null,
    primaryRoomState: null
}));
