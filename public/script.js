// DOM
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const otherCanvasElement = document.getElementsByClassName('output_second')[0];
const otherCanvasCtx = otherCanvasElement.getContext('2d');
const btm = document.getElementById('bottom');

let poseText = document.getElementById('pose')
let poserText = document.getElementById('pose_second')

let outText = document.getElementById('out')
let countdownText = document.getElementById('countdown')
let rpsText = document.getElementById('rps')

// Audio
let audio = {
  getReady: new Audio('./audio/getReady.wav'),
  rps: new Audio('./audio/rps.wav'),
  smile: new Audio('./audio/smile.wav'),
  lose: new Audio('./audio/lose.wav'),
  win: new Audio('./audio/win.wav'),
  tie: new Audio('./audio/tie.wav'),
  camera: new Audio('./audio/cameraShutter.wav'),
  click: new Audio('./audio/click.wav')
}

for (let a in audio) {
  audio[a].volume = 0.75
}

// Spaghetti
let r = {}
let captures = []
let poses = {}
let lastPoses = []
let otherOtherImage = new window.Image();

function mostFreqStr(r) { var t = {}, n = 0, o = []; return r.forEach((r => { t[r] ? t[r]++ : t[r] = 1, t[r] > n ? (n = t[r], o = [r]) : t[r] === n && o.push(r) })), o }

otherOtherImage.addEventListener("load", function() {
  audio.camera.play()
  poserText.innerText = ``

  let oy = 720

  let oyoyoy = setInterval(() => {
    otherCanvasCtx.drawImage(otherOtherImage, 0, oy);
    oy -= 80
    if (oy <= 0) {
      clearInterval(oyoyoy)
      otherCanvasCtx.drawImage(otherOtherImage, 0, 0);
    }
  }, 1)
});

function setOtherImage(strDataURI) {
  otherOtherImage.setAttribute("src", strDataURI);
}
function clearOtherImage() {
  otherCanvasCtx.clearRect(0, 0, otherCanvasElement.width, otherCanvasElement.height)

  let gradient = otherCanvasCtx.createLinearGradient(0, 0, otherCanvasElement.width, otherCanvasElement.height);

  gradient.addColorStop(0, "#0d0d0d");
  gradient.addColorStop(1, "#1c1c1c");

  otherCanvasCtx.fillStyle = gradient;
  otherCanvasCtx.fillRect(0, 0, otherCanvasElement.width, otherCanvasElement.height);

  poserText.innerText = `Waiting...`
}
clearOtherImage()

let camX = 500
let draw = true

function onResults(results) {
  if (!draw) return;

  r = results

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (r.multiHandLandmarks[0]) {
    let hm = r.multiHandLandmarks[0][0].x * 1000

    let acamX = hm - 150;

    if (Math.abs(acamX - camX) > 150) {
      if (camX < acamX) {
        camX += 25
      } else {
        camX -= 25
      }
    }
  }
  canvasCtx.drawImage(results.image, camX, 0, 720, 720, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.fillStyle = "white";
  canvasCtx.font = "30px Arial";
  canvasCtx.textAlign = "center";
  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      /*
      for(let i=0;i<landmarks.length;i++){
        let z = landmarks[i].z*300
        canvasCtx.fillRect(canvasElement.width*landmarks[i].x, canvasElement.height*landmarks[i].y, z,z);
      }
      
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
        { color: '#00FF00', lineWidth: 5 });
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
      */

    }
  }
  let ca = calcAction()
  lastPoses.push(ca.name)
  if (mostFreqStr(lastPoses).length > 1) {
    poseText.innerText = `Calculating...`
  } else {
    poseText.innerText = mostFreqStr(lastPoses)
  }

  if (lastPoses.length > 5) lastPoses.shift();
  canvasCtx.restore();
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.9,
  minTrackingConfidence: 0.3
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});
camera.start();

fetch(`./poses.json`).then(async (resp) => {
  resp = await resp.json()

  for (let i = 0; i < resp.length; i++) {
    fetch(resp[i].files.right).then(async (re) => {
      re = await re.json()
      poses[resp[i].name] = re
      console.log(resp[i].name + ` loaded`)
    })
  }
})

let score, ghost, scores, pose;

function calcAction() {
  if (!r.multiHandLandmarks[0]) return {
    name: `Waiting for hand`
  };

  let re = [...r.multiHandLandmarks[0]]
  let changeX = re[0].x
  let changeY = re[0].y
  let changeZ = re[0].z

  for (let i = 0; i < re.length; i++) {
    re[i].x -= changeX
    re[i].y -= changeY
    re[i].z -= changeZ
  }

  scores = []

  for (pose in poses) {
    score = 9999;
    ghost = []

    for (let part = 0; part < poses[pose].length; part++) {
      let sco = 0
      for (let dot = 0; dot < poses[pose][part].length; dot++) {
        if (poses[pose][part][dot]?.x && re[dot]?.x) {
          sco += Math.abs(poses[pose][part][dot].x - re[dot].x)
          sco += Math.abs(poses[pose][part][dot].y - re[dot].y)
          sco += Math.abs(poses[pose][part][dot].z - re[dot].z)
        }
      }

      if (score > sco && sco !== 0) {
        score = sco
        ghost = poses[pose][part]
      }
    }

    scores.push({ score: score, name: pose, ghost: ghost })
  }
  scores = scores.sort((a, b) => { return a.score - b.score })
  if (!scores[0]) return `Calculating...`;
  return {
    name: scores[0].name,
    ghost: scores[0].ghost
  }
}

$(document).keypress(function(event) {
  if (event.originalEvent.key == 'c') {
    console.log(`Capture`)

    if (!r.multiHandLandmarks[0]) {
      console.log("no")
      return
    }

    let re = [...r.multiHandLandmarks[0]]

    let changeX = re[0].x
    let changeY = re[0].y
    let changeZ = re[0].z

    for (let i = 0; i < re.length; i++) {
      re[i].x -= changeX
      re[i].y -= changeY
      re[i].z -= changeZ
      re[i].x = Number(re[i].x.toFixed(4))
      re[i].y = Number(re[i].y.toFixed(4))
      re[i].z = Number(re[i].z.toFixed(4))
    }

    captures.push(re)
  }
  if (event.originalEvent.key == 'e') {
    console.log(`Export`)
    console.log(captures)
  }
  if (event.originalEvent.key == 'p') {
    console.log(poses)
  }
  if (event.originalEvent.key == 'd') {
    console.log(calcAction())
  }
});

const socket = io();

let username = ``
let cloc = 0
let countdown = false
let cd = 0
let opponent = ``

socket.on("connect", () => {
  console.log(socket.id); // x8WIv7-mJelg7on_ALbx
});

socket.on('li', (is, un) => {
  if (is) {
    username = un
    btm.hidden = false
    document.getElementById('loginContainer').hidden = true
  } else {
    document.getElementById('loginContainer').hidden = false
  }
})

socket.on('waiting', () => {
  outText.innerText = `Nobody here? Share the game!`
  rpsText.innerText = `Looking for an opponent`
  countdown = false

  btm.classList.remove('green')
  btm.classList.remove('red')
  draw = true
})

socket.on('inRoom', (other) => {
  clearOtherImage()
  outText.innerText = `${username} VS ${other}`
  opponent = other

  btm.classList.remove('green')
  btm.classList.remove('red')
  draw = true
})

socket.on('time', (clo) => {
  cloc = clo // clockity click click clock
})

socket.on("countdown", (t, c) => {
  console.log(c, Date.now())
  cd = c - cloc + Date.now()

  if (t == 0) {
    rpsText.innerText = `Smile!`
    audio.smile.play()
    setTimeout(() => {
      rpsText.innerText = `Get ready...`
      audio.getReady.play()
      setTimeout(() => {
        draw = true
      }, 1000)
    }, 2500)

    countdown = true
  } else if (t == 1) {
    clearOtherImage()
    rpsText.innerText = `Rock/paper/scissors!`
    audio.rps.play()
    countdown = true
  } else {
    socket.emit(`pose`, mostFreqStr(lastPoses).join(), socket.id)
    rpsText.innerText = `The winners are...`
    countdown = false
  }
})

socket.on('otherImage', (img) => {
  setOtherImage(img)
})

socket.on('sendImage', () => {
  audio.click.play()
  //socket.emit('image',canvasElement.toDataURL(),socket.id)
  draw = false
})

socket.on('winner', (winner, compare, poseA, poseB) => {
  setTimeout(() => {
    if (compare == 1) {
      poseText.innerText = poseA
      poserText.innerText = poseB
    } else {
      poseText.innerText = poseB
      poserText.innerText = poseA
    }

    if (compare == winner) {
      rpsText.innerText = `You win!`
      btm.classList.remove('red')
      btm.classList.add('green')
      audio.win.play()
    } else if (winner == 0) {
      rpsText.innerText = `It's a tie.`
      audio.tie.play()
    } else {
      rpsText.innerText = `You lose...`
      audio.lose.play()
      btm.classList.remove('green')
      btm.classList.add('red')
    }
  }, 3000)
})

socket.on("disconnect", () => {
  console.log(socket.id); // undefined
});

setInterval(() => {
  if (countdown) {
    countdownText.innerText = Math.round(Math.abs(Date.now() - cd) / 1000)
  } else {
    countdownText.innerText = `0`
  }
}, 100)

repl_auth({
  id: 'replit'
})