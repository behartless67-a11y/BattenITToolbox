"use client"

import { DeviceStatus } from '@/types/device'
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: DeviceStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StatusBadge({ status, showIcon = false, size = 'md' }: StatusBadgeProps) {
  const styles = {
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
    },
    good: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-500',
    },
    unknown: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: HelpCircle,
      iconColor: 'text-gray-500',
    },
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const style = styles[status]
  const Icon = style.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border
                  ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${style.iconColor}`} />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
