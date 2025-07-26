import React from "react";
import { useNavigate } from "react-router-dom";

export default function EndPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      <div className="p-10 rounded-3xl shadow-2xl text-center max-w-md bg-white/10 border border-blue-900/20 backdrop-blur-md flex flex-col items-center">
        <div className="mb-4">
          <span className="inline-block text-6xl animate-bounce">🎉</span>
        </div>
        <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
          Thank You!
        </h1>
        <p className="text-lg mb-6 text-blue-100">
          Your interview has been successfully submitted. We appreciate your time and effort.
        </p>
        <p className="text-sm text-blue-200 mb-8">
          You'll receive an update from us shortly.
        </p>
        <button
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg transition-all"
          onClick={() => navigate("/")}
        >
          Home Page
        </button>
      </div>
    </div>
  );
}
