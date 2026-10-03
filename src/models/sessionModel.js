const pool = require("../config/database");

async function createSession(userId, tokenHash, expiresAt) {
    const result = await pool.query(
        `INSERT INTO user_sessions
            (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, expires_at, created_at`,
        [userId, tokenHash, expiresAt]
    );

    return result.rows[0];
}

module.exports = {
    createSession,
};