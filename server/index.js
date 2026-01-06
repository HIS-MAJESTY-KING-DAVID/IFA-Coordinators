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
const ROOT_COORDINATORS_FILE = path.join(__dirname, '..', 'data', 'coordinators.json');

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

const generateSchedule = (coordinators, startMonth, numMonths = 6) => {
    const boards = [];
    const currentCoordinators = JSON.parse(JSON.stringify(coordinators)).map(c => ({
        id: String(c.id),
        name: String(c.name),
        stars: typeof c.stars === 'number' ? c.stars : 1,
        available: c.available !== false
    }));
    const parts = startMonth.split('-').map(Number);
    let year = parts[0];
    let month = parts[1] - 1;
    for (let m = 0; m < numMonths; m++) {
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const assignments = [];
        const usedInMonth = new Set();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 0) {
                const type = dayOfWeek === 5 ? 'Friday' : 'Sunday';
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const pool = currentCoordinators.filter(c => c.available && !usedInMonth.has(c.id));
                if (pool.length > 0) {
                    const totalWeight = pool.reduce((acc, c) => acc + (c.stars || 0) + 1, 0);
                    let r = Math.random() * totalWeight;
                    let pick = pool[0];
                    for (const c of pool) {
                        r -= (c.stars || 0) + 1;
                        if (r <= 0) {
                            pick = c;
                            break;
                        }
                    }
                    assignments.push({
                        date: dateStr,
                        coordinatorId: pick.id,
                        coordinatorName: pick.name,
                        type
                    });
                    usedInMonth.add(pick.id);
                    if (pick.stars > 0) pick.stars--;
                }
            }
        }
        boards.push({ month: monthStr, assignments });
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
    }
    return { boards, updatedCoordinators: currentCoordinators };
};

const seedDataIfNeeded = async () => {
    let coords = await fs.readJson(COORDINATORS_FILE).catch(() => []);
    if (Array.isArray(coords) && coords.length < 6) {
        const exists = await fs.pathExists(ROOT_COORDINATORS_FILE);
        if (exists) {
            const rootCoords = await fs.readJson(ROOT_COORDINATORS_FILE).catch(() => []);
            if (Array.isArray(rootCoords) && rootCoords.length > 0) {
                await fs.writeJson(COORDINATORS_FILE, rootCoords);
                coords = rootCoords;
            }
        }
    }
    const boards = await fs.readJson(BOARDS_FILE).catch(() => []);
    const needsRegenerate =
        !Array.isArray(boards) ||
        boards.length === 0 ||
        boards.some(b => !Array.isArray(b.assignments) || b.assignments.length < 4);
    if (needsRegenerate) {
        const now = new Date();
        const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const result = generateSchedule(coords || [], startMonth, 6);
        await fs.writeJson(BOARDS_FILE, result.boards);
        await fs.writeJson(COORDINATORS_FILE, result.updatedCoordinators);
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
    await seedDataIfNeeded();
    console.log(`Server running on http://localhost:${PORT}`);
});
