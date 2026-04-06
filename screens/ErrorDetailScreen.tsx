import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBluetooth } from '../useBluetooth';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DTC_LIBRARY: any = {
  'P0103': { title: 'Mass Air Flow (MAF) Circuit High', desc: 'The MAF sensor is sending a voltage that is too high to the ECU.', causes: ['Defective MAF sensor', 'Shorted wiring', 'Clogged air filter'], fix: 'Check the MAF sensor connector or replace the sensor.' },
  'P0010': { title: 'Camshaft Position (A) Actuator Circuit', desc: 'Issues with the VVT solenoid control circuit.', causes: ['Defective solenoid', 'Low oil level', 'Broken wiring'], fix: 'Check engine oil level and control solenoid resistance.' },
  'P0100': { title: 'MAF Sensor Circuit Malfunction', desc: 'ECU is not receiving a valid signal from the Mass Air Flow sensor.', causes: ['Disconnected sensor', 'Blown fuse', 'Dirty MAF sensor'], fix: 'Clean the sensor with specialized MAF spray or check the power supply.' },
  'P1000': { title: 'Monitor Testing Incomplete', desc: 'Internal diagnostic tests (Readiness Monitors) have not completed.', causes: ['Battery disconnected recently', 'Codes cleared recently'], fix: 'Not a critical error. Disappears after completing a mixed driving cycle.' },
  'P0300': { title: 'Random/Multiple Cylinder Misfire Detected', desc: 'Ignition misfire error on random cylinders.', causes: ['Worn spark plugs', 'Defective ignition coils', 'Vacuum leak'], fix: 'Inspect and replace spark plugs or coils.' }
};

export default function ErrorDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { connectedDevice } = useBluetooth();
  
  const { moduleName, errors: rawErrorCodes } = route.params || { moduleName: 'Engine', errors: [] };
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorList, setErrorList] = useState<any[]>([]);

  useEffect(() => {
    if (rawErrorCodes) {
      const detailedErrors = rawErrorCodes.map((code: string, index: number) => {
        const info = DTC_LIBRARY[code] || { title: 'Unknown Code', desc: 'Manufacturer-specific code.', causes: ['Search code online for specific details'], fix: 'Consult the service manual.' };
        return { id: String(index), code, ...info, status: 'Stored' };
      });
      setErrorList(detailedErrors);
    }
  }, [rawErrorCodes]);

  const executeDeletion = async (id?: string) => {
    if (!connectedDevice) return;
    setIsDeleting(true);
    
    try {
      await connectedDevice.write("04\r");
      
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (id) {
          setErrorList(prev => prev.filter(err => err.id !== id));
        } else {
          setErrorList([]);
        }
        setIsDeleting(false);
        Alert.alert("OBDII", "DTCs deleted!");
      }, 2500);
    } catch (e) {
      setIsDeleting(false);
      Alert.alert("Error", "Communication with the ECU failed.");
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Warning!', 'Clearing codes only turns off the engine light. If the underlying part is still broken, the error will return on the next drive.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Code', style: 'destructive', onPress: () => executeDeletion(id) },
    ]);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <Modal transparent visible={isDeleting} animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/80">
          <View className="items-center rounded-[40px] border border-zinc-800 bg-zinc-900 p-10">
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="mt-6 font-anton text-xl uppercase tracking-widest text-white">Communicating...</Text>
            <Text className="mt-2 font-brico text-[10px] uppercase italic text-zinc-500">Resetting DTC Memory</Text>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 60 }}>
        
        <View className="mb-10 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <View className="items-end">
            <Text className="font-anton text-2xl uppercase text-white">{moduleName || 'Engine'}</Text>
            <Text className={`font-brico-bold text-[10px] uppercase ${errorList.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {errorList.length > 0 ? `${errorList.length} Codes Found` : 'System Clean'}
            </Text>
          </View>
        </View>

        <View className="gap-y-6">
          {errorList.length > 0 ? errorList.map(error => (
            <ErrorCard 
              key={error.id} 
              error={error} 
              isExpanded={expandedId === error.id} 
              onExpand={() => { 
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
                setExpandedId(expandedId === error.id ? null : error.id); 
              }} 
              onDelete={() => confirmDelete(error.id)} 
            />
          )) : (
            <View className="mt-20 items-center">
              <MaterialCommunityIcons name="shield-check" size={80} color="#09ed11" />
              <Text className="mt-6 text-center font-anton text-2xl uppercase text-white">No Stored Codes</Text>
            </View>
          )}
        </View>

        {errorList.length > 0 && (
          <TouchableOpacity onPress={() => executeDeletion()} className="mt-12 items-center justify-center border-t border-zinc-900 py-6">
            <Text className="font-anton text-lg uppercase text-red-500">Clear All Codes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function ErrorCard({ error, isExpanded, onExpand, onDelete }: any) {
  return (
    <View className="relative">
      <View className="absolute bottom-0 right-0 top-0 w-full flex-row items-center justify-end rounded-[35px] bg-red-600 px-10">
        <MaterialCommunityIcons name="trash-can-outline" size={30} color="white" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={120} decelerationRate="fast">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onExpand} 
          style={{ width: 342 }} 
          className={`rounded-[35px] border ${isExpanded ? 'border-orange-500/50' : 'border-zinc-800'} bg-[#0F0F0F] p-6 shadow-xl`}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="font-anton text-4xl tracking-tighter text-white">{error.code}</Text>
              <View className="mt-2 self-start rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1">
                <Text className="font-brico-bold text-[8px] uppercase text-red-500">{error.status}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#3f3f46" />
          </View>

          <Text className="mt-4 font-brico-bold text-lg text-white">{error.title}</Text>
          <Text className="mt-1 font-brico text-sm text-zinc-500">{error.desc}</Text>

          {isExpanded && (
            <View className="mt-6 border-t border-zinc-800 pt-6">
              <Text className="mb-3 font-anton text-[10px] uppercase text-orange-500">Possible Causes:</Text>
              {error.causes.map((cause: string, i: number) => (
                <View key={i} className="mb-2 flex-row items-center">
                  <View className="mr-3 h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <Text className="font-brico text-sm text-zinc-400">{cause}</Text>
                </View>
              ))}
              <View className="mt-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4">
                <Text className="font-brico-bold text-[10px] text-zinc-500 uppercase mb-1">Suggested Fix:</Text>
                <Text className="font-brico text-sm text-zinc-300 italic">{error.fix}</Text>
              </View>
            </View>
          )}
          <Text className="mt-6 font-brico text-[9px] uppercase text-zinc-700">
            {isExpanded ? 'Collapse' : 'Details / Swipe left to clear'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} className="h-full w-[120px]" />
      </ScrollView>
    </View>
  );
}