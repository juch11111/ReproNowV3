// This is Chrome Extension/Repro Now/recorder.js
let mediaRecorder = null;
let recordedBlobs = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startCapture") {
    startDisplayCapture();
    sendResponse({ success: true });
  }
  if (message.action === "stopCapture") {
    stopDisplayCapture();
    sendResponse({ success: true });
  }
  return true;
});

async function startDisplayCapture() {
  try {
    console.log("Starting display capture...");
    recordedBlobs = [];

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: true,
    });

    console.log("Display stream obtained:", stream);

    // Use VP9 codec
    let options;
    if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9,opus")) {
      options = { mimeType: "video/webm; codecs=vp9,opus" };
      console.log("Using VP9+Opus codec (recommended)");
    } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8,opus")) {
      options = { mimeType: "video/webm; codecs=vp8,opus" };
      console.log("Using VP8+Opus codec (fallback)");
    } else {
      options = { mimeType: "video/webm" };
      console.log("Using default WebM codec");
    }

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = function (event) {
      console.log("Data available, size:", event.data.size);
      if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
        console.log("Total blobs so far:", recordedBlobs.length);
      }
    };

    mediaRecorder.onstop = function () {
      console.log("MediaRecorder stopped. Total blobs:", recordedBlobs.length);

      const totalSize = recordedBlobs.reduce(
        (total, blob) => total + blob.size,
        0
      );
      console.log("Total recording size:", totalSize, "bytes");

      if (totalSize > 50000) {
        // Use simple approach - convert to base64 and send
        convertToBase64AndSend();
      } else {
        console.error("Recording too small, likely failed. Size:", totalSize);
        chrome.runtime.sendMessage({
          action: "recordingError",
          error: `Recording failed - only ${totalSize} bytes captured`,
        });
      }

      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.onerror = function (event) {
      console.error("MediaRecorder error:", event);
      chrome.runtime.sendMessage({
        action: "recordingError",
        error: "MediaRecorder failed",
      });
    };

    mediaRecorder.start(2000);
    console.log("Recording started with 2-second intervals");
  } catch (error) {
    console.error("Error starting display capture:", error);
    chrome.runtime.sendMessage({
      action: "recordingError",
      error: error.message,
    });
  }
}

// Simple base64 conversion (proven to work)
function convertToBase64AndSend() {
  console.log("Converting video to base64...");

  const superBuffer = new Blob(recordedBlobs, { type: "video/webm" });
  console.log("Created final blob size:", superBuffer.size, "bytes");

  const reader = new FileReader();
  reader.onloadend = function () {
    const base64data = reader.result;
    console.log("Base64 conversion complete, length:", base64data.length);

    chrome.runtime.sendMessage({
      action: "recordingComplete",
      videoBase64: base64data,
      originalSize: superBuffer.size,
    });
  };

  reader.readAsDataURL(superBuffer);
}

function stopDisplayCapture() {
  console.log("Stopping display capture...");
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}
