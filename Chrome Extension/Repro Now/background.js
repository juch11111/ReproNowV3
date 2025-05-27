// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function WebRequest() {}

// State management for service worker
let req;
let startTime = 0;
let recordedBlobs = [];
let pending_request_id = null;
let mediaRecorder = null;
let tabidRecieved;
let videoName = Date.now();
let customName;
let recorderTabId = null;
let isRecording = false;
let recordingStartTime = null;

// Options
let tabRecordOnlyNewTab = true;
let recordCurrentTabOnly = false;
let recordAlltabs = false;

// Initialize state when service worker starts
async function initializeState() {
  const state = await chrome.storage.local.get([
    "req_data",
    "startTime",
    "recordedBlobs",
    "pending_request_id",
    "tabidRecieved",
    "videoName",
    "customName",
    "tabRecordOnlyNewTab",
    "recordCurrentTabOnly",
    "recordAlltabs",
    "isRecording",
    "recordingStartTime",
  ]);

  req = state.req_data ? new Map(Object.entries(state.req_data)) : new Map();
  startTime = state.startTime || 0;
  recordedBlobs = state.recordedBlobs || [];
  pending_request_id = state.pending_request_id || null;
  tabidRecieved = state.tabidRecieved;
  videoName = state.videoName || Date.now();
  customName = state.customName;
  tabRecordOnlyNewTab =
    state.tabRecordOnlyNewTab !== undefined ? state.tabRecordOnlyNewTab : true;
  recordCurrentTabOnly = state.recordCurrentTabOnly || false;
  recordAlltabs = state.recordAlltabs || false;
  isRecording = state.isRecording || false;
  recordingStartTime = state.recordingStartTime || null;
}

// Save state to storage
async function saveState() {
  await chrome.storage.local.set({
    req_data: Object.fromEntries(req),
    startTime,
    recordedBlobs,
    pending_request_id,
    tabidRecieved,
    videoName,
    customName,
    tabRecordOnlyNewTab,
    recordCurrentTabOnly,
    recordAlltabs,
    isRecording,
    recordingStartTime,
  });
}

// Initialize on startup
initializeState();

// Network Requests Capture using debugger API
function addWebReq(details) {
  console.log("addWebReq called with:", details.requestId, details.url);

  if (!req.get(details.requestId)) {
    var temp = new WebRequest();
    if (details.requestBody) {
      temp.requestBody = details.requestBody;
      console.log("Request body captured for:", details.url);
    }
    if (details.method) temp.method = details.method;
    if (details.url) temp.url = details.url;
    temp.requesttime = (new Date().valueOf() - startTime) / 1000;
    if (details.responseHeaders) temp.responseHeaders = details.responseHeaders;
    if (details.statusCode) temp.statusCode = details.statusCode;
    if (details.statusLine) temp.statusLine = details.statusLine;
    req.set(details.requestId, temp);
    console.log("New request added. Total requests:", req.size);
  } else {
    var existingReq = req.get(details.requestId);
    if (details.requestBody) existingReq.requestBody = details.requestBody;
    if (details.requestHeaders)
      existingReq.requestHeaders = details.requestHeaders;
    if (details.responseHeaders)
      existingReq.responseHeaders = details.responseHeaders;
    if (details.statusCode) {
      existingReq.statusCode = details.statusCode;
      existingReq.responseTime = (new Date().valueOf() - startTime) / 1000;
      console.log(
        "Response captured for:",
        existingReq.url,
        "Status:",
        details.statusCode
      );
    }
    if (details.statusLine) existingReq.statusLine = details.statusLine;
  }
  saveState();
}

function startRecording(tabid) {
  console.log("Starting recording for tab:", tabid);
  req = new Map();
  startTime = 0;

  if (recordAlltabs) {
    chrome.tabs.query({}, function (tabs) {
      for (i = 0; i < tabs.length; i++) {
        addEventListenters(tabs[i].id);
      }
    });
  } else {
    addEventListenters(tabid);
  }

  saveState();
}

async function addEventListenters(tabid) {
  try {
    console.log("Setting up network capture for tab:", tabid);

    if (!chrome.debugger) {
      console.error("chrome.debugger API not available");
      return;
    }

    chrome.debugger.attach({ tabId: tabid }, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to attach debugger:", chrome.runtime.lastError);
        return;
      }

      console.log("Debugger attached to tab:", tabid);

      chrome.debugger.sendCommand(
        { tabId: tabid },
        "Network.enable",
        {},
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to enable Network domain:",
              chrome.runtime.lastError
            );
            return;
          }
          console.log("Network domain enabled for tab:", tabid);
        }
      );
    });

    chrome.debugger.onEvent.addListener(networkEventHandler);
  } catch (error) {
    console.error("Error in addEventListenters:", error);
  }
}

// Add this to your networkEventHandler function in background.js
function networkEventHandler(source, method, params) {
  if (source.tabId === tabidRecieved) {
    console.log(
      "Network event for recording tab:",
      method,
      params.url || params.requestId
    );

    if (method === "Network.requestWillBeSent") {
      console.log("Request started:", params.request.url);
      addWebReq({
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        requestHeaders: params.request.headers,
        requestBody: params.request.postData,
      });
    }

    if (method === "Network.responseReceived") {
      console.log(
        "Response received:",
        params.response.url,
        "Status:",
        params.response.status
      );
      addWebReq({
        requestId: params.requestId,
        statusCode: params.response.status,
        responseHeaders: params.response.headers,
        statusLine: params.response.statusText,
      });
    }

    // FIXED: Use loadingFinished instead of responseReceived for body capture
    if (method === "Network.loadingFinished") {
      console.log("Loading finished for request:", params.requestId);
      // Add delay to ensure resource is available (from search results)
      setTimeout(() => {
        getResponseBodyWithRetry(source.tabId, params.requestId, 3);
      }, 500); // Increased delay from 100ms to 500ms
    }
  }
}

// Improved retry mechanism with exponential backoff
function getResponseBodyWithRetry(tabId, requestId, maxRetries) {
  chrome.debugger.sendCommand(
    { tabId: tabId },
    "Network.getResponseBody",
    {
      requestId: requestId,
    },
    (result) => {
      if (chrome.runtime.lastError) {
        console.warn(
          `Response body error for ${requestId}:`,
          chrome.runtime.lastError.message
        );

        // Retry with exponential backoff if we have attempts left
        if (
          maxRetries > 0 &&
          (chrome.runtime.lastError.message.includes(
            "No resource with given identifier found"
          ) ||
            chrome.runtime.lastError.message.includes(
              "No data found for resource"
            ))
        ) {
          const delay = (4 - maxRetries) * 500; // 500ms, 1000ms, 1500ms delays
          console.log(
            `Retrying response body for ${requestId} in ${delay}ms, attempts left: ${
              maxRetries - 1
            }`
          );

          setTimeout(() => {
            getResponseBodyWithRetry(tabId, requestId, maxRetries - 1);
          }, delay);
        }
      } else if (result && result.body) {
        console.log(
          "Response body captured successfully for request:",
          requestId
        );
        addWebReq({
          requestId: requestId,
          responseBody: result.body,
          responseBodyBase64: result.base64Encoded,
        });
      } else {
        console.log("No response body available for request:", requestId);
      }
    }
  );
}

// Add retry mechanism for getting response body
function getResponseBodyWithRetry(tabId, requestId, maxRetries) {
  chrome.debugger.sendCommand(
    { tabId: tabId },
    "Network.getResponseBody",
    {
      requestId: requestId,
    },
    (result) => {
      if (chrome.runtime.lastError) {
        console.warn("Response body error:", chrome.runtime.lastError.message);

        // Retry if we have attempts left and it's the -32000 error
        if (
          maxRetries > 0 &&
          chrome.runtime.lastError.message.includes(
            "No resource with given identifier found"
          )
        ) {
          console.log(
            `Retrying response body for ${requestId}, attempts left: ${
              maxRetries - 1
            }`
          );
          setTimeout(() => {
            getResponseBodyWithRetry(tabId, requestId, maxRetries - 1);
          }, 200);
        }
      } else if (result && result.body) {
        console.log("Response body captured for request:", requestId);
        addWebReq({
          requestId: requestId,
          responseBody: result.body,
          responseBodyBase64: result.base64Encoded,
        });
      }
    }
  );
}

function stopNetworkRecording() {
  if (chrome.debugger && chrome.debugger.getTargets) {
    chrome.debugger.getTargets((targets) => {
      targets.forEach((target) => {
        if (target.attached) {
          chrome.debugger.detach({ tabId: target.tabId });
        }
      });
    });
  }
}

// Video Recording - Use working approach for Manifest V3
function startScreenRecording() {
  console.log("Starting screen recording...");
  recordedBlobs = [];

  // Close any existing recorder tab first
  if (recorderTabId) {
    chrome.tabs.remove(recorderTabId, () => {
      createRecorderTab();
    });
  } else {
    createRecorderTab();
  }
}

function createRecorderTab() {
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL("recorder.html"),
      active: true, // Make tab active so getDisplayMedia works
      pinned: false,
    },
    function (tab) {
      recorderTabId = tab.id;

      // Wait for tab to load
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: "startCapture",
        });
      }, 2000);
    }
  );

  saveState();
}

function stopScreenRecording() {
  if (recorderTabId) {
    chrome.tabs.sendMessage(recorderTabId, {
      action: "stopCapture",
    });
  }
  saveState();
}

function gatherEverything() {
  console.log("gatherEverything called with", recordedBlobs.length, "blobs");

  // CRITICAL: Check if network requests were captured
  console.log("req Map size:", req.size);
  console.log("req Map contents:", req);

  if (req.size === 0) {
    console.error(
      "NO NETWORK REQUESTS CAPTURED! Network recording may have failed."
    );
  }

  var recorded_json = JSON.stringify(convertMapToObject(req));
  console.log("JSON data to save:", recorded_json);
  console.log("JSON data length:", recorded_json.length);

  // Check if JSON is empty
  if (recorded_json === "[]" || recorded_json.length < 10) {
    console.error("JSON data is empty or too small!");
  }

  // Save recording data with consistent video ID
  saveRecordingToStorage(recordedBlobs, recorded_json, videoName);

  // Open display page
  chrome.windows.create({
    url:
      "display.html?fromStorage=true&videoId=" +
      videoName +
      "&customname=" +
      encodeURIComponent(customName),
    type: "popup",
    width: 1920,
    height: 1080,
  });
}

function saveRecordingToStorage(blobs, jsonData, videoId) {
  console.log(
    "saveRecordingToStorage called with:",
    blobs.length,
    "blobs, videoId:",
    videoId
  );
  console.log("JSON data length:", jsonData.length);

  if (!blobs || blobs.length === 0) {
    console.error("No blobs to save!");
    return;
  }

  const reader = new FileReader();
  const superBuffer = new Blob(blobs, { type: "video/webm" });
  console.log("Created blob of size:", superBuffer.size);

  reader.onloadend = function () {
    const base64data = reader.result;
    console.log("Base64 data length:", base64data.length);

    const videoObj = {
      video: base64data,
      json: jsonData,
      friendlyName: customName,
      timestamp: Date.now(),
    };

    const storageData = {};
    storageData[videoId] = videoObj;

    chrome.storage.local.set(storageData, function () {
      console.log("Recording saved to storage with key:", videoId);
    });
  };

  reader.readAsDataURL(superBuffer);
}

function startNetworkRecording() {
  console.log("Starting network recording for tab:", tabidRecieved);
  startRecording(tabidRecieved);
  startTime = new Date().valueOf();
  console.log("Network recording started, startTime:", startTime);
  saveState();
}

function startRecieved(tabid, name, option) {
  videoName = Date.now();
  customName = name;
  console.log("startRecieved called with option:", option, "tabid:", tabid);

  // CRITICAL: Reset req Map
  req = new Map();
  console.log("Reset req Map, size now:", req.size);

  if (option == "ActiveAndNavigated") {
    tabRecordOnlyNewTab = false;
    recordCurrentTabOnly = false;
    recordAlltabs = false;
  }
  if (option == "OnlyActive") {
    tabRecordOnlyNewTab = true;
    recordCurrentTabOnly = false;
    recordAlltabs = false;
  }
  if (option == "OnlySelected") {
    tabRecordOnlyNewTab = false;
    recordCurrentTabOnly = true;
    recordAlltabs = false;
  }
  if (option == "AllTabs") {
    tabRecordOnlyNewTab = false;
    recordCurrentTabOnly = false;
    recordAlltabs = true;
  }

  tabidRecieved = tabid;

  // IMPORTANT: Attach debugger IMMEDIATELY before any navigation
  console.log("Attaching debugger BEFORE starting recording...");
  attachDebuggerEarly(tabid).then(() => {
    // Only start screen recording after debugger is ready
    setTimeout(() => {
      startScreenRecording();
    }, 1000);
  });

  saveState();
}

// New function to attach debugger early
async function attachDebuggerEarly(tabid) {
  try {
    console.log("Early debugger attachment for tab:", tabid);

    if (!chrome.debugger) {
      console.error("chrome.debugger API not available");
      return;
    }

    // Attach debugger and enable network BEFORE any requests
    await new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId: tabid }, "1.3", () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to attach debugger early:",
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
          return;
        }

        console.log("Early debugger attached to tab:", tabid);

        // Enable Network domain immediately
        chrome.debugger.sendCommand(
          { tabId: tabid },
          "Network.enable",
          {},
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Failed to enable Network domain early:",
                chrome.runtime.lastError
              );
              reject(chrome.runtime.lastError);
              return;
            }
            console.log("Network domain enabled early for tab:", tabid);
            resolve();
          }
        );
      });
    });

    // Set up event listeners
    chrome.debugger.onEvent.removeListener(networkEventHandler);
    chrome.debugger.onEvent.addListener(networkEventHandler);

    // Start network recording
    startTime = new Date().valueOf();
    console.log("Early network recording started, startTime:", startTime);
  } catch (error) {
    console.error("Error in early debugger attachment:", error);
  }
}

function stopRecieved() {
  console.log("stopRecieved called");
  stopNetworkRecording();
  stopScreenRecording();
}

// Message Handler for Manifest V3
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);

  if (message.action === "getPendingRequestId") {
    sendResponse({ pending_request_id: pending_request_id });
    return true;
  }

  if (message.action === "getRecordingState") {
    sendResponse({
      isRecording: isRecording,
      customName: customName,
      pending_request_id: pending_request_id,
      recordingStartTime: recordingStartTime,
    });
    return true;
  }

  if (message.action === "startRecieved") {
    isRecording = true;
    recordingStartTime = Date.now();
    startRecieved(message.tabid, message.name, message.option);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "stopRecieved") {
    isRecording = false;
    recordingStartTime = null;
    stopRecieved();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "getCustomName") {
    sendResponse({ customName: customName });
    return true;
  }

  if (message.action === "recordingComplete") {
    console.log("Recording complete, received base64 data");
    console.log("Original video size:", message.originalSize, "bytes");
    console.log("Base64 data length:", message.videoBase64.length);

    // Convert base64 back to blob for storage
    const base64Response = fetch(message.videoBase64);
    base64Response
      .then((response) => response.blob())
      .then((blob) => {
        console.log("Reconstructed blob size:", blob.size, "bytes");

        if (blob.size < 50000) {
          console.error("Reconstructed blob too small:", blob.size);
          return;
        }

        // Store as single blob
        recordedBlobs = [blob];

        isRecording = false;
        recordingStartTime = null;

        // Close recorder tab
        if (recorderTabId) {
          chrome.tabs.remove(recorderTabId);
          recorderTabId = null;
        }

        // Process the recording
        gatherEverything();
      })
      .catch((error) => {
        console.error("Error reconstructing blob:", error);
      });

    sendResponse({ success: true });
    return true;
  }

  if (message.action === "recordingError") {
    console.error("Recording failed:", message.error);

    isRecording = false;
    recordingStartTime = null;

    if (recorderTabId) {
      chrome.tabs.remove(recorderTabId);
      recorderTabId = null;
    }

    stopRecieved();
    sendResponse({ success: true });
    return true;
  }

  return true;
});

function convertMapToObject(map_var) {
  var objectlist = [];
  map_var.forEach(function (i, k) {
    objectlist.push({ requestid: k, webReq: i });
  });
  return objectlist;
}
