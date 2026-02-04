# Venturesuli - Telepítési Útmutató

## 📁 Projekt Struktúra

```
venture deals/
├── index.html        # Értékesítési oldal (hirdetésekből ide érkeznek)
├── auth.html         # Regisztráció és bejelentkezés
├── payment.html      # Fizetési oldal (Barion integráció)
├── app.html          # A tanfolyam (csak fizetett felhasználóknak)
├── index.html        # Eredeti standalone verzió (backup)
└── README.md         # Ez a fájl
```

## 🚀 Gyors Indítás (Fejlesztéshez)

1. Nyisd meg az `index.html` fájlt böngészőben
2. A fizetés jelenleg **teszt módban** van (automatikusan sikeres)
3. Firebase beállítás nélkül nem fog működni az auth/progress

---

## ⚙️ Firebase Beállítás

### 1. Firebase Projekt Létrehozása

1. Menj a [Firebase Console](https://console.firebase.google.com/)-ra
2. Kattints "Add project" / "Projekt hozzáadása"
3. Add meg a projekt nevét (pl. "venture-deals-course")
4. Google Analytics: opcionális (kikapcsolhatod)
5. Kattints "Create project"

### 2. Web App Hozzáadása

1. A projekt áttekintőben kattints a `</>` (Web) ikonra
2. App nickname: "Venture Deals Web"
3. Firebase Hosting: **NEM** kell bejelölni
4. Kattints "Register app"
5. **Másold ki a `firebaseConfig` objektumot!**

### 3. Authentication Bekapcsolása

1. Bal menü → "Authentication"
2. "Get started" gomb
3. "Sign-in method" tab
4. Engedélyezd:
   - **Email/Password** (első)
   - **Google** (opcionális, de ajánlott)

### 4. Firestore Database Létrehozása

1. Bal menü → "Firestore Database"
2. "Create database"
3. **Start in production mode** (fontos a biztonságért!)
4. Válaszd ki a legközelebbi régiót (europe-west1)

### 5. Firestore Szabályok Beállítása

Firestore → Rules tab → Cseréld ki erre:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Felhasználó csak a saját adatait olvashatja/írhatja
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Kattints "Publish"!

### 6. Firebase Config Beillesztése a Kódba

Nyisd meg ezeket a fájlokat és cseréld ki a `firebaseConfig` objektumot:
- `auth.html`
- `payment.html`
- `app.html`

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy.....................",
    authDomain: "venture-deals-course.firebaseapp.com",
    projectId: "venture-deals-course",
    storageBucket: "venture-deals-course.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

---

## 💳 Barion Fizetés Beállítás

### 1. Barion Fiók

1. Regisztrálj a [Barion.com](https://www.barion.com/hu/)-on
2. Töltsd ki az üzleti adatokat
3. Várd meg az aktiválást (1-3 nap)

### 2. API Kulcsok

1. Barion Dashboard → Fejlesztőknek
2. Másold ki:
   - **POSKey** (titkos, csak backend-en használd!)
   - **Publikus kulcs**

### 3. Backend Szükséges!

A Barion fizetéshez **backend szerver kell** (Node.js, PHP, stb.)!

A frontend NEM kezelheti a POSKey-t biztonsági okokból.

#### Egyszerű Node.js Backend Példa:

```javascript
// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BARION_POS_KEY = 'YOUR_BARION_POS_KEY';
const BARION_API = 'https://api.barion.com/v2';

// Fizetés indítása
app.post('/api/create-payment', async (req, res) => {
    const { userId, email } = req.body;
    
    const payment = {
        POSKey: BARION_POS_KEY,
        PaymentType: 'Immediate',
        GuestCheckOut: true,
        FundingSources: ['All'],
        PaymentRequestId: `VD_${userId}_${Date.now()}`,
        Locale: 'hu-HU',
        Currency: 'HUF',
        Transactions: [{
            POSTransactionId: `VD_${userId}_${Date.now()}`,
            Payee: 'your-barion-email@example.com',
            Total: 11111,
            Items: [{
                Name: 'Venturesuli - Startup Finanszírozás',
                Description: 'Interaktív online tanfolyam',
                Quantity: 1,
                Unit: 'db',
                UnitPrice: 11111,
                ItemTotal: 11111
            }]
        }],
        RedirectUrl: `https://yourdomain.com/payment-success.html?userId=${userId}`,
        CallbackUrl: 'https://yourdomain.com/api/barion-callback'
    };

    try {
        const response = await fetch(`${BARION_API}/Payment/Start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment)
        });
        
        const result = await response.json();
        
        if (result.PaymentId) {
            res.json({ 
                success: true, 
                paymentUrl: result.GatewayUrl 
            });
        } else {
            res.json({ success: false, error: result.Errors });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Barion callback (fizetés ellenőrzés)
app.post('/api/barion-callback', async (req, res) => {
    const { PaymentId } = req.body;
    
    // Ellenőrizd a fizetést a Barion API-n
    const response = await fetch(`${BARION_API}/Payment/GetPaymentState`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ POSKey: BARION_POS_KEY, PaymentId })
    });
    
    const result = await response.json();
    
    if (result.Status === 'Succeeded') {
        // Frissítsd a Firebase-t
        const userId = result.PaymentRequestId.split('_')[1];
        
        // Firebase Admin SDK-val frissítsd a hasPaid-et
        // await admin.firestore().collection('users').doc(userId).update({ hasPaid: true });
    }
    
    res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### 4. Alternatíva: Gumroad

Ha nem akarsz backend-et üzemeltetni, használhatod a [Gumroad](https://gumroad.com)-ot:

1. Hozz létre egy terméket a Gumroad-on
2. A "Content" mezőben add meg a tanfolyam URL-jét
3. A landing page-en a CTA linkeljen a Gumroad fizetési oldalra
4. Gumroad automatikusan kezeli a fizetést és hozzáférést

---

## 🌐 Hosting

### Opció 1: Firebase Hosting (Ajánlott)

```bash
# Firebase CLI telepítése
npm install -g firebase-tools

# Bejelentkezés
firebase login

# Inicializálás
firebase init hosting

# Deploy
firebase deploy
```

### Opció 2: Netlify (Egyszerű)

1. [netlify.com](https://netlify.com) → Sign up
2. "New site from Git" VAGY drag & drop a mappát
3. Azonnal kapsz egy URL-t

### Opció 3: Vercel

```bash
npm i -g vercel
vercel
```

---

## 📊 Firestore Struktúra

```
users/
  └── {userId}/
      ├── name: "Felhasználó Neve"
      ├── email: "email@example.com"
      ├── createdAt: Timestamp
      ├── hasPaid: true/false
      ├── paidAt: Timestamp
      ├── paymentMethod: "barion"
      └── progress/
          ├── completed: { 1: true, 2: true, ... }
          └── results: { 1: { score: 3, total: 3 }, ... }
```

---

## 🔒 Biztonsági Checklist

- [ ] Firebase Security Rules beállítva
- [ ] Barion POSKey CSAK backend-en van
- [ ] HTTPS használata (Firebase Hosting auto)
- [ ] Nem publikus a Firebase config (bár a frontend config-ok nem titkosak)
- [ ] Input validáció a regisztrációnál

---

## 📈 Facebook/LinkedIn Hirdetés Tippek

### Landing Page URL
```
https://yourdomain.com/
```

### UTM Paraméterek követéshez
```
https://yourdomain.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=venture_deals
```

### Célközönség
- Startup alapítók
- Tech vállalkozók
- Befektetést kereső cégek
- Startup inkubátor/accelerator résztvevők
- Business/entrepreneurship csoportok tagjai

### Hirdetés szöveg példa
```
🚀 Tőkét akarsz bevonni a startupodba?

Tanuld meg a VC tárgyalás fortélyait! 
✅ 6 interaktív modul
✅ Számítási példák
✅ Kvízek a tudás ellenőrzéséhez

💰 Egyszeri díj: 11 111 Ft
♾️ Örök hozzáférés

[Kezdd el most →]
```

---

## ❓ Hibaelhárítás

### "Firebase is not defined"
→ Ellenőrizd, hogy a Firebase SDK script tagek a HTML-ben vannak

### Nem működik a bejelentkezés
→ Firebase Console → Authentication → Sign-in method → engedélyezve van?

### Firestore permission denied
→ Ellenőrizd a Firestore Rules-t

### Nem menti a haladást
→ Firestore Rules engedi az írást? User be van jelentkezve?

---

## 📞 Támogatás

Ha elakadsz, ellenőrizd:
1. Firebase Console konzol hibák
2. Böngésző DevTools → Console
3. Network tab a kérések ellenőrzéséhez

---

**Készítette:** Az alkalmazás Brad Feld & Jason Mendelson "Venture Deals" könyve alapján készült.
