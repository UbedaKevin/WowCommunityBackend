const crypto = require("crypto");
const bcrypt = require("bcrypt");

const {
    findUserByEmail,
    createUser,
} = require("../models/userModel");

const {
    createSession,
} = require("../models/sessionModel");

async function register(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required",
            });
        }

        const existingUser = await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                status: "error",
                message: "Email already registered",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await createUser(
            email,
            passwordHash
        );

        return res.status(201).json({
            status: "ok",
            message: "User registered",
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.created_at,
            },
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required",
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password",
            });
        }

        const passwordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordValid) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password",
            });
        }

        const accessToken = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto
            .createHash("sha256")
            .update(accessToken)
            .digest("hex");

        const expiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        );

        const session = await createSession(
            user.id,
            tokenHash,
            expiresAt
        );

        return res.status(200).json({
            status: "ok",
            message: "Login successful",
            accessToken,
            expiresAt: session.expires_at,
            user: {
                id: user.id,
                email: user.email,
            },
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

module.exports = {
    register,
    login,
};