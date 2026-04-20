# Twilio Webhook URL Fix - January 29, 2026

## Problem Identified
After relocating to a new network, incoming calls stopped working. Investigation revealed that the Twilio webhook URL was pointing to the **old IP address**.

## Root Cause
When you moved networks, your public IP changed:
- **Old IP**: `139.177.18.91`
- **New IP**: `139.177.33.199`

The DNS record for `calls.popzplace.com` was updated correctly, but **Twilio's webhook configuration** was still hardcoded to the old IP address.

## Fix Applied
Updated Twilio webhook URL via their API:

| Setting | Before | After |
|---------|--------|-------|
| **Voice URL** | `http://139.177.18.91:3001/voice` | `http://calls.popzplace.com:3001/voice` |
| **Voice Method** | POST | POST (unchanged) |

## Why This Fix is Better
By using the domain name (`calls.popzplace.com`) instead of a hardcoded IP:
- Future IP changes only require updating DNS (GoDaddy)
- No need to manually update Twilio every time
- The webhook will automatically resolve to the current IP

## How to Update Twilio Webhook in the Future
If you ever need to update the webhook URL manually:

### Option 1: Twilio Console
1. Log in to https://console.twilio.com
2. Go to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on `+1-855-914-5997`
4. Update the **Voice Configuration** → **A call comes in** URL

### Option 2: Via Script
Run this command from the project directory:
```bash
source .env && node -e "
const twilio = require('twilio');
const client = twilio('\$TWILIO_ACCOUNT_SID', '\$TWILIO_AUTH_TOKEN');
client.incomingPhoneNumbers.list({phoneNumber: '+18559145997'})
  .then(numbers => {
    return client.incomingPhoneNumbers(numbers[0].sid).update({
      voiceUrl: 'http://calls.popzplace.com:3001/voice',
      voiceMethod: 'POST'
    });
  })
  .then(updated => console.log('Updated to:', updated.voiceUrl));
"
```

## Verification
After the fix, confirmed:
- ✅ Server accessible at `http://calls.popzplace.com:3001/api/health`
- ✅ Twilio webhook URL updated correctly
- ✅ No server restart required (Twilio change is server-side)

---
*Fix applied: January 29, 2026 at 8:47 PM CST*
