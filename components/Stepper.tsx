import React from 'react';
import { View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface StepperProps {
  currentStep: 1 | 2 | 3;
}

export const Stepper = ({ currentStep }: StepperProps) => {
  return (
    <View className="flex-row items-center justify-center">
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          currentStep >= 1
            ? 'h-12 w-12 bg-orange-500 shadow-lg shadow-orange-500/30'
            : 'border border-zinc-800 bg-zinc-900'
        }`}>
        <FontAwesome name="rss" size={20} color={currentStep >= 1 ? 'white' : '#444'} />
      </View>

      <View className={`mx-2 h-[1px] w-10 ${currentStep >= 2 ? 'bg-orange-500' : 'bg-zinc-800'}`} />

      <View
        className={`h-10 w-10 items-center justify-center rounded-full border ${
          currentStep >= 2
            ? 'h-12 w-12 bg-orange-500 shadow-lg shadow-orange-500/30'
            : 'border-zinc-800 bg-zinc-900'
        }`}>
        <FontAwesome name="user" size={16} color={currentStep >= 2 ? 'white' : '#444'} />
      </View>

      <View className={`mx-2 h-[1px] w-10 ${currentStep >= 3 ? 'bg-orange-500' : 'bg-zinc-800'}`} />

      <View
        className={`h-10 w-10 items-center justify-center rounded-full border ${
          currentStep === 3
            ? 'h-12 w-12 bg-orange-500 shadow-lg shadow-orange-500/30'
            : ' border-zinc-800 bg-zinc-900'
        }`}>
        <FontAwesome name="wrench" size={16} color={currentStep === 3 ? 'white' : '#444'} />
      </View>
    </View>
  );
};
