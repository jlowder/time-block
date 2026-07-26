import { useState, useEffect, useCallback, useMemo } from 'react';

interface Settings {
  endpoint: string;
  model: string;
  apiKeyEnabled: boolean;
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
  const [apiKeyEnabled, setApiKeyEnabled] = useState(false);
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
      setApiKeyEnabled(data.apiKeyEnabled ?? false);
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
    const keyEnabledChanged = apiKeyEnabled !== settings.apiKeyEnabled;
    const keyChanged = apiKey.trim() !== '';
    const endpointChanged = endpoint !== settings.endpoint;
    const modelChanged = model !== settings.model;
    return keyEnabledChanged || keyChanged || endpointChanged || modelChanged;
  }, [settings, apiKeyEnabled, apiKey, endpoint, model]);

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen, loadSettings]);

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Save endpoint, model, and apiKeyEnabled
      const settingsRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, model, apiKeyEnabled }),
      });
      if (!settingsRes.ok) throw new Error('Failed to save settings');

      // Save API key if provided and key is enabled
      if (apiKey.trim() && apiKeyEnabled) {
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
      await loadSettings();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Loading settings...
              </span>
            </div>
          ) : (
            <>
              {/* API Key Toggle */}
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <input
                    type="checkbox"
                    checked={apiKeyEnabled}
                    onChange={(e) => setApiKeyEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500"
                    style={{ accentColor: 'var(--accent-indigo)' }}
                  />
                  <span className="text-sm font-medium">API key required</span>
                </label>
              </div>

              {/* API Key Input (conditional) */}
              {apiKeyEnabled && (
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey || (settings?.apiKeyMasked || '')}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your LLM API key"
                    className="flex-1 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none"
                    style={{
                      fontFamily: 'var(--font-inter)',
                      background: 'var(--bg-surface-hover)',
                      color: 'var(--text-primary)',
                      border: `1px solid var(--border-subtle)`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 py-2 text-sm rounded-lg transition-colors"
                    style={{
                      background: 'var(--bg-surface-hover)',
                      color: 'var(--text-muted)',
                      border: `1px solid var(--border-subtle)`,
                    }}
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                  </button>
                </div>
                {settings?.hasApiKey && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Currently stored: {settings.apiKeyMasked}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveKey}
                      className="text-xs font-medium transition-colors"
                      style={{ color: 'var(--theme-special)' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Type a new key to replace the stored one. Leave blank to keep the current key.
                </p>
              </div>
              )}

              {!apiKeyEnabled && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  The app will use a placeholder API key. Some LLM features may not work.
                </p>
              )}

              {/* Endpoint */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  LLM Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://localhost:8080/v1"
                  className="w-full px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    background: 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    border: `1px solid var(--border-subtle)`,
                  }}
                />
              </div>

              {/* Model */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Model Name
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Qwen3.6-35B-A3B-MLX-8bit"
                  className="w-full px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    background: 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    border: `1px solid var(--border-subtle)`,
                  }}
                />
              </div>

              {/* Status messages */}
              {success && (
                <div
                  className="px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{
                    background: 'rgba(124, 184, 154, 0.1)',
                    color: '#5a9a78',
                    border: `1px solid rgba(124, 184, 154, 0.2)`,
                  }}
                >
                  {success}
                </div>
              )}
              {error && (
                <div
                  className="px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{
                    background: 'rgba(212, 123, 123, 0.1)',
                    color: 'var(--theme-special)',
                    border: `1px solid rgba(212, 123, 123, 0.2)`,
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div
            className="flex justify-end gap-2 px-6 py-4 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                background: hasChanges ? 'var(--accent-indigo)' : 'var(--bg-surface-hover)',
                color: hasChanges ? '#ffffff' : 'var(--text-muted)',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                opacity: hasChanges ? 1 : 0.6,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
