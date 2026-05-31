import { useState } from 'react';
import { Settings, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  isNotificationSupported,
  NotificationType
} from '../utils/notifications';

export default function NotificationSettings() {
  const [settings, setSettings] = useState(getNotificationSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(
    isNotificationSupported() ? Notification.permission : 'denied'
  );

  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      updateSettings({ browser: true });
    }
  };

  const updateSettings = (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const updateTypeSettings = (type, enabled) => {
    const newSettings = {
      ...settings,
      types: {
        ...settings.types,
        [type]: enabled
      }
    };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const notificationTypes = [
    { type: NotificationType.SIGNAL_A_PLUS, label: 'Signal A+ Detected', icon: '🚀' },
    { type: NotificationType.SIGNAL_A, label: 'Signal A Detected', icon: '⭐' },
    { type: NotificationType.TRADE_EXECUTED, label: 'Trade Executed', icon: '✅' },
    { type: NotificationType.TP_HIT, label: 'Take Profit Hit', icon: '💰' },
    { type: NotificationType.SL_HIT, label: 'Stop Loss Hit', icon: '🛑' },
    { type: NotificationType.BALANCE_LOW, label: 'Balance Low Warning', icon: '⚠️' },
    { type: NotificationType.RUNNER_DETECTED, label: 'Runner Detected', icon: '🏃' },
    { type: NotificationType.RUG_WARNING, label: 'Rug Warning', icon: '⚠️' },
    { type: NotificationType.TRADE_CLOSED, label: 'Trade Closed', icon: '📊' }
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setShowSettings(!showSettings)}
        title="Notification Settings"
        style={{
          padding: 8,
          borderRadius: 6,
          background: settings.enabled ? 'var(--cyan-soft)' : 'transparent',
          color: settings.enabled ? 'var(--cyan)' : 'var(--muted)'
        }}
      >
        {settings.enabled ? <Bell size={18} /> : <BellOff size={18} />}
      </button>

      {showSettings && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setShowSettings(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              width: 320,
              maxHeight: '80vh',
              overflow: 'auto',
              zIndex: 1000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              position: 'sticky',
              top: 0,
              background: 'var(--surface)',
              zIndex: 1
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Settings size={16} />
                Notification Settings
              </h3>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              {/* Master Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                padding: 12,
                background: 'var(--bg-secondary, var(--panel-2))',
                borderRadius: 8
              }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Enable Notifications</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {settings.enabled && (
                <>
                  {/* Browser Notifications */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Browser Notifications</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.browser}
                          onChange={(e) => updateSettings({ browser: e.target.checked })}
                          disabled={permissionStatus !== 'granted'}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    {permissionStatus !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: 12,
                          background: 'var(--cyan)',
                          color: 'white',
                          borderRadius: 6,
                          fontWeight: 500
                        }}
                      >
                        Enable Browser Notifications
                      </button>
                    )}
                    {permissionStatus === 'denied' && (
                      <p style={{
                        fontSize: 11,
                        color: 'var(--red)',
                        margin: '4px 0 0',
                        lineHeight: 1.4
                      }}>
                        Browser notifications blocked. Enable in browser settings.
                      </p>
                    )}
                  </div>

                  {/* Toast Notifications */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Toast Notifications</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.toast}
                        onChange={(e) => updateSettings({ toast: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {/* Sound */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 24,
                    paddingBottom: 20,
                    borderBottom: '1px solid var(--line)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Sound</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.sound}
                        onChange={(e) => updateSettings({ sound: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {/* Notification Types */}
                  <div>
                    <h4 style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 12
                    }}>
                      Notification Types
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notificationTypes.map(({ type, label, icon }) => (
                        <div
                          key={type}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--bg-secondary, var(--panel-2))',
                            borderRadius: 6
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>{icon}</span>
                            <span style={{ fontSize: 12 }}>{label}</span>
                          </div>
                          <label className="toggle-switch toggle-switch-sm">
                            <input
                              type="checkbox"
                              checked={settings.types[type]}
                              onChange={(e) => updateTypeSettings(type, e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
