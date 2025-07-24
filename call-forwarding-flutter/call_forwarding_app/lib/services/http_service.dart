import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_state.dart';
import 'notification_service.dart';

class HttpService {
  // Singleton pattern
  static final HttpService _instance = HttpService._internal();
  factory HttpService() => _instance;
  HttpService._internal();

  String _serverUrl = 'http://calls.popzplace.com:3001'; // Main call forwarding server
  String _apiKey = ''; // API key for authentication
  static const int _timeoutSeconds = 10; // HTTP timeout
  static const int _pollingInterval = 1; // Poll every 1 second for faster real-time updates

  AppState? _appState;
  final NotificationService _notificationService = NotificationService();
  Timer? _pollingTimer;
  bool _isPolling = false;
  bool _isBackground = false;

  // Connection status
  bool get isConnected => _lastConnectionSuccess && _pollingTimer?.isActive == true;

  bool _lastConnectionSuccess = false;
  DateTime? _lastSuccessfulConnection;

  Future<void> _loadServerUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _serverUrl = prefs.getString('server_url') ?? 'http://calls.popzplace.com:3001';
      _apiKey = prefs.getString('api_key') ?? 'cf_59f94e3512e690c354da4dfd96ba7cdd215064d8d725b7fb334a51070ec45039';
      
      // Auto-save defaults to SharedPreferences if not already saved
      if (!prefs.containsKey('server_url')) {
        await prefs.setString('server_url', _serverUrl);
      }
      if (!prefs.containsKey('api_key')) {
        await prefs.setString('api_key', _apiKey);
      }
      
      debugPrint('HttpService: Using server URL: $_serverUrl');
      debugPrint('HttpService: API Key configured: ${_apiKey.isNotEmpty}');
      
      // Validate URL format
      if (!_serverUrl.startsWith('https://') && !_serverUrl.startsWith('http://')) {
        debugPrint('HttpService: Invalid URL format, using default');
        _serverUrl = 'http://calls.popzplace.com:3001';
      }
    } catch (e) {
      debugPrint('HttpService: Error loading server URL: $e');
      _serverUrl = 'http://calls.popzplace.com:3001';
    }
  }

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

  Future<void> connect() async {
    debugPrint('HttpService: === STARTING HTTP CONNECTION ===');
    await _loadServerUrl();
    
    _appState?.setConnectionStatus(ConnectionStatus.connecting);

    try {
      // Test initial connection
      final success = await _testConnection();
      if (success) {
        debugPrint('HttpService: ✅ CONNECTED SUCCESSFULLY to $_serverUrl');
        _lastConnectionSuccess = true;
        _lastSuccessfulConnection = DateTime.now();
        _appState?.setConnectionStatus(ConnectionStatus.connected);
        
        // Start faster polling for real-time updates (instead of webhook server)
        _startPolling();
        
        // Initial data sync
        await syncAllData();
        
      } else {
        debugPrint('HttpService: ❌ CONNECTION FAILED');
        _lastConnectionSuccess = false;
        _appState?.setConnectionStatus(ConnectionStatus.error, 'Cannot reach server');
      }
      
    } catch (e) {
      debugPrint('HttpService: Connection error: $e');
      _lastConnectionSuccess = false;
      _appState?.setConnectionStatus(ConnectionStatus.error, e.toString());
    }
  }

  Future<bool> _testConnection() async {
    try {
      debugPrint('HttpService: Testing connection to $_serverUrl/api/health');
      
      final response = await http.get(
        Uri.parse('$_serverUrl/api/health'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      if (response.statusCode == 200) {
        debugPrint('HttpService: Health check successful: ${response.statusCode}');
        return true;
      } else {
        debugPrint('HttpService: Health check failed: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      debugPrint('HttpService: Health check error: $e');
      return false;
    }
  }

  void _startPolling() {
    if (_isPolling) return;
    
    debugPrint('HttpService: Starting polling every $_pollingInterval seconds');
    _isPolling = true;
    
    _pollingTimer = Timer.periodic(Duration(seconds: _pollingInterval), (timer) async {
      if (!_isBackground) {
        await _pollForUpdates();
      }
    });
  }

  void _stopPolling() {
    debugPrint('HttpService: Stopping polling');
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _isPolling = false;
  }

  Future<void> _pollForUpdates() async {
    try {
      // Get latest timestamp from last update
      final prefs = await SharedPreferences.getInstance();
      final lastUpdate = prefs.getInt('last_update_timestamp') ?? 0;
      
      final response = await http.get(
        Uri.parse('$_serverUrl/api/updates?since=$lastUpdate'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        await _processUpdates(data);
        
        // Update connection status if it was previously failed
        if (!_lastConnectionSuccess) {
          _lastConnectionSuccess = true;
          _lastSuccessfulConnection = DateTime.now();
          _appState?.setConnectionStatus(ConnectionStatus.connected);
        }
      } else {
        debugPrint('HttpService: Polling failed: ${response.statusCode}');
        _handleConnectionError('Polling failed: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('HttpService: Polling error: $e');
      _handleConnectionError('Polling error: $e');
    }
  }

  void _handleConnectionError(String error) {
    _lastConnectionSuccess = false;
    _appState?.setConnectionStatus(ConnectionStatus.error, error);
  }

  Future<void> _processUpdates(Map<String, dynamic> data) async {
    try {
      // Process new calls
      if (data['newCalls'] != null) {
        final newCalls = data['newCalls'] as List<dynamic>;
        for (final callData in newCalls) {
          await _handleNewCall(callData);
        }
      }

      // Process call updates
      if (data['callUpdates'] != null) {
        final updates = data['callUpdates'] as List<dynamic>;
        for (final update in updates) {
          _handleCallUpdate(update);
        }
      }

      // Process data updates first
      if (data['contacts'] != null) {
        _handleContactsUpdate(data['contacts']);
      }
      
      if (data['blacklist'] != null) {
        _handleBlacklistUpdate(data['blacklist']);
      }
      
      if (data['callLogs'] != null) {
        _handleCallLogsUpdate(data['callLogs']);
      }
      
      // Don't override stats - individual handlers already set correct values
      // The _handleContactsUpdate and _handleCallLogsUpdate methods 
      // already call updateStats with the correct counts
      debugPrint('HttpService: Skipping stats override to preserve correct values');

      // Update last update timestamp
      if (data['timestamp'] != null) {
        final prefs = await SharedPreferences.getInstance();
        prefs.setInt('last_update_timestamp', data['timestamp']);
      }
      
    } catch (e) {
      debugPrint('HttpService: Error processing updates: $e');
    }
  }

  Future<void> _handleNewCall(Map<String, dynamic> callData) async {
    debugPrint('HttpService: New call received: $callData');
    
    try {
      final callInfo = CallInfo.fromJson(callData);
      _appState?.setCurrentCall(callInfo);
      
      // Show notification if app is in background
      if (_isBackground) {
        _notificationService.showCallNotification(
          callInfo.fromNumber,
          callInfo.contactName ?? 'Unknown Caller',
        );
      }
      
      // Play alert sound
      _notificationService.playCallAlert();
      
    } catch (e) {
      debugPrint('HttpService: Error handling new call: $e');
    }
  }

  void _handleCallUpdate(Map<String, dynamic> updateData) {
    debugPrint('HttpService: Call update: $updateData');
    
    try {
      final callSid = updateData['callSid'] as String?;
      final status = updateData['status'] as String?;
      final message = updateData['message'] as String?;
      
      if (callSid != null && status != null) {
        final callStatus = _parseCallStatus(status);
        _appState?.updateCallStatus(callSid, callStatus, message);
      }
      
    } catch (e) {
      debugPrint('HttpService: Error handling call update: $e');
    }
  }

  void _handleContactsUpdate(List<dynamic> contactsData) {
    debugPrint('HttpService: Contacts updated - count: ${contactsData.length}');
    
    try {
      final contacts = contactsData
          .map((json) => Contact.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _appState?.setContacts(contacts);
      
      // Force update total contacts stat immediately
      _appState?.updateStats(totalContacts: contacts.length);
      
      debugPrint('HttpService: Contacts set in AppState: ${contacts.length}');
      
    } catch (e) {
      debugPrint('HttpService: Error handling contacts update: $e');
    }
  }

  void _handleBlacklistUpdate(List<dynamic> blacklistData) {
    debugPrint('HttpService: Blacklist updated');
    
    try {
      final entries = blacklistData
          .map((json) => BlacklistEntry.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _appState?.setBlacklistEntries(entries);
      
    } catch (e) {
      debugPrint('HttpService: Error handling blacklist update: $e');
    }
  }

  void _handleCallLogsUpdate(List<dynamic> logsData) {
    debugPrint('HttpService: Call logs updated - count: ${logsData.length}');
    
    try {
      final logs = logsData
          .map((json) => CallLog.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _appState?.setCallLogs(logs);
      
      // Force update recent calls stat immediately
      _appState?.updateStats(recentCalls: logs.length);
      
      debugPrint('HttpService: Call logs set in AppState: ${logs.length}');
      
    } catch (e) {
      debugPrint('HttpService: Error handling call logs update: $e');
    }
  }

  void _handleStatsUpdate(Map<String, dynamic> statsData) {
    debugPrint('HttpService: Stats updated: $statsData');
    
    try {
      _appState?.updateStats(
        totalContacts: statsData['totalContacts'] as int?,
        recentCalls: statsData['recentCalls'] as int?,
        aiScreeningStatus: statsData['aiScreeningStatus'] as String?,
      );
      
      debugPrint('HttpService: Stats set - Contacts: ${statsData['totalContacts']}, Calls: ${statsData['recentCalls']}');
      
    } catch (e) {
      debugPrint('HttpService: Error handling stats update: $e');
    }
  }

  CallStatus _parseCallStatus(String status) {
    switch (status.toLowerCase()) {
      case 'ringing':
        return CallStatus.ringing;
      case 'in-progress':
        return CallStatus.inProgress;
      case 'screening':
        return CallStatus.screening;
      case 'completed':
        return CallStatus.completed;
      default:
        return CallStatus.idle;
    }
  }

  Future<void> syncAllData() async {
    debugPrint('HttpService: Syncing all data');
    
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/sync'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        await _processUpdates(data);
        debugPrint('HttpService: Initial sync completed');
      } else {
        debugPrint('HttpService: Sync failed: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('HttpService: Sync error: $e');
    }
  }

  // Public API methods for UI to fetch data
  Future<Map<String, dynamic>?> getContacts() async {
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/contacts'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (e) {
      debugPrint('HttpService: Get contacts error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> getCallLogs() async {
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/call-logs'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (e) {
      debugPrint('HttpService: Get call logs error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> getBlacklist() async {
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/blacklist'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (e) {
      debugPrint('HttpService: Get blacklist error: $e');
    }
    return null;
  }

  Future<bool> addContact(String name, String number) async {
    try {
      final response = await http.post(
        Uri.parse('$_serverUrl/api/contacts'),
        headers: _getAuthHeaders(),
        body: json.encode({'name': name, 'number': number}),
      ).timeout(Duration(seconds: _timeoutSeconds));

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('HttpService: Add contact error: $e');
      return false;
    }
  }

  Future<bool> removeContact(String contactId) async {
    try {
      final response = await http.delete(
        Uri.parse('$_serverUrl/api/contacts/$contactId'),
        headers: _getAuthHeaders(),
      ).timeout(Duration(seconds: _timeoutSeconds));

      return response.statusCode == 200 || response.statusCode == 204;
    } catch (e) {
      debugPrint('HttpService: Remove contact error: $e');
      return false;
    }
  }

  Future<bool> addToBlacklist(String phoneNumber, String reason) async {
    try {
      final response = await http.post(
        Uri.parse('$_serverUrl/api/blacklist'),
        headers: _getAuthHeaders(),
        body: json.encode({
          'phone_number': phoneNumber,
          'reason': reason,
          'pattern_type': 'exact'
        }),
      ).timeout(Duration(seconds: _timeoutSeconds));

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('HttpService: Add to blacklist error: $e');
      return false;
    }
  }

  // App lifecycle handlers
  void handleAppResumed() {
    debugPrint('HttpService: App resumed');
    _isBackground = false;
    
    if (!isConnected) {
      connect();
    } else {
      // Immediate sync when app becomes active
      syncAllData();
    }
  }

  void handleAppPaused() {
    debugPrint('HttpService: App paused');
    _isBackground = true;
    // Keep polling in background for real-time notifications
  }

  // Public methods
  void setAppState(AppState appState) {
    _appState = appState;
  }

  void disconnect() {
    debugPrint('HttpService: Disconnecting...');
    _stopPolling();
    _lastConnectionSuccess = false;
    _appState?.setConnectionStatus(ConnectionStatus.disconnected);
  }

  // Simple test connection
  Future<bool> testConnection(String testUrl) async {
    try {
      debugPrint('HttpService: Testing connection to $testUrl');
      
      // Save URL to preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('server_url', testUrl);
      debugPrint('HttpService: URL saved to preferences');
      
      // Reload URL from preferences
      await _loadServerUrl();
      debugPrint('HttpService: URL loaded: $_serverUrl');
      
      // Disconnect any existing connection
      disconnect();
      debugPrint('HttpService: Disconnected existing connection');
      
      // Test the new URL
      final success = await _testConnection();
      debugPrint('HttpService: Test result: $success');
      
      return success;
    } catch (e, stackTrace) {
      debugPrint('HttpService: Test connection error: $e');
      debugPrint('HttpService: Stack trace: $stackTrace');
      return false;
    }
  }

  // Force reconnection with new URL
  Future<void> reconnectWithNewUrl() async {
    debugPrint('HttpService: Reconnecting with updated URL...');
    disconnect();
    await Future.delayed(const Duration(milliseconds: 1000)); // Brief delay
    await connect();
  }

  void dispose() {
    disconnect();
  }
}