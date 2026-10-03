const test = require("node:test");
const assert = require("node:assert/strict");

const {
    findCharacter,
    createCharacter,
    deleteCharacter,
} = require("../src/models/characterModel");

test("crée puis retrouve un personnage", async () => {
    const userId = 1;

    const characterData = {
        guid: "TestCharacterModel-GUID",
        name: "TestCharacterModel",
        realm: "TestRealm",
        level: 6,
        class: "Mage",
        classFile: "MAGE",
        race: "Undead",
        raceFile: "Scourge",
        raceID: 5,
        faction: "Horde",
        guild: {
            name: "TestGuild",
            rank: "New",
            rankIndex: 8,
        },
    };

    const createdCharacter = await createCharacter(
        userId,
        characterData
    );

    assert.equal(
        createdCharacter.name,
        "TestCharacterModel"
    );

    assert.equal(
        createdCharacter.realm,
        "TestRealm"
    );

    const foundCharacter = await findCharacter(
        userId,
        characterData.guid
    );

    assert.ok(foundCharacter);

    assert.equal(
        foundCharacter.name,
        "TestCharacterModel"
    );
    
    await deleteCharacter(createdCharacter.id);
});
