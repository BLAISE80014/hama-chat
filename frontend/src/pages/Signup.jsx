import React, { useState } from "react";
import { Link } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight, ShieldQuestion, KeyRound, Eye, EyeOff, MessageCircleMore } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
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
    <main className="auth-page">
      <div className="auth-card auth-card--signup">
        <section className="auth-brand-panel">
          <div className="auth-logo">
            <span className="auth-logo-mark"><MessageCircleMore size={25} /></span>
            <span className="auth-logo-copy">
              <strong>Hama Chat</strong>
              <span>Connect • Chat • Share</span>
            </span>
          </div>
          <div className="auth-brand-copy">
            <h2>Join Hama Chat Today!</h2>
            <p>Create your account and start chatting with the people who matter.</p>
          </div>
          <div className="auth-art" aria-hidden="true">
            <div className="auth-friends-art">
              {[0, 1, 2].map((person) => (
                <span className="auth-friend" key={person}>
                  <i className="auth-friend-face"><User size={25} /></i>
                </span>
              ))}
            </div>
            <span className="auth-floating-bubble auth-floating-bubble--one"><MessageCircleMore size={27} /></span>
          </div>
        </section>

        <section className="auth-form-panel">
          <header className="auth-form-heading">
            <h1>Create Account</h1>
            <p>Join Hama Chat and connect with others</p>
          </header>
          <form onSubmit={handleSubmit} className="auth-form auth-signup-form">
            <div className="auth-field">
              <label htmlFor="signup-name">Full name</label>
              <div className="auth-input-wrap">
                <User className="auth-input-icon" size={18} />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  value={fromData.fullName}
                  onChange={(e) => setFromData({ ...fromData, fullName: e.target.value })}
                  className="auth-input"
                />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signup-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" size={18} />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={fromData.email}
                  onChange={(e) => setFromData({ ...fromData, email: e.target.value })}
                  className="auth-input"
                />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" size={18} />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                  value={fromData.password}
                  onChange={(e) => setFromData({ ...fromData, password: e.target.value })}
                  className="auth-input auth-password-input"
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
            <div className="auth-field">
              <label htmlFor="signup-question">Security question</label>
              <div className="auth-input-wrap">
                <ShieldQuestion className="auth-input-icon" size={18} />
                <select
                  id="signup-question"
                  required
                  value={fromData.securityQuestion}
                  onChange={(e) => setFromData({ ...fromData, securityQuestion: e.target.value })}
                  className="auth-select"
                >
                  <option value="" disabled>Select a security question</option>
                  <option value="What is your pet's name?">What is your pet&apos;s name?</option>
                  <option value="What was your first car?">What was your first car?</option>
                  <option value="What is your mother's maiden name?">What is your mother&apos;s maiden name?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                </select>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signup-answer">Security answer</label>
              <div className="auth-input-wrap">
                <KeyRound className="auth-input-icon" size={18} />
                <input
                  id="signup-answer"
                  type="text"
                  placeholder="Your answer"
                  autoComplete="off"
                  required
                  value={fromData.securityAnswer}
                  onChange={(e) => setFromData({ ...fromData, securityAnswer: e.target.value })}
                  className="auth-input"
                />
              </div>
            </div>
            <button type="submit" disabled={isSigningUp} className="auth-primary-button">
              {isSigningUp ? "Creating account..." : "Register"}
              {!isSigningUp && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="auth-form-footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </div>
    </main>
  );
};

export default Signup;