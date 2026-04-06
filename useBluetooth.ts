import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

let globalConnectedDevice: BluetoothDevice | null = null;
let isConnectingGlobal = false; 

export const useBluetooth = () => {
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(globalConnectedDevice);
  const [foundDevices, setFoundDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const sync = setInterval(() => {
      if (globalConnectedDevice && connectedDevice?.address !== globalConnectedDevice.address) {
        setConnectedDevice(globalConnectedDevice);
      } else if (!globalConnectedDevice && connectedDevice) {
        setConnectedDevice(null);
      }
    }, 500);

    const onDisconnect = RNBluetoothClassic.onDeviceDisconnected(() => {
        globalConnectedDevice = null;
        setConnectedDevice(null);
    });

    return () => { clearInterval(sync); onDisconnect.remove(); };
  }, [connectedDevice]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const perms = Platform.Version >= 31 
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const granted = await PermissionsAndroid.requestMultiple(perms);
      return Object.values(granted).every(res => res === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;
  };

  const scanAndConnect = async () => {
    if (isScanning || !(await requestPermissions())) return;
    setIsScanning(true);
    try {
      const paired = await RNBluetoothClassic.getBondedDevices();
      setFoundDevices(paired.map(d => ({ id: d.address, name: d.name, address: d.address, type: "Paired" })));
    } catch (e) { 
    } finally { 
      setIsScanning(false); 
    }
  };

  const disconnect = async () => {
    if (globalConnectedDevice) {
      try { await globalConnectedDevice.disconnect(); } catch (e) {}
      globalConnectedDevice = null;
      setConnectedDevice(null);
    }
  };

  const connectToDevice = async (mac: string, baudRate = 38400) => {
    if (isConnectingGlobal) return null;
    try {
      isConnectingGlobal = true;
      try { await RNBluetoothClassic.cancelDiscovery(); } catch (e) {}
      let device = null;

      let connectionOptions = {
        connectorType: "rfcomm",
        secure: true,
        connectionTimeout: 8000,
        delimiter: "", 
        DELIMITER: "", 
        charset: "ascii"
      };

      try {
        device = await RNBluetoothClassic.connectToDevice(mac, connectionOptions);
      } catch (errSecure: any) {
        connectionOptions.secure = false;
        device = await RNBluetoothClassic.connectToDevice(mac, connectionOptions);
      }
      return device || null;

    } catch (e: any) {
      return null;
    } finally {
      isConnectingGlobal = false;
    }
  };

  const setConfirmedDevice = (device: BluetoothDevice | null) => {
    globalConnectedDevice = device;
    setConnectedDevice(device);
  };

  return { scanAndConnect, connectToDevice, disconnect, setConfirmedDevice, foundDevices, connectedDevice, isScanning };
};