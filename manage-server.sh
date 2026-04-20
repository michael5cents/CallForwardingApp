#!/bin/bash

# Call Forwarding Server Management Script
# Usage: ./manage-server.sh [start|stop|restart|status|install-service]

SERVER_DIR="/home/michael5cents/call-forwarding-app"
SERVICE_NAME="call-forwarding.service"
WEB_URL="http://calls.popzplace.com:3001"

case "$1" in
    start)
        echo "🚀 Starting Call Forwarding Server..."
        cd "$SERVER_DIR"
        if systemctl is-active --quiet call-forwarding.service; then
            echo "⚠️  Server is already running"
            exit 1
        fi
        echo '5904' | sudo -S systemctl start call-forwarding.service
        echo '5904' | sudo -S systemctl start local-llm.service
        sleep 3
        if systemctl is-active --quiet call-forwarding.service; then
            echo "✅ Server started successfully!"
            echo "🌐 Web Dashboard: $WEB_URL"
            echo "🔐 Login: michael5cents / 5904"
        else
            echo "❌ Failed to start server"
            exit 1
        fi
        ;;
    
    stop)
        echo "🛑 Stopping Call Forwarding Server..."
        if systemctl is-active --quiet call-forwarding.service; then
            echo '5904' | sudo -S systemctl stop call-forwarding.service
            sleep 2
            if ! systemctl is-active --quiet call-forwarding.service; then
                echo "✅ Server stopped successfully!"
            else
                echo "❌ Failed to stop server"
                exit 1
            fi
        else
            echo "⚠️  Server is not running"
        fi
        ;;
    
    restart)
        echo "🔄 Restarting Call Forwarding Server..."
        $0 stop
        sleep 2
        $0 start
        ;;
    
    status)
        echo "📊 Call Forwarding Server Status:"
        echo "================================"
        if systemctl is-active --quiet call-forwarding.service; then
            echo "Status: ✅ RUNNING"
            echo "Process: $(systemctl status call-forwarding.service | grep 'Main PID' | awk '{print $3}')"
            echo "Web: $WEB_URL (Login: michael5cents/5904)"
        else
            echo "Status: ❌ NOT RUNNING"
        fi
        echo ""
        echo "🤖 Local AI Status:"
        if systemctl is-active --quiet local-llm.service; then
            echo "Service: ✅ RUNNING (port 8080)"
        else
            echo "Service: ❌ NOT RUNNING"
        fi
        echo ""
        echo "Auto-startup service:"
        if systemctl is-enabled call-forwarding.service &>/dev/null; then
            echo "Service: ✅ ENABLED (will start on boot)"
        else
            echo "Service: ❌ NOT ENABLED (run: sudo systemctl enable call-forwarding.service)"
        fi
        ;;
    
    install-service)
        echo "⚙️  Installing auto-startup service..."
        if [ ! -f "$SERVER_DIR/$SERVICE_NAME" ]; then
            echo "❌ Service file not found: $SERVER_DIR/$SERVICE_NAME"
            exit 1
        fi
        
        echo "Installing systemd service..."
        sudo cp "$SERVER_DIR/$SERVICE_NAME" /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable call-forwarding.service
        
        echo "✅ Auto-startup service installed!"
        echo "🔄 Server will now start automatically on boot"
        echo "📋 Service commands:"
        echo "   Start:   sudo systemctl start call-forwarding.service"
        echo "   Stop:    sudo systemctl stop call-forwarding.service"
        echo "   Status:  sudo systemctl status call-forwarding.service"
        ;;
    
    *)
        echo "📖 Call Forwarding Server Management"
        echo "Usage: $0 {start|stop|restart|status|install-service}"
        echo ""
        echo "Commands:"
        echo "  start           - Start the server"
        echo "  stop            - Stop the server"  
        echo "  restart         - Restart the server"
        echo "  status          - Show server status"
        echo "  install-service - Install auto-startup service"
        echo ""
        echo "Web Dashboard: $WEB_URL"
        echo "Login: michael5cents / 5904"
        exit 1
        ;;
esac