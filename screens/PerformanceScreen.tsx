import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOBDData } from '../hooks/useOBDData';
import { useBluetooth } from '../useBluetooth';

export default function PerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { connectedDevice } = useBluetooth();
  const obd = useOBDData();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isWaitingForStart, setIsWaitingForStart] = useState<boolean>(false);
  
  const [userRedline, setUserRedline] = useState<number>(7000);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [tempRedline, setTempRedline] = useState<string>('7000');

  const [time0to100, setTime0to100] = useState<number | null>(null);
  const [time402m, setTime402m] = useState<number | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [activeTime, setActiveTime] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const speedRef = useRef(0);
  const distanceRef = useRef(0);

  const speed = obd.speed || 0;
  const rpm = obd.rpm || 0;
  const coolantTemp = obd.coolant || 0;
  const isEngineCold = coolantTemp > 0 && coolantTemp < 70;

  const activeRedline = isEngineCold ? 3000 : userRedline;
  const maxRpmScale = userRedline + 2000;
  const orangeZoneStart = activeRedline - 1500;

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (isWaitingForStart && speed > 0) {
      setIsWaitingForStart(false);
      setIsRecording(true);
    }
  }, [speed, isWaitingForStart]);

  useEffect(() => {
    if (isRecording) {
      distanceRef.current = 0;
      const startTime = Date.now();
      let lastTick = startTime;
      let finished0to100 = false;
      let finished402m = false;

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const dtSeconds = (now - lastTick) / 1000; 
        lastTick = now;

        const currentElapsed = (now - startTime) / 1000;
        setActiveTime(currentElapsed);

        const currentSpeedMs = speedRef.current / 3.6;
        distanceRef.current += currentSpeedMs * dtSeconds;
        setCurrentDistance(distanceRef.current);

        if (!finished0to100 && speedRef.current >= 100) {
          finished0to100 = true;
          setTime0to100(currentElapsed);
        }

        if (!finished402m && distanceRef.current >= 402.336) { 
          finished402m = true;
          setTime402m(currentElapsed);
        }

        if (finished0to100 && finished402m && timerRef.current) {
          clearInterval(timerRef.current);
          setIsRecording(false);
        }
      }, 50); 
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const saveConfig = () => {
    const val = parseInt(tempRedline);
    if (!isNaN(val) && val >= 4000 && val <= 13000) {
      setUserRedline(val);
      setShowConfig(false);
    } else {
      Alert.alert('Error', 'Enter a Redline between 4000 and 13000 RPM');
    }
  };

  const handleStartAttempt = () => {
    if (!connectedDevice) {
      Alert.alert('Error', 'Connect the OBDII scanner first!');
      return;
    }
    if (speed > 0) {
      Alert.alert('Vehicle in motion', 'Stop the vehicle completely to initialize the timer.');
      return;
    }
    setTime0to100(null);
    setTime402m(null);
    setCurrentDistance(0);
    setActiveTime(0);
    distanceRef.current = 0;
    
    setIsWaitingForStart(true);
  };

  const resetSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsWaitingForStart(false);
    setTime0to100(null);
    setTime402m(null);
    setCurrentDistance(0);
    setActiveTime(0);
  };

  const formatTime = (time: number | null, isRunning: boolean, currentLive: number) => {
    if (time !== null) return `${time.toFixed(2)}s`;
    if (isRunning) return `${currentLive.toFixed(2)}s`;
    return '--.--';
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <Modal visible={showConfig} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/80 px-8">
          <View className="w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <Text className="mb-4 font-anton text-xl uppercase text-white">Set Redline Threshold</Text>
            <TextInput
              className="mb-6 rounded-xl bg-zinc-800 p-4 font-anton text-2xl text-white"
              keyboardType="numeric"
              value={tempRedline}
              onChangeText={setTempRedline}
            />
            <View className="flex-row gap-x-3">
              <TouchableOpacity onPress={() => setShowConfig(false)} className="flex-1 rounded-xl bg-zinc-800 py-4">
                <Text className="text-center font-anton uppercase text-zinc-400">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveConfig} className="flex-1 rounded-xl bg-orange-500 py-4">
                <Text className="text-center font-anton uppercase text-black">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 40 }}>
        
        <View className="mb-8 flex-row items-center justify-between">
          <Text className="font-anton text-4xl uppercase tracking-tight text-white">Performance</Text>
          <View className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2">
            <Text className={`font-anton text-xs ${isEngineCold ? 'text-blue-400' : 'text-green-500'}`}>
              {coolantTemp > 0 ? `${coolantTemp}°C` : '--°C'}
            </Text>
          </View>
        </View>

        <View className="relative mb-8 items-center justify-center rounded-[40px] border border-zinc-800 bg-zinc-900/30 py-10">
          <TouchableOpacity onPress={() => setShowConfig(true)} className="absolute right-6 top-4 h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/50">
            <MaterialCommunityIcons name="cog-outline" size={16} color="white" />
          </TouchableOpacity>

          {isEngineCold && (
            <View className="absolute top-4 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">
              <Text className="font-brico-bold text-[8px] uppercase text-blue-500">Cold Engine: Limited to 3000 RPM</Text>
            </View>
          )}

          <View className="items-center">
            <Text className="font-anton text-8xl tracking-tighter text-white">
              {speed}
              <Text className="text-[16px] text-zinc-500"> KM/H</Text>
            </Text>
          </View>

          <View className="mt-10 w-full px-8">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-anton text-2xl text-white">
                {rpm} <Text className="text-lg text-zinc-600">RPM</Text>
              </Text>
            </View>
            <View className="h-8 w-full flex-row items-center justify-between">
              {[...Array(20)].map((_, i) => {
                const step = maxRpmScale / 20;
                const currentStepRpm = i * step;
                const isActive = rpm >= currentStepRpm;
                const isRedLineZone = currentStepRpm >= activeRedline;
                const isOrangeZone = currentStepRpm >= orangeZoneStart && currentStepRpm < activeRedline;

                let color = '#1a1a1a';
                if (isActive) {
                  if (isRedLineZone) color = '#ef4444';
                  else if (isOrangeZone) color = '#ffff00';
                  else color = '#3b82f6';
                }

                return (
                  <View
                    key={i}
                    style={{
                      width: '4.5%',
                      height: '100%',
                      backgroundColor: color,
                      borderRadius: 2,
                      opacity: isActive ? 1 : 0.2,
                      borderTopWidth: 3,
                      borderTopColor: isRedLineZone ? '#ef4444' : isOrangeZone ? '#ffff00' : '#3b82f6',
                      shadowColor: color,
                      shadowOpacity: isActive ? 0.8 : 0,
                      shadowRadius: isRedLineZone ? 10 : 4,
                    }}
                  />
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={isRecording || isWaitingForStart ? resetSession : handleStartAttempt}
          className={`mb-8 w-full flex-row items-center justify-center rounded-[30px] border-2 py-6 ${isRecording || isWaitingForStart ? 'border-red-500/40 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
          <MaterialCommunityIcons name={isRecording || isWaitingForStart ? 'stop-circle-outline' : 'flag-checkered'} size={24} color={isRecording || isWaitingForStart ? '#ef4444' : 'white'} />
          <Text className={`ml-4 font-anton text-xl uppercase ${isRecording || isWaitingForStart ? 'text-red-500' : 'text-white'}`}>
            {isWaitingForStart ? 'Waiting to launch...' : isRecording ? 'Stop Run' : 'Start Drag Timer'}
          </Text>
        </TouchableOpacity>

        <View className="mb-4 flex-row items-center justify-between px-1">
          <Text className="font-anton text-xl uppercase text-white">Run Results</Text>
          <Text className="font-brico-bold text-xs uppercase text-orange-500">
            Distance: {currentDistance.toFixed(1)}m
          </Text>
        </View>
        
        <View className="flex-row gap-x-4">
          <DragCard 
            label="0-100 km/h" 
            time={formatTime(time0to100, isRecording && !time0to100, activeTime)} 
            isDone={time0to100 !== null} 
            icon="lightning-bolt" 
          />
          <DragCard 
            label="402m" 
            time={formatTime(time402m, isRecording && !time402m, activeTime)} 
            isDone={time402m !== null} 
            icon="road-variant" 
          />
        </View>

      </ScrollView>
    </View>
  );
}

function DragCard({ label, time, isDone, icon }: any) {
  return (
    <View className={`flex-1 rounded-[32px] border ${isDone ? 'border-orange-500/50 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/40'} p-5`}>
      <MaterialCommunityIcons name={icon} size={20} color={isDone ? "#f97316" : "#71717a"} />
      <Text className="mt-3 font-brico text-[9px] uppercase tracking-widest text-zinc-500">{label}</Text>
      <Text className={`mt-1 font-anton text-4xl ${isDone ? 'text-orange-500' : 'text-white'}`}>{time}</Text>
    </View>
  );
}