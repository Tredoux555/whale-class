"use client";

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full text-center">
        {/* Whale Icon */}
        <div className="text-8xl mb-6 animate-bounce">🌳</div>
        
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-[#2C5F7C] mb-4">
          Out for Upgrade
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-[#4A90E2] mb-6 font-semibold">
          Be back soon!
        </p>
        
        {/* Description */}
        <p className="text-lg text-[#2C5F7C]/70 mb-8 leading-relaxed">
          We're making the My Classroom platform even better for you. 
          <br />
          We'll be back shortly with exciting new features!
        </p>
        
        {/* Decorative Elements */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="text-4xl animate-pulse">🌊</div>
          <div className="text-4xl animate-pulse delay-75">🌳</div>
          <div className="text-4xl animate-pulse delay-150">🌊</div>
        </div>
        
        {/* Footer Message */}
        <p className="text-sm text-[#2C5F7C]/60">
          Thank you for your patience! 💙
        </p>
      </div>
    </div>
  );
}

