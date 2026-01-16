const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvFromServer() {
  const envPath = path.resolve(__dirname, '../server/.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) return;
    const key = m[1];
    const val = m[2];
    if (!process.env[key]) process.env[key] = val;
  });
}

if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  loadEnvFromServer();
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or service/anon key');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function ping() {
  try {
    // 1. First try to update a timestamp on a dedicated keep_alive table if it exists
    // If not, we fall back to reading, but reading often isn't enough for some PaaS idlers.
    // Ideally, we should have a 'system_health' or 'audit_logs' insert.
    
    // Let's try to insert a log entry into 'audit_logs' as a "heartbeat"
    const { error: insertError } = await supabase.from('audit_logs').insert({
      action: 'keep_alive_ping',
      trigger: 'github_action',
      occurred_at: new Date().toISOString()
    });

    if (!insertError) {
      console.log('keep-alive ok: inserted heartbeat into audit_logs');
      return;
    }

    // Fallback: Just read from coordinators if write fails (e.g. permission or table missing)
    console.warn(`keep-alive write failed (${insertError.message}), falling back to read...`);
    const { data, error } = await supabase.from('coordinators').select('count', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`keep-alive ok: read coordinators count=${data}`);
      return;
    }
    
    throw new Error(`Read fallback failed: ${error.message}`);
    
  } catch (err) {
    console.error('keep-alive critical failure:', err);
    process.exit(1);
  }
}

ping();
