import React, { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, AlertCircle, Loader2, Shield } from 'lucide-react';
import { api } from '../../api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAlert } from '../../hooks/useAlert';
import { AlertContainer } from '../common/Alert';

interface UserSettings {
  isInvisible: boolean;
  showEmail: boolean;
}

const SettingsSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-6">
    <div className="h-8 bg-gray-700 rounded w-48 animate-pulse"></div>
    <div className="bg-gray-800 p-6 rounded border border-gray-700 space-y-6">
      <div className="space-y-4">
        <div className="h-6 bg-gray-700 rounded w-40 animate-pulse"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    isInvisible: false,
    showEmail: false,
  });
  const [originalSettings, setOriginalSettings] = useState<UserSettings>({
    isInvisible: false,
    showEmail: false,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { alert, showSuccess, showError, handleApiError } = useAlert();
  const [showInvisibleConfirm, setShowInvisibleConfirm] = useState(false);
  const [pendingInvisibleValue, setPendingInvisibleValue] = useState(false);

  // Check if settings have been modified
  const isDirty = settings.isInvisible !== originalSettings.isInvisible ||
                   settings.showEmail !== originalSettings.showEmail;

  const loadSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.users.getUserSettings();
      
      const loadedSettings: UserSettings = {
        isInvisible: response.isInvisible ?? false,
        showEmail: response.showEmail ?? false,
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (error) {
      handleApiError(error, 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    if (!isDirty) {
      showError('No changes to save');
      return;
    }

    setIsSaving(true);

    try {
      await api.users.updateUserSettings({
        isInvisible: settings.isInvisible,
        showEmail: settings.showEmail,
      });

      setOriginalSettings(settings);
      showSuccess('Settings saved successfully!');
    } catch (error) {
      handleApiError(error, 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, settings]);

  const handleReset = useCallback(() => {
    setSettings(originalSettings);
  }, [originalSettings]);

  const handleInvisibleChange = useCallback((checked: boolean) => {
    if (checked && !originalSettings.isInvisible) {
      // Show confirmation when enabling invisible mode
      setPendingInvisibleValue(true);
      setShowInvisibleConfirm(true);
    } else {
      setSettings(prev => ({ ...prev, isInvisible: checked }));
    }
  }, [originalSettings.isInvisible]);

  const handleConfirmInvisible = useCallback(() => {
    setSettings(prev => ({ ...prev, isInvisible: pendingInvisibleValue }));
    setShowInvisibleConfirm(false);
  }, [pendingInvisibleValue]);

  const handleCancelInvisible = useCallback(() => {
    setShowInvisibleConfirm(false);
    setPendingInvisibleValue(false);
  }, []);

  const handleShowEmailChange = useCallback((checked: boolean) => {
    setSettings(prev => ({ ...prev, showEmail: checked }));
  }, []);

  // Loading state
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AlertContainer alert={alert} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <button
          onClick={loadSettings}
          disabled={isLoading || isSaving}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh settings"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <AlertContainer alert={alert} />

      {/* Settings Panel */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
        {/* Privacy Settings Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-blue-400" size={20} />
            <h3 className="text-lg font-medium text-white">Privacy Settings</h3>
          </div>
          
          <div className="space-y-4">
            {/* Invisible Profile Setting */}
            <label 
              htmlFor="invisible-profile"
              className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-700 transition-colors group"
            >
              <div className="flex items-center h-6">
                <input
                  id="invisible-profile"
                  type="checkbox"
                  checked={settings.isInvisible}
                  onChange={(e) => handleInvisibleChange(e.target.checked)}
                  disabled={isSaving}
                  className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium group-hover:text-blue-400 transition-colors">
                  Invisible Profile
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  When enabled, other users cannot view your list or find you in search results. 
                  Your profile will be completely hidden from other users.
                </div>
              </div>
            </label>

            {/* Show Email Setting */}
            <label 
              htmlFor="show-email"
              className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-700 transition-colors group"
            >
              <div className="flex items-center h-6">
                <input
                  id="show-email"
                  type="checkbox"
                  checked={settings.showEmail}
                  onChange={(e) => handleShowEmailChange(e.target.checked)}
                  disabled={isSaving}
                  className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium group-hover:text-blue-400 transition-colors">
                  Show Email Address
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  When enabled, your email address will be visible to other users in your profile, 
                  followers, and following lists. Default is hidden.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {isDirty && (
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 text-yellow-400 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="text-sm">You have unsaved changes</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={!isDirty || isSaving}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Privacy Settings</h4>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Changes take effect immediately after saving</li>
          <li>Invisible profile hides you from all public searches and user lists</li>
          <li>Email visibility only applies to authenticated users</li>
          <li>You can change these settings at any time</li>
        </ul>
      </div>

      {/* Invisible Profile Confirmation Modal */}
      <ConfirmModal
        isOpen={showInvisibleConfirm}
        title="Enable Invisible Profile?"
        message="Enabling invisible profile will hide your profile from all other users. They won't be able to view your list, find you in searches, or see you in followers/following lists. Are you sure you want to continue?"
        confirmText="Enable"
        confirmVariant="primary"
        onConfirm={handleConfirmInvisible}
        onCancel={handleCancelInvisible}
      />
    </div>
  );
};