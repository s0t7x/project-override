import { time } from 'console';
import { IMessage } from 'messages/Messages';

export const AuthMessageTypeEnum = {
	AuthLoginRequest: 'Auth.LoginRequest',
	AuthLoginResponse: 'Auth.LoginResponse',
	AuthRegisterRequest: 'Auth.RegisterRequest',
	AuthRegisterResponse: 'Auth.RegisterResponse',
	AuthRefreshRequest: 'Auth.RefreshRequest',
	AuthRefreshResponse: 'Auth.RefreshResponse',
} as const;

export type AuthMessageType = (typeof AuthMessageTypeEnum)[keyof typeof AuthMessageTypeEnum];

export class AuthLoginRequest implements IMessage {
	public readonly type: AuthMessageType = AuthMessageTypeEnum.AuthLoginRequest;
	public readonly username: string;
	public readonly password: string;

	constructor(username: string, password: string) {
		this.username = username;
		this.password = password;
	}
}

export class AuthLoginResponse implements IMessage, IAuthTokens {
	public readonly type: AuthMessageType = 'Auth.LoginResponse';
	public readonly accessToken: string;
	public readonly refreshToken: string;

	constructor(tokens: IAuthTokens) {
		this.accessToken = tokens.accessToken;
		this.refreshToken = tokens.refreshToken;
	}
}

export class AuthRegisterRequest implements IMessage {
	public readonly type: AuthMessageType = AuthMessageTypeEnum.AuthRegisterRequest;
	public readonly username: string;
	public readonly password: string;

	constructor(username: string, password: string) {
		this.username = username;
		this.password = password;
	}
}

export class AuthRegisterResponse implements IMessage {
	public readonly type: AuthMessageType = AuthMessageTypeEnum.AuthRegisterResponse;
}

export class AuthRefreshRequest implements IMessage {
	public readonly type: AuthMessageType = AuthMessageTypeEnum.AuthRefreshRequest;
	public readonly token: string;

	constructor(token: string) {
		this.token = token;
	}
}

export class AuthRefreshResponse implements IMessage, IAuthTokens {
	public readonly type: AuthMessageType = AuthMessageTypeEnum.AuthRefreshResponse;
	public readonly accessToken: string;
	public readonly refreshToken: string;

	constructor(tokens: IAuthTokens) {
		this.accessToken = tokens.accessToken;
		this.refreshToken = tokens.refreshToken;
	}
}

export interface IJwtPayload {
	userId: string;
	username: string;
	role: string;
}

export interface IAuthTokens {
	accessToken: string;
	refreshToken: string;
}
