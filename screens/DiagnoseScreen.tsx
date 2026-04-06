import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOBDData } from '../hooks/useOBDData';

export default function DiagnosisScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { performDeepScan, isDeepScanning, detectedErrors } = useOBDData();

  const [seconds, setSeconds] = useState<number>(0);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let interval: any;
    if (isDeepScanning) {
      setSeconds(0);
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.timing(scanAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
    } else {
      clearInterval(interval);
      pulseAnim.setValue(1);
      scanAnim.stopAnimation();
    }
    return () => clearInterval(interval);
  }, [isDeepScanning]);

  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 40 }}>
        
        <View className="mb-8 flex-row items-center justify-between">
          <Text className="font-anton text-4xl uppercase tracking-tight text-white">Diagnosis</Text>
        </View>

        <View className="my-6 items-center">
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={performDeepScan} 
            className={`h-52 w-52 items-center justify-center rounded-full border-4 ${isDeepScanning ? 'border-orange-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}`}
          >
            <MaterialCommunityIcons name={isDeepScanning ? 'radar' : 'magnify-scan'} size={60} color={isDeepScanning ? '#f97316' : 'white'} />
            <Text className="mt-2 font-anton text-lg uppercase text-white">{isDeepScanning ? 'Scanning...' : 'Start Scan'}</Text>
          </TouchableOpacity>
          
          {isDeepScanning && (
            <Animated.View style={{ opacity: pulseAnim }} className="mt-6 flex-row items-center justify-center">
              <View className="mr-2 h-2 w-2 rounded-full bg-orange-500" />
              <Text className="font-anton text-2xl tracking-[2px] text-white">
                {`${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}
              </Text>
            </Animated.View>
          )}
        </View>

        <View className="mt-10 gap-y-4">
          <Text className="mb-2 px-3 font-anton text-xl uppercase text-white">Available Modules</Text>
          <View className="relative">
            {isDeepScanning && <Animated.View style={{ transform: [{ translateY }], zIndex: 20 }} className="absolute left-0 right-0 h-[3px] bg-orange-500 shadow-lg shadow-orange-500" />}
            
            <DiagModule
              icon="engine"
              name="Engine (ECU)"
              status={isDeepScanning ? 'Scanning...' : detectedErrors.length > 0 ? `${detectedErrors.length} Codes Found` : 'No Issues'}
              color={isDeepScanning ? '#FACC15' : detectedErrors.length > 0 ? '#ff4444' : '#09ed11'}
              error={detectedErrors.length > 0}
              onPress={() => !isDeepScanning && navigation.navigate('ErrorDetail', { errors: detectedErrors })}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const DiagModule = ({ icon, name, status, color, error, onPress }: any) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} className="flex-row items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
    <View className="flex-1 flex-row items-center">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800">
        <MaterialCommunityIcons name={icon} size={24} color={error ? '#ef4444' : 'white'} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-bold text-lg text-white">{name}</Text>
        <Text style={{ color }} className="font-bold text-xs uppercase">{status}</Text>
      </View>
    </View>
    <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />
  </TouchableOpacity>
);