const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');

const ADMINS = [
  { id: "Santosh", password: "Santosh@123" },
  { id: "Divya", password: "Divya@123" },
  { id: "Yashnil", password: "Yashnil@123" },
  { id: "Rani", password: "Rani@123" }
];

const app = express();
const LEADS_FILE = 'leads.json';
const WINNER_FILE = 'winner.json';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (if you have custom HTML/CSS)
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Helper: Read and Write leads.json and winner.json
function readLeads() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
}
function writeLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}
function readWinner() {
  if (!fs.existsSync(WINNER_FILE)) return {};
  return JSON.parse(fs.readFileSync(WINNER_FILE, 'utf-8'));
}
function writeWinner(winner) {
  fs.writeFileSync(WINNER_FILE, JSON.stringify(winner || {}, null, 2));
}

// Lead Entry API
app.post('/api/lead', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).send('All fields required');
  let leads = readLeads();
  if (leads.find(l => l.phone === phone)) return res.status(409).json({ already: true });
  leads.push({ name, phone, date: new Date().toISOString() });
  writeLeads(leads);
  res.json({ success: true });
});

// Winner API (get)
app.get('/api/winner', (req, res) => {
  const winner = readWinner();
  res.json(winner || {});
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
  res.json(readLeads());
});

// Spin and Pick Winner (admin)
app.post('/api/admin/spin', (req, res) => {
  let leads = readLeads();
  if (!leads.length) return res.json({ error: 'No entries' });
  const winner = leads[Math.floor(Math.random() * leads.length)];
  const picked_at = new Date().toISOString();
  writeWinner({ name: winner.name, phone: winner.phone, picked_at });
  res.json({ name: winner.name, phone: winner.phone });
});

// Reset Leads and Winner (fresh)
app.post('/api/admin/reset-leads', (req, res) => {
  writeLeads([]);
  writeWinner({});
  res.json({ success: true });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Lucky Draw (leads.json) server running on ' + port));
