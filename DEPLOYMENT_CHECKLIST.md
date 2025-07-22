# Direct Internet Exposure - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 🔧 Infrastructure Setup
- [ ] **Router Access**: Confirm admin access to your router (typically 192.168.1.1 or 192.168.68.1)
- [ ] **Static Local IP**: Set 192.168.68.69 as static IP or reserve in DHCP
- [ ] **Public IP**: Note your current public IP address (check at whatismyip.com)
- [ ] **ISP Check**: Confirm ISP doesn't block ports 80/443 (some residential ISPs do)

### 🌐 Domain & DNS
- [ ] **Domain Purchase**: Buy domain from registrar (Namecheap, GoDaddy, etc.)
- [ ] **DNS Access**: Access to domain DNS management
- [ ] **Dynamic DNS** (if no static IP): Sign up for No-IP, DuckDNS, or similar service

### 💻 Server Preparation
- [ ] **Current System Working**: Verify .69 computer call forwarding works locally
- [ ] **Dependencies Installed**: Run `./install-dependencies.sh`
- [ ] **Environment Config**: Copy and configure `.env` file
- [ ] **Backup Current Setup**: Backup existing server directory

---

## 🚀 Step-by-Step Deployment

### Step 1: Router Configuration (15 minutes)

#### Port Forwarding Setup
1. Access router admin panel:
   ```
   Open browser: http://192.168.1.1 OR http://192.168.68.1
   Login with admin credentials
   ```

2. Find Port Forwarding section:
   - Look for "Port Forwarding", "Virtual Servers", or "NAT"
   - Add these rules:

   ```
   Rule 1: HTTP
   External Port: 80
   Internal IP: 192.168.68.69
   Internal Port: 3001
   Protocol: TCP
   
   Rule 2: HTTPS
   External Port: 443
   Internal IP: 192.168.68.69
   Internal Port: 3001
   Protocol: TCP
   ```

3. Save settings and restart router

#### Verification
```bash
# Test from external network or use online tools:
# https://www.canyouseeme.org/ - test ports 80 and 443
# Should show "open" for both ports
```

### Step 2: Domain Configuration (30 minutes)

#### Purchase Domain
1. Choose registrar: Namecheap (~$12/year), GoDaddy (~$15/year), etc.
2. Purchase domain like: `yourcalls.com`, `yourname-phone.net`
3. Access DNS management

#### Configure DNS Records
```
A Record: @ → YOUR_PUBLIC_IP
A Record: www → YOUR_PUBLIC_IP
CNAME: * → @ (optional, for subdomains)
```

#### Dynamic DNS Setup (if needed)
If you don't have static IP:
1. Sign up at No-IP.com or DuckDNS.org
2. Install dynamic DNS client on .69 computer
3. Configure domain to point to your dynamic DNS hostname

### Step 3: SSL Certificate Installation (20 minutes)

#### Install Certbot
```bash
sudo apt update
sudo apt install certbot
```

#### Stop existing server temporarily
```bash
# If your server is running, stop it:
pkill -f node
# OR if using systemd:
sudo systemctl stop call-forwarding
```

#### Get SSL Certificate
```bash
# Replace your-domain.com with your actual domain
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Follow prompts:
# 1. Enter email for notifications
# 2. Agree to Terms of Service (A)
# 3. Share email with EFF (Y/N - your choice)
```

#### Set Up Auto-Renewal
```bash
# Test renewal process
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
sudo crontab -e

# Add this line to run twice daily:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 4: Server Configuration (10 minutes)

#### Configure Environment
```bash
cd ~/workspace/call-forwarding-vps/direct-internet-setup
cp .env.example .env
nano .env
```

Update `.env` with your values:
```bash
DOMAIN=your-domain.com
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
ANTHROPIC_API_KEY=sk-ant-xxxxx
MY_PERSONAL_NUMBER=+1234567890
```

#### Test Server
```bash
# Test HTTP mode first
node server-https.js

# Should see:
# "🔒 HTTPS Server running on https://your-domain.com:443"
# "HTTP redirect server running on port 80"
```

### Step 5: Flutter App Update (10 minutes)

#### Update Flutter App
1. Replace current `http_service.dart` with `http_service_domain.dart`
2. Update domain in the service:
   ```dart
   static const String _defaultDomainUrl = 'https://your-domain.com';
   ```
3. Rebuild and test app

### Step 6: Twilio Configuration (5 minutes)

#### Update Twilio Webhooks
1. Login to Twilio Console
2. Go to Phone Numbers → Manage → Active Numbers
3. Click your phone number
4. Update webhooks:
   ```
   Voice URL: https://your-domain.com/voice
   Status Callback URL: https://your-domain.com/status
   ```
5. Save configuration

---

## 🧪 Testing & Verification

### System Health Check
```bash
# Test health endpoint
curl https://your-domain.com/health

# Should return:
# {"status":"healthy","timestamp":"...","domain":"your-domain.com"}
```

### SSL Certificate Check
```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443

# Should show valid certificate info
```

### Mobile App Test
1. Connect phone to different network (mobile data)
2. Open Flutter app
3. Verify connection shows: "Connected to https://your-domain.com"
4. Test adding/removing contacts

### Call Testing
1. Make test call to your Twilio number
2. Verify call forwarding works
3. Check dashboard shows real-time updates
4. Confirm call logs are recorded

---

## 🔒 Security Hardening

### Firewall Status
```bash
# Check UFW status
sudo ufw status

# Should show:
# Status: active
# 22/tcp    ALLOW       Anywhere
# 80/tcp    ALLOW       Anywhere
# 443/tcp   ALLOW       Anywhere
```

### fail2ban Status
```bash
# Check fail2ban status
sudo systemctl status fail2ban

# Should show "active (running)"
```

### System Monitoring
```bash
# Check system resources
htop

# Check server logs
tail -f /var/log/syslog
```

---

## 🚨 Troubleshooting

### Common Issues

#### Port Forwarding Not Working
1. **Check router settings**: Ensure rules are correct
2. **Restart router**: Power cycle router
3. **Test with online tools**: Use canyouseeme.org
4. **Check ISP restrictions**: Some ISPs block residential port 80/443

#### Domain Not Resolving
1. **DNS Propagation**: Wait 24-48 hours for full propagation
2. **Check DNS**: `nslookup your-domain.com`
3. **Verify registrar**: Ensure domain points to correct nameservers

#### SSL Certificate Issues
1. **Domain must resolve**: Ensure domain points to your IP before running certbot
2. **Port 80 open**: Certbot needs port 80 for verification
3. **Stop other services**: Ensure no other service is using port 80 during cert creation

#### App Connection Issues
1. **Test health endpoint**: `curl https://your-domain.com/health`
2. **Check CORS**: Verify server allows mobile app origins
3. **Network test**: Try from different networks (WiFi vs mobile)

### Log Files
```bash
# Server logs
tail -f ~/workspace/call-forwarding-vps/server/server.log

# System logs
sudo tail -f /var/log/syslog

# Nginx logs (if using)
sudo tail -f /var/log/nginx/error.log

# Let's Encrypt logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring
- [ ] Check server is running: `curl https://your-domain.com/health`
- [ ] Monitor resource usage: `htop`
- [ ] Check for failed login attempts: `sudo journalctl -u fail2ban`

### Weekly Maintenance
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Check SSL certificate expiry: `sudo certbot certificates`
- [ ] Review server logs for errors
- [ ] Test call forwarding functionality

### Monthly Tasks
- [ ] Full system backup
- [ ] Review security logs
- [ ] Test disaster recovery procedures
- [ ] Update dependencies if needed

---

## 💰 Cost Breakdown

### One-Time Costs
- Domain name: ~$15/year
- Setup time: ~2 hours

### Ongoing Costs
- Domain renewal: ~$15/year
- Electricity for .69 computer: ~$50-100/year
- **Total**: ~$65-115/year

### Compared to VPS
- VPS hosting: ~$144/year ($12/month)
- **Savings**: ~$30-80/year

---

## 🎉 Success Checklist

When everything is working, you should have:
- [ ] **Stable URL**: https://your-domain.com always works
- [ ] **Mobile App**: Works from anywhere with internet
- [ ] **HTTPS**: Automatic SSL certificate with auto-renewal
- [ ] **Security**: Firewall and intrusion prevention
- [ ] **Monitoring**: Health checks and system monitoring
- [ ] **Call Forwarding**: Works reliably with Twilio
- [ ] **Real-time Dashboard**: Updates in real-time via Socket.io

**🚀 Your call forwarding system is now professional and internet-accessible!**