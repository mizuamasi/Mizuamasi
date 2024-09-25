// audio.js

import { getGLContext } from './shader.js';

let audioContext;
let analyser;
let audioDataArray;
let waveformCanvas;
let waveformCtx;
let isMicOn = true;
let isWaveformOn = true;
let currentStream;
let selectedMicDeviceId = null;
let gl;
let audioTexture;

export function initAudio() {
    gl = getGLContext();

    // マイクデバイスのリストを取得
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const micSelect = document.getElementById('mic-select');
        devices.forEach(device => {
            if (device.kind === 'audioinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${micSelect.length + 1}`;
                micSelect.appendChild(option);
            }
        });
    });

    startMic();
}

export function toggleMic() {
    isMicOn = !isMicOn;
    document.getElementById('toggle-mic').innerHTML = isMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    if (isMicOn) {
        startMic();
    } else {
        stopMic();
    }
}

export function toggleWaveform() {
    isWaveformOn = !isWaveformOn;
    document.getElementById('toggle-waveform').innerHTML = isWaveformOn ? '<i class="fas fa-wave-square"></i>' : '<i class="fas fa-wave-square"></i>';
    const waveformCanvasElement = document.getElementById('waveform-canvas');
    waveformCanvasElement.style.display = isWaveformOn ? 'block' : 'none';
}

export function changeMicDevice() {
    selectedMicDeviceId = document.getElementById('mic-select').value;
    if (isMicOn) {
        startMic();
    }
}

function startMic() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        audio: {
            deviceId: selectedMicDeviceId ? { exact: selectedMicDeviceId } : undefined
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        currentStream = stream;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        const bufferLength = analyser.frequencyBinCount;
        audioDataArray = new Uint8Array(bufferLength);
        source.connect(analyser);

        // オーディオテクスチャの作成
        audioTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, audioTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, bufferLength, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // 波形表示用のキャンバス
        waveformCanvas = document.getElementById('waveform-canvas');
        waveformCtx = waveformCanvas.getContext('2d');
        waveformCanvas.width = waveformCanvas.parentElement.clientWidth;
        waveformCanvas.height = 50;
        waveformCanvas.style.display = isWaveformOn ? 'block' : 'none';

        requestAnimationFrame(drawWaveform);
    }).catch(err => {
        console.error('マイクの初期化に失敗しました:', err);
    });
}

function stopMic() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

function drawWaveform() {
    if (!waveformCtx || !audioDataArray || !isWaveformOn) return;
    waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    waveformCtx.fillStyle = '#00ff00';

    const barWidth = waveformCanvas.width / audioDataArray.length;
    let x = 0;
    for (let i = 0; i < audioDataArray.length; i++) {
        const barHeight = audioDataArray[i] / 255 * waveformCanvas.height;
        waveformCtx.fillRect(x, waveformCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth;
    }

    requestAnimationFrame(drawWaveform);
}

export function updateAudioTexture() {
    analyser.getByteFrequencyData(audioDataArray);
    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, audioDataArray.length, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, audioDataArray);
}
