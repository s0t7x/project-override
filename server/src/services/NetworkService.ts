// packages/po_server/src/services/NetworkService.ts
import { Client, Server } from 'colyseus';
import {
  IServerErrorMessage,
  ServerError,
  ServerErrorMessageTypeEnum,
} from '@project-override/shared/dist/messages/ServerError'; // Assuming shared types are available
import { IMessage, IMessageType } from '@project-override/shared/dist/messages/Messages';

class NetworkServiceInternal {
  // Could also just be exported functions

  /**
   * Sends a standardized error message to a client.
   * Uses the generic SERVER_ERROR message type by default for the envelope.
   * @param client The Colyseus client instance.
   * @param error The error object (ideally an instance of AppError or its children).
   * @param customMessageType Optional: A more specific message type for the envelope if needed.
   */
  public sendError(client: Client, error: Error | ServerError, customMessageType?: string): void {
    let payload: IServerErrorMessage;

    if (error instanceof ServerError) {
      payload = { ...error }; // Cast to the shared error type
    } else {
      // Generic error
      payload = {
        type: ServerErrorMessageTypeEnum.InternalServerError,
        message: error.message || 'An unexpected error occurred.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
    }
    console.warn(`[NetworkService] Sending error to client ${client.sessionId}:`, payload.message);
    client.send(customMessageType || payload.type, payload);
  }

  /**
   * Sends a custom message to a specific client.
   * This is a thin wrapper around client.send for consistency if you want all sends to go via NetworkService.
   * @param client The Colyseus client instance.
   * @param message The message object.
   */
  public sendMessage(client: Client, message: IMessage): void {
    client.send(message.type, message);
  }

  public sendRaw(client: Client, messageType: IMessageType, payload: any): void {
    client.send(messageType, payload);
  }

  /**
   * Broadcasts a message to all clients in a room.
   * @param room The Colyseus Room instance (needed for `this.broadcast`).
   * @param messageType The type of the message.
   * @param payload The message payload.
   * @param options Optional broadcast options (e.g., { except: clientToExclude }).
   */
  public broadcastMessage(
    room: { broadcast: (type: string | number, message?: any, options?: any) => void },
    message: IMessage,
    options?: any,
  ): void {
    room.broadcast(message.type, message, options);
  }

  public broadcastRaw(
    room: { broadcast: (type: string | number, message?: any, options?: any) => void }, // Duck typing for Room
    messageType: IMessageType,
    payload: any,
    options?: any,
  ): void {
    room.broadcast(messageType, payload, options);
  }

  /**
   * Broadcasts a standardized error to all clients in a room.
   * This might be less common, usually errors are client-specific.
   * @param room The Colyseus Room instance.
   * @param error The error object.
   * @param customMessageType Optional: A more specific message type for the envelope.
   */
  public broadcastError(
    room: { broadcast: (type: string | number, message?: any, options?: any) => void },
    error: Error | ServerError,
    options?: any,
    customMessageType?: string,
  ): void {
    let payload: IServerErrorMessage;
    if (error instanceof ServerError) {
      payload = { ...error }; // Cast to the shared error type
    } else {
      payload = {
        type: ServerErrorMessageTypeEnum.InternalServerError,
        message: error.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
    }
    console.warn(`[NetworkService] Broadcasting error to room:`, payload);
    room.broadcast(customMessageType || payload.type, payload, options);
  }
}

export const networkService = new NetworkServiceInternal();
