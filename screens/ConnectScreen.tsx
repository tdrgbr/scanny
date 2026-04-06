import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BluetoothItem } from '../components/BluetoothItem';
import { Stepper } from '../components/Stepper';
import { useBluetooth } from '../useBluetooth';

export default function ConnectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const { scanAndConnect, connectToDevice, foundDevices, isScanning, setConfirmedDevice } = useBluetooth();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    scanAndConnect();
  }, []);

  const handleDevicePress = async (device: any) => {
    setConnectionError(false);
    setIsConnecting(true);
    const deviceObject = await connectToDevice(device.address);

    if (deviceObject) {
      setConfirmedDevice(deviceObject);
      await AsyncStorage.setItem('@last_obd_id', device.address);

      setIsConnecting(false);
      navigation.replace('OBDScan');

    } else {
      setIsConnecting(false);
      setConnectionError(true);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-6" style={{ paddingTop: insets.top }}>
      
      <View className="mb-8 mt-10">
        <Text className="font-anton text-5xl leading-[50px] text-white">Connect to your car</Text>
        <Text className="font-brico text-md leading-6 text-white mt-2">
          Please select your OBD device from the list below. Make sure your car is turned on!
        </Text>
      </View>

      <View className="max-h-72 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
        {isScanning ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator color="#f2630a" />
            <Text className="font-brico text-zinc-500 mt-2">Scanning for paired devices...</Text>
          </View>
        ) : (
          <FlatList
            data={foundDevices}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <BluetoothItem
                name={item.name || 'Unknown Device'}
                isLast={index === foundDevices.length - 1}
                onPress={() => handleDevicePress(item)}
              />
            )}
            ListEmptyComponent={() => (
              <View className="py-10 items-center justify-center">
                <Text className="font-brico text-zinc-500 text-center px-6">
                  No paired OBDII devices found. Please pair your device in phone settings first.
                </Text>
              </View>
            )}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
            persistentScrollbar={true}
            className="px-2"
          />
        )}
      </View>

      <View className="flex-1 items-center justify-center">
        {isConnecting ? (
          <View className="items-center">
            <ActivityIndicator color="white" size="large" />
            <Text className="font-brico mt-4 text-center text-zinc-300">
              Trying to connect with your car...
            </Text>
          </View>
        ) : connectionError ? (
          <View className="items-center">
            <View className="relative">
              <MaterialIcons name="warning" size={50} color="#f2630a" />
              <View className="absolute -bottom-1 -right-1 rounded-full bg-[#0A0A0A] p-0.5">
                <MaterialIcons name="cancel" size={20} color="#f2630a" />
              </View>
            </View>

            <Text className="font-brico mt-6 px-4 text-center text-lg text-zinc-300">
              Connection timed out. Make sure your OBDII adapter is plugged in and try again.
            </Text>

            <TouchableOpacity
              onPress={() => scanAndConnect()}
              className="mt-8 rounded-full bg-zinc-100 px-12 py-4 shadow-lg active:bg-zinc-300">
              <Text className="font-brico-bold text-lg text-zinc-900">Refresh List</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={{ paddingBottom: insets.bottom + 20 }}>
        <Stepper currentStep={1} />
      </View>
    </View>
  );
}