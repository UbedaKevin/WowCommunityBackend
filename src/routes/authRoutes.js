const express = require("express");
const authenticate = require("../middleware/authMiddleware");

const {
    register,
    login,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, (req, res) => {
    res.json({
        status: "ok",
        user: req.user,
        session: req.session,
    });
});

module.exports = router;