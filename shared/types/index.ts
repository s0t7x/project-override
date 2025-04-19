// shared/types/index.ts
// Exports all shared types, interfaces, and enums for easy importing
// across ProjectOverride client and server modules.

export * from './data';      // Exports IVector3, IQuaternion, IItemStack, ICharacterStats, etc.
export * from './enums';     // Exports EntityType, ItemSlot, FriendStatus, QuestStatus, InputActions, InteractionType, etc.
export * from './schemas';   // Exports IGameRoomState, IEntityState, IPlayerState, ICharacterSummary, IRoomListing etc.
export * from './messages';  // Exports IPlayerInputPayload, IEditBlockPayload, ICombatActionPayload, IErrorMessagePayload, ISoundPlayPayload etc.