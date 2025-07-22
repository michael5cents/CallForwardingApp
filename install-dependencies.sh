#!/bin/bash

# Direct Internet Exposure Setup Script
# Run this script on your .69 computer to install necessary dependencies

echo "🚀 Setting up direct internet exposure for Call Forwarding system..."
echo "=================================================================="

# Check if running as root for some operations
if [[ $EUID -eq 0 ]]; then
   echo "Please don't run this script as root. We'll use sudo when needed."
   exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y \
    certbot \
    ufw \
    fail2ban \
    curl \
    wget \
    unzip

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install npm packages for security
echo "📚 Installing additional security packages..."
cd ../server
npm install helmet express-rate-limit --save

# Configure UFW Firewall
echo "🛡️ Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp  # For development access
echo "✅ Firewall configured"

# Configure fail2ban for SSH protection
echo "🚨 Configuring fail2ban for SSH protection..."
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
echo "✅ fail2ban configured"

# Create SSL certificate directory and set permissions
echo "🔐 Preparing SSL certificate directories..."
sudo mkdir -p /etc/letsencrypt/live/
sudo chown -R $USER:$USER /home/$USER/
echo "✅ SSL directories prepared"

# Create startup script
echo "📝 Creating startup script..."
cat > ~/start-call-forwarding.sh << 'EOF'
#!/bin/bash
# Call Forwarding Direct Internet Startup Script

cd /home/$USER/workspace/call-forwarding-vps/direct-internet-setup

# Load environment variables
source .env 2>/dev/null || echo "Warning: .env file not found"

# Check if SSL certificates exist
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🔒 Starting with HTTPS support..."
    sudo node server-https.js
else
    echo "🌐 Starting with HTTP (SSL certificates not found)..."
    node server-https.js
fi
EOF

chmod +x ~/start-call-forwarding.sh

# Create systemd service (optional)
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/call-forwarding.service > /dev/null << EOF
[Unit]
Description=Call Forwarding Direct Internet Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/workspace/call-forwarding-vps/direct-internet-setup
ExecStart=/usr/bin/node server-https.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable call-forwarding.service

echo ""
echo "🎉 Installation complete!"
echo "=================================================================="
echo ""
echo "Next steps:"
echo "1. Configure your router port forwarding:"
echo "   External Port 80 → 192.168.68.69:3001"
echo "   External Port 443 → 192.168.68.69:3001"
echo ""
echo "2. Purchase and configure your domain name"
echo ""
echo "3. Copy .env.example to .env and configure:"
echo "   cp .env.example .env"
echo "   nano .env"
echo ""
echo "4. Get SSL certificate (after domain is configured):"
echo "   sudo certbot certonly --standalone -d yourdomain.com"
echo ""
echo "5. Start the service:"
echo "   ./start-call-forwarding.sh"
echo "   OR"
echo "   sudo systemctl start call-forwarding"
echo ""
echo "6. Check firewall status:"
echo "   sudo ufw status"
echo ""
echo "7. Test your setup:"
echo "   curl http://yourdomain.com/health"
echo ""
echo "For detailed instructions, see README.md"