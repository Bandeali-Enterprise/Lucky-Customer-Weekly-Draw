const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const ADMINS = [
  { id: "ADMIN_PASS", password: "admin123" },
  { id: "BANDEALI_ENTERPRISES", password: "Bandealia123" }
];

const app = express();
const db = new sqlite3.Database('./data.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, phone TEXT, userid TEXT, date TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, week_date TEXT, picked_at TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  )`);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (no folder)
app.get('/style.css', (req,res) => res.sendFile(path.join(__dirname,'style.css')));
app.get('/index.html', (req,res) => res.sendFile(path.join(__dirname,'index.html')));
app.get('/admin.html', (req,res) => res.sendFile(path.join(__dirname,'admin.html')));
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'index.html')));

// APIs
app.post('/api/lead', (req, res) => {
  const { name, phone, userid } = req.body;
  if (!name || !phone || !userid) return res.status(400).send('All fields required');
  const date = new Date().toISOString();
  db.run(
    'INSERT INTO leads (name, phone, userid, date) VALUES (?,?,?,?)',
    [name, phone, userid, date],
    function (err) {
      if (err) return res.status(500).send('DB Error');
      res.json({ success: true });
    }
  );
});

// Winner of current week only
app.get('/api/winner', (req, res) => {
  function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }
  const thisMonday = getMonday(new Date());
  db.get(`SELECT w.id, l.name, l.phone, w.week_date, w.picked_at
          FROM winners w JOIN leads l ON w.lead_id = l.id
          WHERE w.week_date = ?
          ORDER BY w.picked_at DESC LIMIT 1`, [thisMonday], (err, row) => {
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
  function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }
  const now = new Date();
  const weekDate = getMonday(now);
  db.get('SELECT * FROM winners WHERE week_date=?', [weekDate], (err, exists) => {
    if (exists) {
      db.get(`SELECT l.name, l.phone FROM winners w JOIN leads l ON w.lead_id = l.id WHERE w.week_date=?`, [weekDate], (err, winner) => {
        res.json({ name: winner.name, phone: winner.phone, already: true });
      });
    } else {
      db.all('SELECT * FROM leads', (err, leads) => {
        if (!leads || !leads.length) return res.json({ error: 'No entries' });
        const winner = leads[Math.floor(Math.random() * leads.length)];
        db.run(
          'INSERT INTO winners (lead_id, week_date, picked_at) VALUES (?,?,?)',
          [winner.id, weekDate, now.toISOString()],
          function (err) {
            if (err) return res.status(500).send('DB Error');
            res.json({ name: winner.name, phone: winner.phone });
          }
        );
      });
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Lucky Draw server running on ' + port));

