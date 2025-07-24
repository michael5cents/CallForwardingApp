import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';

class CurrentCallWidget extends StatelessWidget {
  const CurrentCallWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        final currentCall = appState.currentCall;

        if (currentCall == null) {
          return _buildIdleState();
        }

        return _buildActiveCallState(currentCall);
      },
    );
  }

  Widget _buildIdleState() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.2),
              borderRadius: BorderRadius.circular(30),
            ),
            child: const Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 32,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'System Ready',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.green,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Monitoring for incoming calls',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveCallState(CallInfo call) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (call.status) {
      case CallStatus.ringing:
        statusColor = Colors.blue;
        statusIcon = Icons.phone_in_talk;
        statusText = 'Incoming Call';
        break;
      case CallStatus.inProgress:
        statusColor = Colors.orange;
        statusIcon = Icons.call;
        statusText = 'Call In Progress';
        break;
      case CallStatus.screening:
        statusColor = Colors.purple;
        statusIcon = Icons.security;
        statusText = 'AI Screening';
        break;
      case CallStatus.completed:
        statusColor = Colors.green;
        statusIcon = Icons.call_end;
        statusText = 'Call Completed';
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.phone;
        statusText = 'Unknown Status';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: statusColor.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: call.status == CallStatus.ringing
                    ? SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                        ),
                      )
                    : Icon(
                        statusIcon,
                        color: statusColor,
                        size: 24,
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
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      call.contactName ?? 'Unknown Caller',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      call.fromNumber,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _formatTime(call.timestamp),
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      call.status.name.toUpperCase(),
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
          
          if (call.message != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                call.message!,
                style: TextStyle(
                  color: Colors.grey[700],
                  fontSize: 14,
                ),
              ),
            ),
          ],
          
          // Call progression steps
          Consumer<AppState>(
            builder: (context, appState, child) {
              final steps = appState.callSteps;
              if (steps.isNotEmpty) {
                return Column(
                  children: [
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Call Progress',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[700],
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...steps.map((step) => _buildCallStep(step)).toList(),
                        ],
                      ),
                    ),
                  ],
                );
              }
              return const SizedBox.shrink();
            },
          ),

          if (call.status == CallStatus.ringing || call.status == CallStatus.inProgress) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _handleDeclineCall(call),
                    icon: const Icon(Icons.call_end, color: Colors.red),
                    label: const Text('Decline', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _handleAcceptCall(call),
                    icon: const Icon(Icons.call),
                    label: const Text('Accept'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCallStep(CallStep step) {
    Color stepColor;
    IconData stepIcon;
    
    switch (step.status) {
      case 'complete':
        stepColor = Colors.green;
        stepIcon = Icons.check_circle;
        break;
      case 'active':
        stepColor = Colors.blue;
        stepIcon = Icons.radio_button_checked;
        break;
      case 'error':
        stepColor = Colors.red;
        stepIcon = Icons.error;
        break;
      default:
        stepColor = Colors.grey;
        stepIcon = Icons.circle;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 2),
            child: Icon(
              stepIcon,
              size: 16,
              color: stepColor,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: step.status == 'active' ? stepColor : Colors.grey[700],
                  ),
                ),
                if (step.details != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    step.details!,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ],
            ),
          ),
          Text(
            _formatStepTime(step.timestamp),
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else {
      return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }

  String _formatStepTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}:${dateTime.second.toString().padLeft(2, '0')}';
  }

  void _handleAcceptCall(CallInfo call) {
    // Handle accepting the call
    // This would integrate with the phone system
    debugPrint('Accepting call from ${call.fromNumber}');
  }

  void _handleDeclineCall(CallInfo call) {
    // Handle declining the call
    // This would integrate with the phone system
    debugPrint('Declining call from ${call.fromNumber}');
  }
}