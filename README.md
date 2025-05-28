<img src="Complete_Logo.png" height="25">

# Capture and Replay Security Bugs

An open-source browser extension to capture your desktop video **and** network traffic in a single `.webm` + `.json` bundle, replay it later and interactively step through every request & response. Everything runs entirely in the client (no server), works on Chrome & Opera (Firefox support coming soon), and stores history in Local Storage.

---

## Key Features

- **Screen + Network Recording**  
  Captures your tab’s video (WebM) and network calls (JSON) together.

- **Interactive Replay UI**  
  Search, filter and step through every request/response in sync with playback.

- **One-File Export/Import**  
  Download a ZIP containing both the `.webm` and the `.json`.  
  Upload that same ZIP back into the UI to replay.

- **cURL Export**  
  Copy any request as a cURL command.

- **No Backend**  
  All storage & processing in-browser (Local Storage + Emscripten-powered FFMPEG).

---

## Options Explained

1. **Active & Navigated Tabs (Default)**  
   Capture network from the currently active tab **and** any tabs you navigate to.

2. **Only Active**  
   Track only the tab that is active at each moment (switching tabs captures those networks).

3. **Only Selected**  
   Capture only the tab you explicitly started from (URL bar hidden).

4. **All Tabs**  
   Capture network from every open tab.

---

## Installation

### Chrome

[Install from the Chrome Web Store](https://chrome.google.com/webstore/detail/repronow/bgnboagkkokloclccjpmamhfijeinnpc)

### Opera

Available on the Opera Add-ons store soon — you can also “Load Unpacked” from this folder.

### Manual (Chrome / Opera)

1. Go to `chrome://extensions` (or `opera://extensions`)
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository’s folder.
4. The extension will appear in your toolbar.

### Firefox

On the roadmap. Watching [bug 1394062](https://bugzilla.mozilla.org/show_bug.cgi?id=1394062).

---

## Usage

1. **Start Recording**  
   Click the toolbar icon → choose a **Name** & **Capture Mode** → **Start**.

2. **Stop Recording**  
   Click **Stop**. A popup will list your recording in history with its friendly name & date.

3. **View / Replay**

   - Click the **eye** button to open the in-browser replay UI.
   - Use the timeline panel to step through each request/response.

4. **Download**  
   Click the **download** button to export a **ZIP** that contains:

   - `yourName.webm` — the screen capture,
   - `yourName.json` — the full request/response log.

5. **Upload**  
   In the replay UI, click **Upload**, select the same ZIP, and it will unpack both files and start your interactive replay.

---

## Development & References

- **Chrome Extension Guide**  
  https://developer.chrome.com/extensions/getstarted

- **FFmpeg.js** (Emscripten-compiled)  
  https://github.com/Kagami/ffmpeg.js

- **JSZip** for client-side ZIP handling  
  https://github.com/Stuk/jszip

- **ts-ebml** for MKV parsing (older builds)  
  https://github.com/legokichi/ts-ebml

- **Browserify** to bundle node modules into browser scripts  
  http://browserify.org/

- Ideas & Demos on FFMPEG.js  
  https://paul.kinlan.me/ffmpeg-ideas/  
  https://github.com/bgrins/videoconverter.js
