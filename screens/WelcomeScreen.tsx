import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const savedId = await AsyncStorage.getItem('@last_obd_id');
        
        if (savedId) {
          navigation.replace('OBDScan');
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ImageBackground
        source={require('../assets/bgcar.jpg')}
        className="flex-1"
        resizeMode="cover">
        <View className="flex-1 bg-black/40">
          <View
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
            className="flex-1 justify-between">
            <View className="mt-16 items-center">
              <Text
                style={{ includeFontPadding: false, lineHeight: 65 }}
                className="font-anton px-6 text-center text-5xl uppercase tracking-tighter text-white">
                Welcome to Scanny!
              </Text>
              <View className="mt-4 h-[3px] w-16 bg-orange-500" />
              <Text className="font-brico mt-6 text-lg uppercase tracking-widest text-zinc-300">
                Your car's best friend.
              </Text>
            </View>

            <View className="px-8">
              <TouchableOpacity
                onPress={() => navigation.navigate('Connect')}
                activeOpacity={0.9}
                className="w-full items-center rounded-2xl bg-zinc-100 py-5 shadow-2xl shadow-white/10">
                <Text className="font-anton text-2xl uppercase tracking-wide text-zinc-900">
                  Get started
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default WelcomeScreen;