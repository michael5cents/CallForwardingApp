import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/app_state.dart';
import 'notification_service.dart';
import 'http_service.dart';

class WebhookService {
  // Singleton pattern
  static final WebhookService _instance = WebhookService._internal();
  factory WebhookService() => _instance;
  WebhookService._internal();

  static const int _webhookPort = 8080; // Port for receiving webhooks
  
  HttpServer? _server;
  AppState? _appState;
  final NotificationService _notificationService = NotificationService();
  final HttpService _httpService = HttpService();
  bool _isRunning = false;

  bool get isRunning => _isRunning;

  Future<void> startWebhookServer() async {
    if (_isRunning) {
      debugPrint('WebhookService: Server already running');
      return;
    }

    try {
      debugPrint('WebhookService: Starting webhook server on port $_webhookPort');
      
      _server = await HttpServer.bind(InternetAddress.anyIPv4, _webhookPort);
      _isRunning = true;
      
      debugPrint('WebhookService: ✅ Webhook server started on http://0.0.0.0:$_webhookPort');
      
      // Listen for incoming webhook requests
      _server!.listen((HttpRequest request) async {
        await _handleWebhookRequest(request);
      });
      
      // Register this device with the API server for webhook delivery
      await _registerWithApiServer();
      
    } catch (e) {
      debugPrint('WebhookService: ❌ Failed to start webhook server: $e');
      _isRunning = false;
    }
  }

  Future<void> _registerWithApiServer() async {
    try {
      debugPrint('WebhookService: Registering device with API server...');
      
      final response = await HttpClient().postUrl(
        Uri.parse('http://192.168.68.69:3002/api/register-device')
      );
      
      response.headers.contentType = ContentType.json;
      response.write(json.encode({
        'deviceId': 'flutter-mobile-${DateTime.now().millisecondsSinceEpoch}',
        'webhookPort': _webhookPort
      }));
      
      final httpResponse = await response.close();
      final responseBody = await httpResponse.transform(utf8.decoder).join();
      
      if (httpResponse.statusCode == 200) {
        final data = json.decode(responseBody);
        debugPrint('WebhookService: ✅ Device registered successfully: ${data['webhookUrl']}');
      } else {
        debugPrint('WebhookService: ❌ Registration failed: ${httpResponse.statusCode}');
      }
      
    } catch (e) {
      debugPrint('WebhookService: ❌ Registration error: $e');
    }
  }

  Future<void> _handleWebhookRequest(HttpRequest request) async {
    try {
      debugPrint('WebhookService: Received ${request.method} ${request.uri.path}');
      
      // Set CORS headers
      request.response.headers.set('Access-Control-Allow-Origin', '*');
      request.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      request.response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle preflight requests
      if (request.method == 'OPTIONS') {
        request.response.statusCode = 200;
        await request.response.close();
        return;
      }
      
      // Route webhook requests
      switch (request.uri.path) {
        case '/webhook/call':
          await _handleCallWebhook(request);
          break;
        case '/webhook/call-update':
          await _handleCallUpdateWebhook(request);
          break;
        case '/webhook/data-update':
          await _handleDataUpdateWebhook(request);
          break;
        case '/health':
          await _handleHealthCheck(request);
          break;
        default:
          debugPrint('WebhookService: Unknown webhook path: ${request.uri.path}');
          request.response.statusCode = 404;
          request.response.write('Not Found');
          await request.response.close();
      }
      
    } catch (e) {
      debugPrint('WebhookService: Error handling webhook request: $e');
      request.response.statusCode = 500;
      request.response.write('Internal Server Error');
      await request.response.close();
    }
  }

  Future<void> _handleCallWebhook(HttpRequest request) async {
    try {
      if (request.method != 'POST') {
        request.response.statusCode = 405;
        request.response.write('Method Not Allowed');
        await request.response.close();
        return;
      }

      // Read request body
      final body = await utf8.decoder.bind(request).join();
      final data = json.decode(body) as Map<String, dynamic>;
      
      debugPrint('WebhookService: 📞 NEW CALL WEBHOOK: $data');
      
      // Process the incoming call
      await _processIncomingCall(data);
      
      // Send success response
      request.response.statusCode = 200;
      request.response.headers.contentType = ContentType.json;
      request.response.write(json.encode({'status': 'success', 'message': 'Call processed'}));
      await request.response.close();
      
    } catch (e) {
      debugPrint('WebhookService: Error processing call webhook: $e');
      request.response.statusCode = 400;
      request.response.write('Bad Request');
      await request.response.close();
    }
  }

  Future<void> _handleCallUpdateWebhook(HttpRequest request) async {
    try {
      if (request.method != 'POST') {
        request.response.statusCode = 405;
        request.response.write('Method Not Allowed');
        await request.response.close();
        return;
      }

      // Read request body
      final body = await utf8.decoder.bind(request).join();
      final data = json.decode(body) as Map<String, dynamic>;
      
      debugPrint('WebhookService: 📱 CALL UPDATE WEBHOOK: $data');
      
      // Process the call update
      _processCallUpdate(data);
      
      // Send success response
      request.response.statusCode = 200;
      request.response.headers.contentType = ContentType.json;
      request.response.write(json.encode({'status': 'success', 'message': 'Update processed'}));
      await request.response.close();
      
    } catch (e) {
      debugPrint('WebhookService: Error processing call update webhook: $e');
      request.response.statusCode = 400;
      request.response.write('Bad Request');
      await request.response.close();
    }
  }

  Future<void> _handleDataUpdateWebhook(HttpRequest request) async {
    try {
      if (request.method != 'POST') {
        request.response.statusCode = 405;
        request.response.write('Method Not Allowed');
        await request.response.close();
        return;
      }

      // Read request body
      final body = await utf8.decoder.bind(request).join();
      final data = json.decode(body) as Map<String, dynamic>;
      
      debugPrint('WebhookService: 📊 DATA UPDATE WEBHOOK: $data');
      
      // Trigger a data sync from the HTTP service
      // This will fetch the latest data via REST API
      await _httpService.syncAllData();
      
      // Send success response
      request.response.statusCode = 200;
      request.response.headers.contentType = ContentType.json;
      request.response.write(json.encode({'status': 'success', 'message': 'Data sync triggered'}));
      await request.response.close();
      
    } catch (e) {
      debugPrint('WebhookService: Error processing data update webhook: $e');
      request.response.statusCode = 400;
      request.response.write('Bad Request');
      await request.response.close();
    }
  }

  Future<void> _handleHealthCheck(HttpRequest request) async {
    try {
      request.response.statusCode = 200;
      request.response.headers.contentType = ContentType.json;
      request.response.write(json.encode({
        'status': 'healthy',
        'service': 'webhook-receiver',
        'port': _webhookPort,
        'timestamp': DateTime.now().toIso8601String(),
      }));
      await request.response.close();
    } catch (e) {
      debugPrint('WebhookService: Error in health check: $e');
    }
  }

  Future<void> _processIncomingCall(Map<String, dynamic> callData) async {
    try {
      debugPrint('WebhookService: Processing incoming call: ${callData['fromNumber']}');
      
      final callInfo = CallInfo.fromJson(callData);
      
      // Update app state immediately
      _appState?.setCurrentCall(callInfo);
      
      // Determine if this is a whitelisted contact
      final isWhitelisted = await _checkIfWhitelisted(callInfo.fromNumber);
      
      if (isWhitelisted) {
        debugPrint('WebhookService: 🟢 WHITELISTED CALL - Immediate forward');
        
        // Send immediate forward command to server
        await _sendForwardCommand(callInfo.callSid, callInfo.fromNumber);
        
        // Show immediate notification
        _notificationService.showCallNotification(
          callInfo.fromNumber,
          '✅ ${callInfo.contactName ?? "Unknown"} - Forwarding now',
        );
        
      } else {
        debugPrint('WebhookService: 🟡 NON-WHITELISTED CALL - Background processing');
        
        // Show screening notification
        _notificationService.showCallNotification(
          callInfo.fromNumber,
          '🔍 ${callInfo.contactName ?? "Unknown Caller"} - Screening...',
        );
      }
      
      // Always play alert sound for new calls
      _notificationService.playCallAlert();
      
    } catch (e) {
      debugPrint('WebhookService: Error processing incoming call: $e');
    }
  }

  void _processCallUpdate(Map<String, dynamic> updateData) {
    try {
      final callSid = updateData['callSid'] as String?;
      final status = updateData['status'] as String?;
      final message = updateData['message'] as String?;
      
      if (callSid != null && status != null) {
        debugPrint('WebhookService: Call $callSid status: $status');
        
        final callStatus = _parseCallStatus(status);
        _appState?.updateCallStatus(callSid, callStatus, message);
        
        // Show notification for important status changes
        if (status == 'completed' || status == 'forwarded' || status == 'blocked') {
          _notificationService.showGeneralNotification(
            'Call Update',
            'Call ${status.toLowerCase()}${message != null ? ": $message" : ""}',
          );
        }
      }
      
    } catch (e) {
      debugPrint('WebhookService: Error processing call update: $e');
    }
  }

  Future<bool> _checkIfWhitelisted(String phoneNumber) async {
    try {
      // Get current contacts from app state or fetch from server
      final contacts = _appState?.contacts ?? [];
      
      // Check if the number matches any whitelisted contact
      for (final contact in contacts) {
        if (contact.phoneNumber == phoneNumber || 
            _normalizePhoneNumber(contact.phoneNumber) == _normalizePhoneNumber(phoneNumber)) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      debugPrint('WebhookService: Error checking whitelist: $e');
      return false; // Default to not whitelisted on error
    }
  }

  String _normalizePhoneNumber(String phoneNumber) {
    // Remove all non-digits and normalize for comparison
    return phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
  }

  Future<void> _sendForwardCommand(String callSid, String fromNumber) async {
    try {
      debugPrint('WebhookService: Sending forward command for call $callSid');
      
      // Send HTTP POST request to forward the call
      final client = HttpClient();
      final request = await client.postUrl(
        Uri.parse('http://192.168.68.69:3001/api/forward-call'),
      );
      
      request.headers.contentType = ContentType.json;
      request.write(json.encode({
        'callSid': callSid,
        'fromNumber': fromNumber,
        'action': 'forward',
        'timestamp': DateTime.now().toIso8601String(),
      }));
      
      final httpResponse = await request.close();
      client.close();
      
      if (httpResponse.statusCode == 200) {
        debugPrint('WebhookService: ✅ Forward command sent successfully');
      } else {
        debugPrint('WebhookService: ❌ Forward command failed: ${httpResponse.statusCode}');
      }
      
    } catch (e) {
      debugPrint('WebhookService: Error sending forward command: $e');
    }
  }

  CallStatus _parseCallStatus(String status) {
    switch (status.toLowerCase()) {
      case 'ringing':
        return CallStatus.ringing;
      case 'in-progress':
      case 'forwarded':
        return CallStatus.inProgress;
      case 'screening':
        return CallStatus.screening;
      case 'completed':
      case 'blocked':
        return CallStatus.completed;
      default:
        return CallStatus.idle;
    }
  }

  // Public methods
  void setAppState(AppState appState) {
    _appState = appState;
  }

  String get webhookUrl => 'http://192.168.68.69:$_webhookPort';

  Future<void> stopWebhookServer() async {
    if (!_isRunning) return;
    
    try {
      debugPrint('WebhookService: Stopping webhook server');
      await _server?.close();
      _server = null;
      _isRunning = false;
      debugPrint('WebhookService: ✅ Webhook server stopped');
    } catch (e) {
      debugPrint('WebhookService: Error stopping webhook server: $e');
    }
  }

  void dispose() {
    stopWebhookServer();
  }
}