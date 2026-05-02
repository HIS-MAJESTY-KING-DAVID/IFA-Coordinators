const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Env helpers (reuse pattern from keep_alive.js)
// ---------------------------------------------------------------------------
function loadEnvFromServer() {
  const envPath = path.resolve(__dirname, '../server/.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) return;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

loadEnvFromServer();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or service/anon key');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Scheduling algorithm (mirrors client/src/utils/scheduler.ts)
// ---------------------------------------------------------------------------
function generateMonth(coordinators, monthStr) {
  const pool = JSON.parse(JSON.stringify(coordinators));
  const [year, monthIdx] = monthStr.split('-').map(Number);
  const month = monthIdx - 1; // 0-indexed
  const assignments = [];
  const usedInMonth = new Set();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay(); // 0=Sun, 5=Fri
    if (dow !== 5 && dow !== 0) continue;

    const type = dow === 5 ? 'Friday' : 'Sunday';
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const available = pool.filter(c => c.available && !usedInMonth.has(String(c.id)));

    if (available.length > 0) {
      // Weighted random pick
      const totalWeight = available.reduce((acc, c) => acc + (c.stars || 0) + 1, 0);
      let r = Math.random() * totalWeight;
      let pick = available[0];
      for (const c of available) {
        r -= (c.stars || 0) + 1;
        if (r <= 0) { pick = c; break; }
      }

      assignments.push({
        date: dateStr,
        coordinatorId: String(pick.id),
        coordinatorName: String(pick.name),
        type,
        joined: false,
        youthSunday: false
      });

      usedInMonth.add(String(pick.id));
      if (pick.stars > 0) pick.stars--;
    } else {
      assignments.push({
        date: dateStr,
        coordinatorId: '',
        coordinatorName: '',
        type,
        joined: false,
        youthSunday: false
      });
    }
  }

  return { assignments, updatedCoordinators: pool };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Determine next month
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = next.toISOString().slice(0, 10); // YYYY-MM-01

  console.log(`auto_generate: checking board for ${nextStr} (month_start=${monthStart})`);

  // Check if board already has assignments
  const { data: existingBoard } = await supabase
    .from('boards')
    .select('id')
    .eq('month_start', monthStart)
    .maybeSingle();

  if (existingBoard) {
    const { count } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', existingBoard.id);

    if (count && count > 0) {
      console.log(`auto_generate: ${nextStr} already has ${count} assignments — skipping`);
      return;
    }
  }

  // Read coordinators
  const { data: coordinators, error: cErr } = await supabase
    .from('coordinators')
    .select('id,name,stars,available');

  if (cErr || !coordinators || coordinators.length === 0) {
    console.error('auto_generate: failed to read coordinators', cErr);
    process.exit(1);
  }

  console.log(`auto_generate: generating ${nextStr} with ${coordinators.length} coordinators`);

  // Generate
  const { assignments, updatedCoordinators } = generateMonth(coordinators, nextStr);

  // Upsert board row
  await supabase.from('boards').upsert({ month_start: monthStart }, { onConflict: 'month_start' });
  const { data: boardRow } = await supabase
    .from('boards')
    .select('id')
    .eq('month_start', monthStart)
    .limit(1)
    .maybeSingle();

  if (!boardRow || !boardRow.id) {
    console.error('auto_generate: could not create/find board row');
    process.exit(1);
  }

  // Upsert assignments
  for (const a of assignments) {
    await supabase.from('assignments').upsert({
      board_id: boardRow.id,
      date: a.date,
      type: a.type,
      coordinator_id: a.coordinatorId || null,
      is_joined: false,
      is_youth_sunday: false
    }, { onConflict: 'board_id,date' });
  }

  // Update coordinator star credits
  for (const c of updatedCoordinators) {
    const original = coordinators.find(o => String(o.id) === String(c.id));
    if (original && c.stars !== original.stars) {
      await supabase.from('coordinators').update({ stars: c.stars }).eq('id', c.id);
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    action: 'auto_generate',
    trigger: 'github_action',
    month_start: monthStart,
    occurred_at: new Date().toISOString()
  });

  console.log(`auto_generate: created ${assignments.length} assignments for ${nextStr}`);
}

main().catch(err => {
  console.error('auto_generate: fatal error', err);
  process.exit(1);
});
