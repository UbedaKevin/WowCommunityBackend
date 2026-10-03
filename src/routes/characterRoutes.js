const express = require("express");

const authenticate = require("../middleware/authMiddleware");

const {
    syncCharacters,
    getCharacters,
    getCharacter,
    getCharacterEvents,
} = require("../controllers/characterController");

const router = express.Router();

router.post(
    "/sync",
    authenticate,
    syncCharacters
);

router.get(
    "/",
    authenticate,
    getCharacters
);

router.get(
    "/:id/events",
    authenticate,
    getCharacterEvents
);

router.get(
    "/:id",
    authenticate,
    getCharacter
);

module.exports = router;