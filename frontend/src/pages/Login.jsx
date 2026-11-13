import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, MessageCircleMore, Eye, EyeOff, X, KeyRound, RotateCcw } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
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
    <main className="auth-page">
      <div className="auth-card">
        <section className="auth-brand-panel">
          <div className="auth-logo">
            <span className="auth-logo-mark"><MessageCircleMore size={25} /></span>
            <span className="auth-logo-copy">
              <strong>Hama Chat</strong>
              <span>Connect • Chat • Share</span>
            </span>
          </div>
          <div className="auth-brand-copy">
            <h2>Stay connected with your friends and family.</h2>
            <p>Your conversations, moments, and favorite people are all in one place.</p>
          </div>
          <div className="auth-art" aria-hidden="true">
            <div className="auth-phone">
              <p className="auth-phone-heading">Your conversations</p>
              {[0, 1, 2].map((item) => (
                <div className="auth-phone-chat" key={item}>
                  <i className="auth-phone-avatar" />
                  <span className="auth-phone-lines"><i /><i /></span>
                </div>
              ))}
            </div>
            <span className="auth-floating-bubble auth-floating-bubble--one"><MessageCircleMore size={27} /></span>
            <span className="auth-floating-bubble auth-floating-bubble--two"><Lock size={19} /></span>
          </div>
        </section>

        <section className="auth-form-panel">
          <header className="auth-form-heading">
            <h1>Welcome Back!</h1>
            <p>Sign in to your Hama Chat account</p>
          </header>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" size={18} />
                <input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="auth-input"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="auth-field">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setResetStep(1); }}
                  className="auth-text-button"
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" size={18} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="auth-input auth-password-input"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLogin} className="auth-primary-button">
              {isLogin ? "Signing in..." : "Login"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-form-footer">
            Don&apos;t have an account? <Link to="/signup">Register</Link>
          </p>
        </section>
      </div>

      {/* --- FORGOT PASSWORD MODAL --- */}
      {showForgotModal && (
        <div className="auth-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="auth-modal-card w-full max-w-md rounded-3xl p-8 relative shadow-2xl">
            <button 
              onClick={() => setShowForgotModal(false)}
              className="absolute right-6 top-6 text-violet-500 hover:text-violet-800"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h4 className="text-xl font-bold text-white">Reset Password</h4>
              <p className="text-xs mt-1">Step {resetStep} of 3</p>
            </div>

            {/* Step 1: Email Input */}
            {resetStep === 1 && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-600" size={16} />
                  <input
                    type="email"
                    placeholder="Enter account email"
                    required
                    className="auth-input"
                    value={resetData.email}
                    onChange={(e) => setResetData({...resetData, email: e.target.value})}
                  />
                </div>
                <button type="submit" className="auth-primary-button">
                  Find Account
                </button>
              </form>
            )}

            {/* Step 2: Security Question */}
            {resetStep === 2 && (
              <form onSubmit={handleVerifyAnswer} className="space-y-4">
                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 mb-2">
                  <p className="text-violet-700 text-[10px] uppercase font-bold mb-1">Security Question</p>
                  <p className="text-white text-sm">{resetData.securityQuestion}</p>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-600" size={16} />
                  <input
                    type="text"
                    placeholder="Your answer"
                    required
                    className="auth-input"
                    value={resetData.securityAnswer}
                    onChange={(e) => setResetData({...resetData, securityAnswer: e.target.value})}
                  />
                </div>
                <button type="submit" className="auth-primary-button">
                  Verify Answer
                </button>
              </form>
            )}

            {/* Step 3: Final Password Reset */}
            {resetStep === 3 && (
              <form onSubmit={handleResetFinal} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-600" size={16} />
                  <input
                    type="password"
                    placeholder="New Password"
                    required
                    className="auth-input"
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-600" size={16} />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    required
                    className="auth-input"
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({...resetData, confirmPassword: e.target.value})}
                  />
                </div>
                <button type="submit" className="auth-primary-button">
                  <RotateCcw size={16} /> Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;