import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    autoBackup: true,
    backupLocation: '',
    lowStockThreshold: 5,
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: ''
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electron.invoke('get-settings');
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('');

    try {
      await window.electron.invoke('save-settings', settings);
      setSaveStatus('Settings saved successfully!');
      
      // Apply theme change
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
      
      // Update notification settings
      if (settings.notifications) {
        await window.electron.invoke('enable-notifications');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackupLocation = async () => {
    try {
      const location = await window.electron.invoke('select-backup-location');
      if (location) {
        setSettings({ ...settings, backupLocation: location });
      }
    } catch (error) {
      console.error('Error selecting backup location:', error);
    }
  };

  const handleCompanyInfoChange = (field, value) => {
    setSettings({
      ...settings,
      companyInfo: {
        ...settings.companyInfo,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Appearance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                Enable notifications
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={settings.lowStockThreshold}
                onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoBackup"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="autoBackup" className="ml-2 block text-sm text-gray-700">
                Enable automatic backup
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Backup Location</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={settings.backupLocation}
                  readOnly
                  className="flex-1 rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleBackupLocation}
                  className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                value={settings.companyInfo.name}
                onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                value={settings.companyInfo.address}
                onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={settings.companyInfo.phone}
                  onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={settings.companyInfo.email}
                  onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <input
                type="url"
                value={settings.companyInfo.website}
                onChange={(e) => handleCompanyInfoChange('website', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end space-x-4">
          {saveStatus && (
            <p className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
