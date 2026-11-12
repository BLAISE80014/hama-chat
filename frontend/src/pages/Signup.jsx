import React, { useState } from "react";
import { Link } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight, ShieldQuestion, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AestheticBackground from "../theme/AestheticBackground";
import { toast } from 'react-hot-toast'

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  // Added securityQuestion and securityAnswer to the state
  const [fromData, setFromData] = useState({
    fullName: "",
    email: "",
    password: "",
    securityQuestion: "",
    securityAnswer: ""
  })

  const { signup, isSigningUp } = useAuthStore()
  // --- NEW VALIDATION LOGIC ---
  const validateForm = () => {
    const { fullName, email, password, securityQuestion, securityAnswer } = fromData;

    // Email Regex (simple + effective)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Password Regex
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

    // Full Name
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }

    // Email Validation
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format");
      return false;
    }

    // Password Validation
    if (!passwordRegex.test(password)) {
      toast.error(
        "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)"
      );
      return false;
    }

    // Security Question
    if (!securityQuestion) {
      toast.error("Please select a security question");
      return false;
    }

    // Security Answer
    if (!securityAnswer.trim()) {
      toast.error("Security answer is required");
      return false;
    }

    return true;
  };

  function handleSubmit(e) {
    e.preventDefault();

    // Only call signup if validation passes
    const isValid = validateForm();
    if (isValid) {
      signup(fromData);
    }
  }

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex justify-center items-center overflow-hidden relative font-sans">
      <AestheticBackground />

      <div className="z-10 h-[90vh] w-[90vw] max-w-6xl bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex overflow-hidden shadow-2xl">

        {/* Left Side: Signup Form */}
        <div className="h-full w-full lg:w-[40%] flex flex-col justify-center px-8 py-8 md:py-10 md:px-16 border-r border-white/5 bg-black/20 overflow-y-auto">
          <div className="mb-4 flex flex-col mt-10">
            <p className="text-white font-sans pl-1">Welcome to</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              HAMA <span className="text-blue-500">Chats</span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Create a secure account to get started.
            </p>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Full Name */}
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={fromData.fullName}
                  onChange={(e) => { setFromData({ ...fromData, fullName: e.target.value }) }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={fromData.email}
                  onChange={(e) => { setFromData({ ...fromData, email: e.target.value }) }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                />
              </div>

              {/* Password */}
              <div className="relative group">
                {/* Lock Icon */}
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors"
                  size={18}
                />

                {/* Input */}
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (e.g. Password@123)"
                  required
                  value={fromData.password}
                  onChange={(e) =>
                    setFromData({ ...fromData, password: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                />

                {/* Eye Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="w-full h-[1px] bg-white/5 my-2" />

              {/* Security Question Selection */}
              <div className="relative group">
                <ShieldQuestion className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <select
                  required
                  value={fromData.securityQuestion}
                  onChange={(e) => { setFromData({ ...fromData, securityQuestion: e.target.value }) }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#1a1a1a]">Select a Security Question</option>
                  <option value="What is your pet's name?" className="bg-[#1a1a1a]">What is your pet's name?</option>
                  <option value="What was your first car?" className="bg-[#1a1a1a]">What was your first car?</option>
                  <option value="What is your mother's maiden name?" className="bg-[#1a1a1a]">What is your mother's maiden name?</option>
                  <option value="What city were you born in?" className="bg-[#1a1a1a]">What city were you born in?</option>
                </select>
              </div>

              {/* Security Answer */}
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Your Answer"
                  required
                  value={fromData.securityAnswer}
                  onChange={(e) => { setFromData({ ...fromData, securityAnswer: e.target.value }) }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningUp ? "Creating Account..." : "Get Started"}
                {!isSigningUp && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side: Visual Showcase */}
        <div className="hidden lg:flex h-full w-[60%] bg-[#080808] relative items-center justify-center overflow-hidden p-12">
          <div className="grid grid-cols-3 gap-4 rotate-[12deg] scale-110 opacity-40">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`h-48 w-48 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 shadow-2xl overflow-hidden ${i % 2 === 0 ? 'translate-y-12' : ''}`}
              >
                <img
                  src={`https://picsum.photos/seed/${i + 40}/400/400`}
                  alt="community"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-16">
            <h2 className="text-4xl font-bold text-white mb-4">Connect with developers <br /> and creators.</h2>
            <p className="text-gray-400 max-w-md">
              Join a community of over 10,000+ users sharing their thoughts and building the future of the web together.
            </p>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Signup;