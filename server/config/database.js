const mysql = require('mysql2/promise');
const env = process.env.NODE_ENV || 'development';
const config = require('./config')[env];
const pool = mysql.createPool({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database
(async () => {
  try {
    const conn = await pool.getConnection();
    
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    await conn.query(`USE ${config.database}`);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unique_id VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        designation VARCHAR(255),
        constituency VARCHAR(255),
        district VARCHAR(255),
        cell_number VARCHAR(255),
        image_url VARCHAR(500),
        qr_code_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    conn.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
})();
module.exports = pool;