const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
app.use(bodyParser.json());

// ✅ MySQL Pool Configuration
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Keep connection alive (for Vercel or other serverless platforms)
setInterval(() => {
  pool.query('SELECT 1');
}, 300000); // every 5 minutes

console.log("Env config:", {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
});

// Root Route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Register Route
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  const sql = 'INSERT INTO Users (Name, Email, Password) VALUES (?, ?, ?)';
  pool.query(sql, [username, email, password], (err, results) => {
    if (err) {
      console.error('Error inserting user:', err);
      return res.status(500).send('Database error');
    }
    res.status(200).send('User added successfully');
  });
});

// Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM Users WHERE Email = ? AND Password = ?';
  pool.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).send('Database error');
    }

    if (results.length > 0) {
      res.status(200).json({ message: 'Login successful', user: results[0] });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  });
});

// Get Users Route
app.get('/users', (req, res) => {
  const sql = 'SELECT * FROM Users';
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).send('Database error');
    }
    res.status(200).json(results);
  });
});

// Add Note Route
app.post('/addNote', (req, res) => {
  const { title, content, email } = req.body;
  const sql = 'INSERT INTO Notes (Title, Content, Useremail) VALUES (?, ?, ?)';
  pool.query(sql, [title, content, email], (err, results) => {
    if (err) {
      console.error('Error inserting note:', err);
      return res.status(500).send('Database error');
    }
    res.status(200).send('Note added successfully');
  });
});

// Get Notes Route
app.get('/getNotes', (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).send("Email is required");
  }

  const sql = 'SELECT * FROM Notes WHERE Useremail = ?';
  pool.query(sql, [userEmail], (err, results) => {
    if (err) {
      console.error('Error fetching notes:', err);
      return res.status(500).send('Database error');
    }
    res.status(200).json(results);
  });
});

// Delete Note Route
app.delete('/deleteNote/:id', (req, res) => {
  const noteId = req.params.id;
  const sql = 'DELETE FROM Notes WHERE ID = ?';
  pool.query(sql, [noteId], (err, result) => {
    if (err) {
      console.error('Error deleting note:', err);
      return res.status(500).send('Database error');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Note not found');
    }
    res.status(200).send('Note deleted successfully');
  });
});

// Verify and Delete User Route
app.post('/verifyAndDelete', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM Users WHERE Email = ?';
  pool.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) return res.status(404).send('User not found');

    const user = results[0];

    if (user.Password !== password) {
      return res.status(401).send('Invalid credentials');
    }

    const deleteSql = 'DELETE FROM Users WHERE Email = ?';
    pool.query(deleteSql, [email], (err2) => {
      if (err2) {
        console.error('Delete error:', err2);
        return res.status(500).send('Delete failed');
      }
      res.status(200).send('User deleted successfully');
    });
  });
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
