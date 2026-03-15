import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  subtitle?: ReactNode;
}

const variantStyles = {
  default: "border-border",
  primary: "border-primary/30 glow-primary",
  success: "border-success/30 glow-success",
  warning: "border-warning/30 glow-warning",
  destructive: "border-destructive/30 glow-destructive",
};

const iconStyles = {
  default: "text-muted-foreground bg-secondary",
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

export function MetricCard({ title, value, icon: Icon, variant = "default", subtitle }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-4 ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${iconStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </motion.div>
  );
}
