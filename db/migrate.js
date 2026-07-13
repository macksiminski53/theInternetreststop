// Run this once (npm run migrate) to create tables.
// Render note: you can also just run this locally against your
// Render Postgres external connection string before first deploy,
// or run it via the Render Shell after the web service is up.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Running migration...');
  await pool.query(schema);
  console.log('Migration complete. Tables ready: users, saved_links');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
