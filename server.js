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

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, phone TEXT, date TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, week_date TEXT, picked_at TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  )`);
});

let lastDeletedMonday = "";
function autoDeleteLeadsIfMonday(req, res, next) {
  const today = new Date();
  const day = today.getDay();
  function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }
  if(day === 1) { // Monday
    const mondayStr = getMonday(today);
    if (lastDeletedMonday !== mondayStr) {
      db.run('DELETE FROM leads', () => {
        lastDeletedMonday = mondayStr;
        console.log("All leads deleted for new Monday:", mondayStr);
        next();
      });
      return;
    }
  }
  next();
}

app.use(autoDeleteLeadsIfMonday);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/style.css', (req,res) => res.sendFile(path.join(__dirname,'style.css')));
app.get('/index.html', (req,res) => res.sendFile(path.join(__dirname,'index.html')));
app.get('/admin.html', (req,res) => res.sendFile(path.join(__dirname,'admin.html')));
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'index.html')));

app.post('/api/lead', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).send('All fields required');

  // Only allow one entry per mobile this week (Monday-Sunday)
  function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }
  const mondayStr = getMonday(new Date());

  db.get('SELECT * FROM leads WHERE phone = ? AND date >= ?', [phone, mondayStr], (err, row) => {
    if (row) {
      return res.status(409).json({ already: true });
    }
    const date = new Date().toISOString();
    db.run(
      'INSERT INTO leads (name, phone, date) VALUES (?,?,?)',
      [name, phone, date],
      function (err) {
        if (err) return res.status(500).send('DB Error');
        res.json({ success: true });
      }
    );
  });
});

app.get('/api/winner', (req, res) => {
  db.get(`SELECT w.id, l.name, l.phone, w.week_date, w.picked_at
          FROM winners w JOIN leads l ON w.lead_id = l.id
          ORDER BY w.picked_at DESC LIMIT 1`, [], (err, row) => {
    res.json(row || {});
  });
});

app.post('/api/admin/login', (req, res) => {
  const { adminid, password } = req.body;
  const found = ADMINS.find(x => x.id === adminid && x.password === password);
  if (found) return res.json({ success: true });
  res.status(403).json({ error: 'Wrong ID or Password' });
});

app.get('/api/admin/leads', (req, res) => {
  db.all('SELECT * FROM leads ORDER BY id DESC', (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/admin/spin', (req, res) => {
  db.all('SELECT * FROM leads', (err, leads) => {
    if (!leads || !leads.length) return res.json({ error: 'No entries' });
    const winner = leads[Math.floor(Math.random() * leads.length)];
    const now = new Date();
    db.run(
      'INSERT INTO winners (lead_id, week_date, picked_at) VALUES (?,?,?)',
      [winner.id, now.toISOString().slice(0, 10), now.toISOString()],
      function (err) {
        if (err) return res.status(500).send('DB Error');
        res.json({ name: winner.name, phone: winner.phone });
      }
    );
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Lucky Draw server running on ' + port));
