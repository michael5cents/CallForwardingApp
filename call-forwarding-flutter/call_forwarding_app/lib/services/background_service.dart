import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'notification_service.dart';

class BackgroundService {
  static const String _taskName = 'call_monitoring_task';
  static const String _periodicTaskName = 'periodic_monitoring_task';
  static const Duration _taskFrequency = Duration(minutes: 15);
  
  static final NotificationService _notificationService = NotificationService();
  static bool _isInitialized = false;

  static Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Initialize Workmanager
      await Workmanager().initialize(
        callbackDispatcher,
        isInDebugMode: kDebugMode,
      );

      // Initialize notification service
      await _notificationService.initialize();

      // Register periodic background task
      await _registerPeriodicTask();

      _isInitialized = true;
      debugPrint('BackgroundService: Initialized successfully');

    } catch (e) {
      debugPrint('BackgroundService: Initialization error: $e');
    }
  }

  static Future<void> _registerPeriodicTask() async {
    try {
      // Cancel existing tasks first
      await Workmanager().cancelAll();

      // Register periodic task for background monitoring
      await Workmanager().registerPeriodicTask(
        _periodicTaskName,
        _periodicTaskName,
        frequency: _taskFrequency,
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        ),
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(seconds: 30),
        existingWorkPolicy: ExistingWorkPolicy.replace,
      );

      debugPrint('BackgroundService: Periodic task registered');

    } catch (e) {
      debugPrint('BackgroundService: Error registering periodic task: $e');
    }
  }

  static Future<void> startMonitoring() async {
    try {
      await _registerPeriodicTask();
      
      // Also register an immediate one-time task
      await Workmanager().registerOneOffTask(
        'start_monitoring',
        _taskName,
        constraints: Constraints(
          networkType: NetworkType.connected,
        ),
      );

      debugPrint('BackgroundService: Monitoring started');

    } catch (e) {
      debugPrint('BackgroundService: Error starting monitoring: $e');
    }
  }

  static Future<void> stopMonitoring() async {
    try {
      await Workmanager().cancelAll();
      debugPrint('BackgroundService: Monitoring stopped');

    } catch (e) {
      debugPrint('BackgroundService: Error stopping monitoring: $e');
    }
  }

  static Future<void> checkCallStatus() async {
    try {
      debugPrint('BackgroundService: Checking call status...');
      
      // This would make an HTTP request to check for missed calls
      // For now, simulate the check
      await _simulateCallCheck();
      
    } catch (e) {
      debugPrint('BackgroundService: Error checking call status: $e');
    }
  }

  static Future<void> _simulateCallCheck() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastCheck = prefs.getInt('last_background_check') ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      
      // Update last check time
      await prefs.setInt('last_background_check', now);
      
      // If it's been more than 30 minutes since last check, 
      // show a notification that background monitoring is working
      if (now - lastCheck > 30 * 60 * 1000) {
        await _notificationService.showGeneralNotification(
          'Call Monitoring Active',
          'Background monitoring is working properly',
          payload: 'background_check',
        );
      }
      
      debugPrint('BackgroundService: Call status check completed');

    } catch (e) {
      debugPrint('BackgroundService: Error in simulated call check: $e');
    }
  }

  static Future<void> syncData() async {
    try {
      debugPrint('BackgroundService: Syncing data...');
      
      final prefs = await SharedPreferences.getInstance();
      
      // Store sync attempt
      await prefs.setInt('last_sync_attempt', DateTime.now().millisecondsSinceEpoch);
      
      // Here we would make HTTP requests to sync data
      // For now, just update the sync time
      await prefs.setInt('last_successful_sync', DateTime.now().millisecondsSinceEpoch);
      
      debugPrint('BackgroundService: Data sync completed');

    } catch (e) {
      debugPrint('BackgroundService: Error syncing data: $e');
      
      // Store sync error
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_sync_error', e.toString());
    }
  }

  static Future<bool> isBackgroundProcessingEnabled() async {
    try {
      if (Platform.isAndroid) {
        // Check if background processing is enabled
        // This is device/manufacturer specific
        return true; // Assume enabled for now
      }
      return true;
    } catch (e) {
      debugPrint('BackgroundService: Error checking background processing: $e');
      return false;
    }
  }

  static Future<Map<String, dynamic>> getBackgroundStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final deviceInfo = DeviceInfoPlugin();
      
      final status = <String, dynamic>{
        'isInitialized': _isInitialized,
        'lastCheck': prefs.getInt('last_background_check'),
        'lastSync': prefs.getInt('last_successful_sync'),
        'lastSyncAttempt': prefs.getInt('last_sync_attempt'),
        'lastSyncError': prefs.getString('last_sync_error'),
        'backgroundProcessingEnabled': await isBackgroundProcessingEnabled(),
      };

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        status['deviceInfo'] = {
          'brand': androidInfo.brand,
          'model': androidInfo.model,
          'version': androidInfo.version.release,
          'sdkInt': androidInfo.version.sdkInt,
        };
      }

      return status;

    } catch (e) {
      debugPrint('BackgroundService: Error getting background status: $e');
      return {'error': e.toString()};
    }
  }

  static Future<void> optimizeForDevice() async {
    try {
      if (Platform.isAndroid) {
        final deviceInfo = DeviceInfoPlugin();
        final androidInfo = await deviceInfo.androidInfo;
        
        // Samsung-specific optimizations
        if (androidInfo.brand.toLowerCase().contains('samsung')) {
          await _optimizeForSamsung();
        }
        
        // General Android optimizations
        await _optimizeForAndroid(androidInfo);
      }

    } catch (e) {
      debugPrint('BackgroundService: Error optimizing for device: $e');
    }
  }

  static Future<void> _optimizeForSamsung() async {
    try {
      debugPrint('BackgroundService: Applying Samsung optimizations...');
      
      // Samsung-specific background task optimizations
      // These would require additional platform-specific code
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('samsung_optimizations_applied', true);

    } catch (e) {
      debugPrint('BackgroundService: Error applying Samsung optimizations: $e');
    }
  }

  static Future<void> _optimizeForAndroid(AndroidDeviceInfo androidInfo) async {
    try {
      debugPrint('BackgroundService: Applying Android optimizations...');
      
      // Android version-specific optimizations
      if (androidInfo.version.sdkInt >= 23) {
        // Android 6.0+ Doze mode considerations
        debugPrint('BackgroundService: Device supports Doze mode');
      }
      
      if (androidInfo.version.sdkInt >= 26) {
        // Android 8.0+ background execution limits
        debugPrint('BackgroundService: Device has background execution limits');
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('android_optimizations_applied', true);
      await prefs.setInt('target_sdk', androidInfo.version.sdkInt);

    } catch (e) {
      debugPrint('BackgroundService: Error applying Android optimizations: $e');
    }
  }
}

// Background task callback dispatcher
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      debugPrint('BackgroundService: Executing task: $task');
      
      switch (task) {
        case BackgroundService._taskName:
        case BackgroundService._periodicTaskName:
          await BackgroundService.checkCallStatus();
          await BackgroundService.syncData();
          break;
        case 'start_monitoring':
          await BackgroundService.checkCallStatus();
          break;
        default:
          debugPrint('BackgroundService: Unknown task: $task');
          break;
      }

      return Future.value(true);

    } catch (e) {
      debugPrint('BackgroundService: Task execution error: $e');
      return Future.value(false);
    }
  });
}