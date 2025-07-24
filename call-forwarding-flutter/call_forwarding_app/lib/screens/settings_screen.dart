import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_state.dart';
import '../services/background_service.dart';
import '../services/notification_service.dart';
import '../services/http_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _serverUrlController = TextEditingController();
  final _apiKeyController = TextEditingController();
  bool _backgroundMonitoring = true;
  bool _notificationsEnabled = true;
  bool _autoReconnect = true;
  bool _vibrateOnCall = true;
  String _notificationSound = 'default';
  int _reconnectionAttempts = 5;

  final List<Map<String, String>> _soundOptions = [
    {'value': 'default', 'label': 'Default'},
    {'value': 'call_alert', 'label': 'Call Alert'},
    {'value': 'chime', 'label': 'Chime'},
    {'value': 'bell', 'label': 'Bell'},
  ];

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    _apiKeyController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      setState(() {
        _serverUrlController.text = prefs.getString('server_url') ?? 'http://calls.popzplace.com:3001';
        _apiKeyController.text = prefs.getString('api_key') ?? 'cf_59f94e3512e690c354da4dfd96ba7cdd215064d8d725b7fb334a51070ec45039';
        _backgroundMonitoring = prefs.getBool('background_monitoring') ?? true;
        _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
        _autoReconnect = prefs.getBool('auto_reconnect') ?? true;
        _vibrateOnCall = prefs.getBool('vibrate_on_call') ?? true;
        _notificationSound = prefs.getString('notification_sound') ?? 'default';
        _reconnectionAttempts = prefs.getInt('reconnection_attempts') ?? 5;
      });
    } catch (e) {
      debugPrint('Error loading settings: $e');
    }
  }

  Future<void> _saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      await prefs.setString('server_url', _serverUrlController.text.trim());
      await prefs.setString('api_key', _apiKeyController.text.trim());
      await prefs.setBool('background_monitoring', _backgroundMonitoring);
      await prefs.setBool('notifications_enabled', _notificationsEnabled);
      await prefs.setBool('auto_reconnect', _autoReconnect);
      await prefs.setBool('vibrate_on_call', _vibrateOnCall);
      await prefs.setString('notification_sound', _notificationSound);
      await prefs.setInt('reconnection_attempts', _reconnectionAttempts);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Settings saved successfully - reconnecting...'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Note: User should use "Reconnect Now" button after saving settings
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving settings: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _saveSettings,
            icon: const Icon(Icons.save),
            tooltip: 'Save Settings',
          ),
        ],
      ),
      body: Consumer<AppState>(
        builder: (context, appState, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Connection Settings
                _buildSectionCard(
                  title: '🔗 Connection Settings',
                  children: [
                    TextFormField(
                      controller: _serverUrlController,
                      decoration: const InputDecoration(
                        labelText: 'Server URL',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.link),
                        hintText: 'http://calls.popzplace.com:3001',
                      ),
                      keyboardType: TextInputType.url,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _apiKeyController,
                      decoration: const InputDecoration(
                        labelText: 'API Key',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.vpn_key),
                        hintText: 'Enter your API key for authentication',
                      ),
                      obscureText: true,
                    ),
                    const SizedBox(height: 16),
                    SwitchListTile(
                      title: const Text('Auto Reconnect'),
                      subtitle: const Text('Automatically reconnect when connection is lost'),
                      value: _autoReconnect,
                      onChanged: (value) {
                        setState(() {
                          _autoReconnect = value;
                        });
                      },
                    ),
                    ListTile(
                      title: const Text('Reconnection Attempts'),
                      subtitle: Text('Maximum attempts: $_reconnectionAttempts'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            onPressed: _reconnectionAttempts > 1
                                ? () {
                                    setState(() {
                                      _reconnectionAttempts--;
                                    });
                                  }
                                : null,
                            icon: const Icon(Icons.remove),
                          ),
                          Text('$_reconnectionAttempts'),
                          IconButton(
                            onPressed: _reconnectionAttempts < 10
                                ? () {
                                    setState(() {
                                      _reconnectionAttempts++;
                                    });
                                  }
                                : null,
                            icon: const Icon(Icons.add),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _testConnection(appState),
                        icon: const Icon(Icons.wifi_tethering),
                        label: const Text('Test & Connect'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Notification Settings
                _buildSectionCard(
                  title: '🔔 Notification Settings',
                  children: [
                    SwitchListTile(
                      title: const Text('Enable Notifications'),
                      subtitle: const Text('Receive call notifications'),
                      value: _notificationsEnabled,
                      onChanged: (value) async {
                        if (value) {
                          final granted = await NotificationService().requestNotificationPermission();
                          if (!granted) {
                            _showPermissionDialog();
                            return;
                          }
                        }
                        setState(() {
                          _notificationsEnabled = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Vibrate on Call'),
                      subtitle: const Text('Vibrate when receiving calls'),
                      value: _vibrateOnCall,
                      onChanged: (value) {
                        setState(() {
                          _vibrateOnCall = value;
                        });
                      },
                    ),
                    ListTile(
                      title: const Text('Notification Sound'),
                      subtitle: Text(_getSoundLabel(_notificationSound)),
                      trailing: DropdownButton<String>(
                        value: _notificationSound,
                        items: _soundOptions.map((option) {
                          return DropdownMenuItem(
                            value: option['value'],
                            child: Text(option['label']!),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _notificationSound = value ?? 'default';
                          });
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _testNotification,
                        icon: const Icon(Icons.notifications),
                        label: const Text('Test Notification'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Background Monitoring
                _buildSectionCard(
                  title: '🔄 Background Monitoring',
                  children: [
                    SwitchListTile(
                      title: const Text('Background Monitoring'),
                      subtitle: const Text('Monitor calls when app is in background'),
                      value: _backgroundMonitoring,
                      onChanged: (value) {
                        setState(() {
                          _backgroundMonitoring = value;
                        });
                        _updateBackgroundMonitoring(value);
                      },
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _showBackgroundStatus,
                        icon: const Icon(Icons.info_outline),
                        label: const Text('Background Status'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Device Information
                _buildSectionCard(
                  title: '📱 Device Information',
                  children: [
                    _buildInfoTile('Connection Status', _getConnectionStatusText(appState)),
                    _buildInfoTile('Background Monitoring', _backgroundMonitoring ? 'Enabled' : 'Disabled'),
                    _buildInfoTile('Notifications', _notificationsEnabled ? 'Enabled' : 'Disabled'),
                    _buildInfoTile('Server URL', _serverUrlController.text.isNotEmpty ? _serverUrlController.text : 'Not configured'),
                  ],
                ),

                const SizedBox(height: 16),

                // App Information
                _buildSectionCard(
                  title: 'ℹ️ App Information',
                  children: [
                    _buildInfoTile('Version', '1.0.0'),
                    _buildInfoTile('Build', 'Debug'),
                    _buildInfoTile('Flutter Version', '3.24.5'),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _showAboutDialog,
                        icon: const Icon(Icons.info),
                        label: const Text('About'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTile(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getSoundLabel(String value) {
    final option = _soundOptions.firstWhere(
      (option) => option['value'] == value,
      orElse: () => _soundOptions.first,
    );
    return option['label']!;
  }

  String _getConnectionStatusText(AppState appState) {
    switch (appState.connectionStatus) {
      case ConnectionStatus.connected:
        return 'Connected';
      case ConnectionStatus.connecting:
        return 'Connecting...';
      case ConnectionStatus.disconnected:
        return 'Disconnected';
      case ConnectionStatus.error:
        return 'Error';
    }
  }

  Future<void> _testConnection(AppState appState) async {
    final testUrl = _serverUrlController.text.trim();
    
    if (testUrl.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid server URL first'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Testing connection...'),
          duration: Duration(seconds: 8),
        ),
      );
    }

    bool success = false;
    String errorMessage = '';

    try {
      debugPrint('SETTINGS: Starting connection test to $testUrl');
      
      final httpService = HttpService();
      success = await httpService.testConnection(testUrl).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          debugPrint('SETTINGS: Test connection timed out after 30 seconds');
          return false;
        },
      );
      
      debugPrint('SETTINGS: Test connection result: $success');
      
    } catch (e, stackTrace) {
      debugPrint('SETTINGS: Test connection crashed: $e');
      debugPrint('SETTINGS: Stack trace: $stackTrace');
      errorMessage = e.toString();
      success = false;
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success 
              ? 'Connected successfully! Dashboard should now work ✅' 
              : 'Connection failed: ${errorMessage.isEmpty ? 'timeout or network error' : errorMessage} ❌'),
          backgroundColor: success ? Colors.green : Colors.red,
          duration: const Duration(seconds: 6),
        ),
      );
    }
  }


  Future<void> _testNotification() async {
    final notificationService = NotificationService();
    await notificationService.showGeneralNotification(
      'Test Notification',
      'This is a test notification from Call Forwarding App',
    );
  }

  void _updateBackgroundMonitoring(bool enabled) {
    if (enabled) {
      BackgroundService.startMonitoring();
    } else {
      BackgroundService.stopMonitoring();
    }
  }

  Future<void> _showBackgroundStatus() async {
    final status = await BackgroundService.getBackgroundStatus();
    
    if (mounted) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
        title: const Text('Background Status'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStatusRow('Initialized', status['isInitialized']?.toString() ?? 'Unknown'),
              _buildStatusRow('Last Check', _formatTimestamp(status['lastCheck'])),
              _buildStatusRow('Last Sync', _formatTimestamp(status['lastSync'])),
              _buildStatusRow('Background Processing', status['backgroundProcessingEnabled']?.toString() ?? 'Unknown'),
              if (status['deviceInfo'] != null) ...[
                const Divider(),
                Text('Device Info:', style: Theme.of(context).textTheme.titleSmall),
                _buildStatusRow('Brand', status['deviceInfo']['brand'] ?? 'Unknown'),
                _buildStatusRow('Model', status['deviceInfo']['model'] ?? 'Unknown'),
                _buildStatusRow('Version', status['deviceInfo']['version'] ?? 'Unknown'),
              ],
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
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return 'Never';
    
    try {
      final dateTime = DateTime.fromMillisecondsSinceEpoch(timestamp as int);
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inMinutes < 60) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inHours < 24) {
        return '${difference.inHours}h ago';
      } else {
        return '${dateTime.month}/${dateTime.day} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
      }
    } catch (e) {
      return 'Unknown';
    }
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Permission Required'),
        content: const Text(
          'Notification permission is required for call alerts. Please enable it in your device settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Open app settings (would need platform-specific implementation)
            },
            child: const Text('Settings'),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About Call Forwarding App'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Personal Call Forwarding App with AI Gatekeeper'),
            SizedBox(height: 8),
            Text('Version: 1.0.0'),
            Text('Built with Flutter 3.24.5'),
            SizedBox(height: 8),
            Text('Features:'),
            Text('• Real-time call monitoring'),
            Text('• AI-powered call screening'),
            Text('• Contact management'),
            Text('• Blacklist functionality'),
            Text('• Background monitoring'),
            Text('• Native notifications'),
          ],
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
}