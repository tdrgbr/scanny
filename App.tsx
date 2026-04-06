import { MaterialCommunityIcons } from '@expo/vector-icons';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import './global.css';
import { OBDProvider } from './hooks/OBDContext';
import { useBluetooth } from './useBluetooth';

import AddVehicleScreen from './screens/AddVehicleScreen';
import AuthScreen from './screens/AuthScreen';
import CarSetupScreen from './screens/CarSetupScreen';
import CatalogSelectionScreen from './screens/CatalogScreen';
import ChangeVehicleScreen from './screens/ChangeVehicleScreen';
import ConnectScreen from './screens/ConnectScreen';
import DashboardScreen from './screens/Dashboard';
import DiagnosisScreen from './screens/DiagnoseScreen';
import DiagnosisHistoryScreen from './screens/DiagnosisHistoryScreen';
import ErrorDetailScreen from './screens/ErrorDetailScreen';
import HealthReportScreen from './screens/HealthReportScreen';
import OBDScanningScreen from './screens/OBDScanningScreen';
import PaywallScreen from './screens/PaywallScreen';
import PerformanceScreen from './screens/PerformanceScreen';
import WelcomeScreen from './screens/WelcomeScreen';

const OBD_BACKGROUND_TASK = 'OBD_POLLING_TASK';

const tabConfigs: any = {
  DashboardTab: { icon: 'home-variant', label: 'Dashboard' },
  Diagnosis: { icon: 'engine-outline', label: 'Diagnosis' },
  Performance: { icon: 'speedometer', label: 'Performance' },
};

TaskManager.defineTask(OBD_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) return;
});

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { connectedDevice, connectToDevice, setConfirmedDevice } = useBluetooth();
  
  const slideAnim = useRef(new Animated.Value(-150)).current; 
  const reconnectingRef = useRef(false);

  useEffect(() => {
    if (!connectedDevice) {
      Animated.spring(slideAnim, {
        toValue: insets.top + 10,
        useNativeDriver: true,
        bounciness: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [connectedDevice, insets.top]);

  useEffect(() => {
    const intruder = setInterval(async () => {
      if (!connectedDevice && !reconnectingRef.current) {
        reconnectingRef.current = true;
        const savedId = await AsyncStorage.getItem('@last_obd_id'); 
        if (savedId) {
          try {
            const device = await connectToDevice(savedId);
            if (device) {
              await device.write("\r");
              setConfirmedDevice(device);
            }
          } catch (e) {
            setConfirmedDevice(null);
          }
        }
        reconnectingRef.current = false;
      }
    }, 5000);
    return () => clearInterval(intruder);
  }, [connectedDevice, connectToDevice, setConfirmedDevice]);

  const translateY = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(true);

  const toggleTabBar = (show: boolean) => {
    if (show === isVisible.current) return;
    isVisible.current = show;
    Animated.timing(translateY, {
      toValue: show ? 0 : 150,
      duration: 350,
      easing: Easing.out(Easing.back(1)),
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 20,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 20) toggleTabBar(true);
        if (gestureState.dy < -20) toggleTabBar(false);
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      
      <Animated.View 
        style={{
          transform: [{ translateY: slideAnim }],
          position: 'absolute',
          left: 20,
          right: 20,
          zIndex: 9999,
        }}
        className="flex-row items-center justify-between rounded-3xl border border-red-500/30 bg-[#161617] p-4 shadow-2xl"
      >
        <View className="flex-row items-center flex-1">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <MaterialCommunityIcons name="lan-disconnect" size={20} color="#ef4444" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-brico-bold text-xs text-white uppercase tracking-tighter">Connection Lost</Text>
            <Text className="font-brico text-[10px] text-zinc-500 uppercase">Attempting to reconnect...</Text>
          </View>
        </View>
        <ActivityIndicator size="small" color="#ef4444" className="ml-2" />
      </Animated.View>

      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props: BottomTabBarProps) => (
          <Animated.View
            style={{
              transform: [{ translateY }],
              position: 'absolute',
              bottom: 30, left: 15, right: 15,
              backgroundColor: '#161617',
              borderRadius: 35,
              height: 75,
              borderWidth: 1,
              borderColor: '#27272a',
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              elevation: 5,
            }}>
            {props.state.routes.map((route, index) => {
              const isFocused = props.state.index === index;
              const config = tabConfigs[route.name] || { icon: 'help-circle', label: route.name };
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={() => props.navigation.navigate(route.name)}
                  activeOpacity={0.8}
                  style={{ flex: isFocused ? 1 : 0.45, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    backgroundColor: isFocused ? '#f97316' : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    borderRadius: 22,
                    paddingHorizontal: isFocused ? 16 : 0,
                    maxWidth: '100%',
                    overflow: 'hidden', 
                  }}>
                    <MaterialCommunityIcons name={config.icon} size={24} color={isFocused ? '#fff' : '#52525b'} />
                    {isFocused && (
                      <Text 
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ 
                          color: '#fff', 
                          fontSize: 12, 
                          fontFamily: 'Bricolage-Bold', 
                          marginLeft: 6,
                          flexShrink: 1 
                        }}
                      >
                        {config.label}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}>
        <Tab.Screen name="DashboardTab" component={DashboardScreen} />
        <Tab.Screen name="Diagnosis" component={DiagnosisScreen} />
        <Tab.Screen name="Performance" component={PerformanceScreen} />
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Anton-Regular': require('./assets/fonts/anton.ttf'),
    'Bricolage-Regular': require('./assets/fonts/bricolage.ttf'),
    'Bricolage-Bold': require('./assets/fonts/bricolage.ttf'),
  });

  useEffect(() => {
    const setup = async () => {
      await notifee.requestPermission();
      await notifee.createChannel({ id: 'obd_monitoring', name: 'OBDII Monitoring', importance: AndroidImportance.LOW });
      await notifee.createChannel({ id: 'obd_alerts', name: 'OBDII Critical Alerts', importance: AndroidImportance.HIGH, vibration: true });
    };
    setup();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <OBDProvider>
          <NavigationContainer theme={DarkTheme}>
            <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Connect" component={ConnectScreen} />
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="CarSetup" component={CarSetupScreen} />
              <Stack.Screen name="MainApp" component={MainTabs} />
              <Stack.Screen name="ErrorDetail" component={ErrorDetailScreen} />
              <Stack.Screen name="DTCHistory" component={DiagnosisHistoryScreen} />
              <Stack.Screen name="HealthReport" component={HealthReportScreen} />
              <Stack.Screen name="ChangeVehicle" component={ChangeVehicleScreen} />
              <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
              <Stack.Screen name="OBDScan" component={OBDScanningScreen} />
              <Stack.Screen name="CatalogSelection" component={CatalogSelectionScreen} />
              <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </OBDProvider>
      </View>
    </SafeAreaProvider>
  );
}