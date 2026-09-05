import { handleIncomingStatus, deleteStatusFromDb } from '../../client/ts/party_sync_listener';
import { CharacterRep } from '../../server/character/character_rep';

describe('Party Sync Listener - Local Unit Tests', () => {
    let mockCharacterRep: CharacterRep;

    beforeEach(() => {
        mockCharacterRep = {
            docId: 'test_doc_123',
            name: 'Thror',
            partyName: 'TeamD20_T&E',
            dbLink: 'https://test-db.firebaseio.com',
            parseWarnings: [],
            parseErrors: [],
            parseSuccess: true,
            race: 'Dwarf',
            classes: [],
            initBonus: 4,
            damageBonus: 0,
            attacksOfOpportunity: 1,
            acp: 0,
            hp: { current: 50, max: 50 },
            ac: 25,
            speed: 50,
            saves: {},
            resistances: '',
            preparedSpells: {},
            skills: {},
            abilities: {},
            specialAttacks: {},
            weapons: [],
            statuses: [],
            actions: [],
            battleGear: [],
            possessions: [],
            partyMembers: ['Thror', 'Bess'],
            quickStatuses: []
        };
    });

    test('should properly construct URL and send DELETE request for consumed status', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK'
        });
        global.fetch = fetchMock as any;

        await deleteStatusFromDb(
            'https://test-db.firebaseio.com',
            'TeamD20_T&E',
            'Thror',
            '-Ny123abc'
        );

        expect(fetchMock).toHaveBeenCalledWith(
            'https://test-db.firebaseio.com/parties/TeamD20_T%26E/members/Thror/statuses/-Ny123abc.json',
            { method: 'DELETE' }
        );
    });

    test('should ignore malformed or empty incoming status payloads', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        handleIncomingStatus('key1', null, mockCharacterRep);
        handleIncomingStatus('key2', undefined, mockCharacterRep);
        handleIncomingStatus('key3', {}, mockCharacterRep);

        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });
});
