"use client"

import { MetricCardData } from '@/types/metric'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  data: MetricCardData
  animationDelay?: string
}

export default function MetricCard({ data, animationDelay = '' }: MetricCardProps) {
  const Icon = data.icon

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 ${data.borderColor} p-6
                  hover:shadow-2xl hover:-translate-y-2 transition-all duration-300
                  animate-fade-in-up ${animationDelay}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-sans text-gray-600 mb-2">{data.label}</p>
          <p className="text-4xl font-serif font-bold text-uva-navy mb-1">
            {data.value}
          </p>
          {data.subtext && (
            <p className="text-xs text-gray-500">{data.subtext}</p>
          )}

          {data.trend && (
            <div className="flex items-center gap-1 mt-3">
              {data.trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-semibold ${
                  data.trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {data.trend.value > 0 ? '+' : ''}{data.trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>

        <div className={`p-3 bg-gradient-to-br ${data.iconGradient} rounded-xl`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}
