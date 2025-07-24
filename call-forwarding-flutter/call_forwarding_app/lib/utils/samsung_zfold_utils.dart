import 'package:flutter/material.dart';
import 'package:device_info_plus/device_info_plus.dart';

class SamsungZFoldUtils {
  static const String _samsungBrand = 'samsung';
  static const List<String> _foldableModels = [
    'sm-f936', // Z Fold 4
    'sm-f926', // Z Fold 3
    'sm-f916', // Z Fold 2
    'sm-f900', // Galaxy Fold
    'sm-f711', // Z Flip 3
    'sm-f721', // Z Flip 4
  ];

  static Future<bool> isSamsungDevice() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      return androidInfo.brand.toLowerCase().contains(_samsungBrand);
    } catch (e) {
      return false;
    }
  }

  static Future<bool> isFoldableDevice() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final model = androidInfo.model.toLowerCase();
      
      return _foldableModels.any((foldableModel) => 
          model.contains(foldableModel));
    } catch (e) {
      return false;
    }
  }

  static Future<bool> isZFold3() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final model = androidInfo.model.toLowerCase();
      
      return model.contains('sm-f926');
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> getDeviceInfo() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      
      return {
        'brand': androidInfo.brand,
        'model': androidInfo.model,
        'version': androidInfo.version.release,
        'sdkInt': androidInfo.version.sdkInt,
        'manufacturer': androidInfo.manufacturer,
        'product': androidInfo.product,
        'isSamsung': await isSamsungDevice(),
        'isFoldable': await isFoldableDevice(),
        'isZFold3': await isZFold3(),
      };
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  static Widget buildAdaptiveLayout({
    required BuildContext context,
    required Widget defaultLayout,
    Widget? foldableLayout,
    Widget? landscapeLayout,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
        
        // Use foldable layout if available and device is wide (unfolded)
        if (isWide && foldableLayout != null) {
          return foldableLayout;
        }
        
        // Use landscape layout if available and in landscape mode
        if (isLandscape && landscapeLayout != null) {
          return landscapeLayout;
        }
        
        // Default layout for phone mode
        return defaultLayout;
      },
    );
  }

  static EdgeInsets getAdaptivePadding(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final isWide = mediaQuery.size.width > 600;
    
    if (isWide) {
      // Foldable unfolded - more padding on sides
      return const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
    } else {
      // Phone mode - standard padding
      return const EdgeInsets.symmetric(horizontal: 16, vertical: 8);
    }
  }

  static double getAdaptiveColumnCount(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final width = mediaQuery.size.width;
    
    if (width > 900) {
      return 3; // Three columns for very wide screens
    } else if (width > 600) {
      return 2; // Two columns for unfolded mode
    } else {
      return 1; // Single column for phone mode
    }
  }

  static TextScaleFactor getAdaptiveTextScale(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final isWide = mediaQuery.size.width > 600;
    
    if (isWide) {
      return TextScaleFactor.large; // Larger text for unfolded mode
    } else {
      return TextScaleFactor.normal; // Normal text for phone mode
    }
  }

  static SliverGridDelegate getAdaptiveGridDelegate(BuildContext context) {
    final columnCount = getAdaptiveColumnCount(context);
    
    return SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: columnCount.toInt(),
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      childAspectRatio: columnCount > 1 ? 1.2 : 1.5,
    );
  }

  // Samsung-specific optimizations
  static Map<String, dynamic> getSamsungOptimizations() {
    return {
      'disableBatteryOptimization': true,
      'allowBackgroundActivity': true,
      'setPowerManagementExemption': true,
      'useOneUI_optimizations': true,
      'enableMultiWindow': true,
      'adaptiveBrightness': true,
    };
  }

  // Navigation rail for wide screens
  static Widget buildAdaptiveNavigation({
    required BuildContext context,
    required int currentIndex,
    required List<NavigationDestination> destinations,
    required Function(int) onDestinationSelected,
    required Widget body,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        
        if (isWide) {
          // Use navigation rail for wide screens
          return Row(
            children: [
              NavigationRail(
                selectedIndex: currentIndex,
                onDestinationSelected: onDestinationSelected,
                labelType: NavigationRailLabelType.all,
                destinations: destinations.map((dest) {
                  return NavigationRailDestination(
                    icon: dest.icon,
                    selectedIcon: dest.selectedIcon,
                    label: Text(dest.label),
                  );
                }).toList(),
              ),
              const VerticalDivider(thickness: 1, width: 1),
              Expanded(child: body),
            ],
          );
        } else {
          // Use bottom navigation bar for narrow screens
          return Scaffold(
            body: body,
            bottomNavigationBar: NavigationBar(
              selectedIndex: currentIndex,
              onDestinationSelected: onDestinationSelected,
              destinations: destinations,
            ),
          );
        }
      },
    );
  }

  // Foldable-aware dialog positioning
  static Future<T?> showAdaptiveDialog<T>({
    required BuildContext context,
    required WidgetBuilder builder,
    bool barrierDismissible = true,
  }) {
    return showDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (context) {
        return LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 600;
            
            if (isWide) {
              // Center the dialog on wide screens
              return Dialog(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 500),
                  child: builder(context),
                ),
              );
            } else {
              // Full-width dialog on narrow screens
              return builder(context);
            }
          },
        );
      },
    );
  }

  // Adaptive card layout
  static Widget buildAdaptiveCard({
    required Widget child,
    required BuildContext context,
    EdgeInsets? padding,
  }) {
    final adaptivePadding = padding ?? getAdaptivePadding(context);
    final isWide = MediaQuery.of(context).size.width > 600;
    
    return Card(
      elevation: isWide ? 4 : 2,
      margin: adaptivePadding,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(isWide ? 16 : 12),
      ),
      child: Padding(
        padding: adaptivePadding,
        child: child,
      ),
    );
  }

  // Multi-window support detection
  static bool isInMultiWindowMode(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    // Heuristic: if the screen is wide but short, likely in split screen
    return mediaQuery.size.width > 600 && mediaQuery.size.height < 400;
  }

  // Adaptive FAB positioning
  static FloatingActionButtonLocation getAdaptiveFABLocation(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 600;
    
    if (isWide) {
      return FloatingActionButtonLocation.endFloat;
    } else {
      return FloatingActionButtonLocation.centerFloat;
    }
  }
}

enum TextScaleFactor {
  small,
  normal,
  large,
}

extension TextScaleFactorExtension on TextScaleFactor {
  double get value {
    switch (this) {
      case TextScaleFactor.small:
        return 0.9;
      case TextScaleFactor.normal:
        return 1.0;
      case TextScaleFactor.large:
        return 1.1;
    }
  }
}