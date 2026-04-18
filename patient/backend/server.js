const express = require('express');
require('dotenv').config(); 

// Bring in our database connection
const db = require('./config/db'); 

const app = express();

app.get('/', (req, res) => {
    res.send("Hello! The MedBridge Server is officially awake!");
});

app.listen(5000, () => {
    console.log("🚀 Server is running on port 5000");
});