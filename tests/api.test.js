const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/server");

const crypto = require("crypto");

const pool = require("../src/config/database");

const {
    createServer,
} = require("node:http");

test("GET / retourne le statut de l'API", async () => {
    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    const response = await fetch(
        `http://localhost:${address.port}/`
    );

    const data = await response.json();

    assert.equal(
        response.status,
        200
    );

    assert.deepEqual(
        data,
        {
            status: "ok",
            service: "WoW Community API",
        }
    );

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

test("POST /api/characters/sync refuse une requête sans authentification", async () => {
    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    const response = await fetch(
        `http://localhost:${address.port}/api/characters/sync`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                characters: [],
            }),
        }
    );

    const data = await response.json();

    assert.equal(
        response.status,
        401
    );

    assert.deepEqual(
        data,
        {
            status: "error",
            message: "Authentication required",
        }
    );

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

test("POST /api/characters/sync refuse un token invalide", async () => {
    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    const response = await fetch(
        `http://localhost:${address.port}/api/characters/sync`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid-token",
            },
            body: JSON.stringify({
                characters: [],
            }),
        }
    );

    const data = await response.json();

    assert.equal(
        response.status,
        401
    );

    assert.deepEqual(
        data,
        {
            status: "error",
            message: "Invalid access token",
        }
    );

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

test("POST /api/characters/sync refuse un header Authorization mal formé", async () => {
    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    const response = await fetch(
        `http://localhost:${address.port}/api/characters/sync`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic invalid-token",
            },
            body: JSON.stringify({
                characters: [],
            }),
        }
    );

    const data = await response.json();

    assert.equal(
        response.status,
        401
    );

    assert.deepEqual(
        data,
        {
            status: "error",
            message: "Invalid authorization header",
        }
    );

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

test("GET /api/auth/me refuse une requête sans authentification", async () => {
    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    const response = await fetch(
        `http://localhost:${address.port}/api/auth/me`
    );

    const data = await response.json();

    assert.equal(
        response.status,
        401
    );

    assert.deepEqual(
        data,
        {
            status: "error",
            message: "Authentication required",
        }
    );

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

test("GET /api/auth/me refuse un token invalide", async () => {
    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    const response = await fetch(
        `http://localhost:${address.port}/api/auth/me`,
        {
            headers: {
                "Authorization": "Bearer invalid-token",
            },
        }
    );

    const data = await response.json();

    assert.equal(
        response.status,
        401
    );

    assert.deepEqual(
        data,
        {
            status: "error",
            message: "Invalid access token",
        }
    );

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

test("GET /api/auth/me accepte un token valide", async () => {
    const email = `api-test-${Date.now()}@example.com`;
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    let userId = null;
    let sessionId = null;

    try {
        const userResult = await pool.query(
            `INSERT INTO users (
                email,
                password_hash
            )
            VALUES ($1, $2)
            RETURNING id`,
            [
                email,
                "test-password-hash",
            ]
        );

        userId = userResult.rows[0].id;

        const sessionResult = await pool.query(
            `INSERT INTO user_sessions (
                user_id,
                token_hash,
                expires_at
            )
            VALUES (
                $1,
                $2,
                CURRENT_TIMESTAMP + INTERVAL '1 day'
            )
            RETURNING id`,
            [
                userId,
                tokenHash,
            ]
        );

        sessionId = sessionResult.rows[0].id;

        const server = createServer(app);

        await new Promise((resolve) => {
            server.listen(0, resolve);
        });

        const address = server.address();

        try {
            const response = await fetch(
                `http://localhost:${address.port}/api/auth/me`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            assert.equal(
                response.status,
                200
            );

            assert.equal(
                data.status,
                "ok"
            );

            assert.equal(
                data.user.id,
                userId
            );

            assert.equal(
                data.user.email,
                email
            );

            assert.equal(
                data.session.id,
                sessionId
            );
        } finally {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }
    } finally {
        if (sessionId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE id = $1`,
                [sessionId]
            );
        }

        if (userId !== null) {
            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }
    }
});

test("POST /api/auth/register puis /api/auth/login fonctionne", async () => {
    const email = `api-auth-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);
        assert.equal(registerData.status, "ok");
        assert.equal(registerData.user.email, email);

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);
        assert.equal(loginData.status, "ok");
        assert.equal(loginData.user.email, email);
        assert.ok(loginData.accessToken);
        assert.ok(loginData.expiresAt);

        await pool.query(
            `DELETE FROM user_sessions
             WHERE user_id = $1`,
            [registerData.user.id]
        );

        await pool.query(
            `DELETE FROM users
             WHERE id = $1`,
            [registerData.user.id]
        );
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("POST /api/auth/login retourne un token utilisable sur /api/auth/me", async () => {
    const email = `api-token-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();
    let userId = null;

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);

        userId = registerData.user.id;

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);
        assert.ok(loginData.accessToken);

        const meResponse = await fetch(
            `http://localhost:${address.port}/api/auth/me`,
            {
                headers: {
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
            }
        );

        const meData = await meResponse.json();

        assert.equal(meResponse.status, 200);
        assert.equal(meData.status, "ok");
        assert.equal(meData.user.id, userId);
        assert.equal(meData.user.email, email);
    } finally {
        if (userId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("GET /api/characters retourne les personnages de l'utilisateur connecté", async () => {
    const email = `api-characters-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();
    let userId = null;

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);

        userId = registerData.user.id;

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);
        assert.ok(loginData.accessToken);

        const charactersResponse = await fetch(
            `http://localhost:${address.port}/api/characters`,
            {
                headers: {
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
            }
        );

        const charactersData = await charactersResponse.json();

        assert.equal(charactersResponse.status, 200);
        assert.equal(charactersData.status, "ok");
        assert.ok(Array.isArray(charactersData.characters));
        assert.equal(charactersData.characters.length, 0);
    } finally {
        if (userId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("POST /api/characters/sync accepte une synchronisation authentifiée", async () => {
    const email = `api-sync-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();
    let userId = null;

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);

        userId = registerData.user.id;

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);
        assert.ok(loginData.accessToken);

        const syncResponse = await fetch(
            `http://localhost:${address.port}/api/characters/sync`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
                body: JSON.stringify({
                    characters: [],
                }),
            }
        );

        const syncData = await syncResponse.json();

        assert.equal(syncResponse.status, 200);
        assert.equal(syncData.status, "ok");
        assert.equal(syncData.message, "Characters synchronized");
        assert.equal(syncData.createdCount, 0);
        assert.equal(syncData.updatedCount, 0);
        assert.equal(syncData.unchangedCount, 0);
        assert.deepEqual(syncData.characters, []);
        assert.deepEqual(syncData.events, []);
    } finally {
        if (userId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("GET /api/characters retourne un personnage après synchronisation", async () => {
    const email = `api-character-list-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();
    let userId = null;

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);

        userId = registerData.user.id;

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);

        const character = {
            key: "Player-4619-TESTAPI01",
            name: "ApiTestCharacter",
            realm: "TestRealm",
            level: 80,
            class: "Warrior",
            classFile: "WARRIOR",
            race: "Human",
            raceFile: "Human",
            raceID: 1,
            faction: "Alliance",
            guild: null,
            guid: "Player-4619-TESTAPI01",
            professions: {},
            equipment: {},
        };

        const syncResponse = await fetch(
            `http://localhost:${address.port}/api/characters/sync`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
                body: JSON.stringify({
                    characters: [character],
                }),
            }
        );

        const syncData = await syncResponse.json();

        assert.equal(syncResponse.status, 200);
        assert.equal(syncData.status, "ok");
        assert.equal(syncData.createdCount, 1);
        assert.equal(syncData.characters.length, 1);

        const charactersResponse = await fetch(
            `http://localhost:${address.port}/api/characters`,
            {
                headers: {
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
            }
        );

        const charactersData = await charactersResponse.json();

        assert.equal(charactersResponse.status, 200);
        assert.equal(charactersData.status, "ok");
        assert.equal(charactersData.characters.length, 1);

        assert.equal(
            charactersData.characters[0].name,
            "ApiTestCharacter"
        );

        assert.equal(
            charactersData.characters[0].guid,
            "Player-4619-TESTAPI01"
        );
    } finally {
        if (userId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("GET /api/characters/:id retourne le personnage synchronisé", async () => {
    const email = `api-character-detail-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();
    let userId = null;

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);

        userId = registerData.user.id;

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);

        const character = {
            key: "Player-4619-DETAIL01",
            name: "ApiDetailCharacter",
            realm: "TestRealm",
            level: 80,
            class: "Warrior",
            classFile: "WARRIOR",
            race: "Human",
            raceFile: "Human",
            raceID: 1,
            faction: "Alliance",
            guild: null,
            guid: "Player-4619-DETAIL01",
            professions: {},
            equipment: {},
        };

        const syncResponse = await fetch(
            `http://localhost:${address.port}/api/characters/sync`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
                body: JSON.stringify({
                    characters: [character],
                }),
            }
        );

        const syncData = await syncResponse.json();

        assert.equal(syncResponse.status, 200);
        assert.equal(syncData.createdCount, 1);
        assert.equal(syncData.characters.length, 1);

        const characterId = syncData.characters[0].id;

        assert.ok(characterId);

        const characterResponse = await fetch(
            `http://localhost:${address.port}/api/characters/${characterId}`,
            {
                headers: {
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
            }
        );

        const characterData = await characterResponse.json();

        assert.equal(characterResponse.status, 200);
        assert.equal(characterData.status, "ok");

        assert.equal(
            characterData.character.id,
            characterId
        );

        assert.equal(
            characterData.character.name,
            "ApiDetailCharacter"
        );

        assert.equal(
            characterData.character.guid,
            "Player-4619-DETAIL01"
        );

        assert.ok(Array.isArray(characterData.character.professions));
        assert.ok(Array.isArray(characterData.character.equipment));
    } finally {
        if (userId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("GET /api/characters/:id/events retourne les événements du personnage", async () => {
    const email = `api-character-events-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();
    let userId = null;

    try {
        const registerResponse = await fetch(
            `http://localhost:${address.port}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const registerData = await registerResponse.json();

        assert.equal(registerResponse.status, 201);

        userId = registerData.user.id;

        const loginResponse = await fetch(
            `http://localhost:${address.port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const loginData = await loginResponse.json();

        assert.equal(loginResponse.status, 200);

        const character = {
            key: "Player-4619-EVENTAPI01",
            name: "ApiEventCharacter",
            realm: "TestRealm",
            level: 80,
            class: "Warrior",
            classFile: "WARRIOR",
            race: "Human",
            raceFile: "Human",
            raceID: 1,
            faction: "Alliance",
            guild: null,
            guid: "Player-4619-EVENTAPI01",
            professions: {},
            equipment: {},
        };

        const syncResponse = await fetch(
            `http://localhost:${address.port}/api/characters/sync`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
                body: JSON.stringify({
                    characters: [character],
                }),
            }
        );

        const syncData = await syncResponse.json();

        assert.equal(syncResponse.status, 200);
        assert.equal(syncData.createdCount, 1);

        const characterId = syncData.characters[0].id;

        assert.ok(characterId);

        // Création directe d'un événement de test.
        await pool.query(
            `INSERT INTO character_events (
                character_id,
                event_type,
                event_data
            )
            VALUES ($1, $2, $3)`,
            [
                characterId,
                "TEST_EVENT",
                JSON.stringify({
                    message: "API test event",
                }),
            ]
        );

        const eventsResponse = await fetch(
            `http://localhost:${address.port}/api/characters/${characterId}/events`,
            {
                headers: {
                    "Authorization": `Bearer ${loginData.accessToken}`,
                },
            }
        );

        const eventsData = await eventsResponse.json();

        assert.equal(eventsResponse.status, 200);
        assert.equal(eventsData.status, "ok");
        assert.ok(Array.isArray(eventsData.events));
        assert.equal(eventsData.events.length, 1);
        assert.equal(eventsData.events[0].event_type, "TEST_EVENT");
        assert.equal(eventsData.pagination.total, 1);
        assert.equal(eventsData.pagination.hasMore, false);
        assert.equal(eventsData.pagination.limit, 20);
        assert.equal(eventsData.pagination.offset, 0);
    } finally {
        if (userId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("GET /api/characters/:id refuse l'accès au personnage d'un autre utilisateur", async () => {
    const userAEmail = `api-isolation-a-${Date.now()}@example.com`;
    const userBEmail = `api-isolation-b-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    let userAId = null;
    let userBId = null;

    try {
        const registerUser = async (email) => {
            const response = await fetch(
                `http://localhost:${address.port}/api/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            assert.equal(response.status, 201);

            return data.user.id;
        };

        const loginUser = async (email) => {
            const response = await fetch(
                `http://localhost:${address.port}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            assert.equal(response.status, 200);
            assert.ok(data.accessToken);

            return data.accessToken;
        };

        userAId = await registerUser(userAEmail);
        userBId = await registerUser(userBEmail);

        const tokenA = await loginUser(userAEmail);
        const tokenB = await loginUser(userBEmail);

        const character = {
            key: "Player-4619-ISOLATION01",
            name: "IsolationCharacter",
            realm: "TestRealm",
            level: 80,
            class: "Warrior",
            classFile: "WARRIOR",
            race: "Human",
            raceFile: "Human",
            raceID: 1,
            faction: "Alliance",
            guild: null,
            guid: "Player-4619-ISOLATION01",
            professions: {},
            equipment: {},
        };

        const syncResponse = await fetch(
            `http://localhost:${address.port}/api/characters/sync`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    characters: [character],
                }),
            }
        );

        const syncData = await syncResponse.json();

        assert.equal(syncResponse.status, 200);
        assert.equal(syncData.createdCount, 1);

        const characterId = syncData.characters[0].id;

        const response = await fetch(
            `http://localhost:${address.port}/api/characters/${characterId}`,
            {
                headers: {
                    "Authorization": `Bearer ${tokenB}`,
                },
            }
        );

        const data = await response.json();

        assert.equal(response.status, 404);
        assert.deepEqual(data, {
            status: "error",
            message: "Character not found",
        });
    } finally {
        if (userAId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userAId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userAId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userAId]
            );
        }

        if (userBId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userBId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userBId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userBId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});

test("GET /api/characters/:id/events refuse les événements d'un autre utilisateur", async () => {
    const userAEmail = `api-events-isolation-a-${Date.now()}@example.com`;
    const userBEmail = `api-events-isolation-b-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    const server = createServer(app);

    await new Promise((resolve) => {
        server.listen(0, resolve);
    });

    const address = server.address();

    let userAId = null;
    let userBId = null;

    try {
        const registerUser = async (email) => {
            const response = await fetch(
                `http://localhost:${address.port}/api/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            assert.equal(response.status, 201);

            return data.user.id;
        };

        const loginUser = async (email) => {
            const response = await fetch(
                `http://localhost:${address.port}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            assert.equal(response.status, 200);
            assert.ok(data.accessToken);

            return data.accessToken;
        };

        userAId = await registerUser(userAEmail);
        userBId = await registerUser(userBEmail);

        const tokenA = await loginUser(userAEmail);
        const tokenB = await loginUser(userBEmail);

        const character = {
            key: "Player-4619-EVENTISO01",
            name: "EventIsolationCharacter",
            realm: "TestRealm",
            level: 80,
            class: "Warrior",
            classFile: "WARRIOR",
            race: "Human",
            raceFile: "Human",
            raceID: 1,
            faction: "Alliance",
            guild: null,
            guid: "Player-4619-EVENTISO01",
            professions: {},
            equipment: {},
        };

        const syncResponse = await fetch(
            `http://localhost:${address.port}/api/characters/sync`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    characters: [character],
                }),
            }
        );

        const syncData = await syncResponse.json();

        assert.equal(syncResponse.status, 200);
        assert.equal(syncData.createdCount, 1);

        const characterId = syncData.characters[0].id;

        await pool.query(
            `INSERT INTO character_events (
                character_id,
                event_type,
                event_data
            )
            VALUES ($1, $2, $3)`,
            [
                characterId,
                "TEST_EVENT",
                JSON.stringify({
                    message: "Private event",
                }),
            ]
        );

        const response = await fetch(
            `http://localhost:${address.port}/api/characters/${characterId}/events`,
            {
                headers: {
                    "Authorization": `Bearer ${tokenB}`,
                },
            }
        );

        const data = await response.json();

        assert.equal(response.status, 404);
        assert.deepEqual(data, {
            status: "error",
            message: "Character not found",
        });
    } finally {
        if (userAId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userAId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userAId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userAId]
            );
        }

        if (userBId !== null) {
            await pool.query(
                `DELETE FROM user_sessions
                 WHERE user_id = $1`,
                [userBId]
            );

            await pool.query(
                `DELETE FROM characters
                 WHERE user_id = $1`,
                [userBId]
            );

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [userBId]
            );
        }

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
});