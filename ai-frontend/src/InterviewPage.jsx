import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MicButtonWithWave from "./MicButtonWithWave";
import VideoToggleButton from "./VideoToggleButton";
import { VideoOff } from "lucide-react";

export default function InterviewPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [messages, setMessages] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [videoOn, setVideoOn] = useState(true);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch((err) => {
        console.error("Camera access denied:", err);
        setVideoOn(false);
      });
  }, []);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws/interview");
    socketRef.current = socket;
    window.socketRef = socket;

    socket.onopen = () => console.log("✅ WebSocket connected");

    socket.onmessage = (event) => {
      const msg = event.data;
      if (msg.startsWith("__USER__::")) {
        const userText = msg.replace("__USER__::", "");
        setMessages((prev) => [...prev, { role: "user", text: userText }]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", text: msg }]);
      }
    };

    socket.onclose = () => console.log("❌ WebSocket closed");
    socket.onerror = (err) => console.error("WebSocket error:", err);

    return () => socket.close();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    window.addUserMessage = (text) => {
      setMessages((prev) => [...prev, { role: "user", text }]);
    };
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleLeave = () => {
    stream?.getTracks().forEach((track) => track.stop());
    socketRef.current?.close();
    speechSynthesis.cancel();
    navigate("/end");
  };

  const handleSendMessage = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const text = e.target.value.trim();
      setMessages((prev) => [...prev, { role: "user", text }]);
      socketRef.current?.send(text);
      e.target.value = "";
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] text-white flex overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-1/4 p-6 flex flex-col bg-white/10 border-r border-blue-900/20 shadow-xl rounded-2xl m-4 ml-0 backdrop-blur-md h-[calc(100vh-2rem)]">
          {/* Logo and Profile */}
        <div className="flex-1 flex flex-col justify-start">
          <img
            src="./gemini4.svg"
            alt="Company Logo"
            className="w-32 h-auto mb-4 rounded-xl mx-auto shadow-lg"
          />
          <h2 className="text-center text-xl font-bold text-blue-100 mb-6 tracking-wide drop-shadow">
            {today}
          </h2>
          {/* Tiles */}
          <div className="flex flex-col gap-4 items-center w-full">
            {/* Candidate Tile */}
            <div className="w-full max-w-xs p-4 bg-gradient-to-br from-blue-900/40 to-blue-600/30 border border-blue-400/30 rounded-2xl shadow-md flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎓</span>
                <span className="font-semibold text-blue-100">Candidate</span>
              </div>
              <p className="text-sm text-blue-100">Name: Aniket</p>
              <p className="text-sm text-blue-100">Email: aniket@gmail.com</p>
              <p className="text-sm text-blue-100">Phone: +91-9666666666</p>
            </div>
            {/* Job Info Tile */}
            <div className="w-full max-w-xs p-4 bg-gradient-to-br from-purple-900/40 to-purple-600/30 border border-purple-400/30 rounded-2xl shadow-md flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏢</span>
                <span className="font-semibold text-purple-100">Job Info</span>
              </div>
              <p className="text-sm text-purple-100">ID: JOB22558</p>
              <p className="text-sm text-purple-100">Company: ABC Bank</p>
              <p className="text-sm text-purple-100">HR Email: hr_department@abc.com</p>
              <p className="text-sm text-purple-100">Role: Software Engineer</p>
            </div>
            {/* Status Tile (with timer) */}
            <div className="w-full max-w-xs p-4 bg-gradient-to-br from-green-900/40 to-green-600/30 border border-green-400/30 rounded-2xl shadow-md flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🟢</span>
                <span className="font-semibold text-green-100">Status</span>
              </div>
              <p className="text-sm text-green-100">Interview in Progress</p>
              <p className="text-xs text-green-200 mt-1">
                Time: {formatTime(seconds)}
              </p>
            </div>
          </div>
        </div>
        {/* Leave Interview button at bottom */}
        <div className="mt-6">
          <button
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:opacity-90 w-full py-2 rounded-lg text-white font-semibold shadow-md transition"
            onClick={handleLeave}
          >
            Leave Interview
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 p-6 flex flex-col justify-between bg-white/10 rounded-2xl m-4 shadow-xl backdrop-blur-md">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 rounded-lg custom-scrollbar">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs sm:max-w-md md:max-w-lg px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-md
                ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-400/30 to-purple-400/30 text-white rounded-br-none"
                    : "bg-white/20 text-blue-100 rounded-bl-none"
                }`}
              >
                <p className="text-xs mb-1 font-semibold text-blue-200">
                  {msg.role === "user" ? "You" : "AI Interviewer"}
                </p>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-1/5 p-4 flex flex-col items-center gap-6 bg-white/10 border-l border-blue-900/20 rounded-2xl m-4 mr-0 shadow-xl backdrop-blur-md">
        <p className="text-2xl font-extrabold text-blue-200 tracking-tight mt-10 mb-4 text-center drop-shadow-lg">
          AI Interviewer
        </p>

        <div className="rounded-xl mt-8 overflow-hidden w-full max-w-xs aspect-video bg-gradient-to-br from-[#232526] to-[#414345] mb-6 border border-blue-900/30 shadow-lg flex items-center justify-center">
          {videoOn ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transition-all duration-300 block"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-800 to-gray-700">
              <VideoOff className="h-12 w-12 text-blue-300 opacity-70" />
            </div>
          )}
        </div>

        <p className="text-lg font-medium mb-10 text-blue-100">
          Aniket Deshmukh
        </p>

        <div className="flex gap-6 ">
          <MicButtonWithWave />
          <VideoToggleButton videoOn={videoOn} setVideoOn={setVideoOn} />
        </div>
      </div>
    </div>
  );
}


