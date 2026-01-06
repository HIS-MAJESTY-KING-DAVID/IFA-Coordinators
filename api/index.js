const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { kv } = require('@vercel/kv');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to get consistent data
const getData = async (key, fallbackFile) => {
    try {
        // Try Vercel KV first
        const data = await kv.get(key);
        if (data) return data;

        // Fallback to local JSON files (bundled during build)
        const filePath = path.join(process.cwd(), 'data', fallbackFile);
        if (await fs.pathExists(filePath)) {
            return await fs.readJson(filePath);
        }
    } catch (err) {
        console.error(`KV Error for ${key}:`, err);
    }
    return [];
};

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
