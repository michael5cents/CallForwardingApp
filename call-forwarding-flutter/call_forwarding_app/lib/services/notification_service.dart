import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:just_audio/just_audio.dart';
import 'package:vibration/vibration.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();
  final AudioPlayer _audioPlayer = AudioPlayer();
  
  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Request permissions first
      await _requestPermissions();

      // Initialize notifications
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initializationSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _flutterLocalNotificationsPlugin.initialize(
        initializationSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      // Create notification channels for Android
      if (Platform.isAndroid) {
        await _createNotificationChannels();
      }

      _isInitialized = true;
      debugPrint('NotificationService: Initialized successfully');

    } catch (e) {
      debugPrint('NotificationService: Initialization error: $e');
    }
  }

  Future<void> _requestPermissions() async {
    try {
      // Request notification permission
      final notificationStatus = await Permission.notification.request();
      debugPrint('NotificationService: Notification permission: $notificationStatus');

      // Request phone permission for call handling
      final phoneStatus = await Permission.phone.request();
      debugPrint('NotificationService: Phone permission: $phoneStatus');

      // Request microphone permission for call screening
      final microphoneStatus = await Permission.microphone.request();
      debugPrint('NotificationService: Microphone permission: $microphoneStatus');

      // For Android 13+ (API 33), request POST_NOTIFICATIONS permission
      if (Platform.isAndroid) {
        final status = await Permission.notification.status;
        if (status.isDenied) {
          await Permission.notification.request();
        }
      }

    } catch (e) {
      debugPrint('NotificationService: Permission request error: $e');
    }
  }

  Future<void> _createNotificationChannels() async {
    try {
      const callChannel = AndroidNotificationChannel(
        'call_alerts',
        'Call Alerts',
        description: 'Notifications for incoming calls',
        importance: Importance.high,
        enableVibration: true,
        enableLights: true,
        sound: RawResourceAndroidNotificationSound('call_alert'),
      );

      const generalChannel = AndroidNotificationChannel(
        'general',
        'General Notifications',
        description: 'General app notifications',
        importance: Importance.defaultImportance,
      );

      await _flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(callChannel);

      await _flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(generalChannel);

      debugPrint('NotificationService: Notification channels created');

    } catch (e) {
      debugPrint('NotificationService: Error creating notification channels: $e');
    }
  }

  Future<void> showCallNotification(
    String phoneNumber,
    String callerName, {
    String? message,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      const androidDetails = AndroidNotificationDetails(
        'call_alerts',
        'Call Alerts',
        channelDescription: 'Notifications for incoming calls',
        importance: Importance.high,
        enableVibration: true,
        enableLights: true,
        sound: RawResourceAndroidNotificationSound('call_alert'),
        fullScreenIntent: true,
        category: AndroidNotificationCategory.call,
        visibility: NotificationVisibility.public,
        actions: [
          AndroidNotificationAction(
            'answer',
            'Answer',
            icon: DrawableResourceAndroidBitmap('ic_call'),
          ),
          AndroidNotificationAction(
            'decline',
            'Decline',
            icon: DrawableResourceAndroidBitmap('ic_call_end'),
          ),
        ],
      );

      const iosDetails = DarwinNotificationDetails(
        categoryIdentifier: 'call_alerts',
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        sound: 'call_alert.wav',
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      const title = 'Incoming Call';
      final body = message ?? 'Call from $callerName ($phoneNumber)';

      await _flutterLocalNotificationsPlugin.show(
        1, // Use ID 1 for call notifications
        title,
        body,
        notificationDetails,
        payload: 'call:$phoneNumber',
      );

      // Trigger vibration
      _vibrate();

      debugPrint('NotificationService: Call notification shown for $phoneNumber');

    } catch (e) {
      debugPrint('NotificationService: Error showing call notification: $e');
    }
  }

  Future<void> showGeneralNotification(
    String title,
    String body, {
    String? payload,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      const androidDetails = AndroidNotificationDetails(
        'general',
        'General Notifications',
        channelDescription: 'General app notifications',
        importance: Importance.defaultImportance,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _flutterLocalNotificationsPlugin.show(
        DateTime.now().millisecondsSinceEpoch % 1000000, // Unique ID
        title,
        body,
        notificationDetails,
        payload: payload,
      );

      debugPrint('NotificationService: General notification shown: $title');

    } catch (e) {
      debugPrint('NotificationService: Error showing general notification: $e');
    }
  }

  Future<void> playCallAlert() async {
    try {
      // Simple vibration for call alerts - no audio needed for notifications
      _vibrate();
      
      debugPrint('NotificationService: Call alert vibration played');
      
    } catch (e) {
      debugPrint('NotificationService: Error with call alert: $e');
    }
  }

  Future<void> _vibrate() async {
    try {
      final hasVibrator = await Vibration.hasVibrator();
      if (hasVibrator == true) {
        // Custom vibration pattern: [wait, vibrate, wait, vibrate, ...]
        await Vibration.vibrate(
          pattern: [0, 500, 200, 500, 200, 500],
          intensities: [0, 255, 0, 255, 0, 255],
        );
      }
    } catch (e) {
      debugPrint('NotificationService: Vibration error: $e');
    }
  }

  Future<void> cancelCallNotification() async {
    try {
      await _flutterLocalNotificationsPlugin.cancel(1);
      debugPrint('NotificationService: Call notification cancelled');
    } catch (e) {
      debugPrint('NotificationService: Error cancelling call notification: $e');
    }
  }

  Future<void> cancelAllNotifications() async {
    try {
      await _flutterLocalNotificationsPlugin.cancelAll();
      debugPrint('NotificationService: All notifications cancelled');
    } catch (e) {
      debugPrint('NotificationService: Error cancelling all notifications: $e');
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('NotificationService: Notification tapped: ${response.payload}');
    
    try {
      final payload = response.payload;
      final actionId = response.actionId;
      
      if (payload?.startsWith('call:') == true) {
        final phoneNumber = payload!.substring(5);
        
        switch (actionId) {
          case 'answer':
            debugPrint('NotificationService: Answer call action for $phoneNumber');
            // Handle answer call action
            _handleAnswerCall(phoneNumber);
            break;
          case 'decline':
            debugPrint('NotificationService: Decline call action for $phoneNumber');
            // Handle decline call action
            _handleDeclineCall(phoneNumber);
            break;
          default:
            debugPrint('NotificationService: Open app for call $phoneNumber');
            // Handle general notification tap - open app
            _handleOpenApp();
            break;
        }
      }
      
    } catch (e) {
      debugPrint('NotificationService: Error handling notification tap: $e');
    }
  }

  void _handleAnswerCall(String phoneNumber) {
    // This would integrate with the call management system
    // For now, just bring the app to foreground
    debugPrint('NotificationService: Handling answer call for $phoneNumber');
  }

  void _handleDeclineCall(String phoneNumber) {
    // This would integrate with the call management system
    debugPrint('NotificationService: Handling decline call for $phoneNumber');
  }

  void _handleOpenApp() {
    // Bring app to foreground
    debugPrint('NotificationService: Bringing app to foreground');
  }

  // Check permission status
  Future<bool> areNotificationsEnabled() async {
    try {
      final status = await Permission.notification.status;
      return status.isGranted;
    } catch (e) {
      debugPrint('NotificationService: Error checking notification permission: $e');
      return false;
    }
  }

  // Request permission if needed
  Future<bool> requestNotificationPermission() async {
    try {
      final status = await Permission.notification.request();
      return status.isGranted;
    } catch (e) {
      debugPrint('NotificationService: Error requesting notification permission: $e');
      return false;
    }
  }

  void dispose() {
    _audioPlayer.dispose();
  }
}