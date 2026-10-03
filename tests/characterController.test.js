const test = require("node:test");
const assert = require("node:assert/strict");

const characterSyncService =
    require("../src/services/characterSyncService");

const {
    syncCharacters,
} = require("../src/controllers/characterController");

test("refuse une synchronisation lorsque characters n'est pas un tableau", async () => {
    const req = {
        body: {
            characters: "invalid",
        },
        user: {
            id: 1,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    await syncCharacters(req, res);

    assert.equal(
        responseStatus,
        400
    );

    assert.deepEqual(
        responseBody,
        {
            status: "error",
            message: "Characters must be an array",
        }
    );
});

test("synchronise une liste vide de personnages", async () => {
    const req = {
        body: {
            characters: [],
        },
        user: {
            id: 1,
        },
    };

    let responseStatus = 200;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    await syncCharacters(req, res);

    assert.equal(
        responseStatus,
        200
    );

    assert.deepEqual(
        responseBody,
        {
            status: "ok",
            message: "Characters synchronized",
            createdCount: 0,
            updatedCount: 0,
            unchangedCount: 0,
            events: [],
            characters: [],
        }
    );
});

test("transmet les personnages au service de synchronisation", async () => {
    const characterSyncService =
        require("../src/services/characterSyncService");

    const originalSyncCharacters =
        characterSyncService.syncCharacters;

    let receivedUserId = null;
    let receivedCharacters = null;

    characterSyncService.syncCharacters =
        async (userId, characters) => {
            receivedUserId = userId;
            receivedCharacters = characters;

            return [];
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        syncCharacters,
    } = require("../src/controllers/characterController");

    const characters = [
        {
            guid: "Controller-Test-GUID",
            name: "ControllerTest",
        },
    ];

    const req = {
        body: {
            characters,
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = 200;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await syncCharacters(req, res);

        assert.equal(
            receivedUserId,
            42
        );

        assert.deepEqual(
            receivedCharacters,
            characters
        );

        assert.equal(
            responseStatus,
            200
        );

        assert.deepEqual(
            responseBody,
            {
                status: "ok",
                message: "Characters synchronized",
                createdCount: 0,
                updatedCount: 0,
                unchangedCount: 0,
                events: [],
                characters: [],
            }
        );
    } finally {
        characterSyncService.syncCharacters =
            originalSyncCharacters;
    }
});

test("retourne une erreur 500 lorsque la synchronisation échoue", async () => {
    const characterSyncService =
        require("../src/services/characterSyncService");

    const originalSyncCharacters =
        characterSyncService.syncCharacters;

    characterSyncService.syncCharacters =
        async () => {
            throw new Error("Test synchronization error");
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        syncCharacters,
    } = require("../src/controllers/characterController");

    const req = {
        body: {
            characters: [],
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await syncCharacters(req, res);

        assert.equal(
            responseStatus,
            500
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Internal server error",
            }
        );
    } finally {
        characterSyncService.syncCharacters =
            originalSyncCharacters;
    }
});

test("retourne les personnages de l'utilisateur", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharactersByUserId =
        characterModel.findCharactersByUserId;

    const characters = [
        {
            id: 1,
            guid: "Test-GUID-1",
            name: "TestCharacter",
        },
        {
            id: 2,
            guid: "Test-GUID-2",
            name: "TestCharacter2",
        },
    ];

    let receivedUserId = null;

    characterModel.findCharactersByUserId =
        async (userId) => {
            receivedUserId = userId;
            return characters;
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacters,
    } = require("../src/controllers/characterController");

    const req = {
        user: {
            id: 42,
        },
    };

    let responseStatus = 200;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacters(req, res);

        assert.equal(
            receivedUserId,
            42
        );

        assert.equal(
            responseStatus,
            200
        );

        assert.deepEqual(
            responseBody,
            {
                status: "ok",
                characters,
            }
        );
    } finally {
        characterModel.findCharactersByUserId =
            originalFindCharactersByUserId;
    }
});

test("retourne une erreur 500 lorsque la récupération des personnages échoue", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharactersByUserId =
        characterModel.findCharactersByUserId;

    characterModel.findCharactersByUserId =
        async () => {
            throw new Error("Test database error");
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacters,
    } = require("../src/controllers/characterController");

    const req = {
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacters(req, res);

        assert.equal(
            responseStatus,
            500
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Internal server error",
            }
        );
    } finally {
        characterModel.findCharactersByUserId =
            originalFindCharactersByUserId;
    }
});

test("refuse un identifiant de personnage invalide", async () => {
    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacter,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "invalid",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    await getCharacter(req, res);

    assert.equal(
        responseStatus,
        400
    );

    assert.deepEqual(
        responseBody,
        {
            status: "error",
            message: "Invalid character id",
        }
    );
});

test("retourne 404 lorsque le personnage n'existe pas", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    characterModel.findCharacterById =
        async (userId, characterId) => {
            assert.equal(userId, 42);
            assert.equal(characterId, 999);

            return null;
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacter,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "999",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacter(req, res);

        assert.equal(
            responseStatus,
            404
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Character not found",
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;
    }
});

test("retourne un personnage avec ses professions et son équipement", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const professionModel =
        require("../src/models/professionModel");

    const equipmentModel =
        require("../src/models/equipmentModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    const originalFindProfessions =
        professionModel.findProfessionsWithRecipesByCharacterId;

    const originalFindEquipment =
        equipmentModel.findEquipmentByCharacterId;

    const character = {
        id: 42,
        guid: "Test-GUID",
        name: "TestCharacter",
        realm: "TestRealm",
        level: 10,
    };

    const professionRows = [
        {
            profession_id: 1,
            skill_line: 164,
            profession_name: "Blacksmithing",
            skill_level: 100,
            max_skill_level: 300,
            profession_created_at: "2026-01-01",
            profession_updated_at: "2026-01-02",
            recipe_internal_id: 10,
            recipe_id: 12345,
            recipe_name: "Test Recipe",
            recipe_created_at: "2026-01-01",
            recipe_updated_at: "2026-01-02",
        },
    ];

    const equipment = [
        {
            id: 20,
            slot: "HeadSlot",
            item_id: 123,
            item_link: "[Test Helmet]",
            updated_at: "2026-01-02",
        },
    ];

    characterModel.findCharacterById =
        async (userId, characterId) => {
            assert.equal(userId, 42);
            assert.equal(characterId, 42);

            return character;
        };

    professionModel.findProfessionsWithRecipesByCharacterId =
        async (characterId) => {
            assert.equal(characterId, 42);

            return professionRows;
        };

    equipmentModel.findEquipmentByCharacterId =
        async (characterId) => {
            assert.equal(characterId, 42);

            return equipment;
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacter,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "42",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = 200;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacter(req, res);

        assert.equal(
            responseStatus,
            200
        );

        assert.deepEqual(
            responseBody,
            {
                status: "ok",
                character: {
                    ...character,
                    professions: [
                        {
                            id: 1,
                            skill_line: 164,
                            name: "Blacksmithing",
                            skill_level: 100,
                            max_skill_level: 300,
                            created_at: "2026-01-01",
                            updated_at: "2026-01-02",
                            recipes: [
                                {
                                    id: 10,
                                    recipe_id: 12345,
                                    name: "Test Recipe",
                                    created_at: "2026-01-01",
                                    updated_at: "2026-01-02",
                                },
                            ],
                        },
                    ],
                    equipment,
                },
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;

        professionModel.findProfessionsWithRecipesByCharacterId =
            originalFindProfessions;

        equipmentModel.findEquipmentByCharacterId =
            originalFindEquipment;
    }
});

test("retourne une erreur 500 lorsque la récupération du personnage échoue", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    characterModel.findCharacterById =
        async () => {
            throw new Error("Test database error");
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacter,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "42",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacter(req, res);

        assert.equal(
            responseStatus,
            500
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Internal server error",
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;
    }
});

test("refuse un identifiant invalide pour les événements", async () => {
    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacterEvents,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "invalid",
        },
        query: {},
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    await getCharacterEvents(req, res);

    assert.equal(
        responseStatus,
        400
    );

    assert.deepEqual(
        responseBody,
        {
            status: "error",
            message: "Invalid character id",
        }
    );
});

test("retourne 404 lorsque le personnage des événements n'existe pas", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    characterModel.findCharacterById =
        async (userId, characterId) => {
            assert.equal(userId, 42);
            assert.equal(characterId, 999);

            return null;
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacterEvents,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "999",
        },
        query: {},
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacterEvents(req, res);

        assert.equal(
            responseStatus,
            404
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Character not found",
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;
    }
});

test("refuse une limite d'événements invalide", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    characterModel.findCharacterById =
        async () => ({
            id: 42,
            name: "TestCharacter",
        });

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacterEvents,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "42",
        },
        query: {
            limit: "101",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacterEvents(req, res);

        assert.equal(
            responseStatus,
            400
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Limit must be an integer between 1 and 100",
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;
    }
});

test("refuse un offset d'événements négatif", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    characterModel.findCharacterById =
        async () => ({
            id: 42,
            name: "TestCharacter",
        });

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacterEvents,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "42",
        },
        query: {
            offset: "-1",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacterEvents(req, res);

        assert.equal(
            responseStatus,
            400
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Offset must be a positive integer",
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;
    }
});

test("retourne les événements avec pagination", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const characterEventModel =
        require("../src/models/characterEventModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    const originalFindEvents =
        characterEventModel.findEventsByCharacterId;

    const originalCountEvents =
        characterEventModel.countEventsByCharacterId;

    const character = {
        id: 42,
        name: "TestCharacter",
    };

    const events = [
        {
            id: 1,
            event_type: "LEVEL_UP",
        },
        {
            id: 2,
            event_type: "EQUIPMENT_CHANGED",
        },
        {
            id: 3,
            event_type: "RECIPE_LEARNED",
        },
    ];

    let receivedCharacterId = null;
    let receivedLimit = null;
    let receivedOffset = null;

    characterModel.findCharacterById =
        async (userId, characterId) => {
            assert.equal(userId, 42);
            assert.equal(characterId, 42);

            return character;
        };

    characterEventModel.findEventsByCharacterId =
        async (characterId, limit, offset) => {
            receivedCharacterId = characterId;
            receivedLimit = limit;
            receivedOffset = offset;

            return events;
        };

    characterEventModel.countEventsByCharacterId =
        async (characterId) => {
            assert.equal(characterId, 42);

            return 5;
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacterEvents,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "42",
        },
        query: {
            limit: "2",
            offset: "4",
        },
        user: {
            id: 42,
        },
    };

    let responseStatus = 200;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacterEvents(req, res);

        assert.equal(
            receivedCharacterId,
            42
        );

        assert.equal(
            receivedLimit,
            2
        );

        assert.equal(
            receivedOffset,
            4
        );

        assert.equal(
            responseStatus,
            200
        );

        assert.deepEqual(
            responseBody,
            {
                status: "ok",
                events: [
                    events[0],
                    events[1],
                ],
                pagination: {
                    limit: 2,
                    offset: 4,
                    hasMore: true,
                    total: 5,
                },
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;

        characterEventModel.findEventsByCharacterId =
            originalFindEvents;

        characterEventModel.countEventsByCharacterId =
            originalCountEvents;
    }
});

test("retourne une erreur 500 lorsque la récupération des événements échoue", async () => {
    const characterModel =
        require("../src/models/characterModel");

    const characterEventModel =
        require("../src/models/characterEventModel");

    const originalFindCharacterById =
        characterModel.findCharacterById;

    const originalFindEvents =
        characterEventModel.findEventsByCharacterId;

    characterModel.findCharacterById =
        async () => ({
            id: 42,
            name: "TestCharacter",
        });

    characterEventModel.findEventsByCharacterId =
        async () => {
            throw new Error("Test events database error");
        };

    delete require.cache[
        require.resolve(
            "../src/controllers/characterController"
        )
    ];

    const {
        getCharacterEvents,
    } = require("../src/controllers/characterController");

    const req = {
        params: {
            id: "42",
        },
        query: {},
        user: {
            id: 42,
        },
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
        status(code) {
            responseStatus = code;
            return this;
        },

        json(data) {
            responseBody = data;
            return this;
        },
    };

    try {
        await getCharacterEvents(req, res);

        assert.equal(
            responseStatus,
            500
        );

        assert.deepEqual(
            responseBody,
            {
                status: "error",
                message: "Internal server error",
            }
        );
    } finally {
        characterModel.findCharacterById =
            originalFindCharacterById;

        characterEventModel.findEventsByCharacterId =
            originalFindEvents;
    }
});