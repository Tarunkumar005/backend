const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors'); // 🔥 ADD THIS

require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());

// Middleware
app.use(bodyParser.json());

// const conn = mysql.createConnection({
//   host: 'containers-us-west-123.railway.app', // ✅ changed from 'localhost'
//   user: 'root', 
//   password: '1123',
//   port: '3306',
//   database: 'xyz',
// });

// // // MySQL config
const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
});

// Register Route
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    const sql = 'INSERT INTO Users (Name, Email, Password) VALUES (?, ?, ?)';
    conn.query(sql, [username, email, password], (err, results) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send('Database error');
        }
        res.status(200).send('User added successfully');
    });
});

// Login system check
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM Users WHERE Email = ? AND Password = ?';
  conn.query(sql, [email, password], (err, results) => {
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
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).send('Database error');
        }
        res.status(200).json(results);
    });
});

// Add note Route
app.post("/addNote",(req , res) => {
    const { title , content , email} = req.body;
    const sql = 'INSERT INTO Notes (Title, Content, Useremail) VALUES (?, ?, ?)';
    conn.query(sql, [title, content, email], (err, results) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send('Database error');
        }
        res.status(200).send('User added successfully');
    });
});

// Get user notes
app.get("/getNotes", (req, res) => {
    const userEmail = req.query.email;
  
    if (!userEmail) {
      return res.status(400).send("Email is required");
    }
  
    const sql = "SELECT * FROM Notes WHERE Useremail = ?";
    conn.query(sql, [userEmail], (err, results) => {
      if (err) {
        console.error("Error fetching notes:", err);
        return res.status(500).send("Database error");
      }
  
      res.status(200).json(results);
    });
  });

//Route to delete note
  app.delete("/deleteNote/:id", (req, res) => {
    const noteId = req.params.id;
  
    const sql = "DELETE FROM Notes WHERE ID = ?";
    conn.query(sql, [noteId], (err, result) => {
      if (err) {
        console.error("Error deleting note:", err);
        return res.status(500).send("Database error");
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).send("Note not found");
      }
  
      res.status(200).send("Note deleted successfully");
    });
  });
  
// delete an account
  app.post("/verifyAndDelete", (req, res) => {
    const { email, password } = req.body;
  
    const sql = "SELECT * FROM Users WHERE Email = ?";
    conn.query(sql, [email], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Server error");
      }
  
      if (results.length === 0) return res.status(404).send("User not found");
  
      const user = results[0];
  
      // Plaintext password comparison
      if (user.Password !== password) {
        return res.status(401).send("Invalid credentials");
      }
  
      // Delete user if password matches
      const deleteSql = "DELETE FROM Users WHERE Email = ?";
      conn.query(deleteSql, [email], (err2) => {
        if (err2) {
          console.error("Delete error:", err2);
          return res.status(500).send("Delete failed");
        }
        return res.status(200).send("User deleted successfully");
      });
    });
  });
  
// Root route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
