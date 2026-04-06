<img width="831" height="876" alt="icon" src="https://github.com/user-attachments/assets/b15ab4f3-a0c3-49ba-a381-d1044879bab1" />
#Scanny

GitHub: https://github.com/tdrgbr/scanny

Scanny is a vehicle monitoring mobile app built with React Native, TypeScript, and Expo, designed to connect directly to a car's Engine Control Unit (ECU) via Bluetooth. The goal of the project is to read live engine data and diagnostic trouble codes.

### Used technologies

* Framework: React Native (Expo)
* Language: TypeScript
* UI: Nativewind
* Background Services: Notifee
* Hardware Required: Android device and ELM327 OBD-II Bluetooth adapter

### Features

**Live Dashboard**
* Translates raw hex messages from the CAN bus into real-world values.
* Displays live metrics such as RPM, Speed, Coolant Temp, and Engine Load.

**Background Safety Alerts**
* Constantly monitors engine sensors in the background.
* Pushes instant notifications to the phone if a critical threshold (like overheating) is reached.

**Fault Code Diagnostics**
* Queries the ECU directly to read and interpret Diagnostic Trouble Codes (DTCs).
* Helps identify the specific cause of a check engine light.

**Bluetooth Connection Management**
* Includes a custom manager to handle frequent serial connection dropouts from generic adapters.
* Automatically reconnects and resyncs the data stream in the background without freezing the UI.

**Performance Tracking**
* Uses high-frequency speed data pulled directly from the ECU.
* Includes a built-in timer for 0-100 km/h and 1/4 mile runs.

### Screenshots & Video
![1000066020](https://github.com/user-attachments/assets/f03d99e4-faff-4dda-b6f3-84af533386a8)
![1000066013](https://github.com/user-attachments/assets/ca85a32d-806f-459a-9e3d-409a224422b5)
![1000066012](https://github.com/user-attachments/assets/55b40a23-0e13-4d5a-b173-af230dbf03b6)
![1000066010](https://github.com/user-attachments/assets/40a53b17-72c9-4423-ae00-f87666081a6d)
![1000066005](https://github.com/user-attachments/assets/ebc70c2f-6cb3-486e-8e9a-90710e57e7a9)
![1000066021](https://github.com/user-attachments/assets/7c3aba10-dde8-499c-93cb-77023ddfcd5b)
https://github.com/user-attachments/assets/b6b3b654-7e11-49eb-b0be-f1676c7b4d86


