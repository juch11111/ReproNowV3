// This is Chrome Extension/Repro Now/popup.js

const SKIP_KEYS = new Set([
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

function start() {
  var currTab;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    currTab = tabs[0];
    if (currTab) {
      //console.log(currTab);
      var name = document.querySelector("input#recName").value;
      var selectedoption = document.querySelector(
        "select#SelectedOption"
      ).value;

      // Replace chrome.extension.getBackgroundPage().startRecieved() with message passing
      chrome.runtime.sendMessage({
        action: "startRecieved",
        tabid: currTab.id,
        name: name,
        option: selectedoption,
      });
      showStopButton();
    }
  });
  document.querySelector("input#recName").readOnly = true;
  document.querySelector("select#SelectedOption").readOnly = true;
}

function showStopButton() {
  var startbutton = document.querySelector("button#start");
  startbutton.classList.add("hidebutton");
  var stopbutton = document.querySelector("button#stop");
  stopbutton.classList.remove("hidebutton");
}

function stop() {
  var startbutton = document.querySelector("button#start");
  startbutton.classList.remove("hidebutton");
  var stopbutton = document.querySelector("button#stop");
  stopbutton.classList.add("hidebutton");

  // Replace chrome.extension.getBackgroundPage().stopRecieved() with message passing
  chrome.runtime.sendMessage({ action: "stopRecieved" });

  document.querySelector("input#recName").readOnly = false;
  document.querySelector("select#SelectedOption").readOnly = false;
}

function init() {
  var date = new Date();
  var currTab;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    currTab = tabs[0];
    if (currTab) {
      document.querySelector("input#recName").value =
        url_domain(currTab.url).split(".").reverse()[1] +
        " " +
        date.getMonth() +
        "_" +
        date.getDate() +
        "_" +
        date.getFullYear() +
        "_" +
        Date.now().toString().slice(0, -3).substring(6);
    }

    // CRITICAL FIX: Check if recording is in progress
    chrome.runtime.sendMessage(
      { action: "getRecordingState" },
      function (response) {
        if (response && response.isRecording) {
          // Recording is active - show stop button and set read-only fields
          showStopButton();

          // Get custom name and set fields as read-only
          if (response.customName) {
            document.querySelector("input#recName").value = response.customName;
          }
          document.querySelector("input#recName").readOnly = true;
          document.querySelector("select#SelectedOption").readOnly = true;
        }
      }
    );
  });
  addHistory();

  // Replace chrome.extension.getBackgroundPage().pending_request_id check with message passing
  chrome.runtime.sendMessage(
    { action: "getPendingRequestId" },
    function (response) {
      if (response && response.pending_request_id != null) {
        showStopButton();
      }
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getScreenDimensions") {
    sendResponse({
      width: screen.width,
      height: screen.height,
    });
  }
  return true;
});

function addHistory() {
  var listgroup = document.querySelector("#listgrp");
  listgroup.innerHTML = "";
  chrome.storage.local.get(null, function (allItems) {
    // Sort newest-first
    const items = mapSort(allItems);

    Object.entries(items).forEach(([key, value]) => {
      // 1) skip internal state keys
      if (SKIP_KEYS.has(key)) return;

      // 2) skip anything without a timestamp (not a saved recording)
      if (!value || typeof value !== "object" || !value.timestamp) return;

      // 3) determine display name & date
      const name = value.friendlyName || key;
      const date = new Date(value.timestamp);
      const dateStr = isNaN(date) ? "Unknown Date" : date.toDateString();

      // 4) create the history item
      const item = document.createElement("div");
      item.className =
        "pointer list-group-item list-group-item-action flex-column align-items-start";

      item.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
          <div class="videoName">${name}</div>
          <small class="text-muted">${dateStr}</small>
        </div>
        <div class="form-inline buttongp">
          <div class="form-group actionButton">
            <button type="button" class="btn btn-outline-success btn-sm fa buttonIcons fa-eye but_eye" lid="${key}"></button>
          </div>
          <div class="form-group actionButton">
            <button type="button" class="btn btn-outline-success btn-sm fa buttonIcons fa-download but_download" lid="${key}"></button>
          </div>
          <div class="form-group actionButton">
            <button type="button" class="btn btn-outline-success btn-sm fa buttonIcons fa-trash but_trash" lid="${key}"></button>
          </div>
        </div>`;

      listgroup.appendChild(item);
    });

    addHistoryEventListeners();
  });
}

function mapSort(input) {
  var ordered = {};
  Object.keys(input)
    .reverse()
    .forEach(function (key) {
      ordered[key] = input[key];
    });
  return ordered;
}

function addHistoryEventListeners() {
  //console.log('here');
  //All Previews
  var childDivs = document.querySelectorAll("button.but_eye");
  for (i = 0; i < childDivs.length; i++) {
    var child = childDivs[i];
    child.removeEventListener("click", previewHandler);
    child.addEventListener("click", previewHandler);
  }
  //All Downloads
  //TODO
  childDivs = document.querySelectorAll("button.but_download");
  for (i = 0; i < childDivs.length; i++) {
    var child = childDivs[i];
    child.removeEventListener("click", downloadHandler);
    child.addEventListener("click", downloadHandler);
  }
  //Deletes
  childDivs = document.querySelectorAll("button.but_trash");
  for (i = 0; i < childDivs.length; i++) {
    var child = childDivs[i];
    child.removeEventListener("click", deleteHandler);
    child.addEventListener("click", deleteHandler);
  }
}

function previewHandler() {
  var videoName = this.getAttribute("lid");
  //console.log(videoName);
  chrome.windows.create({
    url: "display.html?localStorageId=" + videoName,
    type: "popup",
    width: screen.width,
    height: screen.height,
  });
}

async function downloadHandler() {
  const key = this.getAttribute("lid");
  chrome.storage.local.get(key, async function (result) {
    const rec = result[key];
    if (!rec) return;

    // 1) Create a new JSZip
    const zip = new JSZip();
    // 2) Add the WebM
    const videoDataUrl = rec.video; // data: URI
    const videoBlob = dataURLtoBlob(videoDataUrl);
    const videoName = (rec.friendlyName || key) + ".webm";
    zip.file(videoName, videoBlob);

    // 3) Add the JSON
    const jsonStr = rec.json; // your JSON string
    const jsonName = (rec.friendlyName || key) + ".json";
    zip.file(jsonName, jsonStr);

    // 4) Generate the ZIP
    const content = await zip.generateAsync({ type: "blob" });

    // 5) Trigger download
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = (rec.friendlyName || key) + ".zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Helpers:
function dataURLtoBlob(dataurl) {
  const parts = dataurl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function deleteHandler() {
  var videoName = this.getAttribute("lid");
  chrome.storage.local.remove(videoName);
  addHistory();
}

function createSingleHistory(id, name) {
  var his = document.createElement("div");
  his.className =
    "pointer list-group-item list-group-item-action flex-column align-items-start";
  var nametime = document.createElement("div");
  nametime.className = "d-flex w-100 justify-content-between";
  var nme = document.createElement("div");
  nme.className = "videoName";
  nme.textContent = name;
  nametime.appendChild(nme);
  var time = document.createElement("small");
  time.className = "text-muted";
  var date = new Date(parseInt(id));
  time.textContent = date.toDateString();
  nametime.appendChild(time);
  his.appendChild(nametime);

  var buttons = document.createElement("div");
  buttons.className = "form-inline buttongp";
  buttons.appendChild(createButtons("eye", id));
  buttons.appendChild(createButtons("download", id));
  buttons.appendChild(createButtons("trash", id));
  his.appendChild(buttons);

  return his;
}

function createButtons(text, id) {
  var outerdiv = document.createElement("div");
  outerdiv.className = "form-group actionButton";
  var button = document.createElement("button");
  button.type = "button";
  button.className =
    "btn btn-outline-success btn-sm fa buttonIcons fa-" + text + " but_" + text;
  button.setAttribute("lid", id);
  outerdiv.appendChild(button);
  return outerdiv;
}

document.querySelector(".historyBut").addEventListener("click", function () {
  // refresh the list every time you open history
  addHistory();
  document.querySelector(".mainPage").style.display = "none";
  document.querySelector(".secondPage").style.display = "block";
});
document.querySelector(".topBar").addEventListener("click", function () {
  document.querySelector(".secondPage").style.display = "none";
  document.querySelector(".mainPage").style.display = "block";
});
document.querySelector(".uploadBut").addEventListener("click", function () {
  chrome.windows.create({
    url: "display.html?uploadVideo=true",
    type: "popup",
    width: screen.width,
    height: screen.height,
  });
});

function url_domain(data) {
  var a = document.createElement("a");
  a.href = data;
  return a.hostname;
}

document.querySelector("button#start").addEventListener("click", start);
document.querySelector("button#stop").addEventListener("click", stop);
window.onload = init;
