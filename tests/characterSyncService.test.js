const test = require("node:test");
const assert = require("node:assert/strict");

const characterModel = require("../src/models/characterModel");
const characterEventModel = require("../src/models/characterEventModel");
const professionSyncService = require("../src/services/professionSyncService");
const equipmentSyncService = require("../src/services/equipmentSyncService");

function loadCharacterSyncService() {
    delete require.cache[
        require.resolve(
            "../src/services/characterSyncService"
        )
    ];

    return require(
        "../src/services/characterSyncService"
    );
}

const baseCharacter = {
    guid: "Test-GUID",
    name: "TestCharacter",
    realm: "TestRealm",
    level: 10,
    class: "Mage",
    classFile: "MAGE",
    race: "Undead",
    raceFile: "Scourge",
    raceID: 5,
    faction: "Horde",
    guild: {
        name: "TestGuild",
        rank: "Member",
        rankIndex: 1,
    },
    professions: {},
    equipment: {},
};


test("crée un nouveau personnage", async () => {
    characterModel.findCharacter =
        async () => null;

    characterModel.createCharacter =
        async () => ({
            id: 100,
            ...baseCharacter,
        });

    professionSyncService.syncProfessions =
        async () => {};

    equipmentSyncService.syncEquipment =
        async () => [];

    const {
        syncCharacter,
    } = loadCharacterSyncService();

    const result = await syncCharacter(
        1,
        baseCharacter
    );

    assert.equal(
        result.action,
        "created"
    );

    assert.equal(
        result.character.id,
        100
    );

    assert.deepEqual(
        result.events,
        []
    );
});


test("ne modifie pas un personnage inchangé", async () => {
    characterModel.findCharacter =
        async () => ({
            id: 100,
            name: "TestCharacter",
            guid: "Test-GUID",
            realm: "TestRealm",
            level: 10,
            class: "Mage",
            class_file: "MAGE",
            race: "Undead",
            race_file: "Scourge",
            race_id: 5,
            faction: "Horde",
            guild_name: "TestGuild",
            guild_rank: "Member",
            guild_rank_index: 1,
        });

    professionSyncService.syncProfessions =
        async () => {};

    equipmentSyncService.syncEquipment =
        async () => [];

    const {
        syncCharacter,
    } = loadCharacterSyncService();

    const result = await syncCharacter(
        1,
        baseCharacter
    );

    assert.equal(
        result.action,
        "unchanged"
    );

    assert.deepEqual(
        result.events,
        []
    );
});


test("met à jour un personnage et crée les événements", async () => {
    characterModel.findCharacter =
        async () => ({
            id: 100,
            name: "TestCharacter",
            guid: "Test-GUID",
            realm: "TestRealm",
            level: 10,
            class_file: "MAGE",
            class: "Mage",
            race: "Undead",
            race_file: "Scourge",
            race_id: 5,
            faction: "Horde",
            guild_name: "OldGuild",
            guild_rank: "Member",
            guild_rank_index: 1,
        });

    characterModel.updateCharacter =
        async () => ({
            id: 100,
            ...baseCharacter,
            level: 11,
            guild_name: "NewGuild",
        });

    professionSyncService.syncProfessions =
        async () => {};

    equipmentSyncService.syncEquipment =
        async () => [];

    characterEventModel.createCharacterEvent =
        async (
            characterId,
            eventType,
            eventData
        ) => ({
            id: 1,
            character_id: characterId,
            event_type: eventType,
            event_data: eventData,
        });

    const updatedCharacter = {
        ...baseCharacter,
        level: 11,
        guild: {
            name: "NewGuild",
            rank: "Member",
            rankIndex: 1,
        },
    };

    const {
        syncCharacter,
    } = loadCharacterSyncService();

    const result = await syncCharacter(
        1,
        updatedCharacter
    );

    assert.equal(
        result.action,
        "updated"
    );

    assert.equal(
        result.events.length,
        2
    );

    assert.equal(
        result.events[0].event_type,
        "LEVEL_UP"
    );

    assert.equal(
        result.events[1].event_type,
        "GUILD_CHANGED"
    );
});

test("synchronise plusieurs personnages", async () => {
    const syncedGuids = [];

    characterModel.findCharacter =
        async (userId, guid) => {
            syncedGuids.push(guid);
            return null;
        };

    characterModel.createCharacter =
        async (userId, character) => ({
            id: character.guid,
            ...character,
        });

    professionSyncService.syncProfessions =
        async () => {};

    equipmentSyncService.syncEquipment =
        async () => [];

    const {
        syncCharacters,
    } = loadCharacterSyncService();

    const characters = [
        {
            ...baseCharacter,
            guid: "GUID-1",
            name: "Character1",
        },
        {
            ...baseCharacter,
            guid: "GUID-2",
            name: "Character2",
        },
    ];

    const results = await syncCharacters(
        1,
        characters
    );

    assert.equal(
        results.length,
        2
    );

    assert.equal(
        results[0].action,
        "created"
    );

    assert.equal(
        results[1].action,
        "created"
    );

    assert.deepEqual(
        syncedGuids,
        [
            "GUID-1",
            "GUID-2",
        ]
    );
});