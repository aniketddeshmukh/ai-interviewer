import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';

export default function MicButtonWithWave() {
  const [micOn, setMicOn] = useState(true);
  const waveRef = useRef(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const recognitionRef = useRef(null);
  const animationIdRef = useRef(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        // Directly update the wave div for smooth animation
        if (waveRef.current) {
          const size = 40 + avg;
          waveRef.current.style.width = `${size}px`;
          waveRef.current.style.height = `${size}px`;
        }
        animationIdRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopMic = () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    // Reset wave size
    if (waveRef.current) {
      waveRef.current.style.width = '40px';
      waveRef.current.style.height = '40px';
    }
  };

  const toggleMic = () => {
    const newState = !micOn;
    setMicOn(newState);

    if (newState) {
      startMic();
      recognitionRef.current?.start();
    } else {
      stopMic();
      recognitionRef.current?.stop();
    }
  };

  // 🔊 Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      console.log("🎤 Recognized:", transcript);

      // 🧠 Prevent speech loop (avoid sending while AI is talking)
      if (window._isSpeaking) return;

      const socket = window.socketRef;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(transcript); // ✅ Send to backend

        if (window.addUserMessage) {
          window.addUserMessage(transcript); // ✅ Display in UI
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognitionRef.current = recognition;

    // 👂 Global controls so other components can control speech
    window.startListening = () => {
      try {
        recognition.start();
      } catch (err) {
        console.warn("Recognition already started:", err);
      }
    };

    window.stopListening = () => {
      try {
        recognition.stop();
      } catch (err) {
        console.warn("Recognition already stopped:", err);
      }
    };

    if (micOn) {
      startMic();
      recognition.start();
    }

    return () => {
      recognition.stop();
      stopMic();
    };
  }, []);


  return (
    <button
      onClick={toggleMic}
      className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200
        ${micOn ? "bg-gradient-to-br from-blue-500/60 to-purple-600/60 border-2 border-blue-300/60" : "bg-gray-800/60 border-2 border-gray-500/40"}
        backdrop-blur-md hover:scale-105 hover:shadow-2xl
      `}
      style={{ boxShadow: micOn ? "0 0 16px 4px #60a5fa, 0 0 32px 8px #a78bfa33" : "0 0 8px 2px #4b5563" }}
      aria-label={micOn ? "Turn off mic" : "Turn on mic"}
    >
      <FontAwesomeIcon
        icon={micOn ? faMicrophone : faMicrophoneSlash}
        size="lg"
        className={`z-10 ${micOn ? "text-white drop-shadow-lg" : "text-gray-300 drop-shadow"}`}
      />
      {micOn && (
        <div
          ref={waveRef}
          className="absolute rounded-full pointer-events-none transition-all duration-75 bg-blue-400/30"
          style={{
            width: '40px',
            height: '40px',
            transition: 'all 0.075s ease-out',
          }}
        />
      )}
    </button>
  );
}
