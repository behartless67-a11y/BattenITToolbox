import { LucideIcon } from 'lucide-react';

export interface MetricCardData {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
  iconGradient: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}
