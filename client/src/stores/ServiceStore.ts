import { create } from 'zustand';
import { NetworkService } from '@/services/NetworkService';
import { BgmService } from '@/services/BgmService';
import { InputService } from '@/services/InputService';
import { AssetService } from '@/services/AssetService';
import { LocalStorageService } from '@/services/LocalStorageService';

export interface IServiceStore {
    networkService: NetworkService | null;
    bgmService: BgmService | null;
    inputService: InputService | null;
    assetService: AssetService | null;
    localStorageService: LocalStorageService | null;
}

export const useServiceStore = create<IServiceStore>((set: (state: Partial<IServiceStore>) => void) => ({
    networkService: null,
    bgmService: null,
    inputService: null,
    assetService: null,
    localStorageService: null,
}));
