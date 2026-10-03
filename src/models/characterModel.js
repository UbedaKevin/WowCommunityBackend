const pool = require("../config/database");

async function findCharacter(userId, guid) {
    const result = await pool.query(
        `SELECT *
         FROM characters
         WHERE user_id = $1
         AND guid = $2`,
        [userId, guid]
    );

    return result.rows[0] || null;
}

async function createCharacter(userId, character) {
    const result = await pool.query(
        `INSERT INTO characters (
            user_id,
            guid,
            name,
            realm,
            level,
            class,
            class_file,
            race,
            race_file,
            race_id,
            faction,
            guild_name,
            guild_rank,
            guild_rank_index
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING *`,
        [
            userId,
            character.guid,
            character.name,
            character.realm,
            character.level,
            character.class,
            character.classFile,
            character.race,
            character.raceFile,
            character.raceID,
            character.faction,
            character.guild?.name ?? null,
            character.guild?.rank ?? null,
            character.guild?.rankIndex ?? null,
        ]
    );

    return result.rows[0];
}


async function updateCharacter(characterId, character) {
    const result = await pool.query(
        `UPDATE characters
         SET
            name = $1,
            guid = $2,
            realm = $3,
            level = $4,
            class = $5,
            class_file = $6,
            race = $7,
            race_file = $8,
            race_id = $9,
            faction = $10,
            guild_name = $11,
            guild_rank = $12,
            guild_rank_index = $13,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $14
         RETURNING *`,
        [
            character.name,
            character.guid,
            character.realm,
            character.level,
            character.class,
            character.classFile,
            character.race,
            character.raceFile,
            character.raceID,
            character.faction,
            character.guild?.name ?? null,
            character.guild?.rank ?? null,
            character.guild?.rankIndex ?? null,
            characterId,
        ]
    );

    return result.rows[0];
}

async function findCharactersByUserId(userId) {
    const result = await pool.query(
        `SELECT
            id,
            guid,
            name,
            realm,
            level,
            class,
            class_file,
            race,
            race_file,
            race_id,
            faction,
            guild_name,
            guild_rank,
            guild_rank_index,
            created_at,
            updated_at
         FROM characters
         WHERE user_id = $1
         ORDER BY name ASC`,
        [userId]
    );

    return result.rows;
}

async function findCharacterById(userId, characterId) {
    const result = await pool.query(
        `SELECT
            id,
            guid,
            name,
            realm,
            level,
            class,
            class_file,
            race,
            race_file,
            race_id,
            faction,
            guild_name,
            guild_rank,
            guild_rank_index,
            created_at,
            updated_at
         FROM characters
         WHERE id = $1
           AND user_id = $2`,
        [characterId, userId]
    );

    return result.rows[0] || null;
}

async function deleteCharacter(characterId) {
    await pool.query(
        `DELETE FROM characters
         WHERE id = $1`,
        [characterId]
    );
}

module.exports = {
    findCharacter,
    createCharacter,
    updateCharacter,
    findCharactersByUserId,
    findCharacterById,
    deleteCharacter,
};