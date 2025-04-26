// Interfaces for common, simple data structures like IVector3 ({x, y, z}), IQuaternion ({x, y, z, w}), 
// potentially basic item/stat structures if useful in isolation on both ends.
// shared/types/data.ts

/** Represents a 3D vector or point. */
export interface IVector3 {
    x: number;
    y: number;
    z: number;
  }

  export interface IColor3 {
    r: number;
    g: number;
    b: number;
  }

  export interface IVector2 {
    x: number;
    y: number;
  }
  
  /** Represents a rotation in 3D space using Euler angles (in radians or degrees, be consistent!). */
  export interface IEulerRotation {
      x: number; // Pitch
      y: number; // Yaw
      z: number; // Roll
  }
  
  /** Represents a rotation in 3D space using a Quaternion. Often preferred over Euler angles to avoid gimbal lock. */
  export interface IQuaternion {
    x: number;
    y: number;
    z: number;
    w: number;
  }
  
  /** Represents basic information about an item stack, usable in inventories or messages. */
  export interface IItemStack {
      /** The unique ID of the specific item instance (if applicable, otherwise base item ID). */
      instanceId?: string;
      /** The ID defining the type of item (links to BaseItem/BaseEntity). */
      baseItemId: string;
      /** How many of this item are in the stack. */
      quantity: number;
      /** Optional: Any instance-specific data overrides (like durability, enchantments) stored as JSON. */
      instanceData?: any; // Use a more specific type if common overrides exist
  }
  
  /** Basic structure for representing stats. */
  export interface ICharacterStats {
      // Example stats - expand as needed
      health: number;
      maxHealth: number;
      attackPower: number;
      defense: number;
      movementSpeed: number;
      attackSpeed: number;
      // Add other stats relevant to ProjectOverride (e.g., hacking skill, edit efficiency)
  }

    export interface ICharacterCustomization {
        baseSpriteSheet: string;
        baseColor: IColor3;
        eyesSpriteSheet: string;
        eyesColor: IColor3;
        hairSpriteSheet: string;
        hairColor: IColor3;
    }

    export interface ICharacterEquipmentVisuals {
        bodySpriteSheet: string;
        bodyColor: IColor3;
        legsSpriteSheet: string;
        legsColor: IColor3;
        hatSpriteSheet: string;
        hatColor: IColor3;
    }

    export interface ICharacterEquipment {
        bodyItemId?: string;
        legsItemId?: string;
        hatItemId?: string;
    }