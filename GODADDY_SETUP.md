# Popzplace.com GoDaddy Setup Guide

## 🎯 **Your Domain Setup**

**Domain**: `popzplace.com` (GoDaddy)
**Current Use**: Available for call forwarding system
**Target**: `https://popzplace.com` → your call forwarding dashboard

## 📋 **GoDaddy DNS Configuration**

### Step 1: Get Your Public IP Address
```bash
# Find your current public IP:
curl ifconfig.me
# OR visit: https://whatismyip.com
# Note this IP address - you'll need it for DNS setup
```

### Step 2: Configure GoDaddy DNS Records

1. **Login to GoDaddy**:
   - Go to https://godaddy.com
   - Sign in to your account
   - Go to "My Products" → "Domains" → "popzplace.com" → "Manage"

2. **Access DNS Management**:
   - Click "DNS" or "Manage DNS"
   - You'll see existing DNS records

3. **Add/Update A Records**:
   ```
   Type: A
   Name: @
   Value: YOUR_PUBLIC_IP_ADDRESS
   TTL: 1 Hour (3600 seconds)
   
   Type: A  
   Name: www
   Value: YOUR_PUBLIC_IP_ADDRESS
   TTL: 1 Hour (3600 seconds)
   ```

4. **Optional - Add CNAME for subdomains**:
   ```
   Type: CNAME
   Name: calls
   Value: popzplace.com
   TTL: 1 Hour
   
   Type: CNAME
   Name: *
   Value: popzplace.com
   TTL: 1 Hour
   ```

### Step 3: Save and Wait for Propagation
- Click "Save" in GoDaddy DNS management
- **Wait**: DNS changes can take 15 minutes to 48 hours
- **Typical**: Usually active within 1-2 hours

## ✅ **Verification Steps**

### Check DNS Propagation
```bash
# Test domain resolution
nslookup popzplace.com

# Should return your public IP address
# If it returns GoDaddy parking page IP, wait longer

# Test with different DNS servers
nslookup popzplace.com 8.8.8.8
nslookup popzplace.com 1.1.1.1
```

### Test HTTP Access (before SSL)
```bash
# Test basic connectivity (once DNS propagates)
curl -I http://popzplace.com

# Should connect to your server on port 80
```

## 🔒 **SSL Certificate Setup for Popzplace.com**

### Install SSL Certificate
```bash
# After DNS propagates, get SSL certificate
sudo certbot certonly --standalone -d popzplace.com -d www.popzplace.com

# Follow prompts:
# Email: your-email@gmail.com
# Terms: A (agree)
# EFF communications: Y or N (your choice)
```

### Verify SSL Installation
```bash
# Check certificate files exist
sudo ls -la /etc/letsencrypt/live/popzplace.com/

# Should show:
# cert.pem -> ../../archive/popzplace.com/cert1.pem
# chain.pem -> ../../archive/popzplace.com/chain1.pem  
# fullchain.pem -> ../../archive/popzplace.com/fullchain1.pem
# privkey.pem -> ../../archive/popzplace.com/privkey1.pem
```

## 🚀 **Launch Your Call Forwarding System**

### Step 1: Configure Environment
```bash
cd ~/workspace/call-forwarding-vps/direct-internet-setup
cp .env.example .env
nano .env
```

Your `.env` file should look like:
```bash
DOMAIN=popzplace.com
SSL_KEY_PATH=/etc/letsencrypt/live/popzplace.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/popzplace.com/fullchain.pem
PORT=3001
NODE_ENV=production

# Your existing Twilio/Anthropic credentials
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
ANTHROPIC_API_KEY=sk-ant-xxxxx
MY_PERSONAL_NUMBER=+1234567890
```

### Step 2: Start the Server
```bash
# Install dependencies if not done
./install-dependencies.sh

# Start server
node server-https.js

# Should see:
# 🔒 HTTPS Server running on https://popzplace.com:443
# HTTP redirect server running on port 80
```

### Step 3: Test Everything
```bash
# Test health endpoint
curl https://popzplace.com/health

# Should return:
# {"status":"healthy","timestamp":"...","domain":"popzplace.com"}
```

## 📱 **Flutter App Configuration**

The Flutter app is already configured for `popzplace.com`! Just:

1. **Build and install** updated app
2. **Test connection** - should show "Connected to https://popzplace.com"
3. **Try from mobile data** - should work from anywhere

## 🔧 **Twilio Configuration**

Update your Twilio phone number webhooks:

1. **Login to Twilio Console**
2. **Go to Phone Numbers** → Manage → Active Numbers
3. **Click your phone number**
4. **Update webhooks**:
   ```
   Voice URL: https://popzplace.com/voice
   Status Callback URL: https://popzplace.com/status
   ```
5. **Save configuration**

## 🎉 **Final Result**

Once complete, you'll have:

- ✅ **Stable URL**: `https://popzplace.com` 
- ✅ **Professional SSL**: Free Let's Encrypt certificate
- ✅ **Mobile Access**: Flutter app works from anywhere
- ✅ **Real-time Dashboard**: Socket.io over HTTPS
- ✅ **Call Forwarding**: Twilio webhooks to your domain
- ✅ **Security**: Firewall, rate limiting, security headers

**Cost**: Just the cost of keeping your existing domain (~$15/year renewal)

## 🔍 **Troubleshooting**

### DNS Not Resolving
```bash
# Check if DNS has propagated
dig popzplace.com

# If still showing GoDaddy parking:
# 1. Double-check A record points to your public IP
# 2. Wait longer (up to 48 hours)
# 3. Try clearing DNS cache: sudo systemctl flush-dns
```

### SSL Certificate Issues
```bash
# If certbot fails:
# 1. Ensure DNS points to your server first
# 2. Ensure ports 80/443 are forwarded and open
# 3. Stop any other services on port 80
# 4. Try again: sudo certbot certonly --standalone -d popzplace.com
```

### Router Port Forwarding
```bash
# Test ports are open from external:
# Visit: https://www.canyouseeme.org/
# Test ports 80 and 443 - both should show "open"
```

**Your call forwarding system will be live at `https://popzplace.com`!** 🚀