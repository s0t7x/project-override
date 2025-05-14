import { IColor3 } from 'math/Color3';

export const EntityComponentsTypeEnum = {
  equipment: 'equipment',
} as const;

export type EntityComponentsType =
  (typeof EntityComponentsTypeEnum)[keyof typeof EntityComponentsTypeEnum];

export type IEntityComponents = Map<EntityComponentsType, any>;
