import type { ICharacter } from './icharacter';
import type { SpellSlotData } from './common_types';

export type UpdateHpCallback = (
  character: ICharacter,
  amount: number,
  actionType: 'inflict' | 'cure',
  helpers: {
    addStatus: (statusName: string, duration: number) => void;
    removeStatus: (statusName: string) => void;
  }
) => void;

export type OnCastSpellCallback = (
  character: ICharacter,
  slotData: SpellSlotData,
  context: { statusName: string; duration: number },
  helpers: {
    addStatus: (statusName: string, duration: number) => void;
    removeStatus: (statusName: string) => void;
  }
) => void;
