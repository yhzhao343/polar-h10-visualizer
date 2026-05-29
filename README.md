# polar-h10-visualizer

A real-time physiological data visualizer and streaming pipeline. The system acquires data (ECG, Accelerometer, Respiration Force, and Breathing Rate) in the browser via Web Bluetooth and the Vernier Go Direct API, archives it locally as structured Apache Arrow files, and streams it instantly into Lab Streaming Layer (LSL) via a local WebSocket bridge. See it in action [here](https://yhzhao343.github.io/polar-h10-visualizer/)

[![Watch the video](https://img.youtube.com/vi/kCUuH8LL9HA/maxresdefault.jpg)](https://youtu.be/kCUuH8LL9HA){:height="100px" width="234px"}


## Project Structure
```
.
├── build/                           # Compiled frontend web assets
├── server_side
│   ├── lsl_bridge/                  # Real-time WebSocket-to-LSL daemon
│   │   ├── lsl_bridge.js
│   │   └── package.json
│   └── arrow_to_lsl_replay/         # Session archive replay player
│       ├── replay_arrow.js
│       └── package.json
├── src/                             # TypeScript frontend source code
└── package.json                     # Frontend build configurations
```

## Installation & Build

### 0. Node.js install

#### Linux/Mac Setup:

Recommend using `nvm` to set up and install node.js ([link](https://github.com/nvm-sh/nvm)). Follow the installation guide in the link. Refresh or restart your shell after the install, and then install the latest Long-Term Support (LTS) version of node.js:

```Bash
nvm install --lts
nvm use --lts
```

#### Windows Setup:
Windows uses a separate, native implementation called nvm-windows ([link](https://github.com/coreybutler/nvm-windows/releases)). Follow the installation guide in the link.


```powershell
nvm install lts
nvm use lts
```

Note: The first time you run nvm use, Windows may prompt you with a User Account Control (UAC) pop-up to approve the creation of the dynamic Node symlink.


### 1. Frontend Setup

From the project root directory:

```Bash
npm install
npm run build      # Compiles assets into the build/ folder
```

To run the frontend in development mode with hot-reloading:

```Bash
npm run dev
```

### 2. Real-Time LSL Bridge Setup

Navigate to the bridge directory to install its dedicated dependencies:

```Bash
cd server_side/lsl_bridge
npm install
```

### 3. Replay Utility Setup

Navigate to the replay utility directory to install its dependencies:

```Bash
cd server_side/arrow_to_lsl_replay
npm install
```

## User Operations Guide

### Step 1: Start the Real-Time LSL Server
Before opening the web interface, spin up the backend server so LSL streams can be initialized instantly when toggling sensors:

```Bash
cd server_side/lsl_bridge
node lsl_bridge.js
```

Leaves an active daemon listening on `ws://localhost:8765`. It handles metadata registration and pushes streams automatically onto your local LSL network.

### Step 2: Acquire and Stream Live Data

 1. Launch the web interface (via npm run dev or by serving the build/ folder).

 2. Open the page in a Chromium-based browser (Chrome, Edge) with Bluetooth enabled.

 3. Click Connect Polar H10 or Connect Vernier Respiration Belt in the top-left toolbar to pair your hardware.

 4. Flip the EXG, ACC, Force, or Resp switch on any connected sensor row.

    - Data immediately streams to the canvas visualizer and broadcasts over your network via LSL.

### Step 3: Record Sessions to Disk

 1. Click the Folder Icon in the top-right menu to select a local directory. Grant the browser file write permissions when prompted.

 2. Configure your session metadata (Study, Subject, Session) in the top bar text fields.

 3. Click the Record Button (circle icon) to begin archiving.

 4. Click it again to stop. The system flushes the data, dumps a master metadata.json packet, and automatically generates matching `.arrow` and `.csv` files inside a timed folder block.

## Replaying Saved Sessions

To simulate live data acquisition or run offline analysis pipelines using previously recorded data, execute the standalone replay tool. Pass the target run folder path as a parameter:

```Bash
cd server_side/arrow_to_lsl_replay
node replay_arrow.js <path_to_recording_directory>
```

The script reconstructs the original LSL stream topologies, handles time-synchronization spacing automatically, and mirrors the absolute Unix epoch hardware timestamps generated during the original session.