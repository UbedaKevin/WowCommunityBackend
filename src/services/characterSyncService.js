const {
    findCharacter,
    createCharacter,
    updateCharacter,
} = require("../models/characterModel");

const {
    createCharacterEvent,
    findLevelUpEvent,
} = require("../models/characterEventModel");

const {
    syncProfessions,
} = require("./professionSyncService");

const {
    syncEquipment,
} = require("./equipmentSyncService");

const EVENT_TYPES =
    require("../constants/eventTypes");

function hasCharacterChanged(
    existingCharacter,
    character
) {
    return (
        existingCharacter.name !== character.name ||
        existingCharacter.guid !== character.guid ||
        existingCharacter.realm !== character.realm ||
        existingCharacter.level !== character.level ||
        existingCharacter.class !== character.class ||
        existingCharacter.class_file !== character.classFile ||
        existingCharacter.race !== character.race ||
        existingCharacter.race_file !== character.raceFile ||
        existingCharacter.race_id !== character.raceID ||
        existingCharacter.faction !== character.faction ||
        existingCharacter.guild_name !== (
            character.guild?.name ?? null
        ) ||
        existingCharacter.guild_rank !== (
            character.guild?.rank ?? null
        ) ||
        existingCharacter.guild_rank_index !== (
            character.guild?.rankIndex ?? null
        )
    );
}


async function syncCharacter(
    userId,
    character
) {
    const existingCharacter = await findCharacter(
        userId,
        character.guid
    );

    if (!existingCharacter) {
        const createdCharacter =
            await createCharacter(
                userId,
                character
            );

        await syncProfessions(
            createdCharacter.id,
            character.professions
        );

        await syncEquipment(
            createdCharacter.id,
            character.equipment
        );
        
        return {
            action: "created",
            character: createdCharacter,
            events: [],
        };
    }

    const changed =
        hasCharacterChanged(
            existingCharacter,
            character
        );

        await syncProfessions(
            existingCharacter.id,
            character.professions
        );

        await syncEquipment(
            existingCharacter.id,
            character.equipment
        );

    const levelEvents =
    character.levelTracking?.levels ?? [];

    if (!changed && levelEvents.length === 0) {
        return {
            action: "unchanged",
            character: existingCharacter,
            events: [],
        };
    }

const updatedCharacter =
    await updateCharacter(
        existingCharacter.id,
        character
    );

const events = [];


// LEVEL UP
// const levelEvents = character.levelTracking?.levels ?? [];

if (levelEvents.length > 0) {
    for (const levelEvent of levelEvents) {
        const existingLevelEvent = await findLevelUpEvent(
            existingCharacter.id,
            levelEvent.fromLevel,
            levelEvent.toLevel,
            levelEvent.timestamp
        );

        if (existingLevelEvent) {
            continue;
        }

        const event = await createCharacterEvent(
            existingCharacter.id,
            EVENT_TYPES.LEVEL_UP,
            {
                fromLevel: levelEvent.fromLevel,
                toLevel: levelEvent.toLevel,
                playtime: levelEvent.playtime,
                timestamp: levelEvent.timestamp,
            }
        );

        events.push(event);
    }
} else if (character.level > existingCharacter.level) {
    const event = await createCharacterEvent(
        existingCharacter.id,
        EVENT_TYPES.LEVEL_UP,
        {
            oldLevel: existingCharacter.level,
            newLevel: character.level,
        }
    );

    events.push(event);
}


// GUILD CHANGE

const oldGuild =
    existingCharacter.guild_name ?? null;

const newGuild =
    character.guild?.name ?? null;

if (oldGuild !== newGuild) {
    const event =
        await createCharacterEvent(
            existingCharacter.id,
            EVENT_TYPES.GUILD_CHANGED,
            {
                oldGuild,
                newGuild,
            }
        );

    events.push(event);
}

    return {
        action: "updated",
        character: {
            ...existingCharacter,
            ...character,
        },
        events,
    };
}


async function syncCharacters(
    userId,
    characters
) {
    const results = [];

    for (const character of characters) {
        const result =
            await syncCharacter(
                userId,
                character
            );

        results.push(result);
    }

    return results;
}


module.exports = {
    syncCharacter,
    syncCharacters,
};