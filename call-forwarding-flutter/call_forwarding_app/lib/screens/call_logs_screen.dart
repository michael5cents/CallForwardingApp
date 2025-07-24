import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_state.dart';
import '../services/http_service.dart';

class CallLogsScreen extends StatefulWidget {
  const CallLogsScreen({super.key});

  @override
  State<CallLogsScreen> createState() => _CallLogsScreenState();
}

class _CallLogsScreenState extends State<CallLogsScreen> {
  String _selectedFilter = 'all';
  
  final List<Map<String, String>> _filterOptions = [
    {'value': 'all', 'label': 'All Calls'},
    {'value': 'completed', 'label': 'Completed'},
    {'value': 'screening', 'label': 'Screened'},
    {'value': 'blocked', 'label': 'Blocked'},
    {'value': 'missed', 'label': 'Missed'},
  ];

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Call Logs'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'clear_all':
                  _showClearAllConfirmation();
                  break;
                case 'refresh':
                  _refreshLogs();
                  break;
                case 'export':
                  _exportLogs();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'refresh',
                child: Row(
                  children: [
                    Icon(Icons.refresh),
                    SizedBox(width: 8),
                    Text('Refresh'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.download),
                    SizedBox(width: 8),
                    Text('Export'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'clear_all',
                child: Row(
                  children: [
                    Icon(Icons.clear_all, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Clear All', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Consumer<AppState>(
        builder: (context, appState, child) {
          return Column(
            children: [
              // Filter Controls
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      Icons.filter_list,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedFilter,
                        decoration: const InputDecoration(
                          labelText: 'Filter by Status',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        items: _filterOptions.map((option) {
                          return DropdownMenuItem(
                            value: option['value'],
                            child: Text(option['label']!),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedFilter = value ?? 'all';
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
              
              // Call Logs List
              Expanded(
                child: _buildCallLogsList(appState),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCallLogsList(AppState appState) {
    final allLogs = appState.callLogs;
    final filteredLogs = _filterLogs(allLogs);

    if (filteredLogs.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: () async {
        _refreshLogs();
        await Future.delayed(const Duration(seconds: 1));
      },
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: filteredLogs.length,
        itemBuilder: (context, index) {
          final log = filteredLogs[index];
          return _buildCallLogCard(log);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    String message;
    String submessage;
    IconData icon;

    switch (_selectedFilter) {
      case 'completed':
        message = 'No completed calls';
        submessage = 'Completed calls will appear here';
        icon = Icons.call_received;
        break;
      case 'screening':
        message = 'No screened calls';
        submessage = 'AI screened calls will appear here';
        icon = Icons.security;
        break;
      case 'blocked':
        message = 'No blocked calls';
        submessage = 'Blocked calls will appear here';
        icon = Icons.block;
        break;
      case 'missed':
        message = 'No missed calls';
        submessage = 'Missed calls will appear here';
        icon = Icons.call_missed;
        break;
      default:
        message = 'No call logs yet';
        submessage = 'Call activity will appear here';
        icon = Icons.history;
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            submessage,
            style: TextStyle(
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildCallLogCard(CallLog log) {
    final statusInfo = _getStatusInfo(log.status);
    final isRecent = DateTime.now().difference(log.timestamp).inMinutes < 5;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: isRecent ? 4 : 1,
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: statusInfo.color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            statusInfo.icon,
            color: statusInfo.color,
            size: 24,
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                log.contactName ?? log.fromNumber,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
            ),
            if (isRecent) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'NEW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (log.contactName != null) ...[
              Text(
                log.fromNumber,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
            ],
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusInfo.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    statusInfo.label,
                    style: TextStyle(
                      color: statusInfo.color,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (log.duration != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _formatDuration(log.duration!),
                      style: TextStyle(
                        color: Colors.grey[700],
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            if (log.aiSummary != null) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.psychology,
                      size: 16,
                      color: Colors.blue[700],
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        log.aiSummary!,
                        style: TextStyle(
                          color: Colors.blue[700],
                          fontSize: 13,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (log.recordingUrl != null) ...[
              const SizedBox(height: 6),
              GestureDetector(
                onTap: () => _playRecording(log),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: Colors.purple.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.voicemail,
                        size: 16,
                        color: Colors.purple[700],
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Voicemail available - Tap to open',
                          style: TextStyle(
                            color: Colors.purple[700],
                            fontSize: 13,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              _formatTimestamp(log.timestamp),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            switch (value) {
              case 'details':
                _showCallDetails(log);
                break;
              case 'play_recording':
                _playRecording(log);
                break;
              case 'add_contact':
                _addToContacts(log);
                break;
              case 'block_number':
                _blockNumber(log);
                break;
              case 'delete':
                _deleteCallLog(log);
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'details',
              child: Row(
                children: [
                  Icon(Icons.info),
                  SizedBox(width: 8),
                  Text('View Details'),
                ],
              ),
            ),
            if (log.recordingUrl != null) ...[
              const PopupMenuItem(
                value: 'play_recording',
                child: Row(
                  children: [
                    Icon(Icons.play_arrow),
                    SizedBox(width: 8),
                    Text('Open Recording'),
                  ],
                ),
              ),
            ],
            if (log.contactName == null) ...[
              const PopupMenuItem(
                value: 'add_contact',
                child: Row(
                  children: [
                    Icon(Icons.person_add),
                    SizedBox(width: 8),
                    Text('Add to Contacts'),
                  ],
                ),
              ),
            ],
            const PopupMenuItem(
              value: 'block_number',
              child: Row(
                children: [
                  Icon(Icons.block, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Block Number'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Delete', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }

  List<CallLog> _filterLogs(List<CallLog> logs) {
    if (_selectedFilter == 'all') {
      return logs;
    }
    
    return logs.where((log) {
      switch (_selectedFilter) {
        case 'completed':
          return log.status.toLowerCase() == 'completed';
        case 'screening':
          return log.status.toLowerCase() == 'screening';
        case 'blocked':
          return log.status.toLowerCase() == 'blocked';
        case 'missed':
          return log.status.toLowerCase() == 'missed';
        default:
          return true;
      }
    }).toList();
  }

  CallStatusInfo _getStatusInfo(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return CallStatusInfo(
          color: Colors.green,
          icon: Icons.call_received,
          label: 'Completed',
        );
      case 'screening':
        return CallStatusInfo(
          color: Colors.purple,
          icon: Icons.security,
          label: 'Screened',
        );
      case 'blocked':
        return CallStatusInfo(
          color: Colors.red,
          icon: Icons.block,
          label: 'Blocked',
        );
      case 'missed':
        return CallStatusInfo(
          color: Colors.orange,
          icon: Icons.call_missed,
          label: 'Missed',
        );
      case 'forwarded':
        return CallStatusInfo(
          color: Colors.blue,
          icon: Icons.call_made,
          label: 'Forwarded',
        );
      default:
        return CallStatusInfo(
          color: Colors.grey,
          icon: Icons.call,
          label: 'Unknown',
        );
    }
  }

  String _formatDuration(int seconds) {
    if (seconds < 60) {
      return '${seconds}s';
    } else {
      final minutes = seconds ~/ 60;
      final remainingSeconds = seconds % 60;
      return '${minutes}m ${remainingSeconds}s';
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inSeconds < 10) {
      return 'Just now';
    } else if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday ${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}';
    } else if (difference.inDays < 7) {
      final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${weekdays[timestamp.weekday - 1]} ${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}';
    } else {
      return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
    }
  }

  void _showCallDetails(CallLog log) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Call Details - ${log.contactName ?? log.fromNumber}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('From', log.fromNumber),
              if (log.contactName != null) 
                _buildDetailRow('Contact', log.contactName!),
              _buildDetailRow('Status', log.status),
              _buildDetailRow('Time', _formatTimestamp(log.timestamp)),
              if (log.duration != null)
                _buildDetailRow('Duration', _formatDuration(log.duration!)),
              if (log.action != null)
                _buildDetailRow('Action', log.action!),
              if (log.aiSummary != null)
                _buildDetailRow('AI Summary', log.aiSummary!),
              _buildDetailRow('Call ID', log.callSid),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  Future<void> _playRecording(CallLog log) async {
    if (log.recordingUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No recording available for this call'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show loading message
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 12),
            Text('Downloading recording...'),
          ],
        ),
        duration: Duration(seconds: 10),
      ),
    );

    try {
      // Download recording to local file
      String localPath = await _downloadRecording(log.recordingUrl!);
      
      // Hide loading message
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      
      // Show audio player with local file
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return _AudioPlayerDialog(
            title: 'Voicemail Recording',
            subtitle: 'From: ${log.contactName ?? log.fromNumber}',
            audioUrl: localPath,
          );
        },
      );
      
    } catch (e) {
      // Hide loading message
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to download recording: $e'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  Future<String> _downloadRecording(String twilioUrl) async {
    // Get recording ID from Twilio URL for filename
    final recordingId = twilioUrl.split('/').last;
    
    // Get app documents directory
    final directory = await getApplicationDocumentsDirectory();
    final filePath = '${directory.path}/recordings/$recordingId.wav';
    final file = File(filePath);
    
    // Create recordings directory if it doesn't exist
    await file.parent.create(recursive: true);
    
    // Check if file already exists
    if (await file.exists()) {
      debugPrint('Recording already downloaded: $filePath');
      return filePath;
    }
    
    // Get server URL from SharedPreferences (same as HttpService)
    final prefs = await SharedPreferences.getInstance();
    final serverUrl = prefs.getString('server_url') ?? 'http://calls.popzplace.com:3001';
    final downloadUrl = '$serverUrl/api/download-recording?url=${Uri.encodeComponent(twilioUrl)}';
    
    debugPrint('Downloading recording via server: $downloadUrl');
    
    final response = await http.get(Uri.parse(downloadUrl));
    
    if (response.statusCode != 200) {
      throw Exception('Failed to download recording: HTTP ${response.statusCode} - ${response.body}');
    }
    
    // Check if we got actual audio data
    if (response.bodyBytes.isEmpty) {
      throw Exception('Received empty audio file');
    }
    
    // Save to local file
    await file.writeAsBytes(response.bodyBytes);
    debugPrint('Recording saved to: $filePath (${response.bodyBytes.length} bytes)');
    
    return filePath;
  }

  void _addToContacts(CallLog log) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Add ${log.fromNumber} to contacts'),
        action: SnackBarAction(
          label: 'ADD',
          onPressed: () {
            // Navigate to contacts screen or show add contact dialog
          },
        ),
      ),
    );
  }

  void _blockNumber(CallLog log) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.block, color: Colors.red),
            SizedBox(width: 8),
            Text('Block Number'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Block this number from calling you?'),
            SizedBox(height: 8),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Number: ${log.fromNumber}',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  if (log.contactName != null)
                    Text('Contact: ${log.contactName}'),
                  SizedBox(height: 4),
                  Text(
                    'This number will be added to your blacklist and future calls will be automatically blocked.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => _confirmBlockNumber(log),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('Block Number'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmBlockNumber(CallLog log) async {
    Navigator.of(context).pop(); // Close dialog

    // Show loading
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 12),
            Text('Adding ${log.fromNumber} to blacklist...'),
          ],
        ),
        duration: Duration(seconds: 5),
      ),
    );

    try {
      final httpService = HttpService();
      final success = await httpService.addToBlacklist(
        log.fromNumber,
        'Blocked from call log - ${log.contactName != null ? 'Contact: ${log.contactName}' : 'Unknown caller'}'
      );

      // Hide loading message
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Expanded(
                  child: Text('${log.fromNumber} has been blocked successfully'),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'UNDO',
              textColor: Colors.white,
              onPressed: () {
                // TODO: Implement undo functionality
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Undo functionality coming soon'),
                    backgroundColor: Colors.orange,
                  ),
                );
              },
            ),
          ),
        );
        
        // Refresh data to update the UI
        final appState = Provider.of<AppState>(context, listen: false);
        appState.refreshData();
        
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error, color: Colors.white),
                SizedBox(width: 8),
                Text('Failed to block number. Please try again.'),
              ],
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      // Hide loading message
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error blocking number: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _deleteCallLog(CallLog log) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Call Log'),
        content: Text('Are you sure you want to delete this call log from ${log.contactName ?? log.fromNumber}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Call log deleted'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showClearAllConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Call Logs'),
        content: const Text('Are you sure you want to delete all call logs? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final appState = Provider.of<AppState>(context, listen: false);
              appState.clearCallLogs();
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All call logs cleared'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
  }

  void _refreshLogs() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Refreshing call logs...'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _exportLogs() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Exporting call logs...'),
        duration: Duration(seconds: 2),
      ),
    );
  }
}

class CallStatusInfo {
  final Color color;
  final IconData icon;
  final String label;

  CallStatusInfo({
    required this.color,
    required this.icon,
    required this.label,
  });
}

class _AudioPlayerDialog extends StatefulWidget {
  final String title;
  final String subtitle;
  final String audioUrl;

  const _AudioPlayerDialog({
    required this.title,
    required this.subtitle,
    required this.audioUrl,
  });

  @override
  State<_AudioPlayerDialog> createState() => _AudioPlayerDialogState();
}

class _AudioPlayerDialogState extends State<_AudioPlayerDialog> {
  late AudioPlayer _player;
  bool _isLoading = false;
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _setupAudioPlayer();
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  void _setupAudioPlayer() {
    // Listen to player state changes
    _player.playerStateStream.listen((state) {
      setState(() {
        _isPlaying = state.playing;
        _isLoading = state.processingState == ProcessingState.loading;
      });
    });

    // Listen to duration changes
    _player.durationStream.listen((duration) {
      setState(() {
        _duration = duration ?? Duration.zero;
      });
    });

    // Listen to position changes
    _player.positionStream.listen((position) {
      setState(() {
        _position = position;
      });
    });
  }

  Future<void> _playPause() async {
    try {
      if (_isPlaying) {
        await _player.pause();
      } else {
        if (_player.processingState == ProcessingState.idle) {
          await _player.setUrl(widget.audioUrl);
        }
        await _player.play();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error playing audio: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('🎵 ${widget.title}'),
          Text(
            widget.subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Play/Pause Button
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: _isLoading ? null : _playPause,
                icon: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        _isPlaying ? Icons.pause : Icons.play_arrow,
                        size: 32,
                      ),
              ),
            ],
          ),
          
          // Progress Slider
          if (_duration.inSeconds > 0) ...[
            Slider(
              value: _position.inSeconds.toDouble(),
              max: _duration.inSeconds.toDouble(),
              onChanged: (value) async {
                await _player.seek(Duration(seconds: value.toInt()));
              },
            ),
            
            // Time Display
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_formatDuration(_position)),
                Text(_formatDuration(_duration)),
              ],
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            _player.stop();
            Navigator.of(context).pop();
          },
          child: const Text('Close'),
        ),
      ],
    );
  }
}