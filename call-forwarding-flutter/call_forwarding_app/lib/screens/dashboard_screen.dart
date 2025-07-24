import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';
import '../widgets/connection_status_widget.dart';
import '../widgets/current_call_widget.dart';
import '../widgets/stats_grid_widget.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int)? onNavigateToTab;
  
  const DashboardScreen({super.key, this.onNavigateToTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Call Forwarding Dashboard'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        elevation: 2,
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        child: Consumer<AppState>(
          builder: (context, appState, child) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Connection Status Section
                  _buildSectionCard(
                    title: '🔗 Connection Status',
                    child: const ConnectionStatusWidget(),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Live Call Status Section
                  _buildSectionCard(
                    title: '📞 Live Call Status',
                    child: const CurrentCallWidget(),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // System Statistics Section
                  _buildSectionCard(
                    title: '📊 System Statistics',
                    child: const StatsGridWidget(),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Quick Actions Section
                  _buildSectionCard(
                    title: '⚡ Quick Actions',
                    child: _buildQuickActions(),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Recent Activity Section
                  _buildSectionCard(
                    title: '📋 Recent Activity',
                    child: _buildRecentActivity(appState),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required Widget child,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
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
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.contacts,
                label: 'Contacts',
                onTap: () => _navigateToTab(1),
                color: Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.block,
                label: 'Blacklist',
                onTap: () => _navigateToTab(2),
                color: Colors.red,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.history,
                label: 'Call Logs',
                onTap: () => _navigateToTab(3),
                color: Colors.green,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.settings,
                label: 'Settings',
                onTap: () => _navigateToTab(4),
                color: Colors.purple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: color,
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentActivity(AppState appState) {
    final recentLogs = appState.callLogs.take(5).toList();
    
    if (recentLogs.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons.history,
              size: 48,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 12),
            Text(
              'No recent call activity',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Recent calls will appear here',
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        ...recentLogs.map((log) => _buildActivityItem(log)),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => _navigateToTab(3),
          child: const Text('View All Call Logs'),
        ),
      ],
    );
  }

  Widget _buildActivityItem(CallLog log) {
    IconData statusIcon;
    Color statusColor;
    
    switch (log.status.toLowerCase()) {
      case 'completed':
        statusIcon = Icons.call_received;
        statusColor = Colors.green;
        break;
      case 'screening':
        statusIcon = Icons.security;
        statusColor = Colors.orange;
        break;
      case 'blocked':
        statusIcon = Icons.block;
        statusColor = Colors.red;
        break;
      default:
        statusIcon = Icons.call;
        statusColor = Colors.blue;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              statusIcon,
              size: 20,
              color: statusColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.contactName ?? log.fromNumber,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: log.contactName != null ? 14 : 15,
                    color: log.contactName != null ? Colors.black87 : Colors.black,
                  ),
                ),
                if (log.contactName != null) ...[
                  Text(
                    log.fromNumber,
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                if (log.aiSummary != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    log.aiSummary!,
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatTime(log.timestamp),
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  log.status.toUpperCase(),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    // For recent calls, be more specific about timing
    if (difference.inMinutes < 1) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else if (difference.inDays < 7) {
      final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${weekdays[dateTime.weekday - 1]} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else {
      return '${dateTime.month}/${dateTime.day}/${dateTime.year}';
    }
  }

  void _navigateToTab(int index) {
    // Call the callback function if provided
    if (widget.onNavigateToTab != null) {
      widget.onNavigateToTab!(index);
    } else {
      // Fallback - show which tab would be navigated to
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Would navigate to tab $index'),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _refreshData() async {
    final appState = Provider.of<AppState>(context, listen: false);
    
    // Show loading state
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Refreshing data...'),
        duration: Duration(seconds: 1),
      ),
    );
    
    // Trigger data refresh
    appState.refreshData();
    
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));
  }
}