const pool = require("../config/database");

async function createCharacterEvent(
    characterId,
    eventType,
    eventData
) {
    const result = await pool.query(
        `INSERT INTO character_events (
            character_id,
            event_type,
            event_data
        )
        VALUES ($1, $2, $3)
        RETURNING *`,
        [
            characterId,
            eventType,
            eventData,
        ]
    );

    return result.rows[0];
}

async function findEventsByCharacterId(
    characterId,
    limit = 20,
    offset = 0
) {
    const result = await pool.query(
        `SELECT
            id,
            event_type,
            event_data,
            created_at
         FROM character_events
         WHERE character_id = $1
         ORDER BY created_at DESC
         LIMIT $2
         OFFSET $3`,
        [characterId, limit + 1, offset]
    );

    return result.rows;
}

async function countEventsByCharacterId(characterId) {
    const result = await pool.query(
        `SELECT COUNT(*) AS total
         FROM character_events
         WHERE character_id = $1`,
        [characterId]
    );

    return Number(result.rows[0].total);
}

async function findLevelUpEvent(
    characterId,
    fromLevel,
    toLevel,
    timestamp
) {
    const result = await pool.query(
        `SELECT
            id,
            event_type,
            event_data,
            created_at
         FROM character_events
         WHERE character_id = $1
         AND event_type = $2
         AND event_data->>'fromLevel' = $3
         AND event_data->>'toLevel' = $4
         AND event_data->>'timestamp' = $5
         LIMIT 1`,
        [
            characterId,
            "LEVEL_UP",
            String(fromLevel),
            String(toLevel),
            String(timestamp),
        ]
    );

    return result.rows[0] || null;
}


module.exports = {
    createCharacterEvent,
    findEventsByCharacterId,
    countEventsByCharacterId,
    findLevelUpEvent,
};