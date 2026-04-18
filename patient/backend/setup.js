// medtech/patient/backend/setup.js
const db = require('./config/db'); // Bring in our database connection

const createTables = async () => {
    // This is the SQL command to create our filing cabinet
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            med_id VARCHAR(20) UNIQUE NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            phone VARCHAR(20) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        console.log("Building the database tables...");
        // Send the command to the database
        await db.query(createUsersTable);
        console.log("✅ Users table created successfully!");
    } catch (error) {
        console.error("❌ Error creating table:", error.message);
    } finally {
        // Close the connection so the script finishes
        process.exit(); 
    }
};

// Run the function
createTables();