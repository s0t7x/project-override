import { time } from 'console';
import { IMessage } from 'messages/Messages';

export interface IServerErrorMessage extends IMessage {
	statusCode: number;
	message: string;
	timestamp: string;
	stack?: string;
	errors?: Record<string, string[]>;
}

export const ServerErrorMessageTypeEnum = {
	ServerError: 'Error.ServerError',
	NotFoundError: 'Error.NotFoundError',
	ForbiddenError: 'Error.ForbiddenError',
	BusinessRuleError: 'Error.BusinessRuleError',
	ValidationError: 'Error.ValidationError',
	InternalServerError: 'Error.InternalServerError',
} as const;

export type ServerErrorMessageType = (typeof ServerErrorMessageTypeEnum)[keyof typeof ServerErrorMessageTypeEnum];

export class ServerError extends Error implements IServerErrorMessage {
	public readonly type: ServerErrorMessageType;
	public readonly message: string;
	public readonly statusCode: number;
	public readonly stack?: string;
	public readonly errors?: Record<string, string[]>;
	public readonly timestamp: string;

	constructor(message: string, statusCode: number = 500) {
		super(message);
		this.message = message;
		this.type = ServerErrorMessageTypeEnum.InternalServerError;
		this.statusCode = statusCode;
		Error.captureStackTrace(this, this.constructor);
		this.timestamp = new Date().toISOString();
	}
}

export class NotFoundError extends ServerError {
	constructor(message: string = 'Resource not found') {
		super(message, 404);
	}
}

export class ForbiddenError extends ServerError {
	constructor(message: string = 'Access forbidden') {
		super(message, 403);
	}
}

export class BusinessRuleError extends ServerError {
	// Could be a 400 Bad Request or 409 Conflict
	constructor(message: string, statusCode: number = 400) {
		super(message, statusCode);
	}
}

export class ValidationError extends ServerError {
	// Specifically for input validation issues
	public readonly errors?: Record<string, string[]>; // Optional: for field-specific errors

	constructor(message: string = 'Validation failed', errors?: Record<string, string[]>) {
		super(message, 422); // Unprocessable Entity
		this.errors = errors;
	}
}
