import { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function PasswordGate() {
  const { verifyPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(false);

    // Small delay for UX
    setTimeout(() => {
      const success = verifyPassword(password);
      if (!success) {
        setError(true);
        setPassword('');
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creative Performance Tracker</h1>
          <p className="text-gray-500 mt-2">Enter password to access the tool</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Incorrect password. Please try again.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!password || isSubmitting}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Verifying...' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Sophie Hub Partners Only
        </p>
      </div>
    </div>
  );
}
