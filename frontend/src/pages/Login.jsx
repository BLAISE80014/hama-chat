import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Command, CheckCircle2, Eye, EyeOff, X, ShieldQuestion, KeyRound, RotateCcw } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AestheticBackground from "../theme/AestheticBackground";
import toast from "react-hot-toast";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: Security Question, 3: New Password
  const [resetData, setResetData] = useState({
    email: "",
    securityQuestion: "",
    securityAnswer: "",
    newPassword: "",
    confirmPassword: "",
    userId: ""
  });

  const { login, isLogin, getSecurityQuestion, verifySecurityAnswer, resetPassword } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  // --- PASSWORD VALIDATION ---
  const validatePassword = (pass) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    return passwordRegex.test(pass);
  };

  // --- FORGOT PASSWORD HANDLERS ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const question = await getSecurityQuestion(resetData.email);
    if (question) {
      setResetData({ ...resetData, securityQuestion: question });
      setResetStep(2);
    }
  };

  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    const userId = await verifySecurityAnswer({ 
      email: resetData.email, 
      securityAnswer: resetData.securityAnswer 
    });
    if (userId) {
      setResetData({ ...resetData, userId });
      setResetStep(3);
    }
  };

  const handleResetFinal = async (e) => {
    e.preventDefault();
    if (!validatePassword(resetData.newPassword)) {
      return toast.error("Password must contain uppercase, lowercase, number, and special character.");
    }
    const success = await resetPassword({
      userId: resetData.userId,
      newPassword: resetData.newPassword,
      confirmPassword: resetData.confirmPassword
    });
    if (success) setShowForgotModal(false);
  };

  return (
    <div className="h-screen w-full bg-[#080808] flex justify-center items-center overflow-hidden relative font-sans">
      <AestheticBackground />
      
      <div className="z-10 h-[85vh] w-[95vw] max-w-7xl bg-white/[0.01] backdrop-blur-3xl border border-white/10 rounded-[3rem] flex overflow-hidden shadow-2xl">
        
        {/* LEFT SIDE: Visual Showcase */}
        <div className="hidden lg:flex h-full w-[55%] bg-gradient-to-br from-blue-600/10 to-transparent relative p-12 flex-col justify-between border-r border-white/5">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Command className="text-white" size={20} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">HAMA</span>
          </div>

          <div className="relative">
            <div className="grid grid-cols-6 grid-rows-2 gap-3 h-[350px]">
              <div className="col-span-3 row-span-2 rounded-3xl overflow-hidden border border-white/10">
                <img src="https://picsum.photos/seed/67/600/800" className="w-full h-full object-cover opacity-80" alt="UI" />
              </div>
              <div className="col-span-3 row-span-1 rounded-3xl overflow-hidden border border-white/10">
                <img src="https://picsum.photos/seed/88/600/400" className="w-full h-full object-cover opacity-60" alt="UI" />
              </div>
              <div className="col-span-3 row-span-1 rounded-3xl overflow-hidden border border-white/10">
                <img src="https://picsum.photos/seed/42/600/400" className="w-full h-full object-cover opacity-60" alt="UI" />
              </div>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white leading-tight mb-2">
              Securely sign in to your <span className="text-blue-500">Workspace.</span>
            </h2>
            <p className="text-gray-500 text-xs">Your messages and collaborators are just one secure step away.</p>
          </div>
        </div>

        {/* RIGHT SIDE: Login Form */}
        <div className="h-full w-full lg:w-[45%] flex flex-col justify-center px-8 md:px-16 bg-black/40">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-1">Welcome Back</h3>
            <p className="text-gray-400 text-xs">Please enter your details to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] uppercase tracking-wider text-gray-500">Password</label>
                <button 
                  type="button" 
                  onClick={() => { setShowForgotModal(true); setResetStep(1); }}
                  className="text-[11px] text-blue-500 hover:text-blue-400 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-12 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLogin}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2 group mt-4 text-sm"
            >
              {isLogin ? "Processing..." : "Log In"}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-gray-500 text-[12px]">
              New here?{" "}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* --- FORGOT PASSWORD MODAL --- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 w-full max-w-md rounded-3xl p-8 relative shadow-2xl">
            <button 
              onClick={() => setShowForgotModal(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h4 className="text-xl font-bold text-white">Reset Password</h4>
              <p className="text-gray-400 text-xs mt-1">Step {resetStep} of 3</p>
            </div>

            {/* Step 1: Email Input */}
            {resetStep === 1 && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="email"
                    placeholder="Enter account email"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white outline-none"
                    value={resetData.email}
                    onChange={(e) => setResetData({...resetData, email: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 py-3.5 rounded-xl text-white font-bold text-sm">
                  Find Account
                </button>
              </form>
            )}

            {/* Step 2: Security Question */}
            {resetStep === 2 && (
              <form onSubmit={handleVerifyAnswer} className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-2">
                  <p className="text-blue-400 text-[10px] uppercase font-bold mb-1">Security Question</p>
                  <p className="text-white text-sm">{resetData.securityQuestion}</p>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Your answer"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white outline-none"
                    value={resetData.securityAnswer}
                    onChange={(e) => setResetData({...resetData, securityAnswer: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 py-3.5 rounded-xl text-white font-bold text-sm">
                  Verify Answer
                </button>
              </form>
            )}

            {/* Step 3: Final Password Reset */}
            {resetStep === 3 && (
              <form onSubmit={handleResetFinal} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="password"
                    placeholder="New Password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white outline-none"
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white outline-none"
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({...resetData, confirmPassword: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-green-600 py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;