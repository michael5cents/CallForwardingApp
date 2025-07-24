# APK Build Process Documentation

## Overview
This document details the complete process for building Flutter APKs for the call forwarding app, including environment setup, troubleshooting, and successful build procedures.

## Build Environment Requirements

### System Configuration
- **Operating System**: Linux (Ubuntu/Debian based)
- **User Directory**: `/home/michael5cents/`
- **Flutter SDK Location**: `/home/michael5cents/flutter/`
- **Java Version Required**: OpenJDK 17 (critical for Gradle compatibility)
- **Android SDK Location**: `/home/michael5cents/android-sdk/`

### Critical Environment Variables
```bash
export JAVA_HOME=/home/michael5cents/jdk-17
export ANDROID_HOME=/home/michael5cents/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin
```

## Java Installation and Configuration

### Available Java Installations Found
During troubleshooting, multiple Java installations were discovered:
- `/home/michael5cents/android-sdk/jdk-11.0.19+7/bin/java` (Android SDK bundled)
- `/home/michael5cents/android-sdk/jdk-17/bin/java` (Android SDK bundled)
- `/home/michael5cents/jdk-17/bin/java` ✅ **WORKING VERSION**

### Java Path Resolution Process
1. **Initial Attempt**: Used system Java path `/usr/lib/jvm/java-17-openjdk-amd64`
   - **Result**: ❌ "JAVA_HOME is set to an invalid directory"
   - **Issue**: Path doesn't exist on this system

2. **System Search**: Searched for Java installations using:
   ```bash
   find / -name "java" -type f -path "*/bin/java" 2>/dev/null
   ```
   
3. **Solution**: Found working Java 17 at `/home/michael5cents/jdk-17/`
   - **Result**: ✅ Build successful

## Build Process Steps

### 1. Environment Preparation
```bash
cd /home/michael5cents/call-forwarding-flutter/call_forwarding_app
export JAVA_HOME=/home/michael5cents/jdk-17
export ANDROID_HOME=/home/michael5cents/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin
```

### 2. Flutter Build Command
```bash
/home/michael5cents/flutter/bin/flutter build apk --release
```

### 3. Build Output
- **Build Time**: ~65.8 seconds
- **File Size**: 24.6MB (consistent across versions)
- **Output Location**: `build/app/outputs/flutter-apk/app-release.apk`
- **Optimization**: Font tree-shaking reduced MaterialIcons from 1.6MB to 5.8KB (99.6% reduction)

### 4. APK Deployment
```bash
cp build/app/outputs/flutter-apk/app-release.apk /home/michael5cents/Desktop/call-forwarding-app-v{VERSION}-{FEATURE}.apk
```

## Troubleshooting History

### Common Issues Encountered

#### 1. Java Path Problems
**Error**: `JAVA_HOME is set to an invalid directory`
- **Cause**: Incorrect Java path or missing Java installation
- **Solution**: Find correct Java installation using system search
- **Prevention**: Verify Java path exists before setting JAVA_HOME

#### 2. Missing Android SDK
**Error**: `No Android SDK found`
- **Solution**: Set ANDROID_HOME environment variable
- **Path**: `/home/michael5cents/android-sdk/`

#### 3. Permission Issues
**Potential Issue**: Access denied to directories
- **Solution**: Ensure proper user permissions for all build directories
- **Check**: User has read/write access to Flutter, Android SDK, and project directories

## Version Management

### Current Versioning Scheme
**Format**: `call-forwarding-app-v{VERSION}-{FEATURE-DESCRIPTION}.apk`

**Examples**:
- `call-forwarding-app-v1.1.4+6-block-number.apk` (Latest with block number feature)
- `call-forwarding-app-v1.1.4.apk` (Previous stable version)
- `call-forwarding-app-v1.1.3.apk` (Earlier version)

### Version Source
Version number comes from `pubspec.yaml`:
```yaml
version: 1.1.4+6
```
- **1.1.4**: Semantic version (major.minor.patch)
- **+6**: Build number

## Build History and File Management

### APK Collection on Desktop
```bash
$ ls -la /home/michael5cents/Desktop/call-forwarding-app*.apk
-rw-rw-r-- 1 michael5cents michael5cents 24622554 Jul 21 20:15 call-forwarding-app-v1.1.0.apk
-rw-rw-r-- 1 michael5cents michael5cents 24623522 Jul 22 12:40 call-forwarding-app-v1.1.1.apk
-rw-rw-r-- 1 michael5cents michael5cents 24622878 Jul 22 12:47 call-forwarding-app-v1.1.2.apk
-rw-rw-r-- 1 michael5cents michael5cents 24623556 Jul 22 13:38 call-forwarding-app-v1.1.3.apk
-rw-rw-r-- 1 michael5cents michael5cents 24636605 Jul 22 14:11 call-forwarding-app-v1.1.4+6-block-number.apk ✅ LATEST
-rw-rw-r-- 1 michael5cents michael5cents 24623541 Jul 22 13:42 call-forwarding-app-v1.1.4.apk
```

### Build Progression Timeline
- **v1.1.0**: Initial stable release with voicemail fixes
- **v1.1.1-v1.1.3**: Various server URL and functionality fixes  
- **v1.1.4**: Stable version with domain configuration
- **v1.1.4+6**: Latest with Block Number functionality implemented

## Development Workflow

### Feature Implementation Process
1. **Code Changes**: Implement new features in Flutter source
2. **Testing**: Verify functionality works correctly
3. **Version Update**: Update `pubspec.yaml` version if needed
4. **Build**: Execute full APK build process
5. **Deploy**: Copy APK to desktop with descriptive filename
6. **Documentation**: Update relevant documentation files

### Build Validation Checklist
- [ ] Java 17 environment configured
- [ ] Android SDK path set correctly
- [ ] Flutter SDK accessible
- [ ] Project directory accessible
- [ ] Previous build artifacts cleaned if needed
- [ ] Version number updated in pubspec.yaml
- [ ] Feature-specific code changes completed

## Critical Success Factors

### Environment Setup Keys
1. **Correct Java Version**: Must use Java 17, not 11 or other versions
2. **User-specific Paths**: Use `/home/michael5cents/` paths, not system paths
3. **Complete PATH**: Include all necessary SDK tools in PATH
4. **Working Directory**: Always build from project root directory

### Build Command Template
```bash
# Complete build command with all environment variables
cd /home/michael5cents/call-forwarding-flutter/call_forwarding_app && \
export JAVA_HOME=/home/michael5cents/jdk-17 && \
export ANDROID_HOME=/home/michael5cents/android-sdk && \
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin && \
/home/michael5cents/flutter/bin/flutter build apk --release
```

## Quality Assurance

### Build Verification
- **File Size**: Should be ~24.6MB (consistent)
- **Build Time**: Typically 60-70 seconds
- **Gradle Success**: No error messages in build output
- **Font Optimization**: MaterialIcons tree-shaking should occur

### Installation Testing
- **Target Device**: Samsung Galaxy ZFold3
- **Installation Method**: APK sideloading
- **Initial Connection**: App should connect to calls.popzplace.com:3001
- **Feature Verification**: All implemented features should work correctly

## Maintenance and Updates

### Regular Maintenance Tasks
- **Dependency Updates**: Keep Flutter and Android SDK updated
- **Java Compatibility**: Ensure Java 17 remains compatible with latest Gradle
- **APK Cleanup**: Manage desktop APK collection to prevent clutter
- **Documentation Updates**: Keep this document current with any process changes

### Emergency Troubleshooting
If builds fail, systematically check:
1. Java installation and JAVA_HOME
2. Android SDK installation and ANDROID_HOME  
3. Flutter SDK accessibility
4. Project directory permissions
5. Previous build artifacts interference

## Future Considerations

### Automation Opportunities
- **Build Scripts**: Create shell scripts for common build scenarios
- **Version Management**: Automated version incrementing
- **CI/CD Pipeline**: Consider automated building and testing

### Platform Expansion
- **iOS Builds**: Extend process for iOS development
- **Web Builds**: Consider web deployment options
- **Desktop Builds**: Linux/Windows/macOS desktop versions

---

## Summary

The APK build process is now well-established and reliable when following these documented procedures. The key breakthrough was identifying the correct Java 17 installation path and ensuring all environment variables are properly configured. This documentation should enable consistent, successful builds for future development cycles.

**Latest Successful Build**: `call-forwarding-app-v1.1.5+7-dashboard-cleanup.apk`  
**Build Date**: July 23, 2025  
**Status**: Production Ready ✅

### Most Recent Build Success (v1.1.5+7)
**Working Build Command**:
```bash
cd /home/michael5cents/call-forwarding-flutter/call_forwarding_app && \
export ANDROID_HOME=/home/michael5cents/android-sdk && \
export JAVA_HOME=/home/michael5cents/android-sdk/jdk-17 && \
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$JAVA_HOME/bin && \
/home/michael5cents/flutter/bin/flutter build apk --release
```

**Build Results**:
- Build Time: 122.0s  
- File Size: 24.6MB  
- Font Optimization: MaterialIcons reduced from 1.6MB to 5.8KB (99.6% reduction)  
- Successfully copied to: `/home/michael5cents/Desktop/call-forwarding-app-v1.1.5+7-dashboard-cleanup.apk`  
- Archived to: `/home/michael5cents/Desktop/APK/`