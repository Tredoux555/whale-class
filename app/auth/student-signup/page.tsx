'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Phone, User, Calendar, Lock, Smile } from 'lucide-react';

export default function StudentSignupPage() {
  const router = useRouter();
  
  // Form state
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDOB, setChildDOB] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🐋');
  const [linkCode, setLinkCode] = useState('');
  
  // UI state
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const emojiOptions = [
    '🐋', '🐬', '🐠', '🦈', '🐙', '🦑', '🐡', '🦀',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧',
    '🦋', '🐛', '🐝', '🐞', '🦄', '🌈', '⭐', '🌟'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!childFirstName || !childLastName || !childDOB || !parentName || !parentEmail || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/student-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childFirstName,
          childLastName,
          childDOB,
          parentName,
          parentEmail,
          parentPhone: parentPhone || null,
          password,
          avatarEmoji,
          linkCode: linkCode || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/student-login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit signup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">Signup Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for registering! Your request has been sent to the admin for approval.
          </p>
          <p className="text-gray-600 mb-4">
            You will receive a confirmation email at <strong>{parentEmail}</strong> once approved.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            🎓 Student Portal Signup
          </h1>
          <p className="text-gray-600">
            Register your child for the Whale Class student portal
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Child Information */}
          <div className="border-2 border-indigo-200 rounded-xl p-6 bg-indigo-50">
            <h3 className="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
              <User size={24} />
              Child Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={childLastName}
                  onChange={(e) => setChildLastName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Date of Birth *
              </label>
              <input
                type="date"
                value={childDOB}
                onChange={(e) => setChildDOB(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Smile size={16} />
                Choose Avatar
              </label>
              <div className="grid grid-cols-8 gap-2">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`text-3xl p-2 rounded-lg border-2 transition ${
                      avatarEmoji === emoji
                        ? 'border-indigo-500 bg-indigo-100 scale-110'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <UserPlus size={24} />
              Parent/Guardian Information
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Mail size={16} />
                Email Address *
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Phone size={16} />
                Phone Number (optional)
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="border-2 border-orange-200 rounded-xl p-6 bg-orange-50">
            <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              <Lock size={24} />
              Create Password
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password * (min 4 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                minLength={4}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                minLength={4}
                required
              />
            </div>
          </div>

          {/* Optional Link Code */}
          <div className="border-2 border-purple-200 rounded-xl p-6 bg-purple-50">
            <h3 className="text-lg font-bold text-purple-700 mb-2">
              Already Have a Child Account?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              If your child already has an account and you have a link code from the admin, enter it here:
            </p>
            <input
              type="text"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code (optional)"
              maxLength={6}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none uppercase"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition"
          >
            {isSubmitting ? 'Submitting...' : '📝 Submit Registration'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have login credentials?{' '}
            <a href="/auth/student-login" className="text-indigo-600 hover:underline font-semibold">
              Login here
            </a>
          </p>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Your registration will be reviewed by our admin team. 
            You'll receive an email confirmation once approved, usually within 1-2 business days.
          </p>
        </div>
      </div>
    </div>
  );
}

