import { useState } from "react";

export default function NeonChatBackground() {

  return (
    <div className="relative min-h-screen w-screen bg-[#0a0a0f] flex items-center justify-center overflow-hidden font-sans">

      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(100,80,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,255,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-violet-700 opacity-30 blur-[80px] -top-24 -left-24 animate-pulse" />
      <div className="absolute w-[340px] h-[340px] rounded-full bg-cyan-500 opacity-30 blur-[80px] -bottom-20 -right-20 animate-pulse" />
      <div className="absolute w-[260px] h-[260px] rounded-full bg-fuchsia-400 opacity-25 blur-[80px] bottom-20 left-[30%] animate-pulse" />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)",
        }}
      />
    </div>
  );
}