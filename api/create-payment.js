// Barion Payment Creation API
// This serverless function creates a payment request with Barion

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, email } = req.body;

        if (!userId || !email) {
            return res.status(400).json({ error: 'Missing userId or email' });
        }

        const paymentRequestId = `VS_${userId}_${Date.now()}`;
        
        // Barion API request
        const barionResponse = await fetch('https://api.barion.com/v2/Payment/Start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                POSKey: process.env.BARION_POS_KEY,
                PaymentType: 'Immediate',
                GuestCheckOut: true,
                FundingSources: ['All'],
                PaymentRequestId: paymentRequestId,
                OrderNumber: paymentRequestId,
                Locale: 'hu-HU',
                Currency: 'HUF',
                Transactions: [{
                    POSTransactionId: paymentRequestId,
                    Payee: process.env.BARION_PAYEE_EMAIL,
                    Total: 11111,
                    Items: [{
                        Name: 'Venturesuli - Startup Finanszírozás Tanfolyam',
                        Description: 'Interaktív online tanfolyam a startup tőkebevonásról',
                        Quantity: 1,
                        Unit: 'db',
                        UnitPrice: 11111,
                        ItemTotal: 11111
                    }]
                }],
                PayerHint: email,
                RedirectUrl: `https://venturesuli.hu/payment-success.html?userId=${userId}&paymentId=${paymentRequestId}`,
                CallbackUrl: `https://venturesuli.hu/api/payment-callback`
            })
        });

        const barionData = await barionResponse.json();

        if (barionData.Errors && barionData.Errors.length > 0) {
            console.error('Barion errors:', barionData.Errors);
            return res.status(400).json({ 
                error: 'Barion error', 
                details: barionData.Errors 
            });
        }

        // Return the gateway URL for redirect
        return res.status(200).json({
            success: true,
            paymentId: barionData.PaymentId,
            gatewayUrl: barionData.GatewayUrl
        });

    } catch (error) {
        console.error('Payment creation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
