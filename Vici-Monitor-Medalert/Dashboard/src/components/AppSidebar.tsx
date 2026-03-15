import {
  LayoutDashboard, Users, Volume2, VolumeX, Activity, LogOut,
  Radio, FileText, Settings, Target, BarChart3, PhoneIncoming,
  Gauge, Wifi, WifiOff, Clock, TrendingUp, Shield
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const navGroups = [
  {
    label: "Monitoring",
    items: [
      { title: "Overview", url: "/", icon: LayoutDashboard },
      { title: "Live Feed", url: "/live", icon: Radio },
      { title: "Queue Monitor", url: "/queue", icon: PhoneIncoming },
      { title: "SLA Tracker", url: "/sla", icon: Target },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Agent Performance", url: "/agents", icon: Users },
      { title: "Call Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Trends", url: "/trends", icon: TrendingUp },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Shift Reports", url: "/reports", icon: FileText },
      { title: "Capacity Planning", url: "/capacity", icon: Gauge },
      { title: "Shift Timeline", url: "/timeline", icon: Clock },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Connection", url: "/connection", icon: Wifi },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function AppSidebar({ soundEnabled, onToggleSound }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-bold text-sm tracking-tight block">ViciDial Ops</span>
                <span className="text-[10px] text-muted-foreground font-mono">v2.0 • ConnectX</span>
              </div>
            )}
          </div>
        </div>

        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
                          activeClassName="bg-primary/10 text-primary border border-primary/20"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 space-y-2">
        <button
          onClick={onToggleSound}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title={soundEnabled ? "Mute alerts" : "Enable alerts"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-success shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>{soundEnabled ? "Alerts On" : "Alerts Off"}</span>}
        </button>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.username}</p>
              <p className="text-[10px] text-muted-foreground">{user?.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
