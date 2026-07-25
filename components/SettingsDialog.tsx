import { useState, useEffect, useCallback, useMemo } from 'react';

interface Settings {
  endpoint: string;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load settings when dialog opens
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSettings(data);
      setEndpoint(data.endpoint);
      setModel(data.model);
      setApiKey('');
      setShowKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track whether any field has changed from saved values
  const hasChanges = useMemo(() => {
    if (!settings) return false;
    const keyChanged = apiKey.trim() !== '';
    const endpointChanged = endpoint !== settings.endpoint;
    const modelChanged = model !== settings.model;
    return keyChanged || endpointChanged || modelChanged;
  }, [settings, apiKey, endpoint, model]);

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen, loadSettings]);

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Save endpoint and model
      const settingsRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, model }),
      });
      if (!settingsRes.ok) throw new Error('Failed to save settings');

      // Save API key if provided
      if (apiKey.trim()) {
        const keyRes = await fetch('/api/keyring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: apiKey.trim() }),
        });
        if (!keyRes.ok) {
          const keyData = await keyRes.json();
          throw new Error(keyData.error || 'Failed to save API key');
        }
      }

      setSuccess('Settings saved successfully');
      await loadSettings(); // Refresh to show masked key
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Remove API key
  const handleRemoveKey = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/keyring', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove key');
      setSuccess('API key removed');
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove key');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-gray-400 animate-pulse">Loading settings...</span>
            </div>
          ) : (
            <>
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey || (settings?.apiKeyMasked || '')}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your LLM API key"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 py-2 text-gray-400 hover:text-white bg-gray-800 border border-gray-600 rounded-lg text-sm transition-colors"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? '👁️' : '🔒'}
                  </button>
                </div>
                {settings?.hasApiKey && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      Currently stored: {settings.apiKeyMasked}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveKey}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  Type a new key to replace the stored one. Leave blank to keep the current key.
                </p>
              </div>

              {/* Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  LLM Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://localhost:8080/v1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Model Name
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Qwen3.6-35B-A3B-MLX-8bit"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Messages */}
              {success && (
                <div className="px-3 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-sm text-emerald-300">
                  ✅ {success}
                </div>
              )}
              {error && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
                  ❌ {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-700 bg-gray-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                hasChanges
                  ? 'bg-purple-600 hover:bg-purple-500 disabled:opacity-70'
                  : 'bg-gray-600 opacity-60 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
