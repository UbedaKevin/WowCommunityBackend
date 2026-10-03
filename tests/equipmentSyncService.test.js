const test = require("node:test");
const assert = require("node:assert/strict");

const equipmentModel =
    require("../src/models/equipmentModel");

const characterEventModel =
    require("../src/models/characterEventModel");

const pool =
    require("../src/config/database");

function loadEquipmentSyncService() {
    delete require.cache[
        require.resolve(
            "../src/services/equipmentSyncService"
        )
    ];

    return require(
        "../src/services/equipmentSyncService"
    );
}

test("crée un équipement sans créer d'événement", async () => {
    const originalFindEquipment =
        equipmentModel.findEquipment;

    const originalCreateEquipment =
        equipmentModel.createEquipment;

    const originalPoolQuery =
        pool.query;

    const originalCreateCharacterEvent =
        characterEventModel.createCharacterEvent;

    let createdEquipment = null;
    let eventCreated = false;

    equipmentModel.findEquipment =
        async () => null;

    equipmentModel.createEquipment =
        async (characterId, equipment) => {
            createdEquipment = {
                characterId,
                ...equipment,
            };

            return createdEquipment;
        };

    characterEventModel.createCharacterEvent =
        async () => {
            eventCreated = true;
            return {};
        };

    pool.query =
        async () => ({
            rows: [],
        });

    try {
        const {
            syncEquipment,
        } = loadEquipmentSyncService();

        const events =
            await syncEquipment(
                4,
                {
                    mainHand: {
                        itemID: 4924,
                        itemLink: "[Primitive Club]",
                        slot: 16,
                    },
                }
            );

        assert.equal(events.length, 0);
        assert.equal(eventCreated, false);

        assert.deepEqual(
            createdEquipment,
            {
                characterId: 4,
                slot: "mainHand",
                itemID: 4924,
                itemLink: "[Primitive Club]",
            }
        );
    } finally {
        equipmentModel.findEquipment =
            originalFindEquipment;

        equipmentModel.createEquipment =
            originalCreateEquipment;

        characterEventModel.createCharacterEvent =
            originalCreateCharacterEvent;

        pool.query =
            originalPoolQuery;
    }
});


test("crée un événement lors d'un changement d'équipement", async () => {
    const originalFindEquipment =
        equipmentModel.findEquipment;

    const originalUpdateEquipment =
        equipmentModel.updateEquipment;

    const originalPoolQuery =
        pool.query;

    const originalCreateCharacterEvent =
        characterEventModel.createCharacterEvent;

    let eventData = null;

    equipmentModel.findEquipment =
        async () => ({
            id: 10,
            slot: "mainHand",
            item_id: 35,
            item_link: "[Bent Staff]",
        });

    equipmentModel.updateEquipment =
        async () => ({});

    characterEventModel.createCharacterEvent =
        async (
            characterId,
            eventType,
            data
        ) => {
            eventData = {
                characterId,
                eventType,
                data,
            };

            return eventData;
        };

    pool.query =
        async () => ({
            rows: [],
        });

    try {
        const {
            syncEquipment,
        } = loadEquipmentSyncService();

        const events =
            await syncEquipment(
                4,
                {
                    mainHand: {
                        itemID: 4924,
                        itemLink: "[Primitive Club]",
                        slot: 16,
                    },
                }
            );

        assert.equal(events.length, 1);

        assert.equal(
            eventData.characterId,
            4
        );

        assert.equal(
            eventData.eventType,
            "EQUIPMENT_CHANGED"
        );

        assert.deepEqual(
            eventData.data,
            {
                slot: "mainHand",
                oldItemId: 35,
                newItemId: 4924,
                oldItemLink: "[Bent Staff]",
                newItemLink: "[Primitive Club]",
            }
        );
    } finally {
        equipmentModel.findEquipment =
            originalFindEquipment;

        equipmentModel.updateEquipment =
            originalUpdateEquipment;

        characterEventModel.createCharacterEvent =
            originalCreateCharacterEvent;

        pool.query =
            originalPoolQuery;
    }
});


test("crée un événement lors du retrait d'un équipement", async () => {
    const originalPoolQuery =
        pool.query;

    const originalCreateCharacterEvent =
        characterEventModel.createCharacterEvent;

    const originalDeleteEquipment =
        equipmentModel.deleteEquipment;

    let eventData = null;
    let deletedEquipmentId = null;

    characterEventModel.createCharacterEvent =
        async (
            characterId,
            eventType,
            data
        ) => {
            eventData = {
                characterId,
                eventType,
                data,
            };

            return eventData;
        };

    equipmentModel.deleteEquipment =
        async (equipmentId) => {
            deletedEquipmentId =
                equipmentId;
        };

    pool.query =
        async () => ({
            rows: [
                {
                    id: 20,
                    slot: "mainHand",
                    item_id: 4924,
                    item_link: "[Primitive Club]",
                },
            ],
        });

    try {
        const {
            syncEquipment,
        } = loadEquipmentSyncService();

        const events =
            await syncEquipment(
                4,
                {}
            );

        assert.equal(events.length, 1);

        assert.equal(
            deletedEquipmentId,
            20
        );

        assert.deepEqual(
            eventData.data,
            {
                slot: "mainHand",
                oldItemId: 4924,
                newItemId: null,
                oldItemLink: "[Primitive Club]",
                newItemLink: null,
            }
        );
    } finally {
        pool.query =
            originalPoolQuery;

        characterEventModel.createCharacterEvent =
            originalCreateCharacterEvent;

        equipmentModel.deleteEquipment =
            originalDeleteEquipment;
    }
});