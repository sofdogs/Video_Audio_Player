// script.js 

let audioContext;
let audioDownladed = false; // for play button 

window.onload = function (){ 
    audioContext =  new(window.AudioContext || window.webkitAudioContext)(); 
}

// to conver the video into a file/blob
async function videoToBlob(src){ 
    try{ 
        const response = await fetch(src); 
        const videoBlob = await response.blob();
        await extractAndPlayAudio(videoBlob);
    } catch (error) { 
        console.error('Error fetching src. ', error);
    }
}

async function extractAndPlayAudio(videoFile) { 

    if(!audioContext){ 
        audioContext = new(window.AudioContext || window.webkitAudioContext)(); 
    }

    if(audioContext.state === 'suspended'){ 
        await audioContext.resume();
    }
 
    // creating audio context env 
    //const audioContext =  
       // new (window.AudioContext || window.webkitAudioContext)(); 

    // instance of FileReader to read contents of video file as ArrayBuffer
    const reader = new FileReader();  
  
    // reading contents as a binary array bugger 
    reader.readAsArrayBuffer(videoFile); 

    // once file is read, onload event is triggered 
    reader.onload = async function () { 
        // binary array data saved from FileReader 
        const arrayBuffer = reader.result; 

        // decode binary audio data into an audio buffer array
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer); 

        // encoding audio data to WAV
        const wavData = encodeWav(audioBuffer); 

        // creating blob from WAV data and triggering downloadBlob funcion 
        const blob = new Blob([ wavData ], { type: 'audio/wav' });
        downloadBlob(blob, 'extracted_audio.wav');
    }; 
} 

// function to convert raw audio data to WAV file
function encodeWav(audioBuffer){ 
    // getting number of channels, samples, and length of WAV file for conversion 
    const numChannels = audioBuffer.numberOfChannels; // 1 -> mono, 2 -> stereo 
    const sampleRate = audioBuffer.sampleRate; 
    const length = 44 + (audioBuffer.length * numChannels * 2); // 44-bytes for riff chunk and 2 sub chunks + audio data size

      // creating buffer to hole WAV data
    const buffer = new ArrayBuffer(length); 
    const view = new DataView(buffer); // used to read and write nums & strs into array buffer

    /* WAV HEADER */
    // RIFF identifier 
    writeString(view, 0, 'RIFF');
    // chunk size 
    view.setUint32(4, length - 8, true);
    // RIFF type (WAVE)
    writeString(view, 8, 'WAVE');

    /* FMT SUB CHUNK */
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    //sub chunk 1 size
    view.setUint32(16, 16, true); // 16 bytes for PCM!
    // audio format
    view.setUint16(20, 1, true); // value 1 for PCM 
    // number of channels
    view.setUint16(22, numChannels, true);
    // sample rate 
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align) 
    view.setUint32(28, sampleRate * numChannels * 2, true); //  SampleRate * NumChannels * (BitsPerSample/8)
    // block align 
    view.setUint16(32, numChannels * 2, true); // NumChannels * (BitsPerSample/8) 
    // bits per sample 
    view.setUint16(34, 16, true);

    /* DATA SUB CHUNK */
    // data chunk identifier 
    writeString(view, 36, 'data');
    // data chunk length 
    view.setUint32(40, length - 44 , true);

    // interleaving audio
    let offset = 44; // audio data begins  
    for (let i = 0; i < audioBuffer.length; i++) {
        for(let j = 0; j < audioBuffer.numberOfChannels; j++) { 
            const channelData = audioBuffer.getChannelData(j); 

            view.setInt16(offset, channelData[i] * 0x7FFF, true);
            offset += 2;
        }
    }

    return buffer;
}

// helper function to write string into DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

/* Video scripts */
const video = document.querySelector("video")
const videoContainer  = document.querySelector(".video-container")
// buttons ...
const playPauseBtn = document.querySelector(".play-pause-btn")
const theaterBtn = document.querySelector(".theater-btn")
const fullScreenBtn = document.querySelector(".full-screen-btn")
const miniPlayerBtn = document.querySelector(".mini-player-btn")
const captionsBtn = document.querySelector(".captions-btn")
const speedBtn = document.querySelector(".speed-btn")
const muteBtn  = document.querySelector(".mute-btn")


// misc ...
const volumeSlider  = document.querySelector(".volume-slider")
const currentTimeElem = document.querySelector(".current-time")
const totalTimeElem = document.querySelector(".total-time")
const previewImg = document.querySelector(".preview-img")
const thumbnailImg = document.querySelector(".thumbnail-img")
const timelineContainer = document.querySelector(".timeline-ctn")

// keyboard event listeners ... 
document.addEventListener("keydown", e=>{ 
    const tagName = document.activeElement.tagName.toLowerCase() 

    if(tagName === "input") return 
    switch(e.key.toLowerCase()){
        case " ": 
            if(tagName === "button") return 
        case "k":
            togglePlay()
            break
        case "f": 
            toggleFullScreenMode()
            break
        case "t": 
            toggleTheaterMode()
            break
        case "o": 
            toggleMiniPlayerMode()
            break
        case "m": 
            toggleMute()
            break
        case "arrowleft": 
            case "j": 
                skip (-5) 
                break
        case "arrowright": 
            case "l": 
                skip (5) 
                break
        case "c": 
            toggleCaptions()
            break
    }
})

//Timeline
timelineContainer.addEventListener("mousemove",handleTimelineUpdate)

function handleTimelineUpdate(e){ 
    const rect = timelineContainer.getBoundingClientRect()
    const percent = Math.min(Math.max(0,e.x-rect.x), rect.width)/rect.width
    const previewImgNumber = Math.max(1, Math.floor((percent * video.duration)/10))
    const previewImgSrc = `assets/previewImgs/preview${previewImgNumber}.jpg`
    previewImg.src = previewImgSrc
    timelineContainer.getElementsByClassName.setProperty("--preview-position", percent)
}

//Playback Speed 
speedBtn.addEventListener("click", changePlaybackSpeed)

function changePlaybackSpeed(){ 
    let newPlaybackRate = video.playbackRate + .25
    if(newPlaybackRate > 2) newPlaybackRate = 0.25
    video.playbackRate = newPlaybackRate
    speedBtn.textContent = `${newPlaybackRate}`
}

//Duration
video.addEventListener("timeupdate", () => { 
    currentTimeElem.textContent = formatDuration(video.currentTime)
})

video.addEventListener("loadeddata", () => { 
    totalTimeElem.textContent = formatDuration(video.duration)
})
const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
})
function formatDuration(time){ 
    const seconds = Math.floor(time % 60)
    const minutes = Math.floor(time / 60) % 60
    const hours = Math.floor(time / 3600)

    if (hours === 0){ 
        return `${minutes}:${leadingZeroFormatter.format(seconds)}`
    } else { 
        return `${hours}:${leadingZeroFormatter.format(minutes)}:${leadingZeroFormatter.format(seconds)}`
    }
}

function skip(duration) { 
    video.currentTime += duration
}

//Captions
/*
const captions = video.textTracks[0]
captions.mode = "hidden"

captionsBtn.addEventListener("click", toggleCaptions)

function toggleCaptions(){ 
    const isHidden = captions.mode === "hidden"
    captions.mode = isHidden ? "showing" : "hidden"
    videoContainer.classList.toggle("captions", isHidden)
}
*/

//Volume 
muteBtn.addEventListener("click", toggleMute)
volumeSlider.addEventListener("input", e => {
    video.volume = e.target.value
    video.muted = e.target.value === 0
})

function toggleMute(){ 
    video.muted = !video.muted
}

video.addEventListener("volumechange", () => { 
    volumeSlider.value = video.volume
    let volumeLevel 
    if(video.muted || video.volume == 0){ 
        volumeLevel = "muted"
    } else if (video.volume >= .5) { 
        volumeLevel = "high"
    } else { 
        volumeLevel = "low" 
    }

    videoContainer.dataset.volumeLevel = volumeLevel
})

// View Modes
theaterBtn.addEventListener("click", toggleTheaterMode)
fullScreenBtn.addEventListener("click", toggleFullScreenMode)
miniPlayerBtn.addEventListener("click", toggleMiniPlayerMode)

function toggleTheaterMode(){ 
    videoContainer.classList.toggle("theater")
}

function toggleFullScreenMode(){ 
    if(document.fullscreenElement == null){ 
        videoContainer.requestFullscreen()
    } else {
        document.exitFullscreen()
    }
}

document.addEventListener("fullscreenchange", () =>{ 
    videoContainer.classList.toggle("full-screen", document.fullscreenElement)
})

function toggleMiniPlayerMode(){ 
    if(videoContainer.classList.contains("mini-player")){ 
        document.exitPictureInPicture()
    } else {
        video.requestPictureInPicture()
    }
}

video.addEventListener("enterpictureinpicture", () =>{ 
    videoContainer.classList.add("mini-player")
})

video.addEventListener("leavepictureinpicture", () =>{ 
    videoContainer.classList.remove("mini-player")
})

// Play/Pause ...
playPauseBtn.addEventListener("click", togglePlay)
video.addEventListener("click", togglePlay) //allows you to play/pause when click inside video 

// if video is paused you can play or if video is playing you can pause
function togglePlay(){ 
    video.paused ? video.play() : video.pause()
}

// event listeners to switch between play and pause icons 
video.addEventListener("play", () => { 
    videoContainer.classList.remove("paused")
    if(!audioDownladed){ 
        videoToBlob(video.src);
        audioDownladed = true;
    }
})

video.addEventListener("pause", () => { 
    videoContainer.classList.add("paused")
})
