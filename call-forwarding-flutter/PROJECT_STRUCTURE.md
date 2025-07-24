# Call Forwarding Project Structure

## Overview
This project consists of two main components:
1. **call-forwarding-app** - Node.js web server with Twilio integration
2. **call-forwarding-flutter** - Flutter mobile app for Samsung ZFold3

## Project Architecture

```
📁 /home/michael5cents/
├── 📁 call-forwarding-app/          # Main web server (Node.js)
└── 📁 call-forwarding-flutter/      # Flutter mobile app project
    └── 📁 call_forwarding_app/      # Flutter app source
```

## call-forwarding-app/ (Main Server)

### Core Files
- **`server.js`** - Main Node.js server (Express.js, port 3001)
- **`database.js`** - SQLite database management
- **`twiML_helpers.js`** - Twilio webhook response helpers
- **`call_forwarding.db`** - SQLite database file

### Configuration Files
- **`package.json`** - Node.js dependencies and scripts
- **`package-lock.json`** - Dependency lock file
- **`call-forwarding.service`** - systemd service configuration

### Web Application
- **`public/`** - Web app frontend files
  - **`index.html`** - Main web interface
  - **`app.js`** - Frontend JavaScript
  - **`styles.css`** - CSS styling
  - **`manifest.json`** - PWA manifest
  - **`sw.js`** - Service worker for PWA
  - **`icons/`** - Web app icons (various sizes)

### SSL/Security
- **`ssl/`** - SSL certificates (if HTTPS needed)
  - **`server.crt`** - SSL certificate
  - **`server.key`** - SSL private key

### Scripts
- **`install-dependencies.sh`** - Dependency installation script
- **`generate-icons.js`** - Icon generation utility

### Documentation
- **`README.md`** - Main project documentation
- **`CLAUDE.md`** - AI assistant context file
- **`COMPARISON.md`** - Feature comparison documentation
- **`DEPLOYMENT_CHECKLIST.md`** - Deployment guide
- **`GODADDY_SETUP.md`** - Domain setup guide
- **`PROJECT_PLANS.md`** - Development planning

### Backup Files
- **`server-https.js`** - HTTPS version of server (backup)
- **`anthropic_helper.js`** - AI integration utilities

## call-forwarding-flutter/ (Mobile App)

### Root Level
- **`VOICEMAIL_FIX_DOCUMENTATION.md`** - Voicemail fix documentation
- **`PROJECT_STRUCTURE.md`** - This file
- **`README.md`** - Flutter project documentation
- **`CHANGELOG.md`** - Version change history
- **`FEATURES.md`** - Feature documentation
- **`HIT_THE_GROUND_RUNNING.md`** - Quick start guide

### call_forwarding_app/ (Flutter Source)

#### Configuration
- **`pubspec.yaml`** - Flutter dependencies and metadata
- **`pubspec.lock`** - Dependency lock file
- **`analysis_options.yaml`** - Dart analysis configuration

#### Source Code
- **`lib/`** - Dart source code
  - **`main.dart`** - App entry point
  - **`models/`** - Data models
    - **`app_state.dart`** - App state management
  - **`screens/`** - UI screens
    - **`dashboard_screen.dart`** - Main dashboard
    - **`call_logs_screen.dart`** - Call history (voicemail fix here)
    - **`contacts_screen.dart`** - Contact management
    - **`blacklist_screen.dart`** - Blocked numbers
    - **`settings_screen.dart`** - App settings
  - **`services/`** - Backend services
    - **`http_service.dart`** - HTTP client (server communication)
    - **`notification_service.dart`** - Push notifications
    - **`background_service.dart`** - Background processing
    - **`realtime_service.dart`** - Real-time updates
    - **`socket_service.dart`** - WebSocket communication
    - **`webhook_service.dart`** - Webhook handling
  - **`widgets/`** - Reusable UI components
    - **`connection_status_widget.dart`** - Connection indicator
    - **`current_call_widget.dart`** - Active call display
    - **`stats_grid_widget.dart`** - Statistics display
  - **`utils/`** - Utility functions
    - **`samsung_zfold_utils.dart`** - ZFold3-specific utilities

#### Platform-Specific

##### Android
- **`android/`** - Android build configuration
  - **`app/build.gradle`** - Android app build settings
  - **`gradle.properties`** - Gradle configuration (Java 17 path)
  - **`src/main/AndroidManifest.xml`** - App permissions and config

##### iOS (Optional)
- **`ios/`** - iOS build configuration
  - **`Runner/`** - iOS project files
  - **`Runner.xcodeproj/`** - Xcode project

##### Desktop Platforms (Optional)
- **`linux/`** - Linux desktop build
- **`macos/`** - macOS desktop build  
- **`windows/`** - Windows desktop build

##### Web (Optional)
- **`web/`** - Web build configuration
  - **`index.html`** - Web app entry point
  - **`manifest.json`** - Web app manifest

#### Testing
- **`test/`** - Unit tests
  - **`widget_test.dart`** - Widget testing

#### Build Output
- **`build/`** - Generated build files
  - **`app/outputs/flutter-apk/app-release.apk`** - Built APK file

## Network Configuration

### Production Environment
- **Server IP:** 192.168.68.69 (DMZ zone)
- **Port:** 3001
- **Protocol:** HTTP (LAN-only)
- **Database:** SQLite (local file)

### Mobile App Configuration
- **Target Device:** Samsung Galaxy ZFold3
- **Server Connection:** 192.168.68.69:3001
- **Configuration Storage:** SharedPreferences
- **Local Storage:** App documents directory

## Key Integration Points

### 1. Voicemail Download Flow
```
Flutter App → GET /api/download-recording?url=<twilio_url>
    ↓
Main Server → Authenticated request to Twilio
    ↓
Twilio API → Binary audio data
    ↓
Main Server → Forward to Flutter app
    ↓
Flutter App → Save locally & play
```

### 2. Real-time Updates
- Flutter app polls server every 1 second
- Server provides call status updates
- Background service maintains connection

### 3. Data Synchronization
- Contacts, blacklist, call logs sync from server
- Changes made via web interface reflect in mobile app
- Mobile app can add contacts back to server

## Build Requirements

### Server
- **Node.js:** v14+ 
- **NPM:** Latest
- **SQLite3:** For database

### Mobile App
- **Flutter SDK:** Latest stable
- **Android SDK:** API level 21+
- **Java:** OpenJDK 17.0.7 (for Gradle 8.3)
- **Gradle:** 8.3 (managed by Flutter)

## Version History
- **v1.0.0:** Initial release
- **v1.1.0:** Voicemail download fix, IP configuration correction

## Deployment

### Server Deployment
1. Deploy to 192.168.68.69
2. Install Node.js dependencies
3. Configure Twilio environment variables
4. Start with systemd service
5. Ensure port 3001 is accessible on LAN

### Mobile App Deployment
1. Build APK with correct configuration
2. Transfer to Samsung ZFold3
3. Install APK (enable unknown sources)
4. App automatically connects to server

## Maintenance Notes

### Regular Tasks
- Monitor server logs for errors
- Update Flutter dependencies periodically
- Backup SQLite database regularly
- Monitor Twilio usage and costs

### Troubleshooting
- Check network connectivity (ping 192.168.68.69)
- Verify server is running (curl http://192.168.68.69:3001/api/health)
- Review app logs via Android debug tools
- Ensure Twilio credentials are valid

## Security Considerations
- Server runs on private LAN only (no external access)
- Twilio credentials stored as environment variables
- No sensitive data stored in mobile app
- SSL certificates available for HTTPS if needed