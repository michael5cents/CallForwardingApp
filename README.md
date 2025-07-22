# Direct Internet Exposure Setup Guide

This guide will help you expose your .69 computer directly to the internet instead of using ngrok tunneling or VPS migration.

## Overview

**Current Setup**: Server on 192.168.68.69:3001 → ngrok tunnel → Internet
**New Setup**: Server on 192.168.68.69:3001 → Router port forwarding → Internet

## Prerequisites

- Your current call forwarding system working on 192.168.68.69:3001
- Router admin access for port forwarding
- Domain name (purchase from registrar like Namecheap, GoDaddy, etc.)
- Static public IP or dynamic DNS service

## Step-by-Step Implementation

### Phase 1: Router Configuration

#### 1.1 Configure Port Forwarding
Access your router admin panel (typically 192.168.1.1 or 192.168.68.1) and set up:

```
External Port 80 → Internal IP 192.168.68.69 Port 3001
External Port 443 → Internal IP 192.168.68.69 Port 3001
```

**Why both ports?**
- Port 80: HTTP traffic, will redirect to HTTPS
- Port 443: HTTPS traffic for secure connections

#### 1.2 Verify Port Forwarding
Test with online port checker tools:
- https://www.canyouseeme.org/
- https://www.yougetsignal.com/tools/open-ports/

### Phase 2: Domain Setup

#### 2.1 Purchase Domain
Choose a domain name like:
- `yourcallforwarding.com`
- `yourname-calls.com`
- `myphone-system.net`

#### 2.2 Configure DNS
Point your domain to your public IP:
```
A Record: @ → YOUR_PUBLIC_IP
A Record: www → YOUR_PUBLIC_IP
```

#### 2.3 Dynamic DNS (if needed)
If you don't have static IP, use services like:
- No-IP (free)
- DuckDNS (free)
- Cloudflare Dynamic DNS

### Phase 3: SSL Certificate Setup

#### 3.1 Install Certbot (Let's Encrypt)
```bash
# On the .69 computer (assuming Ubuntu/Debian):
sudo apt update
sudo apt install certbot
```

#### 3.2 Get SSL Certificate
```bash
# Replace your-domain.com with your actual domain
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Follow the prompts and provide:
# - Email address for renewal notifications
# - Agree to terms of service
# - Your domain name
```

#### 3.3 Set Up Auto-Renewal
```bash
# Add to crontab for automatic renewal
sudo crontab -e

# Add this line to run renewal check twice daily:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Phase 4: Server Updates

The server needs updates to:
1. Handle HTTPS properly with SSL certificates
2. Redirect HTTP to HTTPS
3. Add security headers
4. Handle the domain-based setup

### Phase 5: Flutter App Updates

Update the Flutter app to use your domain instead of local IP:
```dart
// Change from:
String _serverUrl = 'http://192.168.68.69:3001';

// To:
String _serverUrl = 'https://your-domain.com';
```

### Phase 6: Twilio Configuration

Update your Twilio webhooks to use the new domain:
```
Voice URL: https://your-domain.com/voice
Status Callback URL: https://your-domain.com/status
```

## Security Considerations

### Basic Security Measures
1. **Firewall Rules**: Only allow necessary ports (22 for SSH, 80/443 for web)
2. **Regular Updates**: Keep your system updated
3. **Strong Passwords**: Use strong SSH passwords/keys
4. **Rate Limiting**: Implement API rate limiting in the server

### Network Security
1. **DMZ Configuration**: Consider placing .69 computer in router DMZ
2. **VPN Access**: Set up VPN for administrative access
3. **Monitoring**: Monitor for unusual traffic patterns

## Troubleshooting

### Common Issues
1. **Port forwarding not working**: Check router settings and restart router
2. **Domain not resolving**: Wait 24-48 hours for DNS propagation
3. **SSL certificate issues**: Ensure domain points to your IP before running certbot
4. **Mobile app connection issues**: Check CORS settings in server

### Testing Commands
```bash
# Test domain resolution
nslookup your-domain.com

# Test HTTPS connection
curl -I https://your-domain.com/health

# Check SSL certificate
openssl s_client -connect your-domain.com:443
```

## Cost Comparison

### Direct Internet Exposure
- Domain name: ~$15/year
- Dynamic DNS (if needed): Free or ~$25/year
- **Total**: ~$15-40/year

### VPS Alternative
- Domain name: ~$15/year
- VPS hosting: ~$144/year ($12/month)
- **Total**: ~$159/year

**Savings**: $120-145/year with direct exposure approach!

## Next Steps

1. Complete router port forwarding configuration
2. Purchase and configure domain name
3. Set up SSL certificates
4. Update server and Flutter app
5. Test thoroughly before switching Twilio webhooks

This approach gives you the same benefits as VPS hosting (stable URL, HTTPS, mobile app internet access) at a fraction of the cost!