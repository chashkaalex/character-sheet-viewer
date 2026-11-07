import { Character } from './character';

class CharacterSessionManager {
  private cache = new Map<string, Character>();

  public get(docId: string): Character | undefined {
    return this.cache.get(docId);
  }

  public set(docId: string, character: Character): void {
    this.cache.set(docId, character);
  }

  public reset(docId?: string): void {
    if (docId !== undefined) {
      this.cache.delete(docId);
    } else {
      this.cache.clear();
    }
  }
}

export const CharacterSession = new CharacterSessionManager();
