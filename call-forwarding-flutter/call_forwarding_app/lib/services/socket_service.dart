import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../models/app_state.dart';
import 'notification_service.dart';

class SocketService {
  // Singleton pattern
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  String _serverUrl = 'http://192.168.68.69:3001'; // Default Ubuntu server - will be loaded from settings
  static const int _reconnectionDelay = 3000; // Increased for mobile networks
  static const int _maxReconnectionAttempts = 10; // More attempts for unreliable connections
  static const int _timeout = 30000; // Increased timeout for mobile networks

  io.Socket? _socket;
  AppState? _appState;
  final NotificationService _notificationService = NotificationService();
  Timer? _reconnectionTimer;
  bool _isConnecting = false;
  bool _isBackground = false;
  int _reconnectionAttempts = 0;

  // Connection status getters
  bool get isConnected => _socket?.connected ?? false;
  bool get isConnecting => _isConnecting;

  Future<void> _loadServerUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _serverUrl = prefs.getString('server_url') ?? 'http://192.168.68.69:3001';
      debugPrint('SocketService: Using server URL: $_serverUrl');
      
      // Validate URL format
      if (!_serverUrl.startsWith('https://') && !_serverUrl.startsWith('http://')) {
        debugPrint('SocketService: Invalid URL format, using default');
        _serverUrl = 'http://192.168.68.69:3001';
      }
    } catch (e) {
      debugPrint('SocketService: Error loading server URL: $e');
      _serverUrl = 'http://192.168.68.69:3001';
    }
  }

  Future<void> connect() async {
    if (_isConnecting || isConnected) {
      debugPrint('SocketService: Already connecting or connected');
      return;
    }

    // Load server URL from settings
    await _loadServerUrl();

    _isConnecting = true;
    _appState?.setConnectionStatus(ConnectionStatus.connecting);

    try {
      debugPrint('SocketService: === STARTING CONNECTION ATTEMPT ===');
      debugPrint('SocketService: Target URL: $_serverUrl');
      debugPrint('SocketService: Using LAN connection (polling->websocket)');
      debugPrint('SocketService: Timeout: 20 seconds');

      // LAN connection configuration - no CORS issues!
      _socket = io.io(_serverUrl, <String, dynamic>{
        'transports': ['polling', 'websocket'], // Both transports work on LAN
        'timeout': 20000, // Normal timeout for LAN
        'autoConnect': true,
        'upgrade': true, // Allow websocket upgrade for better performance
        'forceNew': true,
        'withCredentials': false,
        'extraHeaders': {
          'User-Agent': 'CallForwardingApp/1.0.0 (Flutter-LAN)', // Identify as LAN client
        }
      });

      _setupSocketListeners();
      
      // Wait for connection with timeout
      await _waitForConnection();

    } catch (e) {
      debugPrint('SocketService: Connection error: $e');
      _appState?.setConnectionStatus(ConnectionStatus.error, e.toString());
      _isConnecting = false;
      _scheduleReconnection();
    }
  }

  Future<void> _waitForConnection() async {
    final completer = Completer<void>();
    Timer? timeoutTimer;

    void onConnect() {
      if (!completer.isCompleted) {
        timeoutTimer?.cancel();
        completer.complete();
      }
    }

    void onError(dynamic error) {
      if (!completer.isCompleted) {
        timeoutTimer?.cancel();
        completer.completeError(error);
      }
    }

    _socket?.once('connect', (_) => onConnect());
    _socket?.once('connect_error', onError);
    _socket?.once('error', onError);

    timeoutTimer = Timer(const Duration(milliseconds: _timeout), () {
      if (!completer.isCompleted) {
        completer.completeError('Connection timeout');
      }
    });

    return completer.future;
  }

  void _setupSocketListeners() {
    if (_socket == null) return;

    // Connection events
    _socket!.on('connect', (_) {
      debugPrint('SocketService: ✅ CONNECTED SUCCESSFULLY to $_serverUrl');
      debugPrint('SocketService: Transport: ${_socket?.io.engine?.transport?.name ?? "unknown"}');
      _isConnecting = false;
      _reconnectionAttempts = 0;
      _appState?.setConnectionStatus(ConnectionStatus.connected);
      
      // Request sync of missed data
      _requestSync();
      
      // Update last connection time
      _updateLastConnectionTime();
    });

    _socket!.on('disconnect', (reason) {
      debugPrint('SocketService: Disconnected: $reason');
      _appState?.setConnectionStatus(ConnectionStatus.disconnected);
      
      if (reason != 'io client disconnect') {
        _scheduleReconnection();
      }
    });

    _socket!.on('connect_error', (error) {
      debugPrint('SocketService: Connection error: $error');
      debugPrint('SocketService: Error type: ${error.runtimeType}');
      debugPrint('SocketService: Full error details: ${error.toString()}');
      _isConnecting = false;
      
      // Enhanced error handling for different error types
      String errorMessage = 'Connection failed';
      if (error.toString().contains('timeout') || error.toString().contains('TIMEOUT')) {
        errorMessage = 'Connection timeout - server may be slow or unreachable';
      } else if (error.toString().contains('refused') || error.toString().contains('ECONNREFUSED')) {
        errorMessage = 'Connection refused - check if server is running';
      } else if (error.toString().contains('unreachable') || error.toString().contains('ENETUNREACH')) {
        errorMessage = 'Network unreachable - check internet connection';
      } else if (error.toString().contains('tunnel') || error.toString().contains('cloudflare')) {
        errorMessage = 'Tunnel connection issue - check tunnel status or URL';
      } else if (error.toString().contains('xhr poll error') || error.toString().contains('polling')) {
        errorMessage = 'Polling failed - try different network or restart app';
      } else {
        errorMessage = 'Connection failed: ${error.toString().substring(0, 100)}...';
      }
      
      _appState?.setConnectionStatus(ConnectionStatus.error, errorMessage);
      _scheduleReconnection();
    });

    _socket!.on('error', (error) {
      debugPrint('SocketService: Socket error: $error');
      debugPrint('SocketService: Error details: ${error.toString()}');
      _appState?.setConnectionStatus(ConnectionStatus.error, 'Socket error: $error');
    });

    // Call events
    _socket!.on('call-started', _handleCallStarted);
    _socket!.on('call-progress', _handleCallProgress);
    _socket!.on('call-ended', _handleCallEnded);
    _socket!.on('call-screening', _handleCallScreening);
    
    // Data sync events
    _socket!.on('contacts-updated', _handleContactsUpdated);
    _socket!.on('blacklist-updated', _handleBlacklistUpdated);
    _socket!.on('call-logs-updated', _handleCallLogsUpdated);
    _socket!.on('stats-updated', _handleStatsUpdated);
    
    // Sync response
    _socket!.on('sync-data', _handleSyncData);
  }

  void _handleCallStarted(dynamic data) {
    debugPrint('SocketService: Call started: $data');
    
    try {
      final callData = data as Map<String, dynamic>;
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
      debugPrint('SocketService: Error handling call started: $e');
    }
  }

  void _handleCallProgress(dynamic data) {
    debugPrint('SocketService: Call progress: $data');
    
    try {
      final callData = data as Map<String, dynamic>;
      final callSid = callData['callSid'] as String?;
      final status = callData['status'] as String?;
      final message = callData['message'] as String?;
      
      if (callSid != null && status != null) {
        final callStatus = _parseCallStatus(status);
        _appState?.updateCallStatus(callSid, callStatus, message);
      }
      
    } catch (e) {
      debugPrint('SocketService: Error handling call progress: $e');
    }
  }

  void _handleCallEnded(dynamic data) {
    debugPrint('SocketService: Call ended: $data');
    
    try {
      final callData = data as Map<String, dynamic>;
      final callSid = callData['callSid'] as String?;
      
      if (callSid != null) {
        _appState?.updateCallStatus(callSid, CallStatus.completed);
        
        // Clear current call after a delay
        Timer(const Duration(seconds: 3), () {
          _appState?.setCurrentCall(null);
        });
      }
      
    } catch (e) {
      debugPrint('SocketService: Error handling call ended: $e');
    }
  }

  void _handleCallScreening(dynamic data) {
    debugPrint('SocketService: Call screening: $data');
    
    try {
      final callData = data as Map<String, dynamic>;
      final callSid = callData['callSid'] as String?;
      final message = callData['message'] as String?;
      
      if (callSid != null) {
        _appState?.updateCallStatus(callSid, CallStatus.screening, message);
      }
      
    } catch (e) {
      debugPrint('SocketService: Error handling call screening: $e');
    }
  }

  void _handleContactsUpdated(dynamic data) {
    debugPrint('SocketService: Contacts updated');
    
    try {
      final contactsData = data as List<dynamic>;
      final contacts = contactsData
          .map((json) => Contact.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _appState?.setContacts(contacts);
      
    } catch (e) {
      debugPrint('SocketService: Error handling contacts update: $e');
    }
  }

  void _handleBlacklistUpdated(dynamic data) {
    debugPrint('SocketService: Blacklist updated');
    
    try {
      final blacklistData = data as List<dynamic>;
      final entries = blacklistData
          .map((json) => BlacklistEntry.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _appState?.setBlacklistEntries(entries);
      
    } catch (e) {
      debugPrint('SocketService: Error handling blacklist update: $e');
    }
  }

  void _handleCallLogsUpdated(dynamic data) {
    debugPrint('SocketService: Call logs updated');
    
    try {
      final logsData = data as List<dynamic>;
      final logs = logsData
          .map((json) => CallLog.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _appState?.setCallLogs(logs);
      
    } catch (e) {
      debugPrint('SocketService: Error handling call logs update: $e');
    }
  }

  void _handleStatsUpdated(dynamic data) {
    debugPrint('SocketService: Stats updated');
    
    try {
      final statsData = data as Map<String, dynamic>;
      
      _appState?.updateStats(
        totalContacts: statsData['totalContacts'] as int?,
        recentCalls: statsData['recentCalls'] as int?,
        aiScreeningStatus: statsData['aiScreeningStatus'] as String?,
      );
      
    } catch (e) {
      debugPrint('SocketService: Error handling stats update: $e');
    }
  }

  void _handleSyncData(dynamic data) {
    debugPrint('SocketService: Received sync data');
    
    try {
      final syncData = data as Map<String, dynamic>;
      
      // Update contacts
      if (syncData['contacts'] != null) {
        _handleContactsUpdated(syncData['contacts']);
      }
      
      // Update blacklist
      if (syncData['blacklist'] != null) {
        _handleBlacklistUpdated(syncData['blacklist']);
      }
      
      // Update call logs
      if (syncData['callLogs'] != null) {
        _handleCallLogsUpdated(syncData['callLogs']);
      }
      
      // Update stats
      if (syncData['stats'] != null) {
        _handleStatsUpdated(syncData['stats']);
      }
      
    } catch (e) {
      debugPrint('SocketService: Error handling sync data: $e');
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

  void _requestSync() async {
    if (!isConnected) return;
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSync = prefs.getInt('last_sync') ?? 0;
      
      _socket?.emit('request-sync', {'timestamp': lastSync});
      
      // Update last sync time
      prefs.setInt('last_sync', DateTime.now().millisecondsSinceEpoch);
      
    } catch (e) {
      debugPrint('SocketService: Error requesting sync: $e');
    }
  }

  void _updateLastConnectionTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      prefs.setInt('last_connection', DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('SocketService: Error updating last connection time: $e');
    }
  }

  void _scheduleReconnection() {
    if (_reconnectionAttempts >= _maxReconnectionAttempts) {
      debugPrint('SocketService: Max reconnection attempts reached');
      return;
    }

    _reconnectionTimer?.cancel();
    _reconnectionTimer = Timer(
      Duration(milliseconds: _reconnectionDelay * (_reconnectionAttempts + 1)),
      () {
        _reconnectionAttempts++;
        debugPrint('SocketService: Reconnection attempt $_reconnectionAttempts');
        connect();
      },
    );
  }

  // App lifecycle handlers
  void handleAppResumed() {
    debugPrint('SocketService: App resumed');
    _isBackground = false;
    
    if (!isConnected && !_isConnecting) {
      connect();
    } else if (isConnected) {
      _requestSync();
    }
  }

  void handleAppPaused() {
    debugPrint('SocketService: App paused');
    _isBackground = true;
    
    if (isConnected) {
      _socket?.emit('app-backgrounded');
    }
  }

  // Public methods
  void setAppState(AppState appState) {
    _appState = appState;
  }

  void emit(String event, [dynamic data]) {
    if (isConnected) {
      _socket?.emit(event, data);
    } else {
      debugPrint('SocketService: Cannot emit $event - not connected');
    }
  }

  void disconnect() {
    debugPrint('SocketService: Disconnecting...');
    _reconnectionTimer?.cancel();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnecting = false;
    _appState?.setConnectionStatus(ConnectionStatus.disconnected);
  }

  // Simple test connection
  Future<bool> testConnection(String testUrl) async {
    try {
      debugPrint('SocketService: Testing connection to $testUrl');
      
      // Save URL to preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('server_url', testUrl);
      debugPrint('SocketService: URL saved to preferences');
      
      // Reload URL from preferences
      await _loadServerUrl();
      debugPrint('SocketService: URL loaded: $_serverUrl');
      
      // Disconnect any existing connection
      disconnect();
      debugPrint('SocketService: Disconnected existing connection');
      
      // Try to connect
      await connect();
      debugPrint('SocketService: Connect method called');
      
      // Wait and check
      await Future.delayed(const Duration(seconds: 8));
      final success = isConnected;
      debugPrint('SocketService: Final connection status: $success');
      
      return success;
    } catch (e, stackTrace) {
      debugPrint('SocketService: Test connection error: $e');
      debugPrint('SocketService: Stack trace: $stackTrace');
      return false;
    }
  }

  // Force reconnection with new URL (call after settings change)
  Future<void> reconnectWithNewUrl() async {
    debugPrint('SocketService: Reconnecting with updated URL...');
    disconnect();
    await Future.delayed(const Duration(milliseconds: 1000)); // Brief delay
    await connect();
  }

  void dispose() {
    disconnect();
  }
}