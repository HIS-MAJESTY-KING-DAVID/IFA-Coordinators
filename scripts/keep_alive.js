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
  const tables = ['questions', 'coordinators'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (!error) {
      console.log(`keep-alive ok: table=${table} rows=${Array.isArray(data) ? data.length : 0}`);
      return;
    }
    console.warn(`keep-alive error: table=${table} msg=${error.message}`);
  }
  console.error('keep-alive failed for all tables');
  process.exit(2);
}

ping();
