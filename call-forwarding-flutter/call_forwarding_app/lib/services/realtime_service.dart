import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_state.dart';
import 'notification_service.dart';

class RealtimeService {
  // Singleton pattern
  static final RealtimeService _instance = RealtimeService._internal();
  factory RealtimeService() => _instance;
  RealtimeService._internal();

  String _serverUrl = 'http://192.168.68.69:3001'; // Main server
  IO.Socket? _socket;
  AppState? _appState;
  final NotificationService _notificationService = NotificationService();
  
  bool _isConnected = false;
  bool _isConnecting = false;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  static const int _reconnectDelay = 2; // seconds

  bool get isConnected => _isConnected;

  Future<void> _loadServerUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _serverUrl = prefs.getString('server_url') ?? 'http://192.168.68.69:3001';
      debugPrint('RealtimeService: Using server URL: $_serverUrl');
    } catch (e) {
      debugPrint('RealtimeService: Error loading server URL: $e');
      _serverUrl = 'http://192.168.68.69:3001';
    }
  }

  Future<void> connect() async {
    if (_isConnecting || _isConnected) {
      debugPrint('RealtimeService: Already connecting or connected');
      return;
    }

    debugPrint('RealtimeService: === STARTING SOCKET.IO CONNECTION ===');
    await _loadServerUrl();
    
    _isConnecting = true;
    _appState?.setConnectionStatus(ConnectionStatus.connecting);

    try {
      // Disconnect existing socket if any
      await disconnect();

      // Create new Socket.IO connection
      _socket = IO.io(_serverUrl, <String, dynamic>{
        'transports': ['websocket', 'polling'],
        'timeout': 5000,
        'autoConnect': false,
        'reconnection': true,
        'reconnectionAttempts': _maxReconnectAttempts,
        'reconnectionDelay': _reconnectDelay * 1000,
      });

      _setupSocketEventListeners();
      
      // Connect to the server
      _socket!.connect();
      
    } catch (e) {
      debugPrint('RealtimeService: Connection error: $e');
      _isConnecting = false;
      _appState?.setConnectionStatus(ConnectionStatus.error, e.toString());
    }
  }

  void _setupSocketEventListeners() {
    if (_socket == null) return;

    // Connection events
    _socket!.on('connect', (_) {
      debugPrint('RealtimeService: ✅ CONNECTED to Socket.IO server');
      _isConnected = true;
      _isConnecting = false;
      _reconnectAttempts = 0;
      _appState?.setConnectionStatus(ConnectionStatus.connected);
      
      // Request initial data sync
      _requestInitialData();
    });

    _socket!.on('disconnect', (data) {
      debugPrint('RealtimeService: ❌ DISCONNECTED from server: $data');
      _isConnected = false;
      _appState?.setConnectionStatus(ConnectionStatus.disconnected);
      
      // Auto-reconnect if not manually disconnected
      if (data != 'io client disconnect') {
        _scheduleReconnect();
      }
    });

    _socket!.on('connect_error', (error) {
      debugPrint('RealtimeService: ❌ CONNECTION ERROR: $error');
      _isConnecting = false;
      _isConnected = false;
      _appState?.setConnectionStatus(ConnectionStatus.error, error.toString());
      _scheduleReconnect();
    });

    // ===== REAL-TIME CALL EVENTS =====
    
    _socket!.on('call-incoming', (data) {
      debugPrint('RealtimeService: 🔔 INCOMING CALL: $data');
      _handleIncomingCall(data);
    });

    _socket!.on('call-screening', (data) {
      debugPrint('RealtimeService: 🔍 CALL SCREENING: $data');
      _appState?.addCallStep(
        '🤖 AI Gatekeeper engaged',
        details: 'Asking caller to state purpose',
        icon: '🤖',
      );
      _handleCallUpdate(data, 'Screening - AI engaged');
    });

    _socket!.on('call-whitelisted', (data) {
      debugPrint('RealtimeService: ✅ CALL WHITELISTED: $data');
      _appState?.addCallStep(
        '✅ Contact recognized',
        details: '${data['contactName'] ?? 'Contact'} is whitelisted',
        icon: '✅',
      );
      _handleCallUpdate(data, 'Whitelisted - Direct forwarding');
    });

    _socket!.on('call-blacklisted', (data) {
      debugPrint('RealtimeService: ❌ CALL BLACKLISTED: $data');
      _appState?.addCallStep(
        '❌ Call blocked',
        details: 'Number is blacklisted',
        icon: '❌',
      );
      _handleCallUpdate(data, 'Blacklisted - TCPA message sent');
      
      // Auto-clear the current call after delay
      Timer(const Duration(seconds: 5), () {
        if (_appState?.currentCall?.callSid == data['callSid']) {
          _appState?.updateCallStatus(data['callSid'], CallStatus.completed, 'Blacklist processing complete');
        }
      });
    });

    _socket!.on('call-forwarding', (data) {
      debugPrint('RealtimeService: 📞 CALL FORWARDING: $data');
      _appState?.addCallStep(
        '📞 Forwarding call',
        details: 'Ringing your phone with whisper message',
        icon: '📞',
      );
      _handleCallUpdate(data, 'Forwarding to your number');
    });

    _socket!.on('call-voicemail', (data) {
      debugPrint('RealtimeService: 📧 CALL TO VOICEMAIL: $data');
      _appState?.addCallStep(
        '📧 Sent to voicemail',
        details: 'Recording voicemail message',
        icon: '📧',
      );
      _handleCallUpdate(data, 'Sent to voicemail');
      
      // Auto-clear the current call after delay
      Timer(const Duration(seconds: 10), () {
        if (_appState?.currentCall?.callSid == data['callSid']) {
          _appState?.updateCallStatus(data['callSid'], CallStatus.completed, 'Voicemail recording complete');
        }
      });
    });

    _socket!.on('call-rejected', (data) {
      debugPrint('RealtimeService: 🚫 CALL REJECTED: $data');
      _appState?.addCallStep(
        '🚫 Call rejected',
        details: 'Call declined or blocked',
        icon: '🚫',
      );
      _handleCallUpdate(data, 'Call rejected');
      
      // Auto-clear the current call after delay
      Timer(const Duration(seconds: 5), () {
        if (_appState?.currentCall?.callSid == data['callSid']) {
          _appState?.updateCallStatus(data['callSid'], CallStatus.completed, 'Call rejection complete');
        }
      });
    });

    _socket!.on('dial-completed', (data) {
      debugPrint('RealtimeService: ✅ CALL COMPLETED: $data');
      _appState?.addCallStep(
        '✅ Call completed',
        details: 'Duration: ${data['duration'] ?? 'Unknown'}',
        icon: '✅',
      );
      _handleCallCompleted(data);
    });

    _socket!.on('call-recording-complete', (data) {
      debugPrint('RealtimeService: 🎙️ RECORDING COMPLETE: $data');
      _appState?.addCallStep(
        '🎙️ Recording complete',
        details: 'Voicemail saved and ready for playback',
        icon: '🎙️',
      );
      _handleRecordingComplete(data);
      
      // Auto-clear the current call after delay
      Timer(const Duration(seconds: 3), () {
        if (_appState?.currentCall?.callSid == data['callSid']) {
          _appState?.updateCallStatus(data['callSid'], CallStatus.completed, 'Recording processing complete');
        }
      });
    });

    _socket!.on('ai-analysis-complete', (data) {
      debugPrint('RealtimeService: 🤖 AI ANALYSIS: $data');
      _appState?.addCallStep(
        '🧠 AI Analysis complete',
        details: 'Category: ${data['category'] ?? 'Unknown'}, ${data['summary'] ?? 'Analysis complete'}',
        icon: '🧠',
      );
      _handleAIAnalysis(data);
      
      // Auto-clear the current call after delay if this is the final analysis
      Timer(const Duration(seconds: 5), () {
        if (_appState?.currentCall?.callSid == data['callSid']) {
          _appState?.updateCallStatus(data['callSid'], CallStatus.completed, 'AI analysis complete');
        }
      });
    });

    // ===== DATA MANAGEMENT EVENTS =====
    
    _socket!.on('contact-added', (data) {
      debugPrint('RealtimeService: 👤 CONTACT ADDED: $data');
      _refreshContactsData();
    });

    _socket!.on('contact-deleted', (data) {
      debugPrint('RealtimeService: 👤 CONTACT DELETED: $data');
      _refreshContactsData();
    });

    _socket!.on('blacklist-added', (data) {
      debugPrint('RealtimeService: 🚫 BLACKLIST ADDED: $data');
      _refreshBlacklistData();
    });

    _socket!.on('blacklist-removed', (data) {
      debugPrint('RealtimeService: 🚫 BLACKLIST REMOVED: $data');
      _refreshBlacklistData();
    });

    _socket!.on('call-logs-cleared', (data) {
      debugPrint('RealtimeService: 🗑️ CALL LOGS CLEARED');
      _refreshCallLogsData();
    });

    // Test connection event
    _socket!.on('connection-test', (data) {
      debugPrint('RealtimeService: 🔗 CONNECTION TEST: $data');
    });
  }

  void _handleIncomingCall(dynamic data) {
    try {
      final callInfo = CallInfo(
        callSid: data['callSid'] ?? '',
        fromNumber: data['from'] ?? '',
        contactName: null,
        timestamp: DateTime.parse(data['timestamp'] ?? DateTime.now().toIso8601String()),
        status: CallStatus.ringing,
        message: 'Incoming call',
      );
      
      _appState?.setCurrentCall(callInfo);
      _appState?.addCallStep(
        '📞 Call received',
        details: 'From: ${callInfo.fromNumber}',
        icon: '📞',
      );
      
      // Show notification
      _notificationService.showCallNotification(
        callInfo.fromNumber,
        'Incoming Call',
      );
      
    } catch (e) {
      debugPrint('RealtimeService: Error handling incoming call: $e');
    }
  }

  void _handleCallUpdate(dynamic data, String message) {
    try {
      if (_appState?.currentCall != null) {
        final currentCall = _appState!.currentCall!;
        final updatedCall = CallInfo(
          callSid: currentCall.callSid,
          fromNumber: currentCall.fromNumber,
          contactName: data['contactName'] ?? currentCall.contactName,
          timestamp: currentCall.timestamp,
          status: _parseCallStatus(data['status'] ?? 'in-progress'),
          message: message,
        );
        
        _appState?.setCurrentCall(updatedCall);
      }
    } catch (e) {
      debugPrint('RealtimeService: Error handling call update: $e');
    }
  }

  void _handleCallCompleted(dynamic data) {
    try {
      // Clear current call
      _appState?.setCurrentCall(null);
      
      // Refresh call logs to show the completed call
      _refreshCallLogsData();
      
    } catch (e) {
      debugPrint('RealtimeService: Error handling call completion: $e');
    }
  }

  void _handleRecordingComplete(dynamic data) {
    debugPrint('RealtimeService: Recording available: ${data['recordingUrl']}');
    // Refresh call logs to show recording
    _refreshCallLogsData();
  }

  void _handleAIAnalysis(dynamic data) {
    try {
      final analysis = 'AI: ${data['summary'] ?? 'Analysis complete'}';
      if (_appState?.currentCall != null) {
        final currentCall = _appState!.currentCall!;
        final updatedCall = CallInfo(
          callSid: currentCall.callSid,
          fromNumber: currentCall.fromNumber,
          contactName: currentCall.contactName,
          timestamp: currentCall.timestamp,
          status: currentCall.status,
          message: analysis,
        );
        
        _appState?.setCurrentCall(updatedCall);
      }
    } catch (e) {
      debugPrint('RealtimeService: Error handling AI analysis: $e');
    }
  }

  CallStatus _parseCallStatus(String status) {
    switch (status.toLowerCase()) {
      case 'ringing':
        return CallStatus.ringing;
      case 'in-progress':
      case 'screening':
        return CallStatus.inProgress;
      case 'completed':
        return CallStatus.completed;
      default:
        return CallStatus.inProgress;
    }
  }

  // Data refresh methods
  void _requestInitialData() {
    debugPrint('RealtimeService: Requesting initial data sync...');
    _refreshContactsData();
    _refreshCallLogsData();
    _refreshBlacklistData();
  }

  Future<void> _refreshContactsData() async {
    try {
      // Make HTTP request for contacts data
      final response = await _makeHttpRequest('/api/contacts');
      if (response != null) {
        final contacts = (response as List<dynamic>)
            .map((json) => Contact.fromJson(json as Map<String, dynamic>))
            .toList();
        
        _appState?.setContacts(contacts);
        _appState?.updateStats(totalContacts: contacts.length);
      }
    } catch (e) {
      debugPrint('RealtimeService: Error refreshing contacts: $e');
    }
  }

  Future<void> _refreshCallLogsData() async {
    try {
      final response = await _makeHttpRequest('/api/call-logs');
      if (response != null) {
        final logs = (response as List<dynamic>)
            .map((json) => CallLog.fromJson(json as Map<String, dynamic>))
            .toList();
        
        _appState?.setCallLogs(logs);
        _appState?.updateStats(recentCalls: logs.length);
      }
    } catch (e) {
      debugPrint('RealtimeService: Error refreshing call logs: $e');
    }
  }

  Future<void> _refreshBlacklistData() async {
    try {
      final response = await _makeHttpRequest('/api/blacklist');
      if (response != null) {
        final entries = (response as List<dynamic>)
            .map((json) => BlacklistEntry.fromJson(json as Map<String, dynamic>))
            .toList();
        
        _appState?.setBlacklistEntries(entries);
      }
    } catch (e) {
      debugPrint('RealtimeService: Error refreshing blacklist: $e');
    }
  }

  Future<dynamic> _makeHttpRequest(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl$endpoint'),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CallForwardingApp/3.0.0 (Flutter-Realtime)',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('RealtimeService: HTTP request error: $e');
    }
    return null;
  }

  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('RealtimeService: Max reconnection attempts reached');
      return;
    }

    _reconnectAttempts++;
    final delay = _reconnectDelay * _reconnectAttempts;
    
    debugPrint('RealtimeService: Scheduling reconnect in ${delay}s (attempt $_reconnectAttempts)');
    
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: delay), () {
      if (!_isConnected && !_isConnecting) {
        debugPrint('RealtimeService: Attempting reconnection...');
        connect();
      }
    });
  }

  void setAppState(AppState appState) {
    _appState = appState;
  }

  Future<void> disconnect() async {
    debugPrint('RealtimeService: Disconnecting...');
    
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
    
    _isConnected = false;
    _isConnecting = false;
    _reconnectAttempts = 0;
    
    _appState?.setConnectionStatus(ConnectionStatus.disconnected);
  }

  void dispose() {
    disconnect();
  }
}