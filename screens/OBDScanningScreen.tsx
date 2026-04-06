import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOBDData } from '../hooks/useOBDData';
import { useBluetooth } from '../useBluetooth';

export default function OBDScanningScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const obd = useOBDData();
  const { connectToDevice, connectedDevice, setConfirmedDevice } = useBluetooth();

  const [scanStep, setScanStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false); 
  const hasFinished = useRef(false);
  const connectionAttempted = useRef(false); // Protecție dublu-apel
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const steps = [
    'Searching for OBD adapter...',
    'Establishing protocol (CAN BUS)...',
    'Querying Engine Control Unit (ECU)...',
    'Reading available sensors...',
    'Finalizing...',
  ];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const triggerBluetooth = async () => {
      if (connectionAttempted.current) return;
      connectionAttempted.current = true;

      if (!connectedDevice) {
        const savedId = await AsyncStorage.getItem('@last_obd_id');
        if (savedId) {
          try {
            const device = await connectToDevice(savedId);
            if (device) {
              setConfirmedDevice(device);
            } else {
              navigation.replace('Connect');
            }
          } catch (error) {
             navigation.replace('Connect');
          }
        } else {
          navigation.replace('Connect');
        }
      }
    };
    
    triggerBluetooth();

    timeoutRef.current = setTimeout(() => {
      if (!hasFinished.current) {
        setShowErrorModal(true);
      }
    }, 25000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const raw = String(obd.lastRaw || "");

    if (raw.includes("FAILED") || raw.includes("ERROR")) {
      setShowErrorModal(true);
      return;
    }

    if (raw.includes("INIT")) {
      setScanStep(1);
    } 
    else if (raw.includes("CONNECTED")) {
      setScanStep(2); 
    } 
    else if (raw.includes("P:") || raw.includes("LIVE") || raw.includes("ECU ASLEEP")) {
      setScanStep(3);
      
      if (!hasFinished.current) {
        hasFinished.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setScanStep(4);
        
        setTimeout(() => setShowResult(true), 800);
      }
    }
  }, [obd.lastRaw]);

  return (
    <View
      className="flex-1 justify-between bg-[#0A0A0A]"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}>
      
      <View className="items-center px-6 py-4">
        <Text className="font-brico text-[10px] uppercase tracking-[3px] text-zinc-500">
          Status: {obd.lastRaw.includes("P:") || obd.lastRaw.includes("LIVE") ? "Active Data Stream" : "Hardware Identification"}
        </Text>
      </View>

      <View className="items-center justify-center">
        <View className="relative items-center justify-center">
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }], opacity: 0.2 }}
            className="absolute h-64 w-64 rounded-full border border-orange-500"
          />
          <View className="h-40 w-40 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-2xl shadow-orange-500/20">
            <MaterialCommunityIcons name="engine" size={80} color="#f97316" />
          </View>
        </View>

        <View className="mt-16 items-center px-10">
          <Text className="text-center font-anton text-3xl uppercase tracking-tight text-white">
            {scanStep === steps.length - 1 ? 'Scan Successful' : 'Querying OBD...'}
          </Text>
          <Text className="mt-4 h-10 text-center font-brico text-sm text-orange-500">
            {steps[scanStep]}
          </Text>
        </View>
      </View>

      <View className="gap-y-3 px-10">
        {steps.map((step, index) => (
          <View key={index} className="flex-row items-center opacity-80">
            <MaterialCommunityIcons
              name={index <= scanStep ? 'check-circle' : 'circle-outline'}
              size={16}
              color={index <= scanStep ? '#f97316' : '#27272a'}
            />
            <Text
              className={`ml-3 font-brico text-[11px] uppercase tracking-wider ${
                index <= scanStep ? 'text-zinc-300' : 'text-zinc-800'
              }`}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <Modal animationType="fade" transparent={true} visible={showErrorModal}>
        <View className="flex-1 items-center justify-center bg-black/95 px-8">
          <View className="w-full rounded-[40px] border border-zinc-800 bg-[#1A1A1B] p-8 shadow-2xl">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
              <MaterialCommunityIcons name="lan-disconnect" size={32} color="#f97316" />
            </View>

            <Text className="font-anton text-3xl uppercase leading-tight text-white">
              Synchronization{'\n'}Failed
            </Text>

            <Text className="mt-4 font-brico text-sm text-zinc-400 mb-2">
              Communication with the ECU timed out or the protocol could not be established. Please check your OBD connection.
            </Text>

            <View className="mt-8 gap-y-3">
              <TouchableOpacity
                onPress={() => {
                  setShowErrorModal(false);
                  navigation.replace('Connect');
                }}
                className="w-full items-center rounded-[22px] bg-orange-500 py-5 active:bg-orange-600">
                <Text className="font-anton text-lg uppercase text-black">Change Device</Text>
              </TouchableOpacity>
              
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={showResult}>
        <View className="flex-1 items-center justify-center bg-black/90 px-6">
          <View className="w-full rounded-[40px] border border-zinc-800 bg-[#161617] p-8 shadow-2xl shadow-orange-500/10">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-orange-500">
              <MaterialCommunityIcons name="car-connected" size={32} color="black" />
            </View>

            <Text className="font-anton text-3xl uppercase leading-tight text-white">
              Successfully Connected to OBD!
            </Text>

            <View className="mt-8">
              <TouchableOpacity
                onPress={() => {
                  setShowResult(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainApp' }], 
                  });
                }}
                className="w-full items-center rounded-[22px] bg-orange-500 py-5 active:bg-orange-600 shadow-xl shadow-orange-500/20">
                <Text className="font-anton text-lg uppercase text-black">Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="h-2" />
    </View>
  );
}