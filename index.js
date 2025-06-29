import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config(); // Load env variables

const app = express();
const server = http.createServer(app);

// ✅ Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
  ],
  methods: ['GET', 'POST', 'UPDATE', 'DELETE'],
  credentials: true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// // ✅ MySQL DB Connection
// const connection = mysql.createConnection({
//   host: process.env.DB_HOST || "localhost",
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASSWORD || 1123,
//   database: process.env.DB_NAME || "chat",
// });

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

// ✅ Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Failed to connect to MySQL:", err);
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL database!");
    connection.release(); // Always release the connection back to pool
  }
});

// ✅ REST APIs
app.get('/', (req, res) => {
  res.send('Socket.IO server is running');
});

// ✅ Register route
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  const checkSql = 'SELECT * FROM Users WHERE Email = ?';
  pool.query(checkSql, [email], (err, results) => {
    if (err) {
      console.error('Error checking existing user:', err);
      return res.status(500).send('Database error');
    }

    if (results.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const insertSql = 'INSERT INTO Users (Name, Email, Password) VALUES (?, ?, ?)';
    pool.query(insertSql, [username, email, password], (err) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).send('Database error');
      }

      res.status(200).json({ message: 'User added successfully' });
    });
  });
});

// ✅ Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM Users WHERE Email = ?';
  pool.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    const user = results[0];
    if (user.Password !== password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.status(200).json({ message: 'Login successful', user });
  });
});

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

// ✅ Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.post('/update-socket', (req, res) => {
  const { email, socket_id } = req.body;

  if (!email) {
    return res.status(400).send('Email is required');
  }

  const sql = 'UPDATE Users SET Socket_id = ? WHERE Email = ?';
  pool.query(sql, [socket_id, email], (err) => {
    if (err) {
      console.error('Error updating socket ID:', err);
      return res.status(500).send('Database error');
    }
    res.status(200).send('Socket ID updated successfully');
  });
});

io.on('connection', (socket) => {
  // console.log(`⚡ Client connected: ${socket.id}`);

  // Store the email when "join" is received
  let userEmail = null;

  socket.on("join", ({ email }) => {
    console.log(`✅ User joined: ${email} with socket id ${socket.id}`);
    userEmail = email;

    const sql = 'UPDATE Users SET Socket_id = ? WHERE Email = ?';
    pool.query(sql, [socket.id, email], (err) => {
      if (err) console.error("Error updating socket id:", err);
      socket.broadcast.emit("user-list-updated");
    });
  });

  socket.on("message", ({ message, socketId }) => {
    console.log("📨 Message from:", socket.id, "to:", socketId);
    io.to(socketId).emit("recieve-message", { message, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    if (userEmail) {
      const sql = 'UPDATE Users SET Socket_id = NULL WHERE Email = ?';
      pool.query(sql, [userEmail], (err) => {
        if (err) {
          console.error("Error clearing socket id:", err);
        } else {
          socket.broadcast.emit("user-list-updated");
        }
      });
    }
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
