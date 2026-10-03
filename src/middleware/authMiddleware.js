const crypto = require("crypto");

const pool = require("../config/database");

async function authenticate(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                status: "error",
                message: "Authentication required",
            });
        }

        const [type, token] = authorization.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({
                status: "error",
                message: "Invalid authorization header",
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const result = await pool.query(
            `SELECT
                user_sessions.id AS session_id,
                user_sessions.user_id,
                user_sessions.expires_at,
                users.email
             FROM user_sessions
             INNER JOIN users
                ON users.id = user_sessions.user_id
             WHERE user_sessions.token_hash = $1`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Invalid access token",
            });
        }

        const session = result.rows[0];

        if (new Date(session.expires_at) <= new Date()) {
            return res.status(401).json({
                status: "error",
                message: "Access token expired",
            });
        }

        req.user = {
            id: session.user_id,
            email: session.email,
        };

        req.session = {
            id: session.session_id,
            expiresAt: session.expires_at,
        };

        next();

    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

module.exports = authenticate;