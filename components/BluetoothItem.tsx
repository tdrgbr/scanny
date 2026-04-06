import { Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface BluetoothItemProps {
  name: string;
  isLast?: boolean;
  onPress: () => void;
}

export const BluetoothItem = ({ name, isLast, onPress }: BluetoothItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center p-4 ${!isLast ? 'border-b border-zinc-800' : ''}`}>
    <View className="mr-3 w-10 items-center rounded-full bg-zinc-800 p-2">
      <FontAwesome name="bluetooth-b" size={20} color="white" />
    </View>
    <Text className="font-brico text-base text-white">{name}</Text>
  </TouchableOpacity>
);
