// shared/types/messages.ts
// INTERFACES defining the structure of network message payloads sent between client and server for ProjectOverride.
// Ensures both ends agree on the data format for specific actions.

import { CurrencyType, InputActions, InteractionType, ItemSlot } from './enums';
import { IVector3, IQuaternion, IColor3 } from './data';

// --- Client -> Server Messages ---

/** Payload for player input updates (sent frequently). */
export interface IPlayerInputPayload {
    /** Input sequence number for reconciliation (optional but good for prediction). */
    sequence?: number;
    /** Direction the player is trying to move (unit vector or normalized). */
    movementInput: IVector3; // { x: horizontal (-1 to 1), y: 0 (usually), z: vertical (-1 to 1) }
    /** Direction the player is looking/aiming (Quaternion or Euler Y). */
    lookRotation: IQuaternion | number; // Quaternion recommended, number if only Yaw matters
    /** Discrete actions performed this tick (bitmask or array). */
    actions: InputActions[]; // Array of actions triggered (e.g., [InputActions.JUMP, InputActions.PRIMARY_ACTION])
}

/** Payload for requesting to edit a world block. */
export interface IEditBlockPayload {
    /** Coordinates of the block being targeted. */
    targetCoords: IVector3;
    /** The type of block the player wants to place (ID string). Null or specific ID for removal? */
    newBlockTypeId?: string | null; // Use null or a specific 'air' type for removal
    /** Optional: The tool or item instance ID used for the edit (if required). */
    toolInstanceId?: string;
}

/** Payload for requesting to edit an entity's component data. */
export interface IEditEntityPayload {
    /** ID of the entity being targeted for editing. */
    targetEntityId: string;
    /** Which component is being edited. */
    componentName: string; // e.g., "RenderableComponent", "CombatComponent"
    /** The specific data field(s) within the component to change and their new values. */
    dataChanges: { [key: string]: any }; // e.g., { "tintColor": "#FF0000", "attackPowerModifier": 5 }
    /** Optional: Currency/item used for the edit. */
    currencyType?: CurrencyType; // e.g., BYTES or HACK_CHIPS
}

/** Payload for initiating a combat action. */
export interface ICombatActionPayload {
    /** The type of action (e.g., 'basicAttack', 'useAbility1'). Could use InputActions enum too. */
    actionId: string | InputActions;
    /** Optional: Specific target entity ID if the action is targeted. */
    targetEntityId?: string;
    /** Optional: Direction vector if the action is directional (e.g., skill shot). */
    direction?: IVector3;
}

/** Payload for interacting with an entity or object. */
export interface IInteractionPayload {
    /** ID of the entity being interacted with. */
    targetEntityId: string;
    /** The specific type of interaction being performed. */
    interactionType: InteractionType;
}

/** Payload for initiating a teleport via a portal. */
export interface ITeleportPayload {
    /** ID of the portal entity being used. */
    portalEntityId: string;
}

/** Payload for creating a new character. */
export interface ICreateCharacterPayload {
    name: string;
    // Include appearance customization data
    customization: {
        baseSpriteSheet: string;
        baseColor: IColor3;
        eyesSpriteSheet: string;
        eyesColor: IColor3;
        hairSpriteSheet: string;
        hairColor: IColor3;
    };
}

/** Payload for selecting a character to play. */
export interface ISelectCharacterPayload {
    characterId: string;
}

/** Payload for requesting to join a specific game room instance. */
export interface IJoinRoomPayload {
    roomId: string; // The Colyseus room instance ID to join
}

/** Payload for requesting to create a new player-owned room (housing). */
export interface ICreatePlayerRoomPayload {
    roomName: string;
    baseMapId: string; // ID of the template map data to use
    isPublic: boolean;
    allowedFriendIds?: string[]; // Optional list of character IDs for private rooms
}

/** Payload for sending a chat message. */
export interface IChatMessagePayload {
    channel: 'say' | 'guild' | 'whisper' | 'party'; // Chat channel type
    message: string;
    recipientCharacterName?: string; // Required if channel is 'whisper'
}

/** Payload for moving an item within the inventory or equipping it. */
export interface IMoveItemPayload {
    itemInstanceId: string;
    fromContainer: 'inventory' | ItemSlot; // Source container/slot
    toContainer: 'inventory' | ItemSlot;   // Destination container/slot
    fromSlotIndex?: number; // Index if source is inventory bag
    toSlotIndex?: number;   // Index if destination is inventory bag
}

/** Payload for requesting a trade with another player. */
export interface ITradeRequestPayload {
    targetCharacterId: string;
}

/** Payload for accepting or declining a trade request. */
export interface ITradeResponsePayload {
    tradeSessionId: string; // ID identifying the specific trade interaction
    accepted: boolean;
}

/** Payload for adding/removing an item offer in an active trade. */
export interface ITradeUpdateOfferPayload {
    tradeSessionId: string;
    itemInstanceId: string;
    action: 'add' | 'remove';
}

/** Payload for confirming the trade offer (locking in). */
export interface ITradeConfirmPayload {
    tradeSessionId: string;
    isConfirmed: boolean; // True to confirm, false to unconfirm
}

/** Payload for sending a guild invite. */
export interface IGuildInvitePayload {
    targetCharacterName: string;
}

/** Payload for responding to a guild invite. */
export interface IGuildInviteResponsePayload {
    inviteId: string; // ID identifying the specific invite
    accepted: boolean;
}

/** Payload for sending a friend request. */
export interface IFriendRequestPayload {
    targetCharacterName: string;
}

/** Payload for responding to a friend request. */
export interface IFriendResponsePayload {
    friendshipId: string; // ID identifying the specific friendship record
    accepted: boolean;
}

// --- Server -> Client Messages (for events not covered by state sync) ---

/** Payload for generic error messages to display to the user. */
export interface IErrorMessagePayload {
    message: string;
    code?: number; // Optional error code
}

/** Payload for generic info messages to display to the user. */
export interface IInfoMessagePayload {
    message: string;
}

/** Payload for popup notifications (level up, achievement). */
export interface IPopupNotificationPayload {
    title: string;
    text: string;
    iconId?: string; // Optional icon identifier
}

/** Payload for detailed combat log entries. */
export interface ICombatLogPayload {
    timestamp: number;
    sourceName?: string; // Name of attacker/caster
    targetName?: string; // Name of target
    actionDescription: string; // e.g., "attacks", "casts Fireball"
    resultValue?: number; // e.g., damage number
    resultType: 'damage' | 'heal' | 'miss' | 'dodge' | 'critical' | 'effect_applied' | 'effect_faded';
    effectName?: string; // Name of status effect if applicable
}

/** Payload requesting the client play a sound effect. */
export interface ISoundPlayPayload {
    soundId: string; // ID of the sound asset to play
    position?: IVector3; // World position to play the sound at (if spatial)
    entityId?: string; // Optional: Entity to attach the sound to
    volume?: number;   // Optional: Volume multiplier (0 to 1)
}

/** Payload requesting the client spawn a visual effect. */
export interface IVfxSpawnPayload {
    vfxId: string; // ID of the visual effect template/asset
    position: IVector3; // World position to spawn the effect
    rotation?: IQuaternion | IVector3; // Optional rotation
    entityId?: string; // Optional: Entity to attach the effect to
    scale?: number;    // Optional: Scale multiplier
    duration?: number; // Optional: Override duration (in seconds)
}

/** Payload informing the client of an incoming trade request. */
export interface ITradeRequestNotificationPayload {
    tradeSessionId: string;
    requestingCharacterId: string;
    requestingCharacterName: string;
}

/** Payload informing the client of an incoming guild invite. */
export interface IGuildInviteNotificationPayload {
    inviteId: string;
    guildId: string;
    guildName: string;
    invitingCharacterName: string;
}

/** Payload informing the client of an incoming friend request. */
export interface IFriendRequestNotificationPayload {
    friendshipId: string;
    requestingCharacterId: string;
    requestingCharacterName: string;
}

/** Payload for a client requesting to login. */
export interface ILoginRequestPayload {
    username: string;
    password: string;
}

/** Payload for a client requesting to register a new account. */
export interface IRegisterRequestPayload {
    username: string;
    password: string;
    // email?: string; // Optional: Add email if you collect it during registration
}