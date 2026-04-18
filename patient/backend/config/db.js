const { Pool } = require('pg');
require('dotenv').config();

// Create a new connection pool using our .env secrets
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test the connection
pool.on('connect', () => {
    console.log('📦 Successfully connected to the PostgreSQL database!');
});

// Export this connection so other files can use it
module.exports = {
    query: (text, params) => pool.query(text, params),
};