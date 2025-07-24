import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/dashboard_screen.dart';
import 'screens/contacts_screen.dart';
import 'screens/blacklist_screen.dart';
import 'screens/call_logs_screen.dart';
import 'screens/settings_screen.dart';
import 'services/realtime_service.dart';
import 'services/webhook_service.dart';
import 'services/background_service.dart';
import 'models/app_state.dart';
import 'utils/samsung_zfold_utils.dart';
import 'package:provider/provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize background service
  await BackgroundService.initialize();
  
  runApp(const CallForwardingApp());
}

class CallForwardingApp extends StatelessWidget {
  const CallForwardingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AppState(),
      child: MaterialApp(
        title: 'Call Forwarding Dashboard',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF2563EB), // Blue theme from web app
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF2563EB),
            foregroundColor: Colors.white,
            elevation: 2,
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            selectedItemColor: Color(0xFF2563EB),
            unselectedItemColor: Colors.grey,
            type: BottomNavigationBarType.fixed,
          ),
          cardTheme: CardTheme(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        darkTheme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF2563EB),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
        ),
        home: const MainScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  late RealtimeService _realtimeService;
  late WebhookService _webhookService;
  
  List<Widget> get _screens => [
    DashboardScreen(onNavigateToTab: _onNavigateToTab),
    const ContactsScreen(),
    const BlacklistScreen(),
    const CallLogsScreen(),
    const SettingsScreen(),
  ];

  final List<BottomNavigationBarItem> _navItems = [
    const BottomNavigationBarItem(
      icon: Icon(Icons.dashboard),
      label: 'Dashboard',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.contacts),
      label: 'Contacts',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.block),
      label: 'Blacklist',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.history),
      label: 'Call Logs',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.settings),
      label: 'Settings',
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeServices();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _realtimeService.disconnect();
    _webhookService.dispose();
    super.dispose();
  }

  Future<void> _initializeServices() async {
    // Initialize real-time and webhook services
    _realtimeService = RealtimeService();
    _webhookService = WebhookService();
    
    // Connect to app state FIRST
    if (mounted) {
      final appState = Provider.of<AppState>(context, listen: false);
      _realtimeService.setAppState(appState);
      _webhookService.setAppState(appState);
    }
    
    // Start webhook server for real-time notifications
    await _webhookService.startWebhookServer();
    
    // Then attempt Socket.IO connection
    await _realtimeService.connect();
  }

  void _onNavigateToTab(int index) {
    setState(() {
      _currentIndex = index;
    });
    // Provide haptic feedback
    HapticFeedback.lightImpact();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    
    switch (state) {
      case AppLifecycleState.resumed:
        // App came to foreground - reconnect if needed
        if (!_realtimeService.isConnected) {
          _realtimeService.connect();
        }
        break;
      case AppLifecycleState.paused:
        // App went to background - keep connection alive for real-time updates
        break;
      case AppLifecycleState.detached:
        // App is being terminated
        _realtimeService.disconnect();
        _webhookService.dispose();
        break;
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SamsungZFoldUtils.buildAdaptiveNavigation(
      context: context,
      currentIndex: _currentIndex,
      destinations: _navItems.map((item) {
        return NavigationDestination(
          icon: item.icon,
          label: item.label!,
        );
      }).toList(),
      onDestinationSelected: (index) {
        setState(() {
          _currentIndex = index;
        });
        // Provide haptic feedback
        HapticFeedback.lightImpact();
      },
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
    );
  }
}
