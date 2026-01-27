import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../api';

export const Settings: React.FC = () => {
  const [isInvisible, setIsInvisible] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.users.getUserSettings();
      // The backend returns a User object, not just settings
      // Check if the properties exist and set accordingly
      setIsInvisible(response.isInvisible ?? false);
      setShowEmail(response.showEmail ?? false);

      console.log('Loaded settings:', response); // Debug log
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await api.users.updateUserSettings({
        isInvisible,
        showEmail,
      });
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      <div className="bg-gray-800 p-6 rounded border border-gray-700 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Privacy Settings</h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isInvisible}
                onChange={(e) => setIsInvisible(e.target.checked)}
                className="w-5 h-5 mt-0.5"
              />
              <div>
                <div className="text-white font-medium">Invisible Profile</div>
                <div className="text-sm text-gray-400">
                  When enabled, other users cannot view your list or find you in search results. 
                  Your profile will be completely hidden from other users.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showEmail}
                onChange={(e) => setShowEmail(e.target.checked)}
                className="w-5 h-5 mt-0.5"
              />
              <div>
                <div className="text-white font-medium">Show Email Address</div>
                <div className="text-sm text-gray-400">
                  When enabled, your email address will be visible to other users in your profile, 
                  followers, and following lists. Default is hidden.
                </div>
              </div>
            </label>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded text-sm ${
            message.includes('success') 
              ? 'bg-green-900 text-green-200' 
              : 'bg-red-900 text-red-200'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};