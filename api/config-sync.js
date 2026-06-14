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
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Automatically reads incoming IP details from network proxies
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';

    const clientNameValue = req.body && req.body.name ? req.body.name : 'Unknown_Action';
    const clientNumberValue = req.body && req.body.rolled_num ? req.body.rolled_num : '0';

    // Writes the separate log entry down to your database document tree
    await db.collection('logs').add({
      name_or_event: clientNameValue,
      rolled_number: clientNumberValue,
      ip_address: ip.split(',')[0].trim(),
      location_resolved: `${decodeURIComponent(city)}, ${country}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ success: true, processedEvent: clientNameValue });

  } catch (err) {
    console.error('Firestore tracking log failed:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: 'Database tracking failed' });
  }
}
