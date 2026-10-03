const pool = require("../config/database");


async function findProfession(
    characterId,
    skillLine
) {
    const result = await pool.query(
        `SELECT *
         FROM professions
         WHERE character_id = $1
           AND skill_line = $2`,
        [
            characterId,
            skillLine,
        ]
    );

    return result.rows[0] || null;
}


async function createProfession(
    characterId,
    profession
) {
    const result = await pool.query(
        `INSERT INTO professions (
            character_id,
            skill_line,
            name,
            skill_level,
            max_skill_level
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
            characterId,
            profession.skillLine,
            profession.name,
            profession.skillLevel ?? null,
            profession.maxSkillLevel ?? null,
        ]
    );

    return result.rows[0];
}


async function updateProfession(
    professionId,
    profession
) {
    const result = await pool.query(
        `UPDATE professions
         SET
            name = $1,
            skill_level = $2,
            max_skill_level = $3,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
            profession.name,
            profession.skillLevel ?? null,
            profession.maxSkillLevel ?? null,
            professionId,
        ]
    );

    return result.rows[0];
}


async function findRecipe(
    professionId,
    recipeId
) {
    const result = await pool.query(
        `SELECT *
         FROM recipes
         WHERE profession_id = $1
           AND recipe_id = $2`,
        [
            professionId,
            recipeId,
        ]
    );

    return result.rows[0] || null;
}


async function createRecipe(
    professionId,
    recipe
) {
    const result = await pool.query(
        `INSERT INTO recipes (
            profession_id,
            recipe_id,
            name
        )
        VALUES ($1, $2, $3)
        RETURNING *`,
        [
            professionId,
            recipe.recipeID,
            recipe.name,
        ]
    );

    return result.rows[0];
}


async function updateRecipe(
    recipeDbId,
    recipe
) {
    const result = await pool.query(
        `UPDATE recipes
         SET
            name = $1,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [
            recipe.name,
            recipeDbId,
        ]
    );

    return result.rows[0];
}

async function deleteRecipe(recipeDbId) {
    await pool.query(
        `DELETE FROM recipes
         WHERE id = $1`,
        [recipeDbId]
    );
}

async function findProfessionsByCharacterId(characterId) {
    const result = await pool.query(
        `SELECT
            p.id,
            p.skill_line,
            p.name,
            p.skill_level,
            p.max_skill_level,
            p.created_at,
            p.updated_at
         FROM professions p
         WHERE p.character_id = $1
         ORDER BY p.name ASC`,
        [characterId]
    );

    return result.rows;
}

async function findRecipesByProfessionId(professionId) {
    const result = await pool.query(
        `SELECT
            id,
            recipe_id,
            name,
            created_at,
            updated_at
         FROM recipes
         WHERE profession_id = $1
         ORDER BY name ASC`,
        [professionId]
    );

    return result.rows;
}


async function findProfessionsWithRecipesByCharacterId(characterId) {
    const result = await pool.query(
        `SELECT
            p.id AS profession_id,
            p.skill_line,
            p.name AS profession_name,
            p.skill_level,
            p.max_skill_level,
            p.created_at AS profession_created_at,
            p.updated_at AS profession_updated_at,

            r.id AS recipe_internal_id,
            r.recipe_id,
            r.name AS recipe_name,
            r.created_at AS recipe_created_at,
            r.updated_at AS recipe_updated_at

         FROM professions p
         LEFT JOIN recipes r
            ON r.profession_id = p.id

         WHERE p.character_id = $1

         ORDER BY p.name ASC, r.name ASC`,
        [characterId]
    );

    return result.rows;
}

module.exports = {
    findProfession,
    createProfession,
    updateProfession,

    findRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    
    findProfessionsByCharacterId,
    findRecipesByProfessionId,
    findProfessionsWithRecipesByCharacterId,
};