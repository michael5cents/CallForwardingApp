# 🤖 AI-Powered Call Forwarding System

**Intelligent call screening and management with Claude AI integration**

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](https://github.com/michael5cents/CallForwardingApp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Twilio](https://img.shields.io/badge/Twilio-Powered-red.svg)](https://www.twilio.com/)
[![Local LLM](https://img.shields.io/badge/Local%20LLM-Integrated-purple.svg)](https://github.com/ggerganov/llama.cpp)

---

## 📱 **Overview**

Transform your phone into an **intelligent communication hub** that automatically screens calls using a Local LLM (Llama 3 8B), blocks spam, prioritizes important contacts, and provides real-time monitoring through both web and mobile interfaces.

**🔥 Key Highlights:**
- **AI-Powered Screening**: Local Llama 3 AI analyzes caller intent and routes calls intelligently without recurring API costs
- **Web Interface**: Professional web dashboard
- **Real-Time Sync**: Instant updates across all devices via Socket.io
- **Spam Protection**: TCPA-compliant blocking with legal compliance
- **Enterprise Quality**: Production-ready with comprehensive logging and monitoring

---

## ✨ **Features**

### 🧠 **Intelligent Call Management**
- **Local LLM Integration**: Advanced offline natural language processing for caller intent analysis (Llama 3 8B via llama.cpp)
- **Smart Routing**: Automatically forward important calls, send sales to voicemail, block spam
- **Contact Whitelisting**: Trusted contacts get direct forwarding with personalized messages
- **TCPA-Compliant Blocking**: Legal spam protection with proper opt-out mechanisms

### 📊 **Real-Time Monitoring**
- **Live Dashboard**: Watch calls being processed in real-time
- **Instant Notifications**: Socket.io powered updates across all interfaces
- **Call Analytics**: Complete history with AI-generated summaries
- **Status Indicators**: Visual feedback for call screening progress

### 📱 **Multi-Platform Access**
- **Web Dashboard**: Professional interface with dark mode and modern UI
- **Backend**: Single Node.js server handles the web dashboard
- **Offline Capability**: Local caching and background processing

### 🎵 **Advanced Voicemail System**
- **High-Quality Recording**: Crystal clear audio capture via Twilio
- **Universal Playback**: Works on any device with local file caching
- **AI Transcription**: Automatic message summaries and categorization
- **Download & Share**: Export recordings for external use

---

## 🏗️ **Architecture**

```mermaid
graph TB
    A[Incoming Call] --> B[Twilio Webhook]
    B --> C[Node.js Server]
    C --> D{Contact Check}
    D -->|Known| E[Direct Forward]
    D -->|Unknown| F[Local LLM Analysis]
    F --> G{AI Decision}
    G -->|Important| H[Forward with Summary]
    G -->|Sales| I[Voicemail Collection]
    G -->|Spam| J[Polite Block]
    C --> K[Real-time Updates]
    K --> L[Web Dashboard]
    C --> N[SQLite Database]
```

### **Technology Stack**

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Node.js + Express | Core server and API |
| **Database** | SQLite3 | Local data storage |
| **AI Engine** | Local Llama 3 8B (llama.cpp) | Offline call intent analysis |
| **Telephony** | Twilio API | Call handling & TwiML |
| **Real-time** | Socket.io | Live updates |
| **Web UI** | Modern JavaScript + CSS3 | Responsive dashboard |
| **Authentication** | Smart bypass system | Secure yet accessible |

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 16+ installed
- Twilio account with phone number
- Llama 3 8B GGUF Model & llama.cpp
- SQLite3

### **Installation**

```bash
# Clone the repository
git clone https://github.com/michael5cents/CallForwardingApp.git
cd CallForwardingApp

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# Initialize database
npm run setup-db

# Start the server
npm start
```

### **Environment Configuration**

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token  
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Local LLM API (OpenAI Compatible)
# Connects to locally hosted llama.cpp server
OPENAI_API_BASE=http://127.0.0.1:8080/v1

# Personal Configuration
MY_PERSONAL_NUMBER=your_personal_phone_number

# Server Configuration
PORT=3001
BASE_URL=https://your-domain.com
```

---

## 📖 **How It Works**

### **Call Flow Process**

1. **📞 Incoming Call** → Twilio receives the call and triggers webhook
2. **🔍 Contact Check** → System queries database for known contacts
3. **🤖 AI Analysis** → If unknown, the Local LLM analyzes caller intent and context
4. **🎯 Smart Routing** → Decision made based on AI analysis:
   - **Trusted Contacts**: Direct forward with personalized greeting
   - **Important Business**: Forward with AI summary
   - **Sales/Marketing**: Collect voicemail message
   - **Spam/Unwanted**: Polite rejection with compliance messaging
5. **📱 Real-time Updates** → Web dashboard updated instantly via Socket.io
6. **💾 Logging** → Complete call record stored with AI summary

### **AI Decision Categories**

| Category | Action | Example |
|----------|--------|---------|
| **Personal** | ✅ Forward | Family, friends, known contacts |
| **Urgent** | ✅ Forward + Alert | Medical, emergency, time-sensitive |
| **Business** | 📝 Voicemail | Professional calls, appointments |
| **Sales** | 📝 Voicemail | Marketing, cold calls, promotions |
| **Spam** | 🚫 Block | Robocalls, scams, unwanted |

---

## 🖥️ **Interfaces**

### **Web Dashboard**
- **Modern Dark Theme**: Professional UI optimized for desktop use
- **Real-time Monitoring**: Live call processing with visual indicators  
- **Contact Management**: Full CRUD operations for whitelist
- **Block from Logs**: One-click spam blocking directly from call history
- **Analytics Dashboard**: Statistics and call pattern analysis

---

## 🔐 **Security & Compliance**

### **Data Protection**
- **Local Storage**: All sensitive data stored on-premise
- **HTTPS Required**: Secure communications for external access
- **Input Validation**: SQL injection protection with prepared statements
- **Authentication**: Secure web protection

### **Legal Compliance**
- **TCPA Compliant**: Legal Do Not Call compliance messaging
- **Opt-out Mechanism**: Automatic removal system for blocked numbers
- **Audit Trail**: Complete logging of all blocking decisions
- **Privacy First**: No data shared with third parties beyond required services

---

## 📊 **Performance**

### **System Metrics**
- **Response Time**: <100ms for call routing decisions
- **Concurrent Calls**: Handles multiple simultaneous incoming calls
- **Memory Usage**: 100-200MB typical operation
- **Database Performance**: Optimized SQLite queries with indexing

### **Scalability Features**
- **Real-time Efficiency**: Sub-second Socket.io event propagation
- **Network Optimization**: Efficient polling and data synchronization
- **Database Optimization**: Indexed queries for fast lookups

---

## 🔧 **API Reference**

### **Core Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/sync` | Complete data synchronization |
| `GET` | `/api/contacts` | Fetch whitelist contacts |
| `POST` | `/api/contacts` | Add new contacts |
| `GET` | `/api/call-logs` | Fetch call history |
| `POST` | `/api/blacklist` | Add numbers to blacklist |
| `GET` | `/api/download-recording` | Download voicemail files |

### **Socket.io Events**

| Event | Description | Payload |
|-------|-------------|---------|
| `call-incoming` | New call received | `{from, timestamp}` |
| `call-screening` | AI analysis in progress | `{callId, status}` |
| `call-whitelisted` | Contact recognized | `{contact, action}` |
| `call-forwarding` | Call being routed | `{destination, summary}` |
| `call-completed` | Call finished | `{status, duration, recording}` |

---

## 🚀 **Deployment**

### **Production Setup**

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start server.js --name "call-forwarding"

# Setup auto-restart
pm2 startup
pm2 save

# Configure nginx reverse proxy (optional)
sudo nginx -s reload
```

### **Docker Deployment**

```bash
# Build Docker image
docker build -t call-forwarding-app .

# Run container
docker run -d \
  --name call-forwarding \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  call-forwarding-app
```

---

## 📝 **Configuration**

### **Call Routing Rules**

Edit `config/routing-rules.json` to customize AI decision logic:

```json
{
  "categories": {
    "personal": {"action": "forward", "message": "personal_greeting.xml"},
    "urgent": {"action": "forward", "priority": "high"},
    "business": {"action": "voicemail", "timeout": 30},
    "sales": {"action": "voicemail", "message": "sales_response.xml"},
    "spam": {"action": "block", "compliance": true}
  },
  "whitelist_override": true,
  "blacklist_priority": "highest"
}
```

### **AI Prompts**

Customize Local LLM analysis in `anthropic_helper.js`:

```javascript
export const CALL_ANALYSIS_PROMPT = `
Analyze this caller's intent and categorize as:
- personal: Family, friends, personal contacts
- urgent: Medical, emergency, time-sensitive
- business: Professional, appointments, services  
- sales: Marketing, cold calls, promotions
- spam: Robocalls, scams, unwanted calls

Caller context: {transcript}
Response format: {"category": "...", "confidence": 0.95, "summary": "..."}
`;
```

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/CallForwardingApp.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and test
npm test

# Commit using conventional commits
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

### **Code Standards**
- **JavaScript**: ES6+ with async/await
- **Testing**: Jest for backend
- **Linting**: ESLint + Prettier for JavaScript
- **Documentation**: JSDoc comments for all functions

---

## 📚 **Documentation**

- **[API Documentation](docs/API.md)** - Complete API reference
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production setup
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Changelog](CHANGELOG.md)** - Version history and updates

---

## 🏆 **Key Achievements**

### **Technical Innovation**
✅ **AI-Powered Call Screening** - Revolutionary approach using a Local LLM for intelligent call management, ensuring offline privacy and eliminating API costs.
✅ **Real-time Synchronization** - Socket.io ensures instant updates across all interfaces  
✅ **Universal Audio Playback** - Solved complex mobile audio streaming with local file caching  
✅ **TCPA Compliance** - Legal protection with proper spam blocking procedures  
✅ **Samsung Z Fold Optimization** - Specialized support for cutting-edge foldable devices  

### **User Experience Excellence**
🎯 **Spam Protection** - Eliminates unwanted robocalls and sales calls automatically  
🎯 **Contact Prioritization** - Ensures important calls always get through  
🎯 **Zero Configuration** - Works out of the box with minimal setup  
🎯 **Multi-Platform** - Seamless experience across web and mobile  
🎯 **Professional Quality** - Enterprise-grade reliability and performance  

---

## 🌟 **Why This Project Stands Out**

This isn't just another call forwarding system. It represents a **paradigm shift** in personal communication management:

- **🤖 AI Integration**: Uses a self-hosted Local LLM (Llama 3 8B) for intelligent, offline decision-making
- **🏗️ Modern Architecture**: Built with current best practices and scalable design
- **💻 Web Dashboard**: Professional web interface for complete control
- **⚡ Real-Time**: Instant updates and monitoring across all interfaces
- **🔒 Privacy-First**: Local storage with minimal external dependencies
- **📈 Production-Ready**: Comprehensive logging, error handling, and monitoring

---

## 📞 **Support**

- **Documentation**: Check our comprehensive [docs](docs/) folder
- **Issues**: Report bugs via [GitHub Issues](https://github.com/michael5cents/CallForwardingApp/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/michael5cents/CallForwardingApp/discussions)

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **[llama.cpp](https://github.com/ggerganov/llama.cpp)** - High-performance local LLM server
- **[Twilio](https://www.twilio.com/)** - Telephony infrastructure and TwiML
- **[Socket.io](https://socket.io/)** - Real-time bidirectional communication

---

<div align="center">

**Built with ❤️ using Node.js, Local LLMs, and Twilio**

[⭐ Star this repo](https://github.com/michael5cents/CallForwardingApp) | [🐛 Report Bug](https://github.com/michael5cents/CallForwardingApp/issues) | [💡 Request Feature](https://github.com/michael5cents/CallForwardingApp/issues)

</div>