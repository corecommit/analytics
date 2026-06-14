import admin from 'firebase-admin';

// Prevent duplicate initialization on Vercel hot-reloads
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
  // Gracefully handle unexpected HTTP methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1. Extract the tracking data using native Node.js request headers
    // Vercel automatically populates these specific geo headers on every incoming request
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';

    // 2. Commit payload entry to Firestore "logs" collection
    await db.collection('logs').add({
      ip_address: ip.split(',')[0].trim(), // Clean up proxy chains if multiple IPs exist
      city: decodeURIComponent(city),       // Decodes special location string characters cleanly
      country: country,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Complete network handshake with user browser using standard Node.js res syntax
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ 
      success: true, 
      ip: ip.split(',')[0].trim(), 
      location: `${decodeURIComponent(city)}, ${country}` 
    });

  } catch (err) {
    console.error('Firestore Error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: 'Internal server logging anomaly' });
  }
}
