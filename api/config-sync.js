import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed - Use POST');
  }

  try {
    // AUTOMATIC IP GRAB: The server captures the connection IP info right here
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';

    // Extract the frontend elements
    const userName = req.body && req.body.name ? req.body.name : 'Anonymous';
    const finalScore = req.body && req.body.rolled_num ? req.body.rolled_num : '0';

    // Writes Name, Score, and IP together in a single row entry
    await db.collection('logs').add({
      name: userName,
      rolled_number: finalScore,
      ip_address: ip.split(',')[0].trim(), // Grabs the clean IP address
      city: decodeURIComponent(city),
      country: country,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ 
      success: true, 
      name: userName,
      ipLogged: ip.split(',')[0].trim()
    });

  } catch (err) {
    console.error('Firestore Error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: 'Database tracking anomaly' });
  }
}
