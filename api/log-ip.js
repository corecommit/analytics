import admin from 'firebase-admin';
import { ipAddress, geolocation } from '@vercel/functions';

// Prevent duplicate initialization on Vercel hot-reloads
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Fixes potential newline formatting errors in Vercel environment keys
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 1. Extract geographic metadata from request context
    const ip = ipAddress(request) || '127.0.0.1';
    const geo = geolocation(request);
    const city = geo.city || 'Unknown';
    const country = geo.country || 'Unknown';

    // 2. Commit payload entry to Firestore "logs" collection
    await db.collection('logs').add({
      ip_address: ip,
      city: city,
      country: country,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Complete network handshake with user browser
    return new Response(
      JSON.stringify({ success: true, ip, location: `${city}, ${country}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Firestore Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server logging anomaly' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}