const { Pool } = require('pg');

// Render provides DATABASE_URL automatically when you attach a Postgres
// instance to your Web Service. Locally, set it in a .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

module.exports = pool;
