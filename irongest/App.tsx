/**
 * IronGest - Main Application Component
 * Iron Man-style air gesture control app
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

import React from 'react';
import { StatusBar, View, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';

// Main App Component
function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor="#0A0A0F" 
          />
          <View style={styles.container}>
            <View style={styles.centerContent}>
              <Text style={styles.title}>IronGest</Text>
              <Text style={styles.subtitle}>Air Gesture Control</Text>
              <Text style={styles.version}>v1.0.0</Text>
            </View>
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#00D4FF',
    opacity: 0.8,
    marginBottom: 24,
  },
  version: {
    fontSize: 14,
    color: '#666666',
  },
});

export default App;
