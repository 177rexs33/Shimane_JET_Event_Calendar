
import React, { useState } from 'react';
import { Modal } from './Modal';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../lib/firebase';
import { Lock, User, Key, AlertCircle, Loader2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        // Login successful!
        setEmail('');
        setPassword('');
        setLoading(false);
        onLoginSuccess();
      })
      .catch(async (err) => {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
          try {
            // Attempt to create the account if it doesn't exist
            await createUserWithEmailAndPassword(auth, email, password);
            setEmail('');
            setPassword('');
            setLoading(false);
            onLoginSuccess();
            return;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // The account exists, so the password was just wrong
              setError("Incorrect email or password.");
            } else {
              setError(createErr.message);
            }
            setLoading(false);
            return;
          }
        }

        console.error("Login failed:", err.code, err.message);
        
        let errorMessage = "Incorrect email or password";
        if (err.code === 'auth/wrong-password') {
          errorMessage = "Incorrect password.";
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = "Invalid email format.";
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = "Too many failed login attempts. Please try again later.";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your connection.";
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setLoading(false);
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Login">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Lock size={20} />
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">Restricted Access</p>
            <p className="opacity-90">Please sign in to access the administrator dashboard.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Enter admin email"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Key size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Enter admin password"
                required
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Login'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
