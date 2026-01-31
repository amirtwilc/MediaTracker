import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError, NetworkError, TimeoutError, ValidationError } from '../../api';

// Constants
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 6;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const SUCCESS_MESSAGE_DURATION_MS = 5000;

// Types
type AuthMode = 'login' | 'register';

interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface AlertState {
  type: 'success' | 'error' | null;
  message: string;
}

export const AuthPage: React.FC = () => {
  // Auth mode
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ type: null, message: '' });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // Refs
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const submitAttemptedRef = useRef(false);
  
  const { login, register } = useAuth();

  /**
   * Focus username input on mount and mode change
   */
  useEffect(() => {
    usernameInputRef.current?.focus();
  }, [mode]);

  /**
   * Auto-dismiss success messages
   */
  useEffect(() => {
    if (alert.type === 'success') {
      const timer = setTimeout(() => {
        setAlert({ type: null, message: '' });
      }, SUCCESS_MESSAGE_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /**
   * Show alert message
   */
  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
  }, []);

  /**
   * Validate username
   */
  const validateUsername = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Username is required';
    }
    if (value.length < MIN_USERNAME_LENGTH) {
      return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
    }
    if (value.length > MAX_USERNAME_LENGTH) {
      return `Username must be at most ${MAX_USERNAME_LENGTH} characters`;
    }
    if (!USERNAME_REGEX.test(value)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return undefined;
  };

  /**
   * Validate email
   */
  const validateEmail = (value: string): string | undefined => {
    if (mode === 'login') return undefined;
    
    if (!value.trim()) {
      return 'Email is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    
    return undefined;
  };

  /**
   * Validate password
   */
  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return 'Password is required';
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    return undefined;
  };

  /**
   * Validate confirm password
   */
  const validateConfirmPassword = (value: string): string | undefined => {
    if (mode === 'login') return undefined;
    
    if (!value) {
      return 'Please confirm your password';
    }
    if (value !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  /**
   * Validate all fields
   */
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };

    setValidationErrors(errors);
    
    return !Object.values(errors).some(error => error !== undefined);
  };

  /**
   * Handle field blur
   */
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate this specific field
    const errors = { ...validationErrors };
    switch (field) {
      case 'username':
        errors.username = validateUsername(username);
        break;
      case 'email':
        errors.email = validateEmail(email);
        break;
      case 'password':
        errors.password = validatePassword(password);
        break;
      case 'confirmPassword':
        errors.confirmPassword = validateConfirmPassword(confirmPassword);
        break;
    }
    setValidationErrors(errors);
  };

  /**
   * Handle mode switch
   */
  const handleModeSwitch = (newMode: AuthMode) => {
    if (loading) return;
    
    setMode(newMode);
    setAlert({ type: null, message: '' });
    setValidationErrors({});
    setTouched({});
    submitAttemptedRef.current = false;
    
    // Clear fields when switching to login
    if (newMode === 'login') {
      setEmail('');
      setConfirmPassword('');
    }
  };

  /**
   * Reset form after successful registration
   */
  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setValidationErrors({});
    setTouched({});
    submitAttemptedRef.current = false;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    submitAttemptedRef.current = true;
    
    // Clear previous alerts
    setAlert({ type: null, message: '' });
    
    // Validate form
    if (!validateForm()) {
      showAlert('error', 'Please fix the errors below');
      return;
    }
    
    // Prevent double submission
    if (loading) return;
    
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username.trim(), password);
        // Navigation handled by AuthContext
      } else {
        await register(username.trim(), email.trim(), password);
        resetForm();
        setMode('login');
        showAlert('success', 'Registration successful! Please login with your credentials.');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          showAlert('error', 'Invalid username or password');
        } else if (error.statusCode === 409) {
          showAlert('error', 'Username or email already exists');
        } else {
          showAlert('error', error.message);
        }
      } else if (error instanceof NetworkError) {
        showAlert('error', 'Network error. Please check your internet connection.');
      } else if (error instanceof TimeoutError) {
        showAlert('error', 'Request timeout. Please try again.');
      } else if (error instanceof ValidationError) {
        showAlert('error', error.message);
      } else {
        showAlert('error', 'An unexpected error occurred. Please try again.');
      }
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Should show field error
   */
  const shouldShowError = (field: keyof ValidationErrors): boolean => {
    return (touched[field] || submitAttemptedRef.current) && !!validationErrors[field];
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Media Tracker
        </h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Track and rate your favorite movies, series, and games
        </p>
        
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => handleModeSwitch('login')}
            disabled={loading}
            className={`flex-1 py-2 rounded font-medium transition-colors ${
              mode === 'login' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Login
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => handleModeSwitch('register')}
            disabled={loading}
            className={`flex-1 py-2 rounded font-medium transition-colors ${
              mode === 'register' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Register
          </button>
        </div>

        {/* Alert Messages */}
        {alert.type && (
          <div
            className={`p-3 rounded-lg mb-4 flex items-start gap-3 ${
              alert.type === 'success'
                ? 'bg-green-900 bg-opacity-20 border border-green-700 text-green-400'
                : 'bg-red-900 bg-opacity-20 border border-red-700 text-red-400'
            }`}
            role="alert"
          >
            {alert.type === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm">{alert.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm text-gray-300 mb-1">
              Username *
            </label>
            <input
              ref={usernameInputRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => handleBlur('username')}
              className={`w-full px-3 py-2 bg-gray-700 text-white rounded border ${
                shouldShowError('username')
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-600 focus:border-blue-500'
              } focus:outline-none transition-colors`}
              autoComplete="username"
              aria-invalid={shouldShowError('username')}
              aria-describedby={shouldShowError('username') ? 'username-error' : undefined}
              required
              disabled={loading}
            />
            {shouldShowError('username') && (
              <p id="username-error" className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.username}
              </p>
            )}
          </div>

          {/* Email Field (Register only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`w-full px-3 py-2 bg-gray-700 text-white rounded border ${
                  shouldShowError('email')
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-600 focus:border-blue-500'
                } focus:outline-none transition-colors`}
                autoComplete="email"
                aria-invalid={shouldShowError('email')}
                aria-describedby={shouldShowError('email') ? 'email-error' : undefined}
                required
                disabled={loading}
              />
              {shouldShowError('email') && (
                <p id="email-error" className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {validationErrors.email}
                </p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`w-full px-3 py-2 pr-10 bg-gray-700 text-white rounded border ${
                  shouldShowError('password')
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-600 focus:border-blue-500'
                } focus:outline-none transition-colors`}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-invalid={shouldShowError('password')}
                aria-describedby={shouldShowError('password') ? 'password-error' : undefined}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {shouldShowError('password') && (
              <p id="password-error" className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.password}
              </p>
            )}
            {mode === 'register' && !shouldShowError('password') && (
              <p className="text-gray-400 text-xs mt-1">
                At least {MIN_PASSWORD_LENGTH} characters
              </p>
            )}
          </div>

          {/* Confirm Password Field (Register only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-gray-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`w-full px-3 py-2 pr-10 bg-gray-700 text-white rounded border ${
                    shouldShowError('confirmPassword')
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-600 focus:border-blue-500'
                  } focus:outline-none transition-colors`}
                  autoComplete="new-password"
                  aria-invalid={shouldShowError('confirmPassword')}
                  aria-describedby={shouldShowError('confirmPassword') ? 'confirm-password-error' : undefined}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {shouldShowError('confirmPassword') && (
                <p id="confirm-password-error" className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {mode === 'login' ? 'Logging in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? 'Login' : 'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => handleModeSwitch('register')}
                disabled={loading}
                className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => handleModeSwitch('login')}
                disabled={loading}
                className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};