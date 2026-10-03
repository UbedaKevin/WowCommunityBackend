const test = require("node:test");
const assert = require("node:assert/strict");

const professionModel = require("../src/models/professionModel");
const characterEventModel = require("../src/models/characterEventModel");

function loadProfessionSyncService() {
    delete require.cache[
        require.resolve(
            "../src/services/professionSyncService"
        )
    ];

    return require(
        "../src/services/professionSyncService"
    );
}

test("crée une nouvelle profession et son événement", async () => {
    professionModel.findProfession =
        async () => null;

    professionModel.createProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.findRecipe =
        async () => null;

    professionModel.createRecipe =
        async () => ({
            id: 20,
            recipe_id: 12345,
            name: "Test Potion",
        });

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

    const {
        syncProfession,
    } = loadProfessionSyncService();

    const profession = {
        name: "Alchemy",
        skillLine: 171,
        recipes: {},
        recipesCollected: true,
    };

    const result = await syncProfession(
        100,
        profession
    );

    assert.equal(
        result.id,
        10
    );

    assert.equal(
        result.name,
        "Alchemy"
    );
});


test("crée une nouvelle recette et son événement", async () => {
    professionModel.findProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.updateProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.findRecipe =
        async () => null;

    professionModel.createRecipe =
        async () => ({
            id: 20,
            recipe_id: 12345,
            name: "Test Potion",
        });

    let createdEvent = null;

    characterEventModel.createCharacterEvent =
        async (
            characterId,
            eventType,
            eventData
        ) => {
            createdEvent = {
                characterId,
                eventType,
                eventData,
            };

            return {
                id: 2,
                character_id: characterId,
                event_type: eventType,
                event_data: eventData,
            };
        };

    const {
        syncProfession,
    } = loadProfessionSyncService();

    const profession = {
        name: "Alchemy",
        skillLine: 171,
        recipes: {
            12345: {
                name: "Test Potion",
            },
        },
        recipesCollected: true,
    };

    await syncProfession(
        100,
        profession
    );

    assert.ok(createdEvent);

    assert.equal(
        createdEvent.characterId,
        100
    );

    assert.equal(
        createdEvent.eventType,
        "RECIPE_LEARNED"
    );

    assert.deepEqual(
        createdEvent.eventData,
        {
            profession: "Alchemy",
            recipeId: 12345,
            recipeName: "Test Potion",
        }
    );
});

test("met à jour une recette existante sans créer d'événement", async () => {
    professionModel.findProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.updateProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.findRecipe =
        async () => ({
            id: 20,
            profession_id: 10,
            recipe_id: 12345,
            name: "Ancienne Potion",
        });

    let updateRecipeCalled = false;
    let createEventCalled = false;

    professionModel.updateRecipe =
        async () => {
            updateRecipeCalled = true;

            return {
                id: 20,
                recipe_id: 12345,
                name: "Nouvelle Potion",
            };
        };

    characterEventModel.createCharacterEvent =
        async () => {
            createEventCalled = true;
        };

    const {
        syncProfession,
    } = loadProfessionSyncService();

    const profession = {
        name: "Alchemy",
        skillLine: 171,
        recipes: {
            12345: {
                name: "Nouvelle Potion",
            },
        },
        recipesCollected: false,
    };

    await syncProfession(
        100,
        profession
    );

    assert.equal(
        updateRecipeCalled,
        true
    );

    assert.equal(
        createEventCalled,
        false
    );
});

test("supprime une recette absente lorsque la collecte est complète", async () => {
    professionModel.findProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.updateProfession =
        async () => ({
            id: 10,
            name: "Alchemy",
            skill_line: 171,
        });

    professionModel.findRecipe =
        async () => null;

    professionModel.deleteRecipe =
        async () => {
            return true;
        };

    const pool = require("../src/config/database");

    const originalQuery = pool.query;

    pool.query = async () => ({
        rows: [
            {
                id: 20,
                profession_id: 10,
                recipe_id: 99999,
                name: "Ancienne recette",
            },
        ],
    });

    const {
        syncProfession,
    } = loadProfessionSyncService();

    const profession = {
        name: "Alchemy",
        skillLine: 171,
        recipes: {},
        recipesCollected: true,
    };

    await syncProfession(
        100,
        profession
    );

    pool.query = originalQuery;
});

test("synchronise plusieurs professions", async () => {
    const syncedProfessions = [];

    const {
        syncProfession,
    } = loadProfessionSyncService();

    const originalSyncProfession =
        syncProfession;

    // On vérifie directement que les deux professions
    // sont parcourues par syncProfessions().
    professionModel.findProfession =
        async (characterId, skillLine) => {
            syncedProfessions.push(skillLine);

            return {
                id: skillLine,
                name: "Test",
                skill_line: skillLine,
            };
        };

    professionModel.updateProfession =
        async () => ({
            id: 10,
        });

    professionModel.findRecipe =
        async () => null;

    const {
        syncProfessions,
    } = loadProfessionSyncService();

    const professions = {
        171: {
            name: "Alchemy",
            skillLine: 171,
            recipes: {},
            recipesCollected: false,
        },
        164: {
            name: "Blacksmithing",
            skillLine: 164,
            recipes: {},
            recipesCollected: false,
        },
    };

    await syncProfessions(
        100,
        professions
    );

    assert.deepEqual(
        syncedProfessions,
        [164, 171]
    );
});