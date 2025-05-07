
let isAlreadyCalling = false;
let getCalled = false;
const existingCalls = [];
const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();
let mediaRecorder;
let recordedChunks = [];

function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(
    ".active-user.active-user--selected"
  );

  alreadySelectedUser.forEach(el => {
    el.setAttribute("class", "active-user");
  });
}

function createUserItemContainer(socketId) {
  const userContainerEl = document.createElement("div");

  const usernameEl = document.createElement("p");

  userContainerEl.setAttribute("class", "active-user");
  userContainerEl.setAttribute("id", socketId);
  usernameEl.setAttribute("class", "username");
  usernameEl.innerHTML = `Socket: ${socketId}`;

  userContainerEl.appendChild(usernameEl);

  userContainerEl.addEventListener("click", () => {
    unselectUsersFromList();
    userContainerEl.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
    callUser(socketId);
  });

  return userContainerEl;
}

async function callUser(socketId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", {
    offer,
    to: socketId
  });
}

function updateUserList(socketIds) {
  const activeUserContainer = document.getElementById("active-user-container");

  socketIds.forEach(socketId => {
    const alreadyExistingUser = document.getElementById(socketId);
    if (!alreadyExistingUser) {
      const userContainerEl = createUserItemContainer(socketId);

      activeUserContainer.appendChild(userContainerEl);
    }
  });
}

const socket = io.connect();

socket.on("update-user-list", ({ users }) => {
  updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
  const elToRemove = document.getElementById(socketId);

  if (elToRemove) {
    elToRemove.remove();
  }
});

socket.on("call-made", async data => {
  if (getCalled) {
    const confirmed = confirm(
      `User "Socket: ${data.socket}" wants to call you. Do accept this call?`
    );

    if (!confirmed) {
      socket.emit("reject-call", {
        from: data.socket
      });

      return;
    }
  }

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("make-answer", {
    answer,
    to: data.socket
  });
  getCalled = true;
});

socket.on("answer-made", async data => {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );

  if (!isAlreadyCalling) {
    callUser(data.socket);
    isAlreadyCalling = true;
  }
});

socket.on("call-rejected", data => {
  alert(`User: "Socket: ${data.socket}" rejected your call.`);
  unselectUsersFromList();
});

peerConnection.ontrack = function({ streams: [stream] }) {
  // console.log('STREAM = ',streams);
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
    console.log('stream=',stream)
  }
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true }
).then(stream => {
  const localVideo = document.getElementById("local-video");
  if (localVideo) {
    localVideo.srcObject = stream;
  }

  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  console.log('MediaStream tracks:', stream.getTracks());
  setupRecording(stream);
}).catch(error => {
  console.warn(error.message);
});

function setupRecording(localStream) {
  const remoteVideo = document.getElementById("remote-video");
  const localVideo = document.getElementById("local-video");
  const canvas = document.getElementById("recording-canvas");
  const ctx = canvas.getContext("2d");

  const canvasStream = canvas.captureStream();
  canvasStream.addTrack(localStream.getAudioTracks()[0]);

  function drawVideos() {
    if (remoteVideo.readyState === remoteVideo.HAVE_ENOUGH_DATA) {
      canvas.width = remoteVideo.videoWidth;
      canvas.height = remoteVideo.videoHeight;
      ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
      const localWidth = canvas.width * 0.3;
      const localHeight = canvas.height * 0.3;
      ctx.drawImage(localVideo, canvas.width - localWidth, canvas.height - localHeight, localWidth, localHeight);
    }
    requestAnimationFrame(drawVideos);
  }

  remoteVideo.addEventListener('play', drawVideos);
  localVideo.addEventListener('play', drawVideos);

  const recordButton = document.getElementById("record-button");
  recordButton.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      recordButton.innerText = "Start Recording";
    } else {
      startRecording(canvasStream); 
      recordButton.innerText = "Stop Recording";
    }
  });
}

function startRecording(stream) {
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
  recordedChunks = [];
  mediaRecorder.start();
}

function handleDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

function handleStop() {
  const blob = new Blob(recordedChunks, {
    type: "video/webm"
  });

  convertToMp4(blob);
}

async function convertToMp4(blob) {
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();

  const webmFile = 'recorded_video.webm';
  const mp4File = 'recorded_video.mp4';

  ffmpeg.FS('writeFile', webmFile, await fetchFile(blob));

  await ffmpeg.run('-i', webmFile, '-c:v', 'libx264', '-c:a', 'aac', mp4File);

  const data = ffmpeg.FS('readFile', mp4File);

  const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'recorded_video.mp4';
  a.click();
  window.URL.revokeObjectURL(url);
}


