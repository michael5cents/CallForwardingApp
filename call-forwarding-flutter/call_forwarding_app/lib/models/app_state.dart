import 'package:flutter/foundation.dart';

enum ConnectionStatus { disconnected, connecting, connected, error }

enum CallStatus { idle, ringing, inProgress, screening, completed }

class CallStep {
  final String title;
  final String? details;
  final DateTime timestamp;
  final String status; // 'active', 'complete', 'error'
  final String? icon;

  CallStep({
    required this.title,
    this.details,
    required this.timestamp,
    this.status = 'active',
    this.icon,
  });
}

class CallInfo {
  final String callSid;
  final String fromNumber;
  final String? contactName;
  final DateTime timestamp;
  final CallStatus status;
  final String? message;

  CallInfo({
    required this.callSid,
    required this.fromNumber,
    this.contactName,
    required this.timestamp,
    required this.status,
    this.message,
  });

  factory CallInfo.fromJson(Map<String, dynamic> json) {
    return CallInfo(
      callSid: json['callSid'] ?? '',
      fromNumber: json['from'] ?? '',
      contactName: json['contactName'],
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      status: _parseCallStatus(json['status']),
      message: json['message'],
    );
  }

  static CallStatus _parseCallStatus(String? status) {
    switch (status?.toLowerCase()) {
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
}

class Contact {
  final String id;
  final String name;
  final String phoneNumber;
  final DateTime createdAt;

  Contact({
    required this.id,
    required this.name,
    required this.phoneNumber,
    required this.createdAt,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      phoneNumber: json['phone_number'] ?? '',
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone_number': phoneNumber,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class BlacklistEntry {
  final String id;
  final String phoneNumber;
  final String reason;
  final String patternType;
  final DateTime createdAt;

  BlacklistEntry({
    required this.id,
    required this.phoneNumber,
    required this.reason,
    required this.patternType,
    required this.createdAt,
  });

  factory BlacklistEntry.fromJson(Map<String, dynamic> json) {
    return BlacklistEntry(
      id: json['id']?.toString() ?? '',
      phoneNumber: json['phone_number'] ?? '',
      reason: json['reason'] ?? '',
      patternType: json['pattern_type'] ?? 'exact',
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone_number': phoneNumber,
      'reason': reason,
      'pattern_type': patternType,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class CallLog {
  final String id;
  final String fromNumber;
  final String? contactName;
  final String callSid;
  final String status;
  final String? action;
  final String? aiSummary;
  final String? recordingUrl;
  final DateTime timestamp;
  final int? duration;

  CallLog({
    required this.id,
    required this.fromNumber,
    this.contactName,
    required this.callSid,
    required this.status,
    this.action,
    this.aiSummary,
    this.recordingUrl,
    required this.timestamp,
    this.duration,
  });

  factory CallLog.fromJson(Map<String, dynamic> json) {
    return CallLog(
      id: json['id']?.toString() ?? '',
      fromNumber: json['from_number'] ?? '',
      contactName: json['contact_name'],
      callSid: json['call_sid'] ?? '',
      status: json['status'] ?? '',
      action: json['action'],
      aiSummary: json['ai_summary'],
      recordingUrl: json['recording_url'],
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      duration: json['duration'],
    );
  }
}

class AppState extends ChangeNotifier {
  // Connection state
  ConnectionStatus _connectionStatus = ConnectionStatus.disconnected;
  String? _connectionError;

  // Current call state
  CallInfo? _currentCall;
  List<CallStep> _callSteps = [];
  
  // Data lists
  List<Contact> _contacts = [];
  List<BlacklistEntry> _blacklistEntries = [];
  List<CallLog> _callLogs = [];
  
  // Statistics
  int _totalContacts = 0;
  int _recentCalls = 0;
  String _aiScreeningStatus = 'Active';

  // Background monitoring
  bool _backgroundMonitoring = false;

  // Getters
  ConnectionStatus get connectionStatus => _connectionStatus;
  String? get connectionError => _connectionError;
  CallInfo? get currentCall => _currentCall;
  List<CallStep> get callSteps => List.unmodifiable(_callSteps);
  List<Contact> get contacts => List.unmodifiable(_contacts);
  List<BlacklistEntry> get blacklistEntries => List.unmodifiable(_blacklistEntries);
  List<CallLog> get callLogs => List.unmodifiable(_callLogs);
  int get totalContacts => _totalContacts;
  int get recentCalls => _recentCalls;
  String get aiScreeningStatus => _aiScreeningStatus;
  bool get backgroundMonitoring => _backgroundMonitoring;

  // Connection management
  void setConnectionStatus(ConnectionStatus status, [String? error]) {
    _connectionStatus = status;
    _connectionError = error;
    notifyListeners();
  }

  // Current call management
  void setCurrentCall(CallInfo? call) {
    _currentCall = call;
    if (call == null) {
      // Clear call steps when call ends
      _callSteps.clear();
    }
    notifyListeners();
  }

  void updateCallStatus(String callSid, CallStatus status, [String? message]) {
    if (_currentCall?.callSid == callSid) {
      _currentCall = CallInfo(
        callSid: _currentCall!.callSid,
        fromNumber: _currentCall!.fromNumber,
        contactName: _currentCall!.contactName,
        timestamp: _currentCall!.timestamp,
        status: status,
        message: message ?? _currentCall!.message,
      );
      
      // Auto-clear the current call after completion or other final states
      if (status == CallStatus.completed || status == CallStatus.idle) {
        // Show the completed state briefly, then clear it
        Future.delayed(const Duration(seconds: 3), () {
          setCurrentCall(null);
        });
      }
      
      notifyListeners();
    }
  }

  void addCallStep(String title, {String? details, String? icon}) {
    // Mark previous steps as complete
    for (int i = 0; i < _callSteps.length; i++) {
      if (_callSteps[i].status == 'active') {
        _callSteps[i] = CallStep(
          title: _callSteps[i].title,
          details: _callSteps[i].details,
          timestamp: _callSteps[i].timestamp,
          status: 'complete',
          icon: _callSteps[i].icon,
        );
      }
    }
    
    // Add new active step
    _callSteps.add(CallStep(
      title: title,
      details: details,
      timestamp: DateTime.now(),
      status: 'active',
      icon: icon,
    ));
    
    notifyListeners();
  }

  // Contacts management
  void setContacts(List<Contact> contacts) {
    _contacts = contacts;
    // Don't automatically update _totalContacts - let updateStats handle it
    notifyListeners();
  }

  void addContact(Contact contact) {
    _contacts.add(contact);
    _totalContacts = _contacts.length;
    notifyListeners();
  }

  void removeContact(String contactId) {
    _contacts.removeWhere((contact) => contact.id == contactId);
    _totalContacts = _contacts.length;
    notifyListeners();
  }

  Contact? getContactByPhone(String phoneNumber) {
    try {
      return _contacts.firstWhere(
        (contact) => contact.phoneNumber == phoneNumber,
      );
    } catch (e) {
      return null;
    }
  }

  // Blacklist management
  void setBlacklistEntries(List<BlacklistEntry> entries) {
    _blacklistEntries = entries;
    notifyListeners();
  }

  void addBlacklistEntry(BlacklistEntry entry) {
    _blacklistEntries.add(entry);
    notifyListeners();
  }

  void removeBlacklistEntry(String entryId) {
    _blacklistEntries.removeWhere((entry) => entry.id == entryId);
    notifyListeners();
  }

  // Call logs management
  void setCallLogs(List<CallLog> logs) {
    _callLogs = logs;
    // Don't automatically update _recentCalls - let updateStats handle it
    notifyListeners();
  }

  void addCallLog(CallLog log) {
    _callLogs.insert(0, log); // Add to beginning for chronological order
    _recentCalls = _callLogs.length;
    notifyListeners();
  }

  void clearCallLogs() {
    _callLogs.clear();
    _recentCalls = 0;
    notifyListeners();
  }

  // Background monitoring
  void setBackgroundMonitoring(bool enabled) {
    _backgroundMonitoring = enabled;
    notifyListeners();
  }

  // Statistics
  void updateStats({
    int? totalContacts,
    int? recentCalls,
    String? aiScreeningStatus,
  }) {
    // Defensive: Don't overwrite valid counts with zeros
    if (totalContacts != null && (totalContacts > 0 || _totalContacts == 0)) {
      _totalContacts = totalContacts;
    }
    if (recentCalls != null && (recentCalls > 0 || _recentCalls == 0)) {
      _recentCalls = recentCalls;
    }
    if (aiScreeningStatus != null) _aiScreeningStatus = aiScreeningStatus;
    notifyListeners();
  }

  // Utility methods
  void refreshData() {
    // This will be called to refresh all data from the server
    notifyListeners();
  }

  void reset() {
    _connectionStatus = ConnectionStatus.disconnected;
    _connectionError = null;
    _currentCall = null;
    _contacts.clear();
    _blacklistEntries.clear();
    _callLogs.clear();
    _totalContacts = 0;
    _recentCalls = 0;
    _aiScreeningStatus = 'Active';
    _backgroundMonitoring = false;
    notifyListeners();
  }
}