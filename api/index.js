const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { kv } = require('@vercel/kv');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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

const SEED_COORDINATORS = [
    { "id": "1", "name": "Kollo David", "stars": 1, "available": true },
    { "id": "2", "name": "Kollo Doris", "stars": 1, "available": true },
    { "id": "3", "name": "Guy Ebamben", "stars": 1, "available": true },
    { "id": "4", "name": "Euinice Ebamben", "stars": 1, "available": true },
    { "id": "5", "name": "Mama CAROLINE", "stars": 1, "available": true },
    { "id": "6", "name": "Rémeiel", "stars": 1, "available": true },
    { "id": "7", "name": "MPILLA Coordinator 1", "stars": 1, "available": true },
    { "id": "8", "name": "MPILLA Coordinator 2", "stars": 1, "available": true },
    { "id": "9", "name": "Vanina Ndoumbe", "stars": 1, "available": true },
    { "id": "10", "name": "Jethro", "stars": 1, "available": true },
    { "id": "11", "name": "Edy", "stars": 1, "available": true },
    { "id": "12", "name": "Elie Phanuel", "stars": 1, "available": true },
    { "id": "13", "name": "Fabrice", "stars": 1, "available": true },
    { "id": "14", "name": "FEUTSAP Coordinator 1", "stars": 1, "available": true },
    { "id": "15", "name": "FEUTSAP Coordinator 2", "stars": 1, "available": true },
    { "id": "16", "name": "Mama AWAM", "stars": 1, "available": true },
    { "id": "17", "name": "Yvan AWAM", "stars": 1, "available": true },
    { "id": "18", "name": "Camille", "stars": 1, "available": true }
];

// Helper to get consistent data
const getData = async (key, fallbackFile) => {
    try {
        // Try Vercel KV first (if configured)
        if (process.env.KV_REST_API_URL) {
            const data = await kv.get(key);
            if (data && Array.isArray(data) && data.length > 0) return data;
        }

        // Fallback to local JSON files
        // We try multiple possible locations for Vercel compatibility
        const possiblePaths = [
            path.join(process.cwd(), 'data', fallbackFile),
            path.join(__dirname, '..', 'data', fallbackFile)
        ];

        for (const filePath of possiblePaths) {
            if (await fs.pathExists(filePath)) {
                const content = await fs.readJson(filePath);
                if (content && Array.isArray(content) && content.length > 0) return content;
            }
        }

        // If even fallback files are missing, use hardcoded seeds
        if (key === 'coordinators') return SEED_COORDINATORS;

        // If even fallback files are missing (like boards.json in repo)
        if (key === 'boards') {
            const coords = await getData('coordinators', 'coordinators.json');
            if (coords && coords.length > 0) {
                const now = new Date();
                const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const { boards } = generateSchedule(coords, startMonth, 6);
                return boards;
            }
        }
    } catch (err) {
        console.error(`KV/File Error for ${key}:`, err);
    }
    return [];
};

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        kv_configured: !!process.env.KV_REST_API_URL,
        env: process.env.NODE_ENV
    });
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (password && hash && bcrypt.compareSync(password, hash)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.get('/api/coordinators', async (req, res) => {
    const data = await getData('coordinators', 'coordinators.json');
    res.json(data);
});

app.post('/api/coordinators', async (req, res) => {
    const { password, coordinators } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (password && hash && bcrypt.compareSync(password, hash)) {
        await kv.set('coordinators', coordinators);
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

app.get('/api/boards', async (req, res) => {
    const data = await getData('boards', 'boards.json');
    res.json(data);
});

app.post('/api/boards', async (req, res) => {
    const { password, boards } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (password && hash && bcrypt.compareSync(password, hash)) {
        await kv.set('boards', boards);
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// Export for Vercel
module.exports = app;
