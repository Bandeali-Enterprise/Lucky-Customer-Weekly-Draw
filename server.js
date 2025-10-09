const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json'); // Secret key local hi rakho

const ADMINS = [
  { id: "Santosh", password: "Santosh@123" },
  { id: "Divya", password: "Divya@123" },
  { id: "Yashnil", password: "Yashnil@123" },
  { id: "Rani", password: "Rani@123" }
];

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<your-firebase-project-id>.firebaseio.com" // Apne Firebase console se real URL daalein
});

const db = admin.database();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Customer Lead Entry
app.post('/api/lead', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).send('All fields required');
  const leadsRef = db.ref('leads');
  const snapshot = await leadsRef.orderByChild('phone').equalTo(phone).once('value');
  if (snapshot.exists()) return res.status(409).json({ already: true });
  await leadsRef.push({ name, phone, date: new Date().toISOString() });
  res.json({ success: true });
});

// Winner Section
app.get('/api/winner', async (req, res) => {
  const snapshot = await db.ref('winner').once('value');
  res.json(snapshot.val() || {});
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { adminid, password } = req.body;
  const found = ADMINS.find(x => x.id === adminid && x.password === password);
  if (found) return res.json({ success: true });
  res.status(403).json({ error: 'Wrong ID or Password' });
});

// Admin Leads Table
app.get('/api/admin/leads', async (req, res) => {
  const snapshot = await db.ref('leads').once('value');
  const leadsObj = snapshot.val() || {};
  // Object ko array me convert karo
  const leads = Object.values(leadsObj);
  res.json(leads);
});

// Spin Winner (Admin)
app.post('/api/admin/spin', async (req, res) => {
  const leadsSnapshot = await db.ref('leads').once('value');
  const leadsObj = leadsSnapshot.val();
  if (!leadsObj) return res.json({ error: 'No entries' });

  const leads = Object.values(leadsObj);
  const winner = leads[Math.floor(Math.random() * leads.length)];
  const picked_at = new Date().toISOString();
  await db.ref('winner').set({ name: winner.name, phone: winner.phone, picked_at });
  res.json({ name: winner.name, phone: winner.phone });
});

// Reset
app.post('/api/admin/reset-leads', async (req, res) => {
  await db.ref('leads').remove();
  await db.ref('winner').remove();
  res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Lucky Draw server running with Firebase DB on ' + port));
