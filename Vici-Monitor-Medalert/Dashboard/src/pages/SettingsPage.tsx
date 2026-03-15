import { useState } from "react";
import { Settings, Bell, Monitor, Shield, Clock, Volume2, Moon, Palette } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    alertThreshold: 5,
    soundVolume: 50,
    autoRefresh: true,
    refreshInterval: 15,
    darkMode: true,
    compactMode: false,
    showNotifications: true,
    alertRepeatInterval: 60,
    slaTarget: 20,
    shiftStart: "18:45",
    shiftEnd: "06:00",
    timezone: "Asia/Karachi",
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const sections = [
    {
      icon: Bell, label: "Alert Settings",
      items: [
        {
          label: "Queue Alert Threshold", description: "Trigger alert when waiting calls exceed this number",
          type: "select" as const,
          value: settings.alertThreshold,
          options: [3, 5, 8, 10, 15],
          onChange: (v: number) => updateSetting("alertThreshold", v),
        },
        {
          label: "Alert Repeat Interval", description: "Seconds between repeated alerts while threshold is exceeded",
          type: "select" as const,
          value: settings.alertRepeatInterval,
          options: [30, 60, 120, 300],
          onChange: (v: number) => updateSetting("alertRepeatInterval", v),
          formatLabel: (v: number) => `${v}s`,
        },
        {
          label: "Show Notifications", description: "Display toast notifications for alerts",
          type: "toggle" as const,
          value: settings.showNotifications,
          onChange: (v: boolean) => updateSetting("showNotifications", v),
        },
      ],
    },
    {
      icon: Volume2, label: "Sound Settings",
      items: [
        {
          label: "Alert Volume", description: "Volume level for sound alerts",
          type: "range" as const,
          value: settings.soundVolume,
          min: 0, max: 100,
          onChange: (v: number) => updateSetting("soundVolume", v),
        },
      ],
    },
    {
      icon: Monitor, label: "Display Settings",
      items: [
        {
          label: "Auto Refresh", description: "Automatically refresh dashboard data",
          type: "toggle" as const,
          value: settings.autoRefresh,
          onChange: (v: boolean) => updateSetting("autoRefresh", v),
        },
        {
          label: "Refresh Interval", description: "Seconds between auto-refresh cycles",
          type: "select" as const,
          value: settings.refreshInterval,
          options: [5, 10, 15, 30, 60],
          onChange: (v: number) => updateSetting("refreshInterval", v),
          formatLabel: (v: number) => `${v}s`,
        },
        {
          label: "Compact Mode", description: "Use compact spacing for more data density",
          type: "toggle" as const,
          value: settings.compactMode,
          onChange: (v: boolean) => updateSetting("compactMode", v),
        },
      ],
    },
    {
      icon: Clock, label: "Shift Configuration",
      items: [
        {
          label: "Shift Start Time", description: "When the monitored shift begins",
          type: "text" as const,
          value: settings.shiftStart,
          onChange: (v: string) => updateSetting("shiftStart", v),
        },
        {
          label: "Shift End Time", description: "When the monitored shift ends",
          type: "text" as const,
          value: settings.shiftEnd,
          onChange: (v: string) => updateSetting("shiftEnd", v),
        },
        {
          label: "SLA Target (seconds)", description: "Target answer time for SLA calculations",
          type: "select" as const,
          value: settings.slaTarget,
          options: [10, 15, 20, 30, 45, 60],
          onChange: (v: number) => updateSetting("slaTarget", v),
          formatLabel: (v: number) => `${v}s`,
        },
        {
          label: "Timezone", description: "Timezone for shift calculations",
          type: "text" as const,
          value: settings.timezone,
          onChange: (v: string) => updateSetting("timezone", v),
        },
      ],
    },
  ];

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Settings
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Configure dashboard behavior, alerts, and display preferences
        </p>
      </div>

      {sections.map((section, si) => {
        const Icon = section.icon;
        return (
          <div key={si} className="glass-panel overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">{section.label}</h3>
            </div>
            <div className="divide-y divide-border/50">
              {section.items.map((item, ii) => (
                <div key={ii} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {item.type === "toggle" && (
                    <button
                      onClick={() => item.onChange(!item.value)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        item.value ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-transform ${
                        item.value ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  )}
                  {item.type === "select" && (
                    <div className="flex items-center gap-1">
                      {item.options!.map(opt => (
                        <button
                          key={opt}
                          onClick={() => item.onChange(opt)}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                            item.value === opt ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {(item as any).formatLabel ? (item as any).formatLabel(opt) : opt}
                        </button>
                      ))}
                    </div>
                  )}
                  {item.type === "range" && (
                    <div className="flex items-center gap-2 w-48">
                      <input
                        type="range"
                        min={(item as any).min}
                        max={(item as any).max}
                        value={item.value as number}
                        onChange={e => item.onChange(parseInt(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="font-mono text-xs w-8 text-right">{item.value}%</span>
                    </div>
                  )}
                  {item.type === "text" && (
                    <input
                      type="text"
                      value={item.value as string}
                      onChange={e => item.onChange(e.target.value)}
                      className="w-36 px-2.5 py-1.5 bg-secondary border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
