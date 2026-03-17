/**
 * IronGest - Navigation
 * React Navigation v6 with custom HUD-style tab bar
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme';

// Import screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TutorialScreen } from '../screens/TutorialScreen';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Custom HUD Tab Bar Component
// ============================================================================

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const HUDTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarItem
              key={route.key}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// Tab Bar Item Component
// ============================================================================

interface TabBarItemProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

const TabBarItem: React.FC<TabBarItemProps> = ({ label, isFocused, onPress }) => {
  const scale = useSharedValue(1);
  const indicator = useSharedValue(0);

  React.useEffect(() => {
    indicator.value = withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 });
    scale.value = withSpring(isFocused ? 1.05 : 1, { damping: 15, stiffness: 200 });
  }, [isFocused]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicator.value,
    transform: [{ scaleX: indicator.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(indicator.value, [0, 1], [0, 0.5]),
    transform: [{ scale: 1 + indicator.value * 0.2 }],
  }));

  const getIcon = () => {
    switch (label) {
      case 'Dashboard':
        return '◉';
      case 'Settings':
        return '⚙';
      case 'Tutorial':
        return '?';
      default:
        return '●';
    }
  };

  return (
    <Pressable onPress={onPress} style={styles.tabItemContainer}>
      <Animated.View style={[styles.tabItem, containerStyle]}>
        {/* Glow effect */}
        <Animated.View style={[styles.tabGlow, glowStyle]} />

        {/* Icon */}
        <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
          {getIcon()}
        </Text>

        {/* Label */}
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
          {label}
        </Text>

        {/* Active indicator */}
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// Navigation Theme
// ============================================================================

const navigationTheme = {
  ...(DarkTheme as any),
  colors: {
    ...(DarkTheme as any).colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.surfaceBorder,
  },
};

// ============================================================================
// Main Navigation Component
// ============================================================================

export const AppNavigation: React.FC = () => {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        tabBar={(props) => <HUDTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
          }}
        />
        <Tab.Screen
          name="Tutorial"
          component={TutorialScreen}
          options={{
            tabBarLabel: 'Tutorial',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.lg,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface + 'E6',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },

  tabItemContainer: {
    flex: 1,
    alignItems: 'center',
  },

  tabItem: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    position: 'relative',
  },

  tabGlow: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },

  tabIcon: {
    fontSize: 24,
    color: Colors.textMuted,
    marginBottom: 2,
  },

  tabIconActive: {
    color: Colors.primary,
  },

  tabLabel: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  tabLabelActive: {
    color: Colors.text,
    fontWeight: '600',
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
});

export default AppNavigation;
