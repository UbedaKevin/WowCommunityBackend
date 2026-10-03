const pool = require("../config/database");

const {
    createCharacterEvent,
} = require("../models/characterEventModel");

const {
    findProfession,
    createProfession,
    updateProfession,

    findRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
} = require("../models/professionModel");

const EVENT_TYPES =
    require("../constants/eventTypes");

async function syncProfession(
    characterId,
    profession
) {
    let professionDb =
        await findProfession(
            characterId,
            profession.skillLine
        );

    if (!professionDb) {
        professionDb =
            await createProfession(
                characterId,
                profession
            );

        await createCharacterEvent(
            characterId,
            EVENT_TYPES.PROFESSION_LEARNED,
            {
                profession: profession.name,
                skillLine: profession.skillLine,
            }
        );
    } else {
        professionDb =
            await updateProfession(
                professionDb.id,
                profession
            );
    }

    const recipes = profession.recipes || {};

    for (const [recipeID, recipeData] of Object.entries(recipes)) {
        const recipe = {
            recipeID: Number(recipeID),
            name: recipeData.name,
        };

        const recipeDb =
            await findRecipe(
                professionDb.id,
                recipe.recipeID
            );

        if (!recipeDb) {
            await createRecipe(
                professionDb.id,
                recipe
            );

            await createCharacterEvent(
                characterId,
                EVENT_TYPES.RECIPE_LEARNED,
                {
                    profession: profession.name,
                    recipeId: recipe.recipeID,
                    recipeName: recipe.name,
                }
            );
        } else {
            await updateRecipe(
                recipeDb.id,
                recipe
            );
        }
    }

    if (profession.recipesCollected === true) {
        const result = await pool.query(
            `SELECT *
             FROM recipes
             WHERE profession_id = $1`,
            [professionDb.id]
        );

        const knownRecipeIDs =
            new Set(
                Object.keys(recipes)
                    .map(Number)
            );

        for (const recipeDb of result.rows) {
            if (!knownRecipeIDs.has(recipeDb.recipe_id)) {
                await deleteRecipe(recipeDb.id);
            }
        }
    }

    return professionDb;
}


async function syncProfessions(
    characterId,
    professions
) {
    for (const profession of Object.values(professions || {})) {
        await syncProfession(
            characterId,
            profession
        );
    }
}


module.exports = {
    syncProfession,
    syncProfessions,
}