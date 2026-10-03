const {
    syncCharacters,
} = require("../services/characterSyncService");

const {
    findCharactersByUserId,
    findCharacterById,
} = require("../models/characterModel");

const {
    findEquipmentByCharacterId,
} = require("../models/equipmentModel");

const {
    findEventsByCharacterId,
    countEventsByCharacterId,
} = require("../models/characterEventModel");

const {
    findProfessionsWithRecipesByCharacterId,
} = require("../models/professionModel");

async function syncCharactersController(
    req,
    res
) {
    try {
        const { characters } = req.body;

        if (!Array.isArray(characters)) {
            return res.status(400).json({
                status: "error",
                message: "Characters must be an array",
            });
        }

        const results =
            await syncCharacters(
                req.user.id,
                characters
            );

        let createdCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;
        const events = [];

        for (const result of results) {

        if (result.action === "created") {
            createdCount++;
        }

        if (result.action === "updated") {
            updatedCount++;
        }

        if (result.action === "unchanged") {
            unchangedCount++;
        }

        if (Array.isArray(result.events)) {
            for (const event of result.events) {
                events.push({
                    ...event,
                    character_guid: result.character.guid,
                    character_name: result.character.name,
                });
            }
        }
    }

    const syncedCharacters = results.map(
    (result) => result.character
    );
    
    return res.json({
        status: "ok",
        message: "Characters synchronized",
        createdCount,
        updatedCount,
        unchangedCount,
        events,
        characters: syncedCharacters,
    });

    } catch (error) {
        console.error(
            "Sync characters error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

async function getCharacters(
    req,
    res
) {
    try {
        const characters =
            await findCharactersByUserId(
                req.user.id
            );

        return res.json({
            status: "ok",
            characters,
        });

    } catch (error) {
        console.error(
            "Get characters error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

async function getCharacter(req, res) {
    try {
        const characterId = Number(req.params.id);

        if (!Number.isInteger(characterId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid character id",
            });
        }

        const character = await findCharacterById(
            req.user.id,
            characterId
        );

        if (!character) {
            return res.status(404).json({
                status: "error",
                message: "Character not found",
            });
        }

        const professionRows =
            await findProfessionsWithRecipesByCharacterId(characterId);

            const professions = [];

            for (const row of professionRows) {
                let profession = professions.find(
                    (item) => item.id === row.profession_id
                );

                if (!profession) {
                    profession = {
                        id: row.profession_id,
                        skill_line: row.skill_line,
                        name: row.profession_name,
                        skill_level: row.skill_level,
                        max_skill_level: row.max_skill_level,
                        created_at: row.profession_created_at,
                        updated_at: row.profession_updated_at,
                        recipes: [],
                    };

                    professions.push(profession);
                }

                if (row.recipe_internal_id !== null) {
                    profession.recipes.push({
                        id: row.recipe_internal_id,
                        recipe_id: row.recipe_id,
                        name: row.recipe_name,
                        created_at: row.recipe_created_at,
                        updated_at: row.recipe_updated_at,
                    });
                }
            }
        
        const equipment = await findEquipmentByCharacterId(
            character.id
        );

        // const events = await findEventsByCharacterId(
        //     character.id
        // );

        return res.json({
            status: "ok",
            character: {
                ...character,
                professions,
                equipment,
                //events,
            },
        });
    } catch (error) {
        console.error("Get character error:", error);

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

async function getCharacterEvents(req, res) {
    try {
        const characterId = Number(req.params.id);

        if (!Number.isInteger(characterId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid character id",
            });
        }

        const character = await findCharacterById(
            req.user.id,
            characterId
        );

        if (!character) {
            return res.status(404).json({
                status: "error",
                message: "Character not found",
            });
        }

        const limit =
            req.query.limit === undefined
                ? 20
                : Number(req.query.limit);

        const offset =
            req.query.offset === undefined
                ? 0
                : Number(req.query.offset);

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                status: "error",
                message: "Limit must be an integer between 1 and 100",
            });
        }

        if (
            !Number.isInteger(offset) ||
            offset < 0
        ) {
            return res.status(400).json({
                status: "error",
                message: "Offset must be a positive integer",
            });
        }

        const eventsWithExtra = await findEventsByCharacterId(
            characterId,
            limit,
            offset
        );

        const total = await countEventsByCharacterId(characterId);

        const hasMore = eventsWithExtra.length > limit;

        const events = eventsWithExtra.slice(0, limit);

        return res.json({
            status: "ok",
            events,
            pagination: {
                limit,
                offset,
                hasMore,
                total,
            },
        });

    } catch (error) {
        console.error(
            "Get character events error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

module.exports = {
    syncCharacters:
        syncCharactersController,
    getCharacters,
    getCharacter,
    getCharacterEvents,
};