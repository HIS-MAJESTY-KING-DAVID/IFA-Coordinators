const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });

app.use(cors());
app.use(bodyParser.json());

// Auth Middleware (Simplistic for the demo)
const adminAuth = (req, res, next) => {
    const { password } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (password && hash && bcrypt.compareSync(password, hash)) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
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
    const { data: coords } = await supabase.from('coordinators').select('id').limit(1);
    if (!Array.isArray(coords) || coords.length === 0) {
        const seeds = [
            { id: '1', name: 'Kollo David', stars: 1, available: true },
            { id: '2', name: 'Kollo Doris', stars: 1, available: true },
            { id: '3', name: 'Guy Ebamben', stars: 1, available: true }
        ];
        await supabase.from('coordinators').upsert(seeds, { onConflict: 'id' });
    }
    const { data: boards } = await supabase.from('boards').select('id').limit(1);
    if (!Array.isArray(boards) || boards.length === 0) {
        const now = new Date();
        const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { boards: genBoards, updatedCoordinators } = generateSchedule(
            [
                { id: '1', name: 'Kollo David', stars: 1, available: true },
                { id: '2', name: 'Kollo Doris', stars: 1, available: true },
                { id: '3', name: 'Guy Ebamben', stars: 1, available: true }
            ],
            startMonth,
            6
        );
        for (const b of genBoards) {
            const [y, m] = b.month.split('-').map(n => parseInt(n, 10));
            const monthStart = new Date(y, m - 1, 1).toISOString().slice(0, 10);
            await supabase.from('boards').upsert({ month_start: monthStart }, { onConflict: 'month_start' });
            const { data: row } = await supabase.from('boards').select('id').eq('month_start', monthStart).limit(1).maybeSingle();
            if (row && row.id) {
                for (const a of b.assignments) {
                    await supabase.from('assignments').upsert(
                        {
                            board_id: row.id,
                            date: a.date,
                            type: a.type,
                            coordinator_id: a.coordinatorId || null
                        },
                        { onConflict: 'board_id,date' }
                    );
                }
            }
        }
        await supabase.from('coordinators').upsert(updatedCoordinators, { onConflict: 'id' });
    }
};

app.get('/api/coordinators', async (req, res) => {
    try {
        const { data } = await supabase.from('coordinators').select('id,name,stars,available,phone').order('name');
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read coordinators' });
    }
});

app.post('/api/coordinators', adminAuth, async (req, res) => {
    try {
        const { coordinators } = req.body;
        const payload = (Array.isArray(coordinators) ? coordinators : []).map(c => ({
            id: String(c.id),
            name: String(c.name),
            stars: Number.isFinite(c.stars) ? c.stars : 1,
            available: c.available !== false,
            phone: c.phone ? String(c.phone) : null
        }));
        await supabase.from('coordinators').upsert(payload, { onConflict: 'id' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save coordinators' });
    }
});

app.get('/api/boards', async (req, res) => {
    try {
        const { data: boardsData } = await supabase.from('boards').select('id,month_start').order('month_start');
        const { data: assigns } = await supabase.from('assignments').select('board_id,date,type,coordinator_id,is_joined').order('date');
        const { data: coords } = await supabase.from('coordinators').select('id,name');
        const nameById = new Map((coords || []).map(c => [String(c.id), String(c.name)]));
        const byBoard = new Map();
        (assigns || []).forEach(a => {
            const list = byBoard.get(a.board_id) || [];
            list.push({
                date: a.date,
                coordinatorId: String(a.coordinator_id || ''),
                coordinatorName: nameById.get(String(a.coordinator_id || '')) || '',
                type: a.type,
                joined: !!a.is_joined
            });
            byBoard.set(a.board_id, list);
        });
        const result = (boardsData || []).map(b => {
            const d = new Date(b.month_start);
            const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return { month, assignments: byBoard.get(b.id) || [] };
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read boards' });
    }
});

app.post('/api/boards', adminAuth, async (req, res) => {
    try {
        const { boards } = req.body;
        const list = Array.isArray(boards) ? boards : [];
        const { data: coordsAll } = await supabase.from('coordinators').select('id,name');
        const nameById = new Map((coordsAll || []).map(c => [String(c.id), String(c.name)]));
        for (const b of list) {
            const [y, m] = String(b.month).split('-').map(n => parseInt(n, 10));
            const monthStart = new Date(y, m - 1, 1).toISOString().slice(0, 10);
            await supabase.from('boards').upsert({ month_start: monthStart }, { onConflict: 'month_start' });
            const { data: row } = await supabase.from('boards').select('id').eq('month_start', monthStart).limit(1).maybeSingle();
            if (!row || !row.id) continue;
            const toUpsert = (Array.isArray(b.assignments) ? b.assignments : []).map(a => ({
                board_id: row.id,
                date: a.date,
                type: a.type,
                coordinator_id: a.coordinatorId || null,
                is_joined: !!a.joined
            }));
            for (const r of toUpsert) {
                await supabase.from('assignments').upsert(r, { onConflict: 'board_id,date' });
                if (r.coordinator_id) {
                    await supabase.from('lead_logs').upsert({
                        date: r.date,
                        type: r.type,
                        coordinator_id: r.coordinator_id,
                        coordinator_name: nameById.get(String(r.coordinator_id || '')) || null,
                        month_start: monthStart
                    }, { onConflict: 'date,type' });
                }
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save boards' });
    }
});

app.post('/api/audit', adminAuth, async (req, res) => {
    try {
        const { event } = req.body;
        const payload = {
            action: String(event?.action || ''),
            resolution: event?.resolution ? String(event.resolution) : null,
            trigger: event?.trigger ? String(event.trigger) : null,
            month_start: event?.month_start ? String(event.month_start) : null,
            date: event?.date ? String(event.date) : null,
            type: event?.type ? String(event.type) : null,
            previous_coordinator_id: event?.previous_coordinator_id ? String(event.previous_coordinator_id) : null,
            previous_coordinator_name: event?.previous_coordinator_name ? String(event.previous_coordinator_name) : null,
            new_coordinator_id: event?.new_coordinator_id ? String(event.new_coordinator_id) : null,
            new_coordinator_name: event?.new_coordinator_name ? String(event.new_coordinator_name) : null
        };
        await supabase.from('audit_logs').insert(payload);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save audit' });
    }
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

app.listen(PORT, async () => {
    await seedDataIfNeeded();
    console.log(`Server running on http://localhost:${PORT}`);
});
