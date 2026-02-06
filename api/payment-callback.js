// Barion Payment Callback Handler
// This endpoint is called by Barion after payment completion

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = getFirestore();

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const paymentId = req.body?.PaymentId || req.query?.PaymentId;

        if (!paymentId) {
            return res.status(400).json({ error: 'Missing PaymentId' });
        }

        // Verify payment status with Barion
        const barionResponse = await fetch('https://api.barion.com/v2/Payment/GetPaymentState', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                POSKey: process.env.BARION_POS_KEY,
                PaymentId: paymentId
            })
        });

        const paymentData = await barionResponse.json();

        console.log('Barion payment status:', paymentData.Status);

        if (paymentData.Status === 'Succeeded') {
            // Extract userId from PaymentRequestId (format: VS_userId_timestamp)
            const paymentRequestId = paymentData.PaymentRequestId;
            const userId = paymentRequestId?.split('_')[1];

            if (userId) {
                // Update Firestore - mark user as paid
                await db.collection('users').doc(userId).update({
                    hasPaid: true,
                    paidAt: new Date(),
                    paymentMethod: 'barion',
                    barionPaymentId: paymentId,
                    paymentRequestId: paymentRequestId
                });

                console.log(`User ${userId} marked as paid`);
            }

            return res.status(200).json({ success: true, status: 'paid' });
        } else if (paymentData.Status === 'Canceled' || paymentData.Status === 'Failed') {
            return res.status(200).json({ success: false, status: paymentData.Status });
        } else {
            // Payment is still pending or in other state
            return res.status(200).json({ success: false, status: paymentData.Status });
        }

    } catch (error) {
        console.error('Callback error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
