const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const COORDINATORS_FILE = path.join(DATA_DIR, 'coordinators.json');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

app.use(cors());
app.use(bodyParser.json());

// Auth Middleware (Simplistic for the demo)
const adminAuth = (req, res, next) => {
    const { password } = req.body;
    if (password === 'KDave237') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Helper to ensure data files exist
const ensureFiles = async () => {
    await fs.ensureDir(DATA_DIR);
    if (!await fs.pathExists(COORDINATORS_FILE)) {
        await fs.writeJson(COORDINATORS_FILE, []);
    }
    if (!await fs.pathExists(BOARDS_FILE)) {
        await fs.writeJson(BOARDS_FILE, []);
    }
};

app.get('/api/coordinators', async (req, res) => {
    try {
        const data = await fs.readJson(COORDINATORS_FILE);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read coordinators' });
    }
});

app.post('/api/coordinators', adminAuth, async (req, res) => {
    try {
        const { coordinators } = req.body;
        await fs.writeJson(COORDINATORS_FILE, coordinators);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save coordinators' });
    }
});

app.get('/api/boards', async (req, res) => {
    try {
        const data = await fs.readJson(BOARDS_FILE);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read boards' });
    }
});

app.post('/api/boards', adminAuth, async (req, res) => {
    try {
        const { boards } = req.body;
        await fs.writeJson(BOARDS_FILE, boards);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save boards' });
    }
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === 'KDave237') {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.listen(PORT, async () => {
    await ensureFiles();
    console.log(`Server running on http://localhost:${PORT}`);
});
