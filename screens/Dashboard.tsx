import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useOBDData } from '../hooks/useOBDData';
import { useBluetooth } from '../useBluetooth';

const INFO_DETAILS = {
  'Coolant': { 
    title: 'Cooling System', 
    desc: 'Monitors the temperature of the fluid circulating through the engine. The optimal operating range is between 85°C and 100°C.', 
    warning: 'If it exceeds 100°C, pull over and check the cooling fans/fluid level.' 
  },
  'Battery Voltage': { 
    title: 'Electrical System', 
    desc: 'Indicates the live voltage supplied by the alternator while the engine is running.', 
    warning: 'A reading below 13V while running usually indicates a failing alternator.' 
  },
  'Engine Load': { 
    title: 'Engine Load', 
    desc: 'The percentage of power currently being used relative to the engine\'s peak capacity.', 
    warning: 'Running constantly at 100% load will cause premature engine wear.' 
  }
};

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { connectedDevice } = useBluetooth();
  const obd = useOBDData();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState({ title: '', desc: '', warning: '' });

  const formatRunTime = (totalSeconds: number) => {
    if (!totalSeconds) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const openInfo = (label: string) => {
    const info = INFO_DETAILS[label as keyof typeof INFO_DETAILS];
    if (info) { setSelectedInfo(info); setModalVisible(true); }
  };

  const getDynamicColor = (value: number, low: number, high: number) => {
    if (value < low) return '#3b82f6';
    if (value <= high) return '#09ed11';
    return '#ff0000';
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} style={{ paddingTop: insets.top }}>
        
        <View className="mt-6 flex-row items-center justify-between px-6">
          <View className="flex-1">
            <Text className="font-anton text-4xl uppercase leading-tight text-white">My vehicle</Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-center rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <MaterialCommunityIcons name="wind-power" size={24} color={obd.throttle > 90 ? "#ff0000" : "#09ed11"} />
              <Text className="ml-2 font-brico-bold text-lg text-white">
                {obd.throttle > 0 ? `${obd.throttle}%` : 'No data'}
              </Text>
            </View>
          </View>
        </View>

        <View className="relative mt-5 min-h-[400px] justify-center">
          <View className="z-10 w-[100%] gap-y-3 px-6">
            <StatusBadge 
              color={connectedDevice ? "#4ADE80" : "#ff0000"} 
              text="OBD Connection" 
              subtext={connectedDevice ? "Connected" : "Disconnected"} 
            />

            <StatusBadge color="#4ADE80" text="Engine Run Time" subtext={formatRunTime(obd.runTime)} />
            
            <StatusBadge
              color={obd.coolant < 50 ? "#15a2fa" : obd.coolant < 105 ? "#4ADE80" : "#ff0000"}
              text="Vehicle Status"
              subtext={obd.coolant > 100 ? 'Overheating!' : obd.coolant < 70 ? 'Warming up...' : 'Optimal Temp'} 
            />

            <StatusBadge 
              color="#FACC15" 
              text="Instant Fuel" 
              subtext={`${Math.min(99.9, obd.instantFuel || 0).toFixed(1)} ${obd.speed > 5 ? "L/100km" : "L/h"}`} 
            />
          </View>

          <LinearGradient
            colors={['transparent', '#0A0A0A']}
            start={{ x: 0.4, y: 0 }}
            end={{ x: 0.85, y: 0 }}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 15 }}
          />

          <View pointerEvents="none" className="absolute -right-40 bottom-0 top-0 z-20 justify-center">
            <Image source={require('../assets/car.jpg')} className="h-80 w-96" resizeMode="contain" />
          </View>
        </View>

        {!connectedDevice && (
          <View className='px-6'>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Connect')}
              className="flex-row items-center justify-between rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 active:bg-orange-500/20"
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="swap-horizontal" size={20} color="#f97316" />
                <Text className="ml-3 font-brico-bold text-orange-500 uppercase">Change Device</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#f97316" />
            </TouchableOpacity>
          </View>
        )}

        <View className="px-6 mt-4">
          <Text className="mb-5 font-anton text-xl text-white uppercase">Live Data</Text>
          <View className="flex-row flex-wrap justify-between">
            <BigGauge icon="thermometer" value={`${obd.coolant}°C`} label="Coolant" color={getDynamicColor(obd.coolant, 80, 100)} percentage={obd.coolant} onPress={() => openInfo('Coolant')} />
            <BigGauge icon="speedometer" value={`${obd.speed}KM/H`} label="Speed" color="#3b82f6" percentage={(obd.speed / 260) * 100} />
            <View className="mt-4 w-full flex-row justify-between">
              <BigGauge icon="flash" value={`${obd.voltage.toFixed(1)}V`} label="Battery Voltage" color={obd.voltage < 12.8 ? "#FACC15" : "#4ADE80"} percentage={(obd.voltage / 15) * 100} onPress={() => openInfo('Battery Voltage')} />
              <BigGauge icon="engine-outline" value={`${obd.load}%`} label="Engine Load" color="#a855f7" percentage={obd.load} onPress={() => openInfo('Engine Load')} />
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/80 px-6" onPress={() => setModalVisible(false)}>
          <View className="w-full rounded-[40px] border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <MaterialCommunityIcons name="information-variant" size={24} color="#fff" />
              </View>
              <Text className="ml-4 font-anton text-2xl uppercase text-white">{selectedInfo.title}</Text>
            </View>
            <Text className="font-brico text-lg leading-7 text-zinc-300">{selectedInfo.desc}</Text>
            <View className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
               <Text className="font-brico-bold text-red-400">Tech Note:</Text>
               <Text className="mt-1 font-brico text-sm text-red-200/80">{selectedInfo.warning}</Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} className="mt-8 items-center rounded-2xl bg-zinc-800 py-4">
              <Text className="font-brico-bold text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const StatusBadge = ({ color, text, subtext }: any) => (
  <View className="rounded-2xl border-l-4 bg-zinc-900/90 p-4 shadow-sm" style={{ borderLeftColor: color }}>
    <Text className="font-brico text-[10px] uppercase text-zinc-500">{text}</Text>
    <Text className="font-brico text-lg text-white">{subtext}</Text>
  </View>
);

const BigGauge = ({ icon, value, label, color, percentage, onPress }: any) => {
  const size = 70;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safePercentage = Math.max(0, Math.min(Number(percentage) || 0, 100));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="w-[48%] items-center rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <View className="mb-3 items-center justify-center">
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#27272a" strokeWidth={strokeWidth} fill="transparent" />
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="transparent" rotation="-90" origin={`${size / 2}, ${size / 2}`} />
        </Svg>
        <View className="absolute">
          <MaterialCommunityIcons name={icon as any} size={26} color="white" />
        </View>
      </View>
      <Text className="font-anton text-2xl text-white">{value}</Text>
      <Text className="mt-1 text-center font-brico text-[10px] uppercase tracking-tighter text-zinc-500">{label}</Text>
    </TouchableOpacity>
  );
};