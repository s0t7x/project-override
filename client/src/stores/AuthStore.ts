import { create } from 'zustand';
import { IAuthTokens, IJwtPayload } from '@project-override/shared/dist/messages/Auth'

export interface IAuthStore {
    isAuthenticated: Boolean;
    authTokens: IAuthTokens | null;
    payload: IJwtPayload | null;
}

export const useAuthStore = create<IAuthStore>((_set: (state: Partial<IAuthStore>) => void) => ({
    isAuthenticated: false,
    authTokens: null,
    payload: null
}));
