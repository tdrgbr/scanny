import notifee, { AndroidColor, AndroidImportance } from '@notifee/react-native';
import { useEffect, useRef, useState } from 'react';
import { useOBD } from '../hooks/OBDContext';
import { useBluetooth } from '../useBluetooth';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const clean = (raw: any): string => {
  const text = String(raw || "");
  return text.replace(/[^a-zA-Z0-9>]/g, "").toUpperCase();
};

const decodeDTC = (hexCode: string): string => {
  if (!hexCode || hexCode.length < 4) return "P0000";
  const firstChar = hexCode.charAt(0);
  const restOfCode = hexCode.substring(1);
  const prefixes: { [key: string]: string } = {
    '0': "P0", '1': "P1", '2': "P2", '3': "P3",
    '4': "C0", '5': "C1", '6': "C2", '7': "C3",
    '8': "B0", '9': "B1", 'A': "B2", 'B': "B3",
    'C': "U0", 'D': "U1", 'E': "U2", 'F': "U3"
  };
  return (prefixes[firstChar] || "P0") + restOfCode;
};

const extractDTCs = (rawResponse: string, expectedHeader: string): string[] => {
  const lines = rawResponse.split('\n');
  let hexData = "";

  for (let line of lines) {
    line = line.trim();
    if (!line || line.includes("NODATA") || line === "SEARCHING...") continue;

    if (line === "03" || line === "07") continue;

    if (/^[0-9A-Fa-f]{1,3}$/.test(line)) continue;

    line = line.replace(/^[0-9A-Fa-f]:/i, "");

    hexData += clean(line);
  }

  if (hexData.includes("NODATA")) return [];

  const idx = hexData.indexOf(expectedHeader);
  const codes: string[] = [];

  if (idx !== -1 && hexData.length >= idx + 6) {
    const dataString = hexData.substring(idx + 2);
    for (let i = 0; i < dataString.length; i += 4) {
      const chunk = dataString.substring(i, i + 4);
      if (chunk !== '0000' && chunk.length === 4) {
        codes.push(chunk);
      }
    }
  }
  return codes;
};

export const useOBDData = () => {
  const { stats, updateStats, lastRaw, setLastRaw } = useOBD();
  const { connectedDevice, setConfirmedDevice } = useBluetooth();
  
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [detectedErrors, setDetectedErrors] = useState<string[]>([]);

  const latestStatsRef = useRef(stats);
  useEffect(() => {
    latestStatsRef.current = stats;
  }, [stats]);

  const deepScanRequestRef = useRef(false); 
  const phaseRef = useRef("IDLE");
  const cycleCounter = useRef(0);
  const alertSent = useRef(false);
  const isRunningRef = useRef(false);
  const isActiveRef = useRef(true);

  useEffect(() => {
    const ticker = setInterval(() => {
      if (isActiveRef.current && connectedDevice) {
        if (latestStatsRef.current.rpm > 0) {
          updateStats({ runTime: (latestStatsRef.current.runTime || 0) + 1 });
        } else if (latestStatsRef.current.runTime !== 0) {
          updateStats({ runTime: 0 });
        }
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, [connectedDevice]);

  useEffect(() => {
    if (connectedDevice) {
      phaseRef.current = "IDLE";
    }
  }, [connectedDevice]);

  const sendOBDCommand = async (command: string, timeoutLimit: number): Promise<string> => {
    if (!connectedDevice || !isActiveRef.current) return "";

    try {
      const avail = await connectedDevice.available();
      if (avail > 0) await connectedDevice.read();

      await connectedDevice.write(command + "\r");
      
      let responseText = "";
      let timePassed = 0;
      
      while (timePassed < timeoutLimit && isActiveRef.current) {
        await wait(40); 
        timePassed += 40;
        const readData = await connectedDevice.read();
        
        if (readData && String(readData).length > 0) {
          responseText += String(readData);
          if (responseText.includes(">")) {
            return responseText.split('>').join('').trim();
          }
        }
      }
    } catch (e) {
      return "ERROR";
    }
    return "";
  };

  const fetchDiagnostic = async (command: string, expectedHeader: string): Promise<string> => {
    if (!connectedDevice) return "";
    for (let i = 0; i < 3; i++) { 
      const raw = await sendOBDCommand(command, 4000); 
      if (clean(raw).includes(expectedHeader)) return raw; 
      await wait(300); 
    }
    return "NODATA"; 
  };

  const updateForegroundService = async (temp: number) => {
    try {
      const isHot = temp >= 100;
      await notifee.displayNotification({
        id: 'obd_live_service',
        title: isHot ? 'ENGINE OVERHEATING' : 'Monitoring Active',
        body: `Coolant: ${temp}°C | RPM: ${latestStatsRef.current.rpm || 0}`,
        android: { 
          channelId: 'obd_monitoring', 
          ongoing: true,
          color: isHot ? AndroidColor.RED : '#f97316', 
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' }
        },
      });
    } catch (e) {}
  };

  const sendTemperatureAlert = async (temp: number) => {
    if (alertSent.current) return;
    try {
      await notifee.displayNotification({
        title: 'CRITICAL ALERT: ' + temp + '°C',
        body: 'Stop the vehicle. Engine temperature is critical.',
        android: { channelId: 'obd_alerts', importance: AndroidImportance.HIGH, smallIcon: 'ic_launcher' },
      });
      alertSent.current = true;
    } catch (e) {}
  };

  useEffect(() => {
    isActiveRef.current = true;
    
    if (!connectedDevice) {
      isRunningRef.current = false;
      return;
    }

    const run = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        if (phaseRef.current === "IDLE") {
          setLastRaw("INIT");
          await wait(500);
          await sendOBDCommand("ATZ", 2500);
          await wait(500);
          await sendOBDCommand("ATE0", 800);
          await sendOBDCommand("ATH0", 800);
          await sendOBDCommand("ATSP6", 1500);
          setLastRaw("CONNECTED");
          phaseRef.current = "POLLING"; 
        }

        while (isActiveRef.current && connectedDevice) {
          
          if (deepScanRequestRef.current) {
            setIsDeepScanning(true);
            try {
              const r03 = await fetchDiagnostic("03", "43");
              const c03 = extractDTCs(r03, "43");
              const r07 = await fetchDiagnostic("07", "47");
              const c07 = extractDTCs(r07, "47");
              setDetectedErrors([...new Set([...c03, ...c07])].map(c => decodeDTC(c)));
            } catch (e) {}
            setIsDeepScanning(false);
            deepScanRequestRef.current = false;
            continue;
          }

          cycleCounter.current++;
          const cycleStats: any = {};
          
          let isEngineRunning = latestStatsRef.current.rpm > 0;

          // 1. RPM
          const rRPM = await sendOBDCommand("010C", 800);
          if (rRPM === "ERROR") { setConfirmedDevice(null); break; }

          const cRPM = clean(rRPM);
          const rpmIdx = cRPM.indexOf("410C");
          if (rpmIdx !== -1 && cRPM.length >= rpmIdx + 8) {
            const val = parseInt(cRPM.substring(rpmIdx + 4, rpmIdx + 8), 16);
            if (!isNaN(val)) {
              cycleStats.rpm = Math.floor(val / 4);
              isEngineRunning = cycleStats.rpm > 0;
            }
          } 

          // 2. Throttle
          if (cycleCounter.current % 2 === 0) {
            const rThr = await sendOBDCommand("0111", 800);
            const cThr = clean(rThr);
            const thrIdx = cThr.indexOf("4111");
            if (thrIdx !== -1 && cThr.length >= thrIdx + 6) {
              const val = parseInt(cThr.substring(thrIdx + 4, thrIdx + 6), 16);
              if (!isNaN(val)) cycleStats.throttle = Math.round((val * 100) / 255);
            }
          }

          if (isEngineRunning) {
            // 3. Speed
            const rSpd = await sendOBDCommand("010D", 800);
            const cSpd = clean(rSpd);
            let currentSpeed = 0;
            const spdIdx = cSpd.indexOf("410D");
            if (spdIdx !== -1 && cSpd.length >= spdIdx + 6) {
              const val = parseInt(cSpd.substring(spdIdx + 4, spdIdx + 6), 16);
              if (!isNaN(val)) { cycleStats.speed = val; currentSpeed = val; }
            }

            // 4. Instant Fuel
            const rMaf = await sendOBDCommand("0110", 800);
            const cMaf = clean(rMaf);
            const mafIdx = cMaf.indexOf("4110");
            if (mafIdx !== -1 && cMaf.length >= mafIdx + 8) {
              const val = parseInt(cMaf.substring(mafIdx + 4, mafIdx + 8), 16) / 100;
              if (!isNaN(val)) {
                const lph = (val * 3600) / (14.7 * 737);
                cycleStats.instantFuel = currentSpeed > 5 ? (lph * 100) / currentSpeed : lph;
              }
            }

            // 5. Engine Load
            const rL = await sendOBDCommand("0104", 800);
            const cL = clean(rL);
            const lIdx = cL.indexOf("4104");
            if (lIdx !== -1 && cL.length >= lIdx + 6) {
              const val = parseInt(cL.substring(lIdx + 4, lIdx + 6), 16);
              if (!isNaN(val)) cycleStats.load = Math.round((val * 100) / 255);
            }

            // 6. Time Sync
            if (cycleCounter.current === 1 || cycleCounter.current % 50 === 0) {
              const rTime = await sendOBDCommand("011F", 800);
              const cTime = clean(rTime);
              const timeIdx = cTime.indexOf("411F");
              if (timeIdx !== -1 && cTime.length >= timeIdx + 8) {
                const A = parseInt(cTime.substring(timeIdx + 4, timeIdx + 6), 16);
                const B = parseInt(cTime.substring(timeIdx + 6, timeIdx + 8), 16);
                if (!isNaN(A) && !isNaN(B)) cycleStats.runTime = (A * 256) + B;
              }
            }
          }

          // 7. Coolant
          if (cycleCounter.current % 5 === 0) {
            const rT = await sendOBDCommand("0105", 800);
            const cT = clean(rT);
            const tIdx = cT.indexOf("4105");
            if (tIdx !== -1 && cT.length >= tIdx + 6) {
              const hexVal = cT.substring(tIdx + 4, tIdx + 6);
              const temp = parseInt(hexVal, 16) - 40;
              if (!isNaN(temp)) {
                cycleStats.coolant = temp;
                updateForegroundService(temp);
                if (temp >= 100) sendTemperatureAlert(temp);
                else if (temp < 96) alertSent.current = false;
              }
            }
          }

          // 8. Voltage
          if (cycleCounter.current % 15 === 0) {
            const rV = await sendOBDCommand("ATRV", 800);
            const match = rV.match(/\d{1,2}\.\d{1,2}/);
            if (match && match[0]) {
              const parsedV = parseFloat(match[0]);
              if (!isNaN(parsedV) && parsedV >= 8.0 && parsedV <= 16.0) {
                cycleStats.voltage = parsedV;
              }
            }
          }

          if (Object.keys(cycleStats).length > 0 && isActiveRef.current) {
            updateStats(cycleStats);
          }
          
          setLastRaw(isEngineRunning ? "P:" + cycleCounter.current : "ECU ASLEEP");
          await wait(80); 
        }
      } catch (error) {
        setLastRaw("FAILED");
        phaseRef.current = "IDLE";
        setConfirmedDevice(null);
      } finally {
        isRunningRef.current = false;
      }
    };

    run();
    return () => { isActiveRef.current = false; };
  }, [connectedDevice]);

  return { ...stats, lastRaw, performDeepScan: () => { deepScanRequestRef.current = true; }, isDeepScanning, detectedErrors };
};