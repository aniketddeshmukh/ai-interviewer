import React, { useState, useRef, useEffect } from "react";
import { VideoOff, UploadCloud, FileText, Sparkles } from "lucide-react";
import MicButtonWithWave from "./MicButtonWithWave";
import VideoToggleButton from "./VideoToggleButton";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    try {
      const response = await fetch("http://localhost:8000/upload_resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      alert("✅ Resume uploaded successfully!");
      setResumeUploaded(true);
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert("❌ Resume upload failed.");
      setResumeUploaded(false);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play(); 
        }
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        source.connect(analyserRef.current);
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const detectAudio = () => {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg);
          requestAnimationFrame(detectAudio);
        };
        detectAudio();
      })
      .catch((err) => console.error("🎤 Media access error:", err));
  }, []);

  const handleJoin = () => {
    if (!resumeUploaded) {
      alert("⚠️ Please upload your resume first.");
      return;
    }
    navigate("/interview");
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] text-white flex flex-row p-8 font-sans overflow-hidden">
      {/* Left Section */}
      <div className="w-1/2 flex flex-col justify-center items-center relative h-full">
        <div className="absolute top-8 left-8 flex items-center gap-2 opacity-80">
          <Sparkles className="text-blue-400 animate-pulse" size={28} />
          <span className="text-lg font-semibold tracking-wide text-blue-200 drop-shadow">
            AI Interviewer
          </span>
        </div>
        <h1 className="text-3xl font-extrabold mb-2 text-center w-full mt-12 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
          Interview for Software Engineer
        </h1>
        <div className="text-base font-semibold text-blue-200 mb-4 text-center tracking-wide">
          Job ID:{" "}
          <span className="bg-blue-900/40 px-3 py-1 rounded-lg ml-1 text-blue-100">
            AA1122
          </span>
        </div>

        <div className="rounded-3xl overflow-hidden w-full max-w-2xl aspect-video bg-gradient-to-br from-[#232526] to-[#414345] shadow-2xl border border-blue-900/30 mb-6 backdrop-blur-lg flex items-center justify-center">
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
              <VideoOff className="h-16 w-16 text-blue-300 opacity-70" />
            </div>
          )}
        </div>

        <div className="flex gap-10 mt-4">
          <MicButtonWithWave />
          <VideoToggleButton videoOn={videoOn} setVideoOn={setVideoOn} />
        </div>
      </div>

      {/* Right Section */}
      <div className="w-1/2 flex flex-col justify-center pl-10 h-full">
        <div className="bg-white/10 rounded-2xl p-8 shadow-xl border border-blue-900/20 backdrop-blur-md mb-8">
          <h2 className="text-3xl font-bold mb-8 text-blue-200 flex items-center gap-2">
            <Sparkles className="text-purple-400 animate-pulse" size={28} />
            Interview Guidelines
          </h2>
          <ul className="text-lg space-y-3 list-disc list-inside text-blue-100">
            <li>Allow camera and mic access before joining.</li>
            <li>Do not turn off your mic or camera during the interview.</li>
            <li>Ensure a stable internet connection.</li>
            <li>Stay visible and audible throughout.</li>
            <li>Answer clearly, you are being graded by AI.</li>
            <li>Once you are done with interview, Please click "Leave Interview" button. </li>
          </ul>
        </div>

        <div className="flex flex-col items-center gap-4 bg-white/10 rounded-2xl p-8 shadow-lg border border-blue-900/20 backdrop-blur-md mb-8">
          <label className="font-medium mb-1 text-blue-200 flex items-center gap-2">
            <FileText className="text-blue-400" size={20} /> Upload Resume (PDF)
          </label>
          <div className="flex flex-row items-center gap-4 w-full justify-between">
            <label
              htmlFor="resume-upload"
              className={`flex items-center gap-2 px-5 py-2 rounded-lg cursor-pointer transition bg-gradient-to-r from-blue-200 to-purple-200 text-blue-900 border border-blue-400 hover:bg-blue-50/80 shadow-md font-semibold ${
                isUploading ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            >
              <UploadCloud className="w-5 h-5" />
              {selectedFile ? "Change File" : "Choose File"}
            </label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
            {selectedFile && (
              <span className="text-sm text-blue-100 truncate max-w-[180px] flex items-center gap-1">
                <FileText className="w-4 h-4 text-blue-300" />
                {selectedFile.name}
              </span>
            )}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition font-semibold text-lg shadow-md ml-2 ${
                isUploading
                  ? "bg-gray-400 cursor-not-allowed text-gray-700"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90"
              }`}
            >
              <UploadCloud className="w-5 h-5" />
              {isUploading ? "Uploading..." : "Upload Resume"}
            </button>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={!resumeUploaded}
          className={`py-3 px-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-xl w-full ${
            resumeUploaded
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
              : "bg-gray-400 text-white cursor-not-allowed"
          }`}
          style={{ marginBottom: '0.5rem' }}
        >
          {resumeUploaded ? "Join Interview" : "Upload Resume to Proceed"}
        </button>
      </div>
    </div>
  );
}
