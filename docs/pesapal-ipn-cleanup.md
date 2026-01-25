# Pesapal IPN Cleanup Guide

## Current Situation

Pesapal LIVE environment currently has **2 active IPN entries**:

1. **Old IPN (to be removed)**:
   - URL: `https://sunmegalimited.onrender.com/api/pesapal/ipn`
   - ipn_id: `c649c87f-5c2b-4d30-bbd0-dada8fc7ee5b`
   - Status: Active (should be deactivated/deleted)

2. **Production IPN (to keep)**:
   - URL: `https://api.sunmega.co.ke/api/pesapal/ipn`
   - ipn_id: `b621cb1b-fe6c-4046-947c-dad1de88556c`
   - Status: Active (this is the one we want)

## Why Multiple IPNs Exist

The old IPN was registered when the backend was hosted on Render (`sunmegalimited.onrender.com`). After migrating to the production domain (`api.sunmega.co.ke`), a new IPN was registered, but the old one was not removed from the Pesapal dashboard.

## Required Configuration

**Environment Variable** (`backend/.env`):
```
PESAPAL_IPN_ID=b621cb1b-fe6c-4046-947c-dad1de88556c
```

**Why this matters**: When submitting orders via `SubmitOrderRequest`, the `notification_id` field tells Pesapal which IPN URL to call. The `notification_id` must match the `ipn_id` of the IPN entry you want to use.

**Code Location**: `backend/controllers/orderController.js:50`
```javascript
notification_id: process.env.PESAPAL_IPN_ID,
```

## Manual Cleanup Steps (Pesapal Dashboard)

1. Log into Pesapal dashboard (LIVE environment)
2. Navigate to IPN/Webhook settings
3. Locate the IPN entry with URL: `https://sunmegalimited.onrender.com/api/pesapal/ipn`
4. **Deactivate or Delete** this IPN entry
5. Verify only the production IPN remains active:
   - URL: `https://api.sunmega.co.ke/api/pesapal/ipn`
   - ipn_id: `b621cb1b-fe6c-4046-947c-dad1de88556c`

**Note**: Do not delete the production IPN entry.

## Verification

After cleanup, verify the configuration:

```bash
cd backend
npm run verify:pesapal:ipn
```

**Expected Result**: ✅ VERIFICATION PASSED

The script will:
- Call Pesapal `GetIpnList` API
- Find IPN entry with URL `https://api.sunmega.co.ke/api/pesapal/ipn`
- Verify its `ipn_id` equals `b621cb1b-fe6c-4046-947c-dad1de88556c`
- Verify `PESAPAL_IPN_ID` entry has the correct URL
- Report PASS only if both directions match

## Related Files

- `backend/controllers/orderController.js` - Uses `PESAPAL_IPN_ID` in order submission
- `backend/controllers/pesapalController.js` - Handles IPN requests
- `backend/routes/pesapalRoute.js` - IPN route: `/api/pesapal/ipn`
- `backend/scripts/verifyPesapalIpnMatch.js` - Verification script
