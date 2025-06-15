import { NetworkSettings } from "@/config/Network";
import { useAuthStore } from "@/stores/AuthStore";
import { useNetworkStore } from "@/stores/NetworkStore";
import { Client, Room } from "colyseus.js";
import { ServerErrorMessageTypeEnum } from "@project-override/shared/messages/ServerError";

export class NetworkService {
    private _isInitialized: boolean = false;
    private client: Client | null = null;
    private primaryRoom: Room | null = null;
    private secondaryRooms: Map<string, Room> | null = null;

    private messageListeners: Map<string, Map<string | number, Set<Function>>> = new Map();

    constructor() {
        useNetworkStore.setState({ networkService: this})
    }

    public initialize() {
        if (this._isInitialized) {
            return;
        }
        
        this.client = new Client(NetworkSettings.endpoint);
        if(!this.client) {
            return
        }
        this._isInitialized = true;
    }

    public isInitialized(): boolean {
        return this._isInitialized && (this.client !== null);
    }

    public getClient(): Client | null {
        return this.client;
    }

    public getPrimaryRoom(): Room | null {
        return this.primaryRoom;
    }

    public getSecondaryRooms(): Map<string, Room> | null {
        return this.secondaryRooms;
    }


    public addMessageListener<T = any>(room: Room | null, type: string | number, handler: (data: T) => void): void {
        const r = room ? room : this.primaryRoom;
        if (!r) {
            console.warn(`[NetworkService] Cannot add listener. Not room specified and not in a primary room.`);
            return;
        }

        if (!this.messageListeners.has(r.name)) {
            this.messageListeners.set(r.name, new Map());
        }
        const roomMsgListeners = this.messageListeners.get(r.name)!;
        if (!roomMsgListeners.has(type)) {
            roomMsgListeners.set(type, new Set());
        }
        const listeners = roomMsgListeners.get(type)!;
        listeners.add(handler);
    }

    public addErrorListener<T = any>(room: Room | null, handler: (data: T) => void): void {
        const r = room ? room : this.primaryRoom;
        if (!r) {
            console.warn(`[NetworkService] Cannot add listener. Not room specified and not in a primary room.`);
            return;
        }

        if (!this.messageListeners.has(r.name)) {
            this.messageListeners.set(r.name, new Map());
        }
        Object.keys(ServerErrorMessageTypeEnum).forEach((name) => {
            const type = "Error." + name;
            console.log('register for', type)
            const roomMsgListeners = this.messageListeners.get(r.name)!;
            if (!roomMsgListeners.has(type)) {
                roomMsgListeners.set(type, new Set());
            }
            const listeners = roomMsgListeners.get(type)!;
            listeners.add(handler);
        })
       
    }

    public removeMessageListener(room: Room | null, type: string | number, handler?: Function): void {
        const r = room ? room : this.primaryRoom;
        if (!r) {
            return;
        }

        const roomMsgListeners = this.messageListeners.get(r.name);
        if (!roomMsgListeners) {
            return;
        }

        const listeners = roomMsgListeners.get(type);
        if (!listeners) {
            return;
        }
        if (handler) listeners.delete(handler);


        // Cleanup
        if (listeners.size === 0) {
            roomMsgListeners.delete(type);
        }

        if (roomMsgListeners.size === 0) {
            this.messageListeners.delete(r.name);
        }
    }

    public onMessageOnce<T = any>(room: Room | null, type: string | number, callback: (payload: T) => void): void {
        const onceWrapper = (payload: T) => {
            this.removeMessageListener(room || this.primaryRoom, type, onceWrapper);
            callback(payload);
        };
        this.addMessageListener(room, type, onceWrapper);
    }

    private clearAllMessageListeners(room: Room | null): void {
        if (!room)
            return this.messageListeners.clear();
        const roomMsgListeners = this.messageListeners.get(room.name);
        if (!roomMsgListeners) {
            return;
        }
        this.messageListeners.delete(room.name);
    }

    async joinRoom<T = any>(roomName: string, options: any = {}, forceCreate: boolean = false, secondary: boolean = false): Promise<Room<T> | null> {
        if(!this.client) {
            return null;
        }
        const { authTokens } = useAuthStore.getState();
        if(authTokens) {
            options.token = authTokens.accessToken;
        }

        if (!secondary) {
            if (this.primaryRoom) {
                await this.primaryRoom.leave();
            }
            if (forceCreate) {
                this.primaryRoom = await this.client!.create<T>(roomName, options);
            } else {
                this.primaryRoom = await this.client!.joinOrCreate<T>(roomName, options);
            }
            this.setupMessageListeners(null);
            return this.primaryRoom;
        } else {
            if (!this.secondaryRooms) {
                this.secondaryRooms = new Map();
            }
            if (this.secondaryRooms.has(roomName)) {
                return this.secondaryRooms.get(roomName)!;
            }
            let secondaryRoom;
            if (forceCreate) {
                secondaryRoom = await this.client!.create<T>(roomName, options);
            } else {
                secondaryRoom = await this.client!.joinOrCreate<T>(roomName, options);
            }
            this.secondaryRooms.set(roomName, secondaryRoom);
            this.setupMessageListeners(secondaryRoom);
            return secondaryRoom;
        }
    }

    public onStateChange(room: Room | null, callback: (state: any) => void | Promise<void>): void {
        const r = room ? room : this.primaryRoom;
        if (!r) return;
        r.onStateChange(callback)
    }

    private setupMessageListeners(room: Room | null): void {
        if(!room) {
            if(!this.primaryRoom) return;
            this.clearAllMessageListeners(this.primaryRoom)
            this.primaryRoom?.onMessage('*', (type, message) => {
                const roomMsgListeners = this.messageListeners.get(this.primaryRoom!.name);
                if (!roomMsgListeners) {
                    return;
                }
                const listeners = roomMsgListeners.get(type);
                if (!listeners) {
                    return;
                }
                listeners.forEach(listener => {
                    listener(message);
                });
            })
            this.onStateChange(room, this.handlePrimaryStateUpdate)
            return
        }
        this.clearAllMessageListeners(room)
        room.onMessage('*', (type, message) => {
            const roomMsgListeners = this.messageListeners.get(room.name);
            if (!roomMsgListeners) {
                return;
            }
            const listeners = roomMsgListeners.get(type);
            if (!listeners) {
                return;
            }
            listeners.forEach(listener => {
                listener(message);
            });
        })
        this.onStateChange(room, this.handleStateUpdate)
    }

    private handlePrimaryStateUpdate(state: any): void {
        useNetworkStore.setState({ networkService: this, primaryRoomState: state });
    }

    private handleStateUpdate(state: any): void {
        useNetworkStore.setState({ networkService: this, primaryRoomState: state });
    }

     async leaveRoom(room: Room | null): Promise<void> {
        let r = room ? room : this.primaryRoom;
        if(!r) return;
        if(!room) {
            this.primaryRoom = null;
        }
        await r.leave();
    }

    public sendMessage(room: Room | null, type: string | number, message?: any): void {
        const r = room ? room : this.primaryRoom;
        if (!r) {
            console.warn(`[NetworkService] Cannot send message type "${type}", not connected to a room.`);
            return;
        }
        try {
            r.send(type, message);
        } catch (error) {
             console.error(`[NetworkService] Error sending message type "${type}":`, error);
        }
    }
}
