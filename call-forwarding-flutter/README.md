# Flutter Call Forwarding App

## 📱 AI-Powered Mobile Call Management System

A Flutter mobile application that provides intelligent call forwarding with AI screening capabilities, real-time dashboard monitoring, and complete voicemail management. This app works in conjunction with a Node.js server to deliver sophisticated call routing using Twilio and Claude AI.

## 🌟 Key Features

### 📞 Intelligent Call Management
- **AI-Powered Screening**: Claude AI analyzes unknown callers and categorizes them
- **Contact Whitelisting**: Direct forwarding for trusted contacts
- **Smart Blacklisting**: TCPA-compliant spam blocking with legal messaging
- **Real-time Call Monitoring**: Live dashboard shows call progress as it happens

### 🎵 Advanced Voicemail System
- **High-Quality Playback**: Embedded audio player with full controls
- **Local File Caching**: Downloads recordings for offline playback
- **Universal Format Support**: Plays WAV, MP3, and most audio formats
- **Progress Controls**: Play/pause, seek bar, and time display

### 📊 Real-Time Dashboard
- **Live Call Progress**: Watch calls being screened and routed in real-time
- **Connection Status**: Visual indicators for server connectivity
- **Call Statistics**: Track total contacts, recent calls, and AI activity
- **Instant Updates**: Socket.io integration for immediate status changes

### 📋 Complete Call History
- **Detailed Call Logs**: Comprehensive history with timestamps and status
- **AI Summaries**: Intelligent categorization of call purposes
- **Contact Integration**: Links calls to your contact database
- **Advanced Filtering**: Filter by status (completed, screened, blocked, missed)

## 🏗️ Architecture

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Flutter App   │◄───┤  Node.js Server  │◄───┤   Twilio API    │
│   (Mobile UI)   │    │ (Call Processing)│    │ (Telephony)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐             │
         └──────────────┤   Claude AI      │             │
                        │ (Call Analysis)  │             │
                        └──────────────────┘             │
                                 │                       │
                        ┌──────────────────┐             │
                        │   SQLite DB      │◄────────────┘
                        │ (Data Storage)   │
                        └──────────────────┘
```

### Technology Stack
- **Frontend**: Flutter 3.24.5 with Material Design
- **Audio Playback**: just_audio library for universal format support
- **Real-time Communication**: Socket.io for live updates
- **Local Storage**: SQLite for call logs, contacts, and settings
- **Network**: HTTP client for API communication and file downloads
- **Background Services**: Workmanager for background sync

## 🚀 Installation & Setup

### Prerequisites
- Flutter 3.24.5 or higher
- Android SDK (API level 21+) or iOS 11+
- Node.js server running (see server setup instructions)
- Twilio account with phone number and API credentials

### Quick Start
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/call-forwarding-flutter.git
   cd call-forwarding-flutter/call_forwarding_app
   ```

2. **Install Flutter dependencies**
   ```bash
   flutter pub get
   ```

3. **Build the APK**
   ```bash
   flutter build apk --release
   ```

4. **Install on Android device**
   ```bash
   flutter install
   # Or manually install the APK from build/app/outputs/flutter-apk/
   ```

### Configuration
The app automatically connects to your server at `192.168.68.69:3001`. To change the server URL:

1. Open **Settings** in the app
2. Update **Server URL** field
3. Tap **Save Settings**

## 📖 User Guide

### Getting Started
1. **Launch the App**: Tap the call forwarding icon on your home screen
2. **Check Connection**: Verify the green connection indicator in the dashboard
3. **Add Contacts**: Go to Contacts tab and add trusted numbers for direct forwarding
4. **Configure Blacklist**: Add spam numbers to the blacklist for automatic blocking

### Using the Dashboard
- **Real-time Monitoring**: Watch incoming calls being processed live
- **Connection Status**: Green = connected, Red = disconnected, Yellow = connecting
- **Call Progress**: See each step of AI screening and call routing
- **Quick Stats**: View total contacts, recent calls, and AI screening status

### Managing Contacts
- **Add Contact**: Tap "+" and enter name and phone number
- **Auto-formatting**: Phone numbers are formatted automatically
- **Direct Forwarding**: Whitelisted contacts bypass AI screening
- **Contact Integration**: Calls show contact names when available

### Call Log Management
- **View History**: See all incoming calls with detailed information
- **Play Recordings**: Tap voicemail entries to play audio
- **Filter Calls**: Use dropdown to filter by status
- **Call Actions**: Long-press for options (delete, block number, add contact)

### Voicemail Playback
1. **Tap Voicemail**: Tap the purple voicemail indicator in call logs
2. **Download Progress**: Wait for "Downloading recording..." to complete
3. **Audio Controls**: Use play/pause button and seek bar
4. **Cached Playback**: Subsequent plays are instant (cached locally)

### Settings Configuration
- **Server URL**: Configure your call forwarding server address
- **Notifications**: Enable/disable call alerts and status updates
- **Audio Settings**: Configure playback preferences
- **Data Sync**: Manage offline data and sync frequency

## 🔧 Technical Implementation

### Audio Playback System
The app uses a sophisticated audio playback system that ensures reliable voicemail playback:

#### Download & Cache Strategy
```dart
Future<String> _downloadRecording(String twilioUrl) async {
  // 1. Check local cache first
  final recordingId = twilioUrl.split('/').last;
  final filePath = '${directory.path}/recordings/$recordingId.wav';
  
  if (await File(filePath).exists()) {
    return filePath; // Play from cache instantly
  }
  
  // 2. Download via server (with Twilio auth)
  final response = await http.get('$serverUrl/api/download-recording?url=$twilioUrl');
  
  // 3. Save to local storage
  await File(filePath).writeAsBytes(response.bodyBytes);
  
  return filePath; // Play from local file
}
```

#### Audio Player Integration
```dart
class _AudioPlayerDialog extends StatefulWidget {
  // Embedded audio player with:
  // - Play/pause controls
  // - Seek bar with time display
  // - Loading indicators
  // - Error handling
  // - Local file playback
}
```

### Real-time Communication
```dart
// Socket.io integration for live updates
socket.on('call-incoming', (data) => _handleIncomingCall(data));
socket.on('call-screening', (data) => _showAIScreening(data));
socket.on('call-forwarding', (data) => _showForwarding(data));
socket.on('call-completed', (data) => _updateCallLogs(data));
```

### State Management
```dart
// Provider pattern for app-wide state
class AppState extends ChangeNotifier {
  List<CallLog> _callLogs = [];
  List<Contact> _contacts = [];
  CallInfo? _currentCall;
  ConnectionStatus _connectionStatus = ConnectionStatus.disconnected;
  
  // Notify UI of changes automatically
  void updateCallLogs(List<CallLog> logs) {
    _callLogs = logs;
    notifyListeners();
  }
}
```

## 🛠️ Development

### Project Structure
```
call_forwarding_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── models/
│   │   └── app_state.dart       # Global state management
│   ├── screens/
│   │   ├── dashboard_screen.dart    # Real-time call monitoring
│   │   ├── call_logs_screen.dart    # Call history & voicemail
│   │   ├── contacts_screen.dart     # Contact management
│   │   ├── blacklist_screen.dart    # Spam number blocking
│   │   └── settings_screen.dart     # App configuration
│   ├── services/
│   │   ├── socket_service.dart      # Real-time communication
│   │   ├── http_service.dart        # API communication
│   │   ├── notification_service.dart # Push notifications
│   │   └── background_service.dart  # Background sync
│   └── widgets/
│       ├── connection_status_widget.dart # Connection indicator
│       ├── current_call_widget.dart      # Live call display
│       └── stats_grid_widget.dart        # Dashboard statistics
├── android/                     # Android-specific configuration
├── ios/                        # iOS-specific configuration
├── pubspec.yaml               # Flutter dependencies
└── README.md                 # This documentation
```

### Key Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Real-time communication
  socket_io_client: ^3.1.2
  http: ^1.1.0
  
  # Audio playback
  just_audio: ^0.9.40
  path_provider: ^2.1.4
  
  # UI & State management
  provider: ^6.1.2
  shared_preferences: ^2.3.2
  
  # Background services
  flutter_local_notifications: ^17.2.3
  workmanager: ^0.5.2
  
  # Device integration
  device_info_plus: ^10.1.2
  permission_handler: ^11.3.1
  vibration: ^2.0.0
```

### Building for Production
```bash
# Android Release Build
flutter build apk --release

# iOS Release Build  
flutter build ios --release

# Install on connected device
flutter install --release
```

### Debugging
```bash
# Run in debug mode
flutter run

# Enable logging
flutter logs

# Analyze code
flutter analyze
```

## 🌐 API Integration

### Server Endpoints Used
```javascript
GET  /api/contacts           # Fetch contact list
POST /api/contacts           # Add new contact
GET  /api/call-logs          # Fetch call history
GET  /api/blacklist          # Fetch blocked numbers
GET  /api/download-recording # Download voicemail files
```

### Socket.io Events
```javascript
// Incoming events (server → app)
'call-incoming'     // New call received
'call-screening'    // AI analysis in progress  
'call-whitelisted'  // Contact recognized
'call-forwarding'   // Call being forwarded
'call-completed'    // Call finished
'call-recording-complete' // Voicemail ready

// Outgoing events (app → server)
'app-backgrounded'  // App went to background
'app-foregrounded'  // App returned to foreground
'request-sync'      // Request data sync
```

## 📊 Performance & Optimization

### Audio Optimization
- **Local Caching**: Recordings downloaded once, played instantly thereafter
- **Efficient Storage**: Only downloads when needed, auto-cleanup of old files
- **Format Support**: Universal audio format compatibility
- **Memory Management**: Streaming playback, minimal memory footprint

### Network Optimization
- **Background Sync**: Continues monitoring when app is backgrounded
- **Connection Resilience**: Auto-reconnect on network issues
- **Bandwidth Efficiency**: Only syncs changed data
- **Offline Support**: Cached data available when offline

### Battery Optimization
- **Adaptive Polling**: Reduces activity on low battery
- **Smart Background**: Minimizes CPU usage when backgrounded
- **Efficient Updates**: Only refreshes when data changes
- **Sleep Mode**: Reduces activity during inactive periods

## 🔐 Security & Privacy

### Data Protection
- **Local Storage**: Sensitive data stored locally, not in cloud
- **Encrypted Communication**: HTTPS/WSS for all server communication
- **Authentication**: Server handles Twilio API authentication
- **Privacy First**: No tracking, analytics, or data sharing

### Permissions
```xml
<!-- Required Android permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 🐛 Troubleshooting

### Common Issues

#### "Connection Failed" 
- **Check Server**: Ensure Node.js server is running on configured port
- **Network**: Verify device can reach server IP address
- **Firewall**: Check firewall allows connections on port 3001

#### "No Sound" from Recordings
- **Download**: Check if "Downloading recording..." completes successfully  
- **Storage**: Verify device has sufficient storage space
- **Permissions**: Ensure app has storage permissions
- **Server**: Confirm server has valid Twilio credentials

#### "Source Error (0)"
- This was fixed in v5.0 with local file playback
- Update to latest APK version
- Clear app cache if persisting

### Debug Commands
```bash
# Check server connectivity
curl -I http://192.168.68.69:3001/

# Test call logs API
curl http://192.168.68.69:3001/api/call-logs

# Test recording download
curl "http://192.168.68.69:3001/api/download-recording?url=RECORDING_URL"
```

## 📈 Version History

### v5.0 (Current) - Audio Playback Fixed
- ✅ **Fixed**: Voicemail playback with local file caching
- ✅ **Added**: Server-authenticated recording downloads
- ✅ **Improved**: Universal audio format support
- ✅ **Enhanced**: Progress indicators and error handling

### v4.8 - just_audio Integration
- ✅ **Switched**: From audioplayers to just_audio library
- ✅ **Added**: Embedded audio player dialog
- ❌ **Issue**: Source error (0) - network playback problems

### v4.7 - Browser Approach
- ❌ **Attempted**: Browser-based audio playback
- ❌ **Issue**: Cannot launch browser from within app

### v4.6 - Simplified Audio
- ✅ **Removed**: Complex AudioContext configuration
- ❌ **Issue**: No sound output

### v4.5 - AudioContext Configuration  
- ❌ **Attempted**: Complex audio permissions and configuration
- ❌ **Issue**: Deprecated API parameters

### v1.0-v4.4 - Foundation
- ✅ **Established**: Core app structure and UI
- ✅ **Implemented**: Real-time dashboard and socket communication
- ✅ **Added**: Contact management and blacklist functionality
- ✅ **Fixed**: Server connectivity and default URL configuration

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on real devices
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style
- Follow Dart/Flutter style guidelines
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure proper error handling
- Test on both Android and iOS when possible

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Flutter Team** - Excellent mobile framework
- **just_audio** - Reliable audio playback library  
- **Socket.io** - Real-time communication
- **Twilio** - Telephony API services
- **Anthropic Claude** - AI call analysis

## 📞 Support

For support, issues, or feature requests:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the server setup documentation

---

**Built with ❤️ using Flutter and AI-powered call management**