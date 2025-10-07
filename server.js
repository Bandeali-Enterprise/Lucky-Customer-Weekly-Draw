const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const ADMINS = [
  { id: "Santosh", password: "Santosh@123" },
  { id: "Divya", password: "Divya@123" },
  { id: "Yashnil", password: "Yashnil@123" },
  { id: "Rani", password: "Rani@123" }
];

const app = express();
const db = new sqlite3.Database('./data.db');

// DB SETUP
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, phone TEXT, date TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS winner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, picked_at TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  )`);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files (optional for front-end)
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Lead Entry API
app.post('/api/lead', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).send('All fields required');
  db.get('SELECT * FROM leads WHERE phone = ?', [phone], (err, row) => {
    if (err) return res.status(500).send('DB Error');
    if (row) return res.status(409).json({ already: true });
    const date = new Date().toISOString();
    db.run('INSERT INTO leads (name, phone, date) VALUES (?, ?, ?)', [name, phone, date], function (err) {
      if (err) return res.status(500).send('DB Error');
      res.json({ success: true });
    });
  });
});

// Get Current Winner API
app.get('/api/winner', (req, res) => {
  db.get(`SELECT l.name, l.phone, w.picked_at
          FROM winner w
          JOIN leads l ON w.lead_id = l.id
          ORDER BY w.picked_at DESC
          LIMIT 1`, [], (err, row) => {
    if (err) return res.status(500).send('DB Error');
    res.json(row || {});
  });
});

// Admin Login API
app.post('/api/admin/login', (req, res) => {
  const { adminid, password } = req.body;
  const found = ADMINS.find(
    x => x.id === adminid && x.password === password
  );
  if (found) return res.json({ success: true });
  res.status(403).json({ error: 'Wrong ID or Password' });
});

// Get All Leads (admin)
app.get('/api/admin/leads', (req, res) => {
  db.all('SELECT * FROM leads ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).send('DB Error');
    res.json(rows);
  });
});

// Spin and Pick Winner (admin)
app.post('/api/admin/spin', (req, res) => {
  db.all('SELECT * FROM leads', (err, leads) => {
    if (err) return res.status(500).send('DB Error');
    if (!leads || !leads.length) return res.json({ error: 'No entries' });
    const winner = leads[Math.floor(Math.random() * leads.length)];
    const now = new Date().toISOString();
    db.serialize(() => {
      db.run('DELETE FROM winner', [], (err) => {
        db.run('INSERT INTO winner (lead_id, picked_at) VALUES (?, ?)', [winner.id, now], function (err) {
          if (err) return res.status(500).send('DB Error');
          res.json({ name: winner.name, phone: winner.phone });
        });
      });
    });
  });
});

// Reset Leads ("fresh file") Admin API
app.post('/api/admin/reset-leads', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM leads', [], function (err) {
      if (err) return res.status(500).send('DB Error');
      db.run('DELETE FROM winner', [], function (err) {
        if (err) return res.status(500).send('DB Error');
        res.json({ success: true });
      });
    });
  });
});

// Server Listen
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Lucky Draw server running on ' + port));
