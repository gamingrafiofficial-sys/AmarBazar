# AmarBazaar (আমারবাজার) - Deployment & Setup Guide

Hyperlocal Marketplace & Own-Fleet Delivery Management Platform for Bangladesh.

---

## 1. Architecture Overview
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Language Support:** Bilingual Bengali (`bn`) first with English (`en`) toggle, customized with Hind Siliguri typography and BDT (`৳`) currency formatting.
- **Backend & APIs:** Express full-stack runtime with Vite middleware in development; portable to Firebase Cloud Functions (`functions/src/index.ts`).
- **Database & Auth:** Firebase Authentication (Google popup) + Cloud Firestore provisioned under Enterprise instance (`deductive-helix-08p5g`).
- **Maps & Routing:** Google Maps Routes API v2 support with fallback to calibrated urban road topography ($1.38\times$ factor).
- **Pricing Formula:** $B + \lceil \max(0, d - \text{includedKm}) \rceil \times K$ (Configurable: Base fee ৳30 for 1st km, ৳10 per started km).
- **Financial Accounting:** Immutable double-entry ledger with COD reconciliation, 5% shop commission, shop payables, rider trip payouts, and cash handover tracking.

---

## 2. Environment Variables (.env)
```bash
# GEMINI_API_KEY (optional AI features)
GEMINI_API_KEY="your-key"

# APP_URL (Cloud Run or preview URL)
APP_URL="https://your-domain.run.app"

# GOOGLE_MAPS_API_KEY (Optional: enables live traffic and Google Routes API v2)
GOOGLE_MAPS_API_KEY="AIzaSy..."
```

---

## 3. Running the Test Suite
Run the 26 unit and integration test assertions covering delivery fees, state transitions, stock validation, RBAC, and COD reconciliation:
```bash
npm test
```

---

## 4. Production Deployment to Firebase
1. **Login & Initialize:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use deductive-helix-08p5g
   ```
2. **Deploy Firestore Security Rules & Indexes:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
3. **Deploy Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```
4. **Deploy Web Hosting:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 5. Security & RBAC Invariants
1. Customer cannot alter order totals, unit prices, or delivery fees.
2. Single-shop cart constraint is validated on both client and backend API.
3. Shopkeepers can only update products and confirm/reject orders for their owned shop.
4. Terminal order states (`delivered`, `cancelled`, `shop_rejected`) are immutable.
5. All ledger entries (`ledgerEntries`) are strictly append-only.
