import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { getCharacterRep } from '../../server/character/character_rep';
import { Character } from '../../server/character/character';
import { APP_VERSION } from '../../server/character/_version';
import { GetAppVersion } from '../../server/services/gas_server';

const MORTY_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');

describe('App Version Tracking & Outdated Client Detection', () => {
  test('APP_VERSION is non-empty and exposed via GetAppVersion() and CharacterRep.appVersion', () => {
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION.length).toBeGreaterThan(0);
    expect(GetAppVersion()).toBe(APP_VERSION);

    const morty = GetCharacterByDocId(MORTY_TEST_FILE) as Character;
    const rep = getCharacterRep(morty);
    expect(rep.appVersion).toBe(APP_VERSION);
  });
});

