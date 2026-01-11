const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const useSupabase = !!process.env.SUPABASE_URL && !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
const getSupabase = async () => {
    const mod = await import('@supabase/supabase-js');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    return mod.createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false } });
};

const getData = async (key) => {
    if (!useSupabase) {
        throw new Error('Database not configured');
    }
    const sb = await getSupabase();
    if (key === 'coordinators') {
        const { data } = await sb.from('coordinators').select('id,name,stars,available,phone').order('name');
        return Array.isArray(data) ? data : [];
    }
    if (key === 'boards') {
        const { data: boardsData } = await sb.from('boards').select('id,month_start').order('month_start');
        const { data: assigns } = await sb.from('assignments').select('board_id,date,type,coordinator_id,is_joined,is_youth_sunday').order('date');
        const { data: coords } = await sb.from('coordinators').select('id,name');
        const nameById = new Map((coords || []).map(c => [String(c.id), String(c.name)]));
        const byBoard = new Map();
        (assigns || []).forEach(a => {
            const list = byBoard.get(a.board_id) || [];
            list.push({
                date: a.date,
                coordinatorId: String(a.coordinator_id || ''),
                coordinatorName: nameById.get(String(a.coordinator_id || '')) || '',
                type: a.type,
                joined: !!a.is_joined,
                youthSunday: !!a.is_youth_sunday
            });
            byBoard.set(a.board_id, list);
        });
        const result = (boardsData || []).map(b => {
            const d = new Date(b.month_start);
            const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return { month, assignments: byBoard.get(b.id) || [] };
        });
        return result;
    }
    return [];
};

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        db_configured: useSupabase,
        env: process.env.NODE_ENV
    });
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const defaultPw = process.env.DEFAULT_ADMIN_PASSWORD || 'KDave237';
    const ok = hash ? (password && bcrypt.compareSync(password, hash)) : (password === defaultPw);
    if (ok) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.get('/api/coordinators', async (req, res) => {
    try {
        const data = await getData('coordinators');
        res.json(data);
    } catch {
        res.status(503).json({ error: 'Database not configured' });
    }
});

app.post('/api/coordinators', async (req, res) => {
    const { password, coordinators } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const defaultPw = process.env.DEFAULT_ADMIN_PASSWORD || 'KDave237';
    const authorized = hash ? (password && bcrypt.compareSync(password, hash)) : (password === defaultPw);
    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (useSupabase) {
        try {
            const sb = await getSupabase();
            const payload = (Array.isArray(coordinators) ? coordinators : []).map(c => ({
                id: String(c.id),
                name: String(c.name),
                stars: Number.isFinite(c.stars) ? c.stars : 1,
                available: c.available !== false,
                phone: c.phone ? String(c.phone) : null
            }));
            await sb.from('coordinators').upsert(payload, { onConflict: 'id' });
            return res.json({ success: true });
        } catch (err) {
            console.error('Supabase Save Error (coordinators):', err);
            return res.status(500).json({ error: 'Failed to save to database' });
        }
    }
    return res.status(503).json({ error: 'Database not configured' });
});

app.get('/api/boards', async (req, res) => {
    try {
        const data = await getData('boards');
        res.json(data);
    } catch {
        res.status(503).json({ error: 'Database not configured' });
    }
});

app.post('/api/boards', async (req, res) => {
    const { password, boards } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const defaultPw = process.env.DEFAULT_ADMIN_PASSWORD || 'KDave237';
    const authorized = hash ? (password && bcrypt.compareSync(password, hash)) : (password === defaultPw);
    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (useSupabase) {
        try {
            const sb = await getSupabase();
            const list = Array.isArray(boards) ? boards : [];
            const { data: coordsAll } = await sb.from('coordinators').select('id,name');
            const nameById = new Map((coordsAll || []).map(c => [String(c.id), String(c.name)]));
            for (const b of list) {
                const [y, m] = String(b.month).split('-').map(n => parseInt(n, 10));
                const monthStart = new Date(y, m - 1, 1).toISOString().slice(0, 10);
                await sb.from('boards').upsert({ month_start: monthStart }, { onConflict: 'month_start' });
                const { data: boardRow } = await sb.from('boards').select('id').eq('month_start', monthStart).limit(1).maybeSingle();
                if (!boardRow || !boardRow.id) continue;
                const toUpsert = (Array.isArray(b.assignments) ? b.assignments : []).map(a => ({
                    board_id: boardRow.id,
                    date: a.date,
                    type: a.type,
                    coordinator_id: a.coordinatorId || null,
                    is_joined: !!a.joined,
                    is_youth_sunday: !!a.youthSunday
                }));
                if (toUpsert.length > 0) {
                    for (const row of toUpsert) {
                        await sb.from('assignments').upsert(row, { onConflict: 'board_id,date' });
                        if (row.coordinator_id) {
                            const d = new Date(row.date);
                            const weekEnd = new Date(d);
                            const add = (7 - d.getDay()) % 7;
                            weekEnd.setDate(d.getDate() + add);
                            const now = new Date();
                            if (weekEnd <= now) {
                                await sb.from('lead_logs').upsert({
                                    date: row.date,
                                    type: row.type,
                                    coordinator_id: row.coordinator_id,
                                    coordinator_name: nameById.get(String(row.coordinator_id || '')) || null,
                                    month_start: monthStart
                                }, { onConflict: 'date,type' });
                            }
                        }
                    }
                }
            }
            return res.json({ success: true });
        } catch (err) {
            console.error('Supabase Save Error (boards):', err);
            return res.status(500).json({ error: 'Failed to save to database' });
        }
    }
    return res.status(503).json({ error: 'Database not configured' });
});

app.post('/api/audit', async (req, res) => {
    const { password, event } = req.body;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const defaultPw = process.env.DEFAULT_ADMIN_PASSWORD || 'KDave237';
    const authorized = hash ? (password && bcrypt.compareSync(password, hash)) : (password === defaultPw);
    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (useSupabase) {
        try {
            const sb = await getSupabase();
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
            await sb.from('audit_logs').insert(payload);
            return res.json({ success: true });
        } catch (err) {
            console.error('Supabase Save Error (audit):', err);
            return res.status(500).json({ error: 'Failed to save audit' });
        }
    }
    return res.status(503).json({ error: 'Database not configured' });
});

// Export for Vercel
module.exports = app;
