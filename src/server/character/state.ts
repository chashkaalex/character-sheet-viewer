import { ModifierType } from './_constants';

export interface BaseEffect {
  status: string;
  description?: string;
}

export interface ApplicableEffect<T> extends BaseEffect {
  property: string;
  modifierType: ModifierType;
  value: T;
  casterClassName?: string;
}

export interface StaticallyApplicableEffect extends ApplicableEffect<number> { }

export type DynamicValue = (character: any) => number;
export interface DynamicallyApplicableEffect extends ApplicableEffect<DynamicValue> { }

export interface Status {
  name: string;
  duration: number;
  elapsed: number;
}


