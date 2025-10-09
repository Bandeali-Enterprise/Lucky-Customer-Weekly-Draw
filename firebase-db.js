const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');  // Apni Firebase service account json ka path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://bandealiluckydraw-default-rtdb.asia-southeast1.firebasedatabase.app'  // Apni Firebase database url
});

const db = admin.database();

// Lead add karne ke liye function
async function addLead(name, phone) {
  const leadsRef = db.ref('leads');
  const snapshot = await leadsRef.orderByChild('phone').equalTo(phone).once('value');
  if (snapshot.exists()) throw new Error('Phone already exists');
  await leadsRef.push({ name, phone, date: new Date().toISOString() });
  return true;
}

// Leads read karne ke liye function
async function getLeads() {
  const snapshot = await db.ref('leads').once('value');
  return snapshot.val() || {};
}

// Winner add karne ke liye function
async function addWinner(name, phone) {
  const winnersRef = db.ref('winners');
  await winnersRef.push({ name, phone, picked_at: new Date().toISOString() });
  return true;
}

// Winners read karne ke liye function
async function getWinners() {
  const snapshot = await db.ref('winners').once('value');
  return snapshot.val() || {};
}

module.exports = { addLead, getLeads, addWinner, getWinners };
