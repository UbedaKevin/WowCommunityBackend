const pool = require("../config/database");

async function findUserByEmail(email) {
    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    return result.rows[0] || null;
}

async function createUser(email, passwordHash) {
    const result = await pool.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [email, passwordHash]
    );

    return result.rows[0];
}

module.exports = {
    findUserByEmail,
    createUser,
};