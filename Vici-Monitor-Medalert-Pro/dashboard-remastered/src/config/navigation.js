import {
  LayoutDashboard,
  Clock,
  Brain,
  FileText,
  Bell,
  Database,
  Settings2,
} from 'lucide-react'

export const PAGE_GROUPS = [
  {
    label: 'Monitor',
    items: [
      { id: 'overview',       label: 'Overview',        Icon: LayoutDashboard },
      { id: 'shift',          label: 'Shift Analytics', Icon: Clock           },
      { id: 'intelligence',   label: 'Intelligence',    Icon: Brain           },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'reports',   label: 'Reports', Icon: FileText },
      { id: 'alerts',    label: 'Alerts',  Icon: Bell     },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'advanced',  label: 'Database',  Icon: Database  },
      { id: 'settings',  label: 'Settings',  Icon: Settings2 },
    ],
  },
]

export const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.items)
