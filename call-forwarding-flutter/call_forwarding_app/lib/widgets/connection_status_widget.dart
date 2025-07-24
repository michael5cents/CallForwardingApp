import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';

class ConnectionStatusWidget extends StatelessWidget {
  const ConnectionStatusWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        final status = appState.connectionStatus;
        final error = appState.connectionError;

        Color statusColor;
        IconData statusIcon;
        String statusText;
        String statusDescription;

        switch (status) {
          case ConnectionStatus.connected:
            statusColor = Colors.green;
            statusIcon = Icons.check_circle;
            statusText = 'Connected';
            statusDescription = 'Real-time monitoring active';
            break;
          case ConnectionStatus.connecting:
            statusColor = Colors.orange;
            statusIcon = Icons.sync;
            statusText = 'Connecting';
            statusDescription = 'Establishing connection...';
            break;
          case ConnectionStatus.disconnected:
            statusColor = Colors.grey;
            statusIcon = Icons.circle_outlined;
            statusText = 'Disconnected';
            statusDescription = 'No connection to server';
            break;
          case ConnectionStatus.error:
            statusColor = Colors.red;
            statusIcon = Icons.error;
            statusText = 'Connection Error';
            statusDescription = error ?? 'Unknown error occurred';
            break;
        }

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: statusColor.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: status == ConnectionStatus.connecting
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                        ),
                      )
                    : Icon(
                        statusIcon,
                        color: statusColor,
                        size: 20,
                      ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      statusText,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      statusDescription,
                      style: TextStyle(
                        color: Colors.grey[700],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              if (status == ConnectionStatus.error) ...[
                IconButton(
                  onPressed: () => _showErrorDetails(context, error),
                  icon: const Icon(Icons.info_outline),
                  tooltip: 'Error Details',
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  void _showErrorDetails(BuildContext context, String? error) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Connection Error'),
        content: Text(error ?? 'Unknown error occurred'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}