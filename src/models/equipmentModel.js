const pool = require("../config/database");


async function findEquipment(
    characterId,
    slot
) {
    const result = await pool.query(
        `SELECT *
         FROM equipment
         WHERE character_id = $1
           AND slot = $2`,
        [
            characterId,
            slot,
        ]
    );

    return result.rows[0] || null;
}


async function createEquipment(
    characterId,
    equipment
) {
    const result = await pool.query(
        `INSERT INTO equipment (
            character_id,
            slot,
            item_id,
            item_link
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
            characterId,
            equipment.slot,
            equipment.itemID,
            equipment.itemLink ?? null,
        ]
    );

    return result.rows[0];
}


async function updateEquipment(
    equipmentId,
    equipment
) {
    const result = await pool.query(
        `UPDATE equipment
         SET
            item_id = $1,
            item_link = $2,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [
            equipment.itemID,
            equipment.itemLink ?? null,
            equipmentId,
        ]
    );

    return result.rows[0];
}

async function deleteEquipment(equipmentId) {
    await pool.query(
        `DELETE FROM equipment
         WHERE id = $1`,
        [equipmentId]
    );
}

async function findEquipmentByCharacterId(characterId) {
    const result = await pool.query(
        `SELECT
            id,
            slot,
            item_id,
            item_link,
            updated_at
         FROM equipment
         WHERE character_id = $1
         ORDER BY slot ASC`,
        [characterId]
    );

    return result.rows;
}

module.exports = {
    findEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    findEquipmentByCharacterId,
};