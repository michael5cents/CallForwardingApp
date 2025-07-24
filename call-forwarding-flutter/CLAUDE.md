# CLAUDE.md - Call Forwarding Flutter App Project Context

## Global Context Framework Reference
**Context Engineering Framework Path**: `/home/michael5cents/Downloads/context-engineering-starter.sh`  
**Implementation Date**: July 22, 2025  
**Companion Project**: `/home/michael5cents/call-forwarding-app` (Node.js backend)

## Project Identity
- **Name**: Call Forwarding Mobile App
- **Type**: Flutter mobile application for Android
- **Primary Purpose**: Mobile interface for AI-powered call management system
- **Target Device**: Samsung Galaxy Z Fold 3 (foldable optimized)
- **Version**: v1.2.3 - Authentication Ready with Smart Defaults
- **Backend Integration**: Connects to Node.js server on port 3001

## Technology Stack
- **Framework**: Flutter 3.24.5 with Dart
- **State Management**: Provider pattern for app-wide state
- **Storage**: SharedPreferences for local configuration
- **HTTP Client**: Built-in dart:http for API communication
- **Notifications**: flutter_local_notifications for call alerts
- **Background Processing**: Android background services
- **UI Design**: Material Design 3 with Samsung Z Fold optimizations

## Architecture Overview
```
Mobile App → HTTP API → Node.js Server → Database/Twilio/AI
     ↓           ↓              ↓              ↓
SharedPrefs → Provider → Socket.io → Real-time Updates
     ↓           ↓              ↓              ↓
Local Cache → UI State → Dashboard → Live Call Status
```

## Context Engineering Implementation

### Hierarchical Classification
- **Core HTTP Service**: DNA level (fundamental API communication)
- **Provider State**: Protein level (state management and data flow)
- **Screen Components**: Molecule level (UI building blocks)
- **Navigation System**: Cell level (complete user experience)
- **App Integration**: Organ level (system-wide functionality)
- **Complete Mobile Solution**: Neural System level (intelligent mobile interface)

### Biological Metaphor Mapping
- **DNA (Core Logic)**: HTTP service, authentication, data models
- **Proteins (Functions)**: API calls, state updates, notification handlers
- **Membranes (Interfaces)**: REST API, SharedPreferences, notification system
- **Organelles (Sub-components)**: Dashboard, contacts, call logs, settings

## Core Features (Current Implementation v1.2.3)
1. **Real-time Dashboard**: Live call status and statistics
2. **Contact Management**: Add/remove whitelisted contacts
3. **Call History**: Complete log with AI summaries and voicemail
4. **Blacklist Management**: Block unwanted numbers with reasons
5. **Settings Configuration**: Server URL and connection settings
6. **Background Monitoring**: Notifications when app is closed
7. **Samsung Z Fold Support**: Optimized for foldable displays
8. **Smart Authentication**: Pre-configured defaults, no manual setup
9. **Quick Actions**: Fast access to key functions from dashboard

## Authentication Architecture (v1.2.3)

### Smart Default Strategy
- **Pre-configured API Key**: Built into app, no manual entry needed
- **Default Server URL**: http://calls.popzplace.com:3001 preset
- **Auto-save Defaults**: Automatically saves to SharedPreferences
- **Seamless Connection**: Works immediately on first launch
- **Settings Override**: Manual configuration available if needed

### HTTP Service Authentication
```dart
Map<String, String> _getAuthHeaders() {
  final headers = {
    'User-Agent': 'CallForwardingApp/1.0.0 (Flutter-HTTP)',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (_apiKey.isNotEmpty) {
    headers['X-API-Key'] = _apiKey;
  }
  
  return headers;
}
```

## Code Standards & Patterns

### File Organization
```
call_forwarding_app/
├── CLAUDE.md (this file - project context)
├── lib/
│   ├── main.dart (app entry point)
│   ├── models/
│   │   └── app_state.dart (Provider state management)
│   ├── screens/
│   │   ├── dashboard_screen.dart (main interface)
│   │   ├── contacts_screen.dart (whitelist management)
│   │   ├── call_logs_screen.dart (history with playback)
│   │   ├── blacklist_screen.dart (spam management)
│   │   └── settings_screen.dart (configuration)
│   ├── services/
│   │   ├── http_service.dart (API communication)
│   │   ├── notification_service.dart (alerts)
│   │   └── background_service.dart (monitoring)
│   └── widgets/ (reusable components)
├── .claude/commands/ (workflow templates)
├── docs/PRPs/ (product requirements)
├── examples/ (code patterns)  
└── templates/ (reusable templates)
```

### Coding Standards
- **Modern Dart**: Null safety, async/await patterns
- **Widget Composition**: Reusable, stateless widgets where possible
- **State Management**: Provider pattern for app-wide state
- **Error Handling**: Comprehensive try-catch with user feedback
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Material Design**: Consistent with Android design language

### API Communication Pattern
```dart
Future<Map<String, dynamic>?> apiCall(String endpoint) async {
  try {
    final response = await http.get(
      Uri.parse('$_serverUrl$endpoint'),
      headers: _getAuthHeaders(),
    ).timeout(Duration(seconds: _timeoutSeconds));

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      debugPrint('API error: ${response.statusCode}');
      return null;
    }
  } catch (e) {
    debugPrint('API call error: $e');
    return null;
  }
}
```

## Development Workflow

### New Feature Process
1. **Context Review**: Check CLAUDE.md and existing patterns
2. **State Planning**: Determine Provider state changes needed
3. **UI Design**: Follow Material Design and Samsung optimizations
4. **API Integration**: Use established HTTP service patterns
5. **Testing**: Test on Samsung Z Fold with various screen states
6. **Documentation**: Update capabilities and feature documentation

### Screen Development Pattern
```dart
class NewScreen extends StatefulWidget {
  const NewScreen({super.key});

  @override
  State<NewScreen> createState() => _NewScreenState();
}

class _NewScreenState extends State<NewScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Screen Title'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: Consumer<AppState>(
        builder: (context, appState, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Widget content
              ],
            ),
          );
        },
      ),
    );
  }
}
```

### State Management Pattern
```dart
class AppState extends ChangeNotifier {
  // Private data
  List<Contact> _contacts = [];
  
  // Public getters
  List<Contact> get contacts => _contacts;
  
  // Public methods
  void setContacts(List<Contact> contacts) {
    _contacts = contacts;
    notifyListeners();
  }
  
  Future<void> addContact(String name, String number) async {
    final httpService = HttpService();
    final success = await httpService.addContact(name, number);
    
    if (success) {
      // Refresh data
      await loadContacts();
    }
  }
}
```

## Screen-Specific Implementation

### Dashboard Screen
- **Real-time Stats**: Connection status, contact count, recent calls
- **Quick Actions**: Fast access to add contact, view logs, settings
- **Live Call Status**: Current call progress with visual indicators
- **Samsung Z Fold**: Adaptive layout for folded/unfolded states

### Contacts Screen
- **Contact List**: Scrollable list with search functionality
- **Add Contact**: Form with validation and duplicate checking
- **Contact Actions**: Edit, delete with confirmation dialogs
- **Integration**: Real-time sync with backend whitelist

### Call Logs Screen
- **History Display**: Chronological list with status indicators
- **AI Summaries**: Show Claude AI analysis of each call
- **Voicemail Playback**: Integrated audio player for recordings
- **Actions**: Block number, add to contacts from logs

### Settings Screen
- **Connection Settings**: Server URL, API key (pre-configured)
- **Notification Settings**: Alert preferences, sounds, vibration
- **Background Monitoring**: Enable/disable background processing
- **Device Info**: Connection status, app version, debug information

## Samsung Galaxy Z Fold 3 Optimizations

### Responsive Design
```dart
Widget _buildLayout(BuildContext context) {
  final screenWidth = MediaQuery.of(context).size.width;
  final isUnfolded = screenWidth > 600;
  
  if (isUnfolded) {
    return Row(
      children: [
        Expanded(flex: 1, child: _buildSidebar()),
        Expanded(flex: 2, child: _buildMainContent()),
      ],
    );
  } else {
    return _buildMainContent();
  }
}
```

### Foldable States
- **Folded Mode**: Single column layout, bottom navigation
- **Unfolded Mode**: Two-pane layout, expanded information display
- **Hinge Awareness**: Adapt content around physical hinge
- **Orientation Changes**: Handle rotation and folding state changes

## Background Processing

### Notification Service
```dart
class NotificationService {
  static const channelId = 'call_forwarding';
  static const channelName = 'Call Forwarding Alerts';
  
  Future<void> showCallNotification(String fromNumber, String contactName) async {
    const androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );
    
    await flutterLocalNotificationsPlugin.show(
      0,
      'Incoming Call',
      'Call from $contactName ($fromNumber)',
      const NotificationDetails(android: androidDetails),
    );
  }
}
```

### Background Monitoring
- **Service Registration**: Android background service for monitoring
- **Battery Optimization**: Efficient polling and connection management
- **Network Awareness**: Handle network changes and reconnection
- **Lifecycle Management**: Proper service start/stop based on app state

## Data Models

### Core Data Models
```dart
class Contact {
  final int id;
  final String name;
  final String phoneNumber;
  final DateTime dateAdded;
  
  Contact({
    required this.id,
    required this.name,
    required this.phoneNumber,
    required this.dateAdded,
  });
  
  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'],
      name: json['name'],
      phoneNumber: json['phone_number'],
      dateAdded: DateTime.parse(json['date_added']),
    );
  }
}

class CallLog {
  final int id;
  final String fromNumber;
  final String status;
  final String? summary;
  final String? recordingUrl;
  final DateTime timestamp;
  
  // Constructor and fromJson method...
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] App launches and connects to server
- [ ] Dashboard shows correct stats and connection status
- [ ] Contacts can be added, edited, and deleted
- [ ] Call logs display with proper formatting
- [ ] Blacklist management functions correctly
- [ ] Settings save and load properly
- [ ] Background notifications work when app closed
- [ ] Samsung Z Fold folding/unfolding handled gracefully
- [ ] Network loss/recovery handled properly

### Device-Specific Testing
- [ ] Samsung Z Fold 3 folded mode layout
- [ ] Samsung Z Fold 3 unfolded mode layout
- [ ] Screen rotation in both modes
- [ ] Hinge positioning awareness
- [ ] Battery optimization compliance
- [ ] Android background processing permissions

## Performance Expectations
- **App Launch**: <3 seconds cold start
- **API Response**: Visual feedback within 1 second
- **Memory Usage**: <100MB typical usage
- **Battery Impact**: Minimal background consumption
- **Network Usage**: Efficient polling, data caching
- **UI Responsiveness**: 60fps scrolling and animations

## Security Considerations
- **API Key Storage**: SecureStorage for sensitive data (if needed)
- **Network Security**: HTTPS for API communication
- **Input Validation**: Client-side validation for user inputs
- **Permissions**: Minimal required permissions for functionality
- **Data Encryption**: Local data encryption for sensitive information

## Build and Deployment

### Build Configuration
```yaml
# pubspec.yaml version management
version: 1.2.3+10

# Build commands
flutter build apk --release
flutter build appbundle --release

# Signing configuration (release builds)
android/app/build.gradle - signingConfigs
```

### APK Versioning Strategy
- **Major.Minor.Patch+Build** format
- **Major**: Significant architectural changes
- **Minor**: New features or major improvements  
- **Patch**: Bug fixes and small improvements
- **Build**: Incremental build number for each release

### Deployment Process
1. **Version Increment**: Update pubspec.yaml version
2. **Build APK**: `flutter build apk --release`
3. **Copy to Desktop**: For easy installation
4. **Version Naming**: Include feature description in filename
5. **Testing**: Install and test on Samsung Z Fold 3

## AI Assistant Guidelines

### Context Awareness Rules
- Always reference this CLAUDE.md for Flutter-specific context
- Consider backend integration with call-forwarding-app
- Follow established Provider state management patterns
- Maintain Samsung Z Fold 3 optimization requirements
- Respect authentication and API communication patterns

### Development Standards
- **Widget Design**: Reusable, composable widgets
- **State Management**: Consistent Provider pattern usage
- **Error Handling**: User-friendly error messages and recovery
- **Performance**: Efficient list rendering, proper disposal
- **Accessibility**: Screen reader support, semantic labels
- **MANDATORY APK BUILD RULE**: After ANY code changes, ALWAYS build APK and copy to desktop with version number
- **MANDATORY VERSION CHECK**: ALWAYS check LATEST_VERSION.txt file before incrementing version numbers

### Communication Protocol
- Use PRP templates for complex mobile features
- Reference examples directory for established patterns
- Follow workflow commands for common development tasks
- Update documentation with significant changes
- Maintain feature parity with backend capabilities

## Success Metrics
- **User Experience**: Smooth, responsive interface on Z Fold 3
- **Reliability**: Stable connection and data synchronization
- **Performance**: Fast API responses and UI interactions
- **Battery Life**: Minimal background processing impact
- **Feature Completeness**: Full access to backend functionality

## Version History
- **v1.0.x**: Initial Flutter implementation
- **v1.1.x**: Quick actions, timestamp improvements, Block Number
- **v1.1.5**: Current - Dashboard recent activity cleanup (phone number readability + timestamp fixes)
- **v1.2.x**: Authentication support and smart defaults
- **v1.2.3**: Smart authentication with pre-configured defaults

## Context Engineering Integration
This Flutter project now follows context engineering principles for:
- **Comprehensive Context**: This CLAUDE.md provides complete mobile app overview
- **Structured Communication**: PRP templates for mobile feature development
- **Example-Driven Development**: Established patterns for widgets and services
- **Validation Gates**: Testing checklists for device-specific functionality
- **Progressive Complexity**: From basic UI to advanced Samsung Z Fold optimization

**The Call Forwarding Flutter App is now optimized for AI assistant collaboration through context engineering principles while maintaining seamless integration with the backend system and optimal user experience on Samsung Galaxy Z Fold 3.**