import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import FloatingChatButton from '@/components/FloatingChatButton';

// Tab bar icon component
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: colors.tabIconDefault,
          headerShown: useClientOnlyValue(false, true),
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarStyle: {
            height: 65,
            paddingBottom: 10,
            paddingTop: 8,
            backgroundColor: colors.card,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
            headerTitle: '🚌 BusBook',
            headerTitleStyle: {
              fontSize: 22,
              fontWeight: 'bold',
            },
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'My Trips',
            tabBarIcon: ({ color }) => <TabBarIcon name="ticket" color={color} />,
            headerTitle: 'My Trips',
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => <TabBarIcon name="credit-card" color={color} />,
            headerTitle: 'Wallet',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
            headerTitle: 'My Account',
          }}
        />
      </Tabs>
      
      {/* Floating AI Chat Button */}
      <FloatingChatButton />
    </View>
  );
}
