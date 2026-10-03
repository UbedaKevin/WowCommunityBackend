const express = require("express");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const characterRoutes = require("./routes/characterRoutes");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "WoW Community API"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/characters", characterRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `WoW Community API running on http://localhost:${PORT}`
        );
    });
}

module.exports = app;