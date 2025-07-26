import { Video, VideoOff } from "lucide-react";

export default function VideoToggleButton({ videoOn, setVideoOn }) {
  return (
    <button
      onClick={() => setVideoOn(!videoOn)}
      className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200
        ${
          videoOn
            ? "bg-gradient-to-br from-blue-500/60 to-purple-600/60 border-2 border-blue-300/60"
            : "bg-gray-800/60 border-2 border-gray-500/40"
        }
        backdrop-blur-md hover:scale-105 hover:shadow-2xl
      `}
      style={{
        boxShadow: videoOn
          ? "0 0 16px 4px #7f9cf5, 0 0 32px 8px #a78bfa33"
          : "0 0 8px 2px #4b5563",
      }}
      aria-label={videoOn ? "Turn off video" : "Turn on video"}
    >
      {videoOn ? (
        <Video className="w-7 h-7 z-10 text-white drop-shadow-lg" />
      ) : (
        <VideoOff className="w-7 h-7 z-10 text-gray-300 drop-shadow" />
      )}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-200
          ${
            videoOn ? "bg-blue-400/30" : "bg-gray-500/20"
          }
        `}
        style={{ width: "60px", height: "60px" }}
      />
    </button>
  );
}
