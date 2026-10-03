const {
    findEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
} = require("../models/equipmentModel");

const {
    createCharacterEvent,
} = require("../models/characterEventModel");

const pool = require("../config/database");

const EVENT_TYPES =
    require("../constants/eventTypes");

async function syncEquipment(
    characterId,
    equipment
) {

    const currentEquipment = equipment || {};

    const events = [];

    for (const [slot, equipmentData] of Object.entries(
        currentEquipment
    )) {
        const item = {
            slot,
            itemID: equipmentData.itemID,
            itemLink: equipmentData.itemLink,
        };

        const existingEquipment =
            await findEquipment(
                characterId,
                slot
            );

        if (!existingEquipment) {
            await createEquipment(
                characterId,
                item
            );

            continue;
        }

        if (
            existingEquipment.item_id !==
            item.itemID
        ) {
            const event =
                await createCharacterEvent(
                    characterId,
                    EVENT_TYPES.EQUIPMENT_CHANGED,
                    {
                        slot,
                        oldItemId:
                            existingEquipment.item_id,
                        newItemId:
                            item.itemID,
                        oldItemLink:
                            existingEquipment.item_link,
                        newItemLink:
                            item.itemLink,
                    }
                );

            events.push(event);
        }

        await updateEquipment(
            existingEquipment.id,
            item
        );
    }

    const result = await pool.query(
        `SELECT *
         FROM equipment
         WHERE character_id = $1`,
        [characterId]
    );

    const currentSlots =
        new Set(
            Object.keys(currentEquipment)
        );

    for (const equipmentDb of result.rows) {
        if (!currentSlots.has(equipmentDb.slot)) {
            const event =
                await createCharacterEvent(
                    characterId,
                    EVENT_TYPES.EQUIPMENT_CHANGED,
                    {
                        slot: equipmentDb.slot,
                        oldItemId: equipmentDb.item_id,
                        newItemId: null,
                        oldItemLink: equipmentDb.item_link,
                        newItemLink: null,
                    }
                );

            events.push(event);

            await deleteEquipment(
                equipmentDb.id
            );
        }
    }

    return events;
}


module.exports = {
    syncEquipment,
};