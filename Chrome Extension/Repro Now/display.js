// This is Chrome Extension/Repro Now/display.js
"use strict";
var InputReq;
var req;
var noJsonFound = false;
var uploadFileName = null;
var changeTimeLine = true;
var videoEle;
var URL = window.URL || window.webkitURL;
function Timeline() {}
var seq_timeline;
var displayMessage = function (message, isError) {
  var element = document.querySelector("#message");
  element.innerHTML = message;
  element.className = isError ? "error" : "info";
};
var playSelectedFile = function (event) {
  uploadfile(this.files);
  /*noJsonFound=false;
    var file = this.files[0];
    var type = file.type;
    uploadFileName=file.name;
    var videoNode = document.querySelector('video')
    var fileURL = URL.createObjectURL(file);
    videoNode.src = fileURL;
    //hasUploadFile=true;
    console.log(fileURL);
    fetch(fileURL)
    .then((res)=> res.arrayBuffer() )
    .then((buf)=>{
        var jsonString=getJson(buf);
        console.log(jsonString);
        if(jsonString)
          convertStringToObject(jsonString.data);
        else
        {
          noJsonFound=true;
          document.querySelector('#Timeline').innerHTML='';
        }
    });
    document.getElementById('drop-zone').className = 'upload-drop-zone hideit';*/
};

// -------------------------------------------------------------------
// small helper to escape HTML so we can safely inject into <pre>
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// -------------------------------------------------------------------

function uploadfile(files) {
  noJsonFound = false;
  var file = files[0];
  var type = file.type;
  uploadFileName = file.name;
  var videoNode = document.querySelector("video");
  /*var canPlay = videoNode.canPlayType(type)
    if (canPlay === '') canPlay = 'no'
    var message = 'Can play type "' + type + '": ' + canPlay
    var isError = canPlay === 'no'
    

    if (isError) {
      console.log(message);
      return
    }*/
  //console.debug(file);
  var fileURL = URL.createObjectURL(file);
  videoNode.src = fileURL;
  //hasUploadFile=true;
  console.log(fileURL);
  fetch(fileURL)
    .then((res) => res.arrayBuffer())
    .then((buf) => {
      var jsonString = getJson(buf);
      console.log(jsonString);
      if (jsonString) convertStringToObject(jsonString.data);
      else {
        noJsonFound = true;
        document.querySelector("#Timeline").innerHTML = "";
      }
    });
  document.getElementById("drop-zone").className = "upload-drop-zone hideit";
}
function loadDemo(fileURL) {
  var videoNode = document.querySelector("video");
  videoNode.src = fileURL;
  uploadFileName = "demo.mkv";
  //hasUploadFile=true;
  console.log(fileURL);
  fetch(fileURL)
    .then((res) => res.arrayBuffer())
    .then((buf) => {
      var jsonString = getJson(buf);
      console.log(jsonString);
      if (jsonString) convertStringToObject(jsonString.data);
      else {
        noJsonFound = true;
        document.querySelector("#Timeline").innerHTML = "";
      }
    });
  document.getElementById("drop-zone").className = "upload-drop-zone hideit";
}
var params = {};

if (location.search) {
  var parts = location.search.substring(1).split("&");

  for (var i = 0; i < parts.length; i++) {
    var nv = parts[i].split("=");
    if (!nv[0]) continue;
    params[nv[0]] = nv[1] || true;
  }
}
function playfromURL() {
  var videoNode = document.querySelector("video");
  videoNode.src = params.mp4;
  //document.querySelector('#formelements').style.visibility = "hidden";
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      convertStringToObject(xhr.responseText);
      //console.debug(xhr.responseText);
    }
  };
  xhr.open("GET", params.json, true);
  xhr.send(null);
  //convertStringToObject(decodeURIComponent(params.json));
}
function playFromURLv2() {
  var videoName = params.localStorageId;
  chrome.storage.local.get(videoName, function (result) {
    convertStringToObject(result[videoName].json);
    //console.log(result[videoName].video);
    //var superBuffer = new Blob(result[videoName].video, {type: 'video/mpeg'});
    var videoNode = document.querySelector("video");
    var source = document.createElement("source");
    source.type = "video/webm";
    source.src = result[videoName].video; //window.URL.createObjectURL(superBuffer);
    videoNode.appendChild(source);
  });
}

function init() {
  InputReq = null;
  req = null;
  seq_timeline = new Array();

  // Handle URL parameters
  const urlParams = new URLSearchParams(window.location.search);

  // NEW: Handle the fromStorage=true&videoId= pattern
  if (urlParams.get("fromStorage") === "true") {
    const videoId = urlParams.get("videoId");
    if (videoId) {
      loadRecordingFromStorage(videoId);
      document.getElementById("drop-zone").className =
        "upload-drop-zone hideit";
      setupEventHandlers();
      return; // Exit early since we're loading from storage
    }
  }

  // Existing functionality
  document
    .querySelector('input[name="search"]')
    .addEventListener("keypress", function (e) {
      var key = e.which || e.keyCode;
      if (key === 13) {
        // 13 is enter
        search(this.value);
      }
    });

  if (params.mp4 && params.json) {
    playfromURL();
    document.getElementById("drop-zone").className = "upload-drop-zone hideit";
  }
  if (params.localStorageId) {
    playFromURLv2();
    document.getElementById("drop-zone").className = "upload-drop-zone hideit";
  }

  setupEventHandlers();

  videoEle = document.querySelector("video");
  videoEle.addEventListener("timeupdate", playJsonFile, false);
}

function setupEventHandlers() {
  // Copy‐to‐clipboard buttons
  $(".js-copy").click(function () {
    var text = $(this).attr("data-copy");
    var el = $(this);
    copyToClipboard(text, el);
  });
  $(".js-copy").tooltip();

  // Download button
  document
    .querySelector("#download")
    .addEventListener("click", downloadHandler);

  // Drag‐and‐drop zone for direct video upload
  var dropZone = document.getElementById("drop-zone");
  dropZone.addEventListener("click", uploadHandler);
  dropZone.ondrop = function (e) {
    e.preventDefault();
    this.className = "upload-drop-zone hideit";
    uploadfile(e.dataTransfer.files);
  };
  dropZone.ondragover = function () {
    this.className = "upload-drop-zone drop";
    return false;
  };
  dropZone.ondragleave = function () {
    this.className = "upload-drop-zone";
    return false;
  };

  // --------------------------------------------------------------------------------
  // NEW ZIP‐UPLOAD HANDLERS (instead of the old two‐step vid+json picker)

  // 1) When user clicks the Upload button, trigger the hidden ZIP file picker:
  document.querySelector("#upload").addEventListener("click", () => {
    document.querySelector("#zip").value = "";
    document.querySelector("#zip").click();
  });

  // 2) When the user selects a ZIP, unzip it and load both .webm/.mkv + .json:
  document.querySelector("#zip").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const videoNode = document.querySelector("video");
    const timeline = document.querySelector("#Timeline");

    JSZip.loadAsync(file)
      .then((zip) => {
        // find the entries
        let entries = [];
        zip.forEach((path, entry) => entries.push(entry));
        const jsonEntry = entries.find((en) => /\.json$/i.test(en.name));
        const videoEntry = entries.find((en) => /\.(webm|mkv)$/i.test(en.name));

        if (!jsonEntry || !videoEntry) {
          return alert("ZIP must contain exactly one .webm/.mkv and one .json");
        }

        // load both in parallel
        return Promise.all([
          jsonEntry.async("string"),
          videoEntry.async("blob"),
        ]).then(([jsonText, videoBlob]) => {
          // hide drop‐zone
          document.getElementById("drop-zone").className =
            "upload-drop-zone hideit";

          // set video src
          const url = URL.createObjectURL(videoBlob);
          videoNode.src = url;

          // clear old timeline
          timeline.innerHTML = "";

          // parse and render JSON
          convertStringToObject(jsonText);

          // wire up timeupdate again
          videoNode.removeEventListener("timeupdate", playJsonFile);
          videoNode.addEventListener("timeupdate", playJsonFile, false);
        });
      })
      .catch((err) => {
        console.error("ZIP load error:", err);
        alert("Failed to read ZIP: " + err.message);
      });
  });
}
window.onload = init;

function loadRecordingFromStorage(videoId) {
  console.log("loadRecordingFromStorage called with videoId:", videoId);

  chrome.storage.local.get(videoId, function (result) {
    console.log("Storage get result:", result);

    if (result[videoId]) {
      const recordingData = result[videoId];
      console.log("Recording data found:", {
        hasVideo: !!recordingData.video,
        videoLength: recordingData.video ? recordingData.video.length : 0,
        hasJson: !!recordingData.json,
        jsonLength: recordingData.json ? recordingData.json.length : 0,
        friendlyName: recordingData.friendlyName,
      });

      // Check if video data is valid
      if (!recordingData.video || recordingData.video.length === 0) {
        console.error("No video data in storage");
        return;
      }

      try {
        // Create video URL from base64 data
        const videoBlob = dataURItoBlob(recordingData.video);
        console.log("Created video blob:", videoBlob.size, "bytes");

        const videoURL = URL.createObjectURL(videoBlob);
        console.log("Created video URL:", videoURL);

        // Set video source
        const videoElement = document.querySelector("video");
        console.log("Video element found:", !!videoElement);

        if (videoElement) {
          videoElement.src = videoURL;

          // Add event listeners to debug video loading
          videoElement.onloadstart = () => console.log("Video load started");
          videoElement.onloadedmetadata = () =>
            console.log("Video metadata loaded");
          videoElement.onloadeddata = () => console.log("Video data loaded");
          videoElement.oncanplay = () => console.log("Video can play");
          videoElement.onerror = (e) => console.error("Video error:", e);

          console.log("Video source set to:", videoElement.src);
        }

        // Process JSON data
        if (recordingData.json) {
          console.log("Processing JSON data...");
          convertStringToObject(recordingData.json);
        } else {
          console.warn("No JSON data found");
        }

        // Set up video event listener
        videoEle = videoElement;
        if (videoEle) {
          videoEle.addEventListener("timeupdate", playJsonFile, false);
          console.log("Video timeupdate listener added");
        }

        console.log("Recording loaded successfully from storage");
      } catch (error) {
        console.error("Error processing recording data:", error);
      }
    } else {
      console.error("Recording not found in storage:", videoId);

      // List all keys in storage for debugging
      chrome.storage.local.get(null, function (allItems) {
        console.log("All storage keys:", Object.keys(allItems));
      });
    }
  });
}

// Helper function to convert base64 to blob
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

function downloadHandler() {
  if (uploadFileName != null) {
    //Download from video src
    if (chrome.tabs)
      chrome.tabs.create({
        url:
          "download.html?vidobjurl=" +
          document.querySelector("video").src +
          "&vidFileName=" +
          uploadFileName,
      });
    else
      window.open(
        "download.html?vidobjurl=" +
          document.querySelector("video").src +
          "&vidFileName=" +
          uploadFileName
      );
    return;
  }
  if (params.localStorageId) {
    /*chrome.windows.create(
              {url:'download.html?localStorageId='+params.localStorageId, type: "popup", width: 300, height: 200
      });*/
    chrome.tabs.create({
      url: "download.html?localStorageId=" + params.localStorageId,
    });
  }
  if (params.mp4 && params.json) {
    var name = "ReproNowGeneratedVideo";
    if (params.customname) name = params.customname;
    chrome.tabs.create({
      url:
        "download.html?mp4=" +
        params.mp4 +
        "&json=" +
        params.json +
        "&customname=" +
        name,
    });
  }
}
function uploadHandler() {
  document.querySelector("#vid").click();
}

/*var unzipcontent = function (event) {
    var file = this.files[0]
    var videoNode = document.querySelector('video')
    JSZip.loadAsync(file)
     .then(function(zip) {

      zip.forEach(function (relativePath, zipEntry) {
        console.debug(zipEntry);
        if(zipEntry.name.endsWith('.mp4'))
        {

          var blob = new Blob([zipEntry.asBinary()], {type: 'video/mpeg'});
          var fileURL = URL.createObjectURL(blob)
          videoNode.src = fileURL
        }
      });
     });

  }
  var inputZip = document.querySelector('#zip')
  inputZip.addEventListener('change',unzipcontent,false)*/

var playJsonFile = function (event) {
  if (req != null) {
    if (changeTimeLine) setReqResponse(this.currentTime, true);
  }
};
function setReqResponse(currentTime, changeTimeLine) {
  if (findCorrectWebReq(currentTime) != 0)
    displayRequest(req.get(findCorrectWebReq(currentTime)));
  if (findCorrectWebRes(currentTime) != 0)
    displayResponse(req.get(findCorrectWebRes(currentTime)));
  changeTimeLineHighlight(currentTime, changeTimeLine);
}

function displayRequest(webrequest) {
  var requestInfo = document.querySelector("#reqInfo");
  //requestInfo.innerHTML='';
  while (requestInfo.hasChildNodes()) {
    requestInfo.removeChild(requestInfo.lastChild);
  }
  var requestLine = document.createElement("div");
  //requestLine.textContent ='Request for : '+webrequest.url;
  //requestInfo.appendChild(requestLine);
  //requestInfo.appendChild(document.createElement("br"));

  requestLine = document.createElement("div");
  var methodline = document.createElement("div");
  methodline.className = "makeitBold disinline";
  methodline.textContent = webrequest.method + " ";
  requestLine.appendChild(methodline);
  var urlline = document.createElement("div");
  urlline.className = "disinline";
  urlline.textContent = webrequest.url + " HTTP/1.1";
  requestLine.appendChild(urlline);
  //requestLine.textContent = webrequest.method + " <b>" +
  //    webrequest.url + "</b> HTTP/1.1";

  requestInfo.appendChild(requestLine);
  requestInfo.appendChild(document.createElement("br"));
  //New stuff
  var wrapper;
  var added;
  var tablist = createTablistWrapper();
  var tabcontent = createtabcontentWrapper();
  var randId = Math.random().toString(36).substr(2, 10);
  var hasCookie;
  //Add copy to Clipboard buttons
  var curltext = "";
  var rawtext = "";

  if (urlline.textContent != "")
    rawtext += webrequest.method + " " + urlline.textContent;
  if (webrequest.method) curltext += "-X" + webrequest.method;
  if (webrequest.requestHeaders) {
    //requestInfo.appendChild(formatHeaders(webrequest.requestHeaders));
    //accordion.appendChild(createAccordianCard('Headers',formatHeaders(webrequest.requestHeaders)));
    var name = "WebReqHeader";
    added = name;
    hasCookie = getCookies(webrequest.requestHeaders);
    tablist.appendChild(createtabheader("Headers_" + randId, "Header", name));
    tabcontent.appendChild(
      createTabData(
        "Headers_" + randId,
        formatHeaders(webrequest.requestHeaders),
        name
      )
    );
    curltext += getCurlHeaders(webrequest.requestHeaders);
    rawtext += getRawHeaders(webrequest.requestHeaders);
  }
  //requestInfo.appendChild(document.createElement("br"));
  if (hasCookie) {
    var name = "WebReqCookie";
    added = name;
    tablist.appendChild(createtabheader("Cookie_" + randId, "Cookie", name));
    tabcontent.appendChild(
      createTabData("Cookie_" + randId, formatHeaders(hasCookie), name)
    );
  }
  if (webrequest.requestBody) {
    var name = "WebReqBody";
    var payloadContent;

    if (webrequest.requestBody.formData) {
      // Handle form data (existing functionality)
      payloadContent = formatFormdata(webrequest.requestBody.formData);
      curltext += getCurlBody(webrequest.requestBody.formData);
      rawtext += getRawBody(webrequest.requestBody.formData);
    } else if (typeof webrequest.requestBody === "string") {
      // Handle JSON/text payloads (new functionality)
      payloadContent = formatPayload(webrequest.requestBody);
      curltext += " -d '" + webrequest.requestBody.replace(/'/g, "'\\''") + "'";
      rawtext += "\n\n" + webrequest.requestBody;
    }

    if (payloadContent) {
      added = name;
      tablist.appendChild(createtabheader("Body_" + randId, "Body", name));
      tabcontent.appendChild(
        createTabData("Body_" + randId, payloadContent, name)
      );
    }
  }
  if (added) {
    requestInfo.appendChild(tablist);
    requestInfo.appendChild(tabcontent);
    var webres = document.querySelectorAll("." + added);

    for (var i = 0, len = webres.length; i < len; i++) {
      if (!webres[i].classList.contains("active"))
        webres[i].classList.add("active");
    }
  }
  if (curltext != "") {
    curltext = "curl " + curltext + " '" + webrequest.url + "' --compressed";
  }
  document.querySelector("#ReqCurlButton").removeAttribute("data-copy");
  document.querySelector("#ReqCurlButton").setAttribute("data-copy", curltext);

  document.querySelector("#ReqRawButton").removeAttribute("data-copy");
  document.querySelector("#ReqRawButton").setAttribute("data-copy", rawtext);

  //requestInfo.appendChild(accordion);
}
function displayResponse(webrequest) {
  var requestInfo = document.querySelector("#resInfo");
  while (requestInfo.hasChildNodes()) {
    requestInfo.removeChild(requestInfo.lastChild);
  }

  // Status line (e.g. "OK https://…")
  var statusLine = document.createElement("div");
  var status = document.createElement("div");
  status.className = "makeitBold disinline";
  status.textContent = webrequest.statusLine + " ";
  statusLine.appendChild(status);
  var url = document.createElement("div");
  url.className = "disinline";
  url.textContent = webrequest.url;
  statusLine.appendChild(url);
  requestInfo.appendChild(statusLine);
  requestInfo.appendChild(document.createElement("br"));

  // Prepare tabs wrapper
  var added = false;
  var tablist = createTablistWrapper(); // returns <ul class="nav nav-tabs">
  var tabcontent = createtabcontentWrapper(); // returns <div class="tab-content">
  var randId = Math.random().toString(36).substr(2, 10);

  // Build the “Raw” dump text
  var rawtext = "";
  if (webrequest.url) rawtext = webrequest.statusLine + " " + webrequest.url;

  // 1) HEADERS tab
  if (webrequest.responseHeaders) {
    added = true;
    tablist.appendChild(
      createtabheader("Headers_" + randId, "Header", "WebResheader")
    );
    tabcontent.appendChild(
      createTabData(
        "Headers_" + randId,
        formatHeaders(webrequest.responseHeaders),
        "WebResheader"
      )
    );
    rawtext += getRawHeaders(webrequest.responseHeaders);
  }

  // 2) BODY tab (new)
  if (webrequest.responseBody) {
    console.log("Adding response body tab for:", webrequest.url);

    // Decode Base64 if needed
    let raw = webrequest.responseBody;
    if (webrequest.responseBodyBase64) {
      try {
        raw = atob(raw);
      } catch (e) {
        /* leave as-is */
      }
    }

    // Pretty-print JSON if possible
    let formatted = raw;
    try {
      const obj = JSON.parse(raw);
      formatted = JSON.stringify(obj, null, 2);
    } catch (_) {
      // not JSON — keep raw text
    }

    // Unique IDs and names
    const tabId = "ResponseBody_" + randId;
    const tabName = "WebResBody";
    added = true;

    // Append the “Body” tab header
    tablist.appendChild(createtabheader(tabId, "Body", tabName));

    // Create and append the BODY pane
    const bodyPane = document.createElement("div");
    bodyPane.className = `tab-pane ${tabName}`;
    bodyPane.id = tabId;
    bodyPane.setAttribute("role", "tabpanel");
    bodyPane.innerHTML = `
      <div class="response-body-content">
        <pre>${escapeHtml(formatted)}</pre>
      </div>
    `;
    tabcontent.appendChild(bodyPane);

    // Also add to Raw dump if you use it
    rawtext += "\n\n" + raw;
  } else {
    console.log("No response body found for:", webrequest.url);
  }

  // If we added any tabs, render them
  if (added) {
    requestInfo.appendChild(tablist);
    requestInfo.appendChild(tabcontent);

    // Make sure all headers tabs start active (so at least one pane shows)
    var webres = document.querySelectorAll(".WebResheader");
    for (var i = 0; i < webres.length; i++) {
      if (!webres[i].classList.contains("active")) {
        webres[i].classList.add("active");
      }
    }
  }

  // Wire up the Raw-button with your accumulated rawtext
  var rawBtn = document.querySelector("#ResRawButton");
  rawBtn.removeAttribute("data-copy");
  rawBtn.setAttribute("data-copy", rawtext);
}

function createTablistWrapper() {
  var tablist = document.createElement("ul");
  tablist.className = "nav nav-tabs";
  tablist.setAttribute("role", "tablist");
  //parentTab.appendChild(tablist);

  return tablist;
}
// Add these functions to display.js

function formatPayload(payload) {
  var div = document.createElement("div");
  div.className = "payload-content";

  var pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordWrap = "break-word";
  pre.style.backgroundColor = "#f8f9fa";
  pre.style.padding = "10px";
  pre.style.border = "1px solid #dee2e6";
  pre.style.borderRadius = "4px";

  // Try to format as JSON if possible
  try {
    var parsed = JSON.parse(payload);
    pre.textContent = JSON.stringify(parsed, null, 2);
    pre.style.color = "#0066cc";
  } catch (e) {
    // Not JSON, display as plain text
    pre.textContent = payload;
  }

  div.appendChild(pre);
  return div;
}
function formatResponseBody(body, isBase64) {
  var div = document.createElement("div");
  div.className = "response-body-content";

  var pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordWrap = "break-word";
  pre.style.backgroundColor = "#f8f9fa";
  pre.style.padding = "10px";
  pre.style.border = "1px solid #dee2e6";
  pre.style.borderRadius = "4px";
  pre.style.maxHeight = "400px";
  pre.style.overflow = "auto";

  var content = body;

  // Decode base64 if needed
  if (isBase64) {
    try {
      content = atob(body);
    } catch (e) {
      content = body; // Use raw if decode fails
    }
  }

  // Try to format as JSON
  try {
    var parsed = JSON.parse(content);
    pre.textContent = JSON.stringify(parsed, null, 2);
    pre.style.color = "#0066cc";
  } catch (e) {
    // Check if it's HTML
    if (
      content.toLowerCase().includes("<html") ||
      content.toLowerCase().includes("<!doctype")
    ) {
      pre.innerHTML = escapeHtml(content);
      pre.style.color = "#cc6600";
    } else {
      // Plain text
      pre.textContent = content;
    }
  }

  div.appendChild(pre);
  return div;
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function createtabcontentWrapper() {
  var tabcontent = document.createElement("div");
  tabcontent.className = "tab-content";
  return tabcontent;
}
function createtabheader(id, text, cssheader) {
  var navitem = document.createElement("li");
  navitem.className = "nav-item";
  var navlink = document.createElement("a");
  navlink.className = "nav-link " + cssheader;
  navlink.href = "#" + id;
  navlink.setAttribute("data-toggle", "tab");
  navlink.setAttribute("role", "tab");
  navlink.textContent = text;
  navitem.appendChild(navlink);
  return navitem;
}
function createTabData(id, data, cssheader) {
  var navitem = document.createElement("div");
  navitem.className = "tab-pane " + cssheader;
  navitem.id = id;
  navitem.setAttribute("role", "tabpanel");
  navitem.appendChild(data);
  return navitem;
}
/*function createAccordianCard(text,data)
  {
    var randId=Math.random().toString(36).substr(2, 10);

    var card=document.createElement("div");
    card.className="card";
      var cardReader=document.createElement("div");
      cardReader.className="card-header";
      cardReader.setAttribute("role","tab");
      cardReader.id="headingOne_"+randId;
        var h5=document.createElement("h5");
        h5.className="mb-0";
          var atag=document.createElement("a");
          atag.setAttribute("data-toggle","collapse");
          //atag.setAttribute("data-parent","#accordion");
          atag.setAttribute("href","#collapseOne_"+randId);
          atag.setAttribute("aria-expanded","false");
          atag.setAttribute("aria-controls","collapseOne_"+randId);
          atag.textContent=text;
        h5.appendChild(atag);
        cardReader.appendChild(h5);
      card.appendChild(cardReader);

    var collone=document.createElement("div");
    collone.id="collapseOne_"+randId;
    collone.className="collapse";
    collone.setAttribute("role","tabpanel");
    collone.setAttribute("aria-labelledby","headingOne_"+randId);
    var cardblock=document.createElement("div");
    cardblock.className="card-block";
    cardblock.appendChild(data);
    collone.appendChild(cardblock);
    card.appendChild(collone);
    return card;
  }*/

function changeTimeLineHighlight(currentTime, changeTimeLine) {
  var childDivs = document
    .querySelector("#Timeline")
    .querySelectorAll("div.timeNode");
  var lastChildDiv;
  for (i = 0; i < childDivs.length; i++) {
    var child = childDivs[i];

    //console.log(child);
    if (child.getAttribute("time")) {
      if (child.classList.contains("timeline-badge")) continue;
      var divTime = parseFloat(child.getAttribute("time"));
      if (divTime <= currentTime) {
        if (
          !child.parentElement.parentElement.classList.contains(
            "timelinePlayed"
          )
        )
          child.parentElement.parentElement.classList.add("timelinePlayed");
        lastChildDiv = child;
      } else {
        if (
          child.parentElement.parentElement.classList.contains("timelinePlayed")
        )
          child.parentElement.parentElement.classList.remove("timelinePlayed");
      }
    }
  }
  //console.log(lastChildDiv);
  //console.log(lastChildDiv.parentElement.parentElement.parentElement.offsetTop);
  if (lastChildDiv) {
    if (changeTimeLine)
      document.querySelector("#Timeline").scrollTop =
        lastChildDiv.parentElement.parentElement.parentElement.offsetTop -
        screen.height / 4 +
        100;
  }
}

var processJson = function (event) {
  var file = this.files[0];
  var type = file.type;
  var fr = new FileReader();
  fr.onload = function (e) {
    convertStringToObject(e.target.result);
    /*InputReq=JSON.parse(e.target.result);
        InputReq.forEach( function(i)
        {
          console.log(i);
          req.set(i.requestid,i.webReq);
          //displayRequest(i.webReq);
          //displayResponse(i.webReq);
        });
        console.log(req);// e.target.result should contain the text
        */
  };
  fr.readAsText(file);
};
function convertStringToObject(stringjson) {
  // Add null/undefined checking before parsing
  if (!stringjson || stringjson === "undefined" || stringjson === "null") {
    console.warn("Invalid JSON string provided:", stringjson);
    req = new Map();
    seq_timeline = new Array();
    displayTimeline([]);
    setOnClickForDivs();
    return [];
  }

  try {
    // 1) parse and reset
    req = new Map();
    InputReq = JSON.parse(stringjson);

    // 2) normalize timestamps
    // collect all numeric requesttimes
    const allRequestTimes = InputReq.map((i) => i.webReq.requesttime).filter(
      (t) => typeof t === "number"
    );
    const baseTime = allRequestTimes.length ? Math.min(...allRequestTimes) : 0;

    // 3) build timeline entries
    seq_timeline = [];
    InputReq.forEach(function (i) {
      req.set(i.requestid, i.webReq);

      if (typeof i.webReq.requesttime === "number") {
        const temp = new Timeline();
        temp.time = i.webReq.requesttime - baseTime;
        temp.url = i.webReq.url;
        temp.method = i.webReq.method;
        temp.isRequest = true;
        seq_timeline.push(temp);
      }
      if (typeof i.webReq.responseTime === "number") {
        const temp = new Timeline();
        temp.time = i.webReq.responseTime - baseTime;
        temp.url = i.webReq.url;
        temp.statusCode = i.webReq.statusCode;
        temp.isRequest = false;
        seq_timeline.push(temp);
      }
    });

    // 4) sort, render, wire up
    seq_timeline = sortTimelineArray(seq_timeline);
    displayTimeline(seq_timeline);
    setOnClickForDivs();
    $(function () {
      $('[data-toggle="tooltip"]').tooltip();
    });

    return InputReq;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.error("Problematic string:", stringjson);
    req = new Map();
    seq_timeline = [];
    displayTimeline([]);
    setOnClickForDivs();
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processRecording") {
    console.log(
      "Received processRecording message, but using storage approach instead"
    );
    sendResponse({ success: true });
  }
  return true;
});

function copyToClipboard(text, el) {
  var copyTest = document.queryCommandSupported("copy");
  var elOriginalText = el.attr("data-original-title");

  if (copyTest === true) {
    var copyTextArea = document.createElement("textarea");
    copyTextArea.value = text;
    document.body.appendChild(copyTextArea);
    copyTextArea.select();
    try {
      var successful = document.execCommand("copy");
      var msg = successful ? "Copied!" : "Whoops, not copied!";
      el.attr("data-original-title", msg).tooltip("show");
    } catch (err) {
      console.log("Oops, unable to copy");
    }
    document.body.removeChild(copyTextArea);
    el.attr("data-original-title", elOriginalText);
  } else {
    // Fallback if browser doesn't support .execCommand('copy')
    //window.prompt("Copy to clipboard: Ctrl+C or Command+C, Enter", text);
  }
}
function setOnClickForDivs() {
  var childDivs = document
    .querySelector("#Timeline")
    .querySelectorAll("div.timeNode");
  for (i = 0; i < childDivs.length; i++) {
    var child = childDivs[i];
    child.addEventListener("click", changeTimeOnSelected);
  }
}

function changeTimeOnSelected() {
  videoEle.pause();
  videoEle.currentTime = parseFloat(this.getAttribute("time")) + 0.0001;
  var time = this.getAttribute("time");
  changeTimeLine = false;
  setReqResponse(parseFloat(time) + 0.0001, false);
  setTimeout(function () {
    //setReqResponse(parseFloat(time)+0.0001,false);
    changeTimeLine = true;
    //alert(1);
  }, 1000);
}

function sortTimelineArray(arrayTimeline) {
  arrayTimeline.sort(function (a, b) {
    return a.time - b.time;
  });
  return arrayTimeline;
}
function displayTimeline(arrayTimeline) {
  var timeline = document.querySelector("#Timeline");
  timeline.innerHTML = "";
  arrayTimeline.forEach(function (i) {
    var event = document.createElement("div");
    if (i.isRequest == true) {
      /*event.className = "alert alert-primary request";
        event.setAttribute('time',i.time);
        event.textContent = i.time + '|'+i.method+'|'+i.url;*/
      timeline.appendChild(
        createDomForTimeline(i.isRequest, i.time, i.method, i.url)
      );
    } else {
      /*event.className = "alert alert-secondary response";
        event.setAttribute('time',i.time);
        event.textContent = i.time + '|'+i.statusCode+'|'+i.url;*/
      timeline.appendChild(
        createDomForTimeline(i.isRequest, i.time, i.statusCode, i.url)
      );
    }
    //timeline.appendChild(event);
  });
}
function createDomForTimeline(isRequest, reqtime, methodStatusCode, url) {
  var li = document.createElement("li");
  if (isRequest == false) li.className = "timeline-inverted";
  var badge = document.createElement("div");
  if (isRequest == false) badge.className = "timeline-badge timeNode";
  else badge.className = "timeline-badge warning timeNode";
  badge.setAttribute("time", reqtime);
  badge.textContent = reqtime.toFixed(2);
  li.appendChild(badge);
  var panel = document.createElement("div");
  panel.className = "timeline-panel";
  var heading = document.createElement("div");
  heading.className = "timeline-heading";
  panel.appendChild(heading);
  var title = document.createElement("div");
  title.className = "timeline-title timeNode";
  var urlcopy = url;
  if (url.length > 50) {
    urlcopy = urlcopy.substring(0, 50);
    urlcopy = urlcopy + "....";
  }

  title.textContent = methodStatusCode + " " + urlcopy;
  //title.setAttribute("data-toggle","tooltip");
  //title.setAttribute("data-placement","top");
  title.setAttribute("title", url);
  title.setAttribute("time", reqtime);

  //var tooltip=document.createElement("div");
  //tooltip.className="tooltiptext";
  //tooltip.textContent=url;
  //title.appendChild(tooltip);
  heading.appendChild(title);
  li.appendChild(panel);
  return li;
}
function findCorrectWebReq(givenTime) {
  var currentTime = 0;
  var foundWebReq = 0;
  req.forEach(function (i, j) {
    if (i.requesttime <= givenTime)
      if (i.requesttime > currentTime) {
        currentTime = i.requesttime;
        foundWebReq = j;
      }
  });
  return foundWebReq;
}
function search(str) {
  //console.log(str);
  var found = 0;
  req.forEach(function (i, j) {
    //console.log(JSON.stringify(i));
    if (JSON.stringify(i).toLowerCase().includes(str.toLowerCase())) {
      if (found == 0) found = j;
    }
  });
  if (found != 0) {
    videoEle.currentTime = req.get(found).requesttime + 0.001;
  } else {
    alert("Text Not Found");
  }
  return found;
}
function findCorrectWebRes(givenTime) {
  var currentTime = 0;
  var foundWebReq = 0;
  req.forEach(function (i, j) {
    if (i.responseTime <= givenTime)
      if (i.responseTime > currentTime) {
        currentTime = i.responseTime;
        foundWebReq = j;
      }
  });
  return foundWebReq;
}
function getCurlHeaders(headers) {
  var returnText = "";
  if (headers) {
    var headersArray = Array.isArray(headers)
      ? headers
      : Object.entries(headers).map(([name, value]) => ({ name, value }));
    headersArray.forEach(function (el) {
      returnText += " -H '" + el.name + ":" + el.value + "'";
    });
  }
  return returnText;
}
function getRawHeaders(headers) {
  var returnText = "";
  if (headers) {
    var headersArray = Array.isArray(headers)
      ? headers
      : Object.entries(headers).map(([name, value]) => ({ name, value }));
    headersArray.forEach(function (el) {
      returnText += "\n" + el.name + ":" + el.value;
    });
  }
  return returnText;
}
function getCookies(headers) {
  var listOfBody;
  if (headers) {
    var headersArray = Array.isArray(headers)
      ? headers
      : Object.entries(headers).map(([name, value]) => ({ name, value }));
    headersArray.forEach(function (el) {
      if (el.name == "Cookie") {
        function bodyObj() {}
        listOfBody = new Array();
        //console.log(el.value);
        el.value.split("; ").forEach(function (vl) {
          var cookie = vl.split("=");
          var temp = new bodyObj();
          temp.name = cookie.shift();
          temp.value = cookie.join("=");
          listOfBody.push(temp);
        });
      }
    });
  }
  return listOfBody;
}
function formatFormdata(data) {
  //console.log(data);
  //var div = document.createElement("div");
  function bodyObj() {}
  var listOfBody = new Array();
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      var Obj = new bodyObj();
      Obj.name = key;
      Obj.value = data[key];
      listOfBody.push(Obj);

      //var headerElement= document.createElement("div");
      //headerElement.className = "formdata";
      //headerElement.textContent= key + ": " + data[key]+'';
      //div.appendChild(headerElement);
    }
  }
  return formatHeaders(listOfBody);
  //return div;
}
function getCurlBody(data) {
  var returnText = " -d '";

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      if (returnText == " -d '")
        returnText += key + "=" + String(data[key]).replace("'", "'\\''");
      else
        returnText += "&" + key + "=" + String(data[key]).replace("'", "'\\''");
    }
  }
  return returnText + "'";
}
function getRawBody(data) {
  var returnText = "\n\n";
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      if (returnText == "\n\n") returnText += key + "=" + data[key];
      else returnText += "&" + key + "=" + data[key];
    }
  }
  return returnText;
}
function formatHeaders(headers) {
  //console.log(headers);
  /*var div = document.createElement("div");
    //var text = '';
    //for (name in headers)

    headers.forEach( function(el){
      var headerElement= document.createElement("div");
      headerElement.className = "headerdata";
      headerElement.textContent= el.name + ": " + el.value+'';
      div.appendChild(headerElement);
    });
    
    //div.textContent = text;
    return div;*/
  var tb = document.createElement("table");
  tb.className = "table table-hover table-bordered";
  var thead = document.createElement("thead");
  var tr = document.createElement("tr");
  var thname = document.createElement("th");
  thname.className = "w-50 oversize";
  thname.textContent = "Name";
  tr.appendChild(thname);
  thname = document.createElement("th");
  thname.className = "w-50 oversize";
  thname.textContent = "Value";
  tr.appendChild(thname);
  thead.appendChild(tr);
  var tbody = document.createElement("tbody");

  if (headers) {
    var headersArray = Array.isArray(headers)
      ? headers
      : Object.entries(headers).map(([name, value]) => ({ name, value }));
    headersArray.forEach(function (el) {
      if (el.name == "Cookie") return;
      var trbody = document.createElement("tr");
      var tdName = document.createElement("td");
      tdName.textContent = el.name;
      tdName.className = "w-50 oversize";
      trbody.appendChild(tdName);
      var tdValue = document.createElement("td");
      tdValue.className = "w-50 oversize";
      tdValue.textContent = jsonBeautify(el.value);
      trbody.appendChild(tdValue);
      tbody.appendChild(trbody);
    });
  }
  //tbody.appendChild(trbody);
  tb.appendChild(thead);
  tb.appendChild(tbody);
  return tb;
}
function jsonBeautify(possibleJson) {
  var json;
  try {
    json = JSON.stringify(JSON.parse(possibleJson), null, 2);
  } catch (e) {
    return possibleJson;
  }
  return json;
}
function parseURL(url) {
  var result = {};
  var match = url.match(
    /^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i
  );
  if (!match) return result;
  result.scheme = match[1].toLowerCase();
  result.host = match[2];
  result.port = match[3];
  result.path = match[4] || "/";
  result.fragment = match[5];
  return result;
}
function uploadHandler() {
  document.querySelector("#zip").click();
}

document.querySelector("#zip").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const videoNode = document.querySelector("video");

  JSZip.loadAsync(file).then(function (zip) {
    let jsonFound = false;
    let videoFound = false;

    zip.forEach(function (relativePath, zipEntry) {
      if (zipEntry.name.endsWith(".webm") || zipEntry.name.endsWith(".mkv")) {
        zipEntry.async("blob").then(function (blob) {
          const fileURL = URL.createObjectURL(blob);
          videoNode.src = fileURL;
          videoFound = true;
        });
      }

      if (zipEntry.name.endsWith(".json")) {
        zipEntry.async("text").then(function (text) {
          convertStringToObject(text);
          jsonFound = true;
        });
      }
    });

    setTimeout(() => {
      if (!jsonFound) {
        document.querySelector("#Timeline").innerHTML = "";
        alert("JSON file not found in zip");
      }
      if (!videoFound) {
        alert("Video file not found in zip");
      }
    }, 1000);

    document.getElementById("drop-zone").className = "upload-drop-zone hideit";
  });
});
