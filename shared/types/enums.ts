// shared/types/enums.ts
// Defines shared enums used by both ProjectOverride client and server logic for consistency.

/** Defines the broad category of an entity in the game world. */
export enum EntityType {
    PLAYER = 'PLAYER',
    NPC = 'NPC',          // Non-Player Character (friendly, quest giver, vendor)
    MONSTER = 'MONSTER',  // Hostile or potentially hostile AI entity
    ITEM = 'ITEM',        // Equippable or consumable items (may have WorldEntity representation if dropped)
    OBJECT = 'OBJECT',    // Interactive or static world objects (doors, chests, potentially editable blocks if they are entities)
    PROJECTILE = 'PROJECTILE', // Arrows, bullets, energy blasts etc.
    PORTAL = 'PORTAL',      // Teleportation portals
  }
  
  /** Defines standard equipment slots for characters. */
  export enum ItemSlot {
    HEAD = 'HEAD',
    CHEST = 'CHEST',
    LEGS = 'LEGS',
    FEET = 'FEET',
    HAND_PRIMARY = 'HAND_PRIMARY', // Main weapon/tool
    HAND_SECONDARY = 'HAND_SECONDARY',// Off-hand weapon/tool/shield
    ACCESSORY1 = 'ACCESSORY1',
    ACCESSORY2 = 'ACCESSORY2',
    // Add more slots if needed (e.g., Ring, Amulet, Back)
  }
  
  /** Represents the status of a friendship between two characters. */
  export enum FriendStatus {
    PENDING_SENT = 'PENDING_SENT', // Request sent, waiting for recipient
    PENDING_RECEIVED = 'PENDING_RECEIVED', // Request received, waiting for local player action
    ACCEPTED = 'ACCEPTED',        // Both players agreed to be friends
    BLOCKED_BY_YOU = 'BLOCKED_BY_YOU',  // You blocked this player
    BLOCKED_BY_THEM = 'BLOCKED_BY_THEM', // This player blocked you (client might just see 'BLOCKED')
  }
  
  /** Represents the status of a character's progress on a specific quest. */
  export enum QuestStatus {
    UNAVAILABLE = 'UNAVAILABLE', // Prerequisites not met
    AVAILABLE = 'AVAILABLE',    // Player meets prerequisites but hasn't accepted
    ACTIVE = 'ACTIVE',        // Accepted, in progress
    COMPLETED = 'COMPLETED',    // Objectives met, potentially awaiting turn-in/reward
    REWARDED = 'REWARDED',      // Turn-in complete, reward given
    FAILED = 'FAILED',          // Quest failed (if applicable)
  }
  
  /** Defines logical input actions triggered by player controls (keyboard, mouse, gamepad). */
  export enum InputActions {
    // Movement (often sent as vectors, but actions can trigger states)
    MOVE_FORWARD = 'MOVE_FORWARD',
    MOVE_BACKWARD = 'MOVE_BACKWARD',
    STRAFE_LEFT = 'STRAFE_LEFT',
    STRAFE_RIGHT = 'STRAFE_RIGHT',
    JUMP = 'JUMP', // If jumping exists
    SPRINT = 'SPRINT', // Toggle or hold
  
    // Combat / Interaction
    PRIMARY_ACTION = 'PRIMARY_ACTION',   // Left mouse / Main attack button
    SECONDARY_ACTION = 'SECONDARY_ACTION', // Right mouse / Secondary skill/aim?
    INTERACT = 'INTERACT',         // 'E' key / Use button
    RELOAD = 'RELOAD',           // If applicable
  
    // UI / System
    TOGGLE_INVENTORY = 'TOGGLE_INVENTORY',
    TOGGLE_CHARACTER_SHEET = 'TOGGLE_CHARACTER_SHEET',
    TOGGLE_QUEST_LOG = 'TOGGLE_QUEST_LOG',
    TOGGLE_GUILD_UI = 'TOGGLE_GUILD_UI',
    TOGGLE_EDITOR_MODE = 'TOGGLE_EDITOR_MODE', // If explicit mode exists
    ESCAPE_MENU = 'ESCAPE_MENU',       // Open main menu / cancel actions
  
    // Explicit Aiming (for twin-stick) - often sent as vector/direction, not simple action
    // AIM_X, AIM_Y can be handled via axis values in the message payload
  
    // Other Game Specific Actions
    TOGGLE_PVP = 'TOGGLE_PVP',         // Toggle PvP flag
    USE_HACK_CHIP = 'USE_HACK_CHIP',   // Initiate hacking sequence
    USE_WORLD_SUBTRACTOR = 'USE_WORLD_SUBTRACTOR', // Initiate world subtractor item
    // ... add any other specific actions
  }
  
  /** Defines the types of interaction possible with entities or world objects. */
  export enum InteractionType {
    TALK = 'TALK',       // Initiate dialogue with an NPC
    OPEN = 'OPEN',       // Open a container, door
    USE = 'USE',        // Use a device, trigger an object
    EDIT = 'EDIT',       // Enter editing mode for a block or entity
    HACK = 'HACK',       // Initiate hacking attempt on an entity/block
    PICKUP = 'PICKUP',     // Pick up a dropped item entity
    PORTAL_USE = 'PORTAL_USE', // Use a teleportation portal
  }
  
  /** Defines the types of currency available in ProjectOverride. */
  export enum CurrencyType {
      BYTES = 'BYTES',           // Primary currency
      HACK_CHIPS = 'HACK_CHIPS', // Special currency for hacking/advanced editing
      // Add premium currency if planned
  }
  
  /** Defines standard roles within a guild. */
  export enum GuildRank {
      LEADER = 'LEADER',
      OFFICER = 'OFFICER',
      VETERAN = 'VETERAN', // Example intermediate rank
      MEMBER = 'MEMBER',
      RECRUIT = 'RECRUIT',
  }
  
  /** Defines potential message types for server->client communication beyond state updates. */
  export enum ServerMessageType {
      // System messages
      ERROR_MESSAGE = 'ERROR_MESSAGE', // Generic error notification
      INFO_MESSAGE = 'INFO_MESSAGE',   // General info to display (e.g., "Trade complete")
      POPUP_NOTIFICATION = 'POPUP_NOTIFICATION', // Achievement unlocked, level up etc.
  
      // Gameplay feedback
      COMBAT_LOG = 'COMBAT_LOG',       // Detailed combat text (damage dealt/taken)
      EFFECT_APPLIED = 'EFFECT_APPLIED', // Visual/audio cue for status effects
      SOUND_PLAY = 'SOUND_PLAY',       // Request client to play a specific sound effect at a location
      VFX_SPAWN = 'VFX_SPAWN',         // Request client to spawn a visual effect at a location
  
      // UI related
      TRADE_REQUEST = 'TRADE_REQUEST',     // Incoming trade request notification
      GUILD_INVITE = 'GUILD_INVITE',     // Incoming guild invite notification
      FRIEND_REQUEST = 'FRIEND_REQUEST',   // Incoming friend request notification
      QUEST_UPDATE_PUSH = 'QUEST_UPDATE_PUSH', // Force UI update for quest log
  
  }