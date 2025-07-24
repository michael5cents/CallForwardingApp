import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';

class BlacklistScreen extends StatefulWidget {
  const BlacklistScreen({super.key});

  @override
  State<BlacklistScreen> createState() => _BlacklistScreenState();
}

class _BlacklistScreenState extends State<BlacklistScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  String _selectedReason = '';
  String _selectedPatternType = 'exact';

  final List<String> _reasons = [
    'Spam/Robocall',
    'Telemarketing',
    'Bill Collector',
    'Harassment',
    'Scam',
    'Other',
  ];

  final List<Map<String, String>> _patternTypes = [
    {'value': 'exact', 'label': 'Exact Number'},
    {'value': 'area_code', 'label': 'Entire Area Code'},
    {'value': 'prefix', 'label': 'Number Prefix'},
  ];

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Blacklist Management'),
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
                  _refreshBlacklist();
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
              // Add to Blacklist Form
              Card(
                margin: const EdgeInsets.all(16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Add to Blacklist',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _phoneController,
                          decoration: const InputDecoration(
                            labelText: 'Phone Number',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.phone, color: Colors.red),
                            hintText: '+1234567890',
                          ),
                          keyboardType: TextInputType.phone,
                          validator: (value) {
                            if (value?.isEmpty ?? true) {
                              return 'Please enter a phone number';
                            }
                            if (!_isValidPhoneNumber(value!)) {
                              return 'Please enter a valid phone number';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          value: _selectedReason.isEmpty ? null : _selectedReason,
                          decoration: const InputDecoration(
                            labelText: 'Reason',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.report, color: Colors.red),
                          ),
                          items: _reasons.map((reason) {
                            return DropdownMenuItem(
                              value: reason,
                              child: Text(reason),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedReason = value ?? '';
                            });
                          },
                          validator: (value) {
                            if (value?.isEmpty ?? true) {
                              return 'Please select a reason';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          value: _selectedPatternType,
                          decoration: const InputDecoration(
                            labelText: 'Block Type',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.block, color: Colors.red),
                          ),
                          items: _patternTypes.map((type) {
                            return DropdownMenuItem(
                              value: type['value'],
                              child: Text(type['label']!),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedPatternType = value ?? 'exact';
                            });
                          },
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _addToBlacklist(appState),
                            icon: const Icon(Icons.block),
                            label: const Text('Add to Blacklist'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              
              // Blacklist Entries
              Expanded(
                child: _buildBlacklistEntries(appState),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBlacklistEntries(AppState appState) {
    final entries = appState.blacklistEntries;

    if (entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.block,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No blocked numbers yet',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add numbers to automatically block unwanted calls',
              style: TextStyle(
                color: Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        return _buildBlacklistCard(entry, appState);
      },
    );
  }

  Widget _buildBlacklistCard(BlacklistEntry entry, AppState appState) {
    Color reasonColor = _getReasonColor(entry.reason);
    IconData reasonIcon = _getReasonIcon(entry.reason);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: reasonColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            reasonIcon,
            color: reasonColor,
            size: 24,
          ),
        ),
        title: Text(
          entry.phoneNumber,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: reasonColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    entry.reason,
                    style: TextStyle(
                      color: reasonColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _getPatternTypeLabel(entry.patternType),
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Added ${_formatDate(entry.createdAt)}',
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
              case 'delete':
                _showDeleteConfirmation(entry, appState);
                break;
            }
          },
          itemBuilder: (context) => [
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

  Color _getReasonColor(String reason) {
    switch (reason.toLowerCase()) {
      case 'spam/robocall':
      case 'scam':
        return Colors.red;
      case 'telemarketing':
        return Colors.orange;
      case 'bill collector':
        return Colors.purple;
      case 'harassment':
        return Colors.pink;
      default:
        return Colors.grey;
    }
  }

  IconData _getReasonIcon(String reason) {
    switch (reason.toLowerCase()) {
      case 'spam/robocall':
      case 'scam':
        return Icons.dangerous;
      case 'telemarketing':
        return Icons.campaign;
      case 'bill collector':
        return Icons.attach_money;
      case 'harassment':
        return Icons.report;
      default:
        return Icons.block;
    }
  }

  String _getPatternTypeLabel(String patternType) {
    switch (patternType) {
      case 'exact':
        return 'Exact';
      case 'area_code':
        return 'Area Code';
      case 'prefix':
        return 'Prefix';
      default:
        return 'Unknown';
    }
  }

  void _addToBlacklist(AppState appState) {
    if (_formKey.currentState?.validate() ?? false) {
      final entry = BlacklistEntry(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        phoneNumber: _phoneController.text.trim(),
        reason: _selectedReason,
        patternType: _selectedPatternType,
        createdAt: DateTime.now(),
      );

      appState.addBlacklistEntry(entry);
      
      // Clear form
      _phoneController.clear();
      setState(() {
        _selectedReason = '';
        _selectedPatternType = 'exact';
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Number "${entry.phoneNumber}" added to blacklist'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showDeleteConfirmation(BlacklistEntry entry, AppState appState) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove from Blacklist'),
        content: Text('Are you sure you want to remove "${entry.phoneNumber}" from the blacklist?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              appState.removeBlacklistEntry(entry.id);
              Navigator.of(context).pop();
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Number "${entry.phoneNumber}" removed from blacklist'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _showClearAllConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Blacklist Entries'),
        content: const Text('Are you sure you want to remove all entries from the blacklist? This action cannot be undone.'),
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
                  content: Text('All blacklist entries cleared'),
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

  void _refreshBlacklist() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Refreshing blacklist...'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  bool _isValidPhoneNumber(String phone) {
    final phoneRegExp = RegExp(r'^\+?[\d\s\-\(\)]+$');
    return phoneRegExp.hasMatch(phone) && phone.replaceAll(RegExp(r'[\s\-\(\)]'), '').length >= 10;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'today';
    } else if (difference.inDays == 1) {
      return 'yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }
}