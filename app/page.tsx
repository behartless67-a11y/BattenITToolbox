"use client"

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MetricCard from '@/components/MetricCard'
import DeviceTable from '@/components/DeviceTable'
import { AlertCircle, AlertTriangle, CheckCircle, Laptop, Shield, Clock, Database } from 'lucide-react'
import { Device } from '@/types/device'
import { MetricCardData } from '@/types/metric'
import { loadDeviceData, calculateDeviceSummary } from '@/utils/dataLoader'

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  // Load device data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const deviceData = await loadDeviceData()
        setDevices(deviceData)
      } catch (error) {
        console.error('Error loading devices:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate summary metrics
  const summary = calculateDeviceSummary(devices)

  // Metric cards data
  const metricCards: MetricCardData[] = [
    {
      label: 'Critical',
      value: summary.criticalCount,
      subtext: 'Devices need replacement',
      icon: AlertCircle,
      bgColor: 'bg-white',
      borderColor: 'border-red-200',
      iconGradient: 'from-red-500 to-red-600',
    },
    {
      label: 'Warning',
      value: summary.warningCount,
      subtext: 'Devices approaching EOL',
      icon: AlertTriangle,
      bgColor: 'bg-white',
      borderColor: 'border-yellow-200',
      iconGradient: 'from-uva-orange to-uva-orange-light',
    },
    {
      label: 'Good',
      value: summary.goodCount,
      subtext: 'Devices up to date',
      icon: CheckCircle,
      bgColor: 'bg-white',
      borderColor: 'border-green-200',
      iconGradient: 'from-green-500 to-green-600',
    },
  ]

  const additionalMetrics: MetricCardData[] = [
    {
      label: 'Total Devices',
      value: summary.totalDevices,
      subtext: 'Across all platforms',
      icon: Laptop,
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconGradient: 'from-uva-navy to-uva-navy/80',
    },
    {
      label: 'Need Replacement',
      value: summary.devicesNeedingReplacement,
      subtext: 'Hardware aging or obsolete',
      icon: AlertCircle,
      bgColor: 'bg-white',
      borderColor: 'border-red-200',
      iconGradient: 'from-red-500 to-red-600',
    },
    {
      label: 'Out of Date',
      value: summary.outOfDateDevices,
      subtext: 'Not updated in 30+ days',
      icon: Clock,
      bgColor: 'bg-white',
      borderColor: 'border-yellow-200',
      iconGradient: 'from-yellow-500 to-yellow-600',
    },
    {
      label: 'Data Sources',
      value: 2,
      subtext: 'Jamf & Intune',
      icon: Database,
      bgColor: 'bg-white',
      borderColor: 'border-blue-200',
      iconGradient: 'from-blue-500 to-blue-600',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-uva-navy to-uva-blue-light text-white py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="animate-fade-in-up">
              <h1 className="text-5xl font-serif font-bold mb-4">
                IT Resource Management
              </h1>
              <div className="w-24 h-1 bg-uva-orange mb-6"></div>
              <p className="text-xl text-white/90 max-w-3xl">
                Single pane of glass for Jamf, Intune, Qualys, and CoreView.
                Monitor device health, track replacements, and maintain security compliance.
              </p>
              {loading && (
                <p className="mt-4 text-white/80 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Loading device data...
                </p>
              )}
              {!loading && devices.length > 0 && (
                <p className="mt-4 text-white/80">
                  Loaded {devices.length} devices from Jamf and Intune
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block w-16 h-16 border-4 border-uva-orange border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg text-gray-600">Loading device data...</p>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-serif font-bold text-gray-700 mb-2">
                No Data Available
              </h2>
              <p className="text-gray-600">
                Unable to load device data. Please check that CSV files are available.
              </p>
            </div>
          ) : (
            <>
              {/* Primary Metrics */}
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                  Device Health Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {metricCards.map((card, index) => (
                    <MetricCard
                      key={card.label}
                      data={card}
                      animationDelay={`animation-delay-${index * 200}`}
                    />
                  ))}
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                  Additional Insights
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {additionalMetrics.map((card, index) => (
                    <MetricCard
                      key={card.label}
                      data={card}
                      animationDelay={`animation-delay-${index * 200}`}
                    />
                  ))}
                </div>
              </div>

              {/* Device Table - Show all devices or filter to needing attention */}
              <div className="mb-12 animate-fade-in">
                <DeviceTable
                  devices={devices.filter(d => d.status === 'critical' || d.status === 'warning')}
                  title="Devices Needing Attention"
                  showExport={true}
                />
              </div>

              {/* Statistics Section */}
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                  Device Statistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Average Device Age</h3>
                    <p className="text-4xl font-serif font-bold text-uva-navy">
                      {summary.averageAge.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">years</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">macOS Devices</h3>
                    <p className="text-4xl font-serif font-bold text-uva-navy">
                      {devices.filter(d => d.source === 'jamf').length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">from Jamf</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Windows Devices</h3>
                    <p className="text-4xl font-serif font-bold text-uva-navy">
                      {devices.filter(d => d.source === 'intune').length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">from Intune</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="bg-white rounded-xl shadow-lg border-2 border-gray-100
                                   p-6 hover:shadow-2xl hover:border-uva-orange
                                   hover:-translate-y-2 transition-all duration-300
                                   text-left group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-uva-navy to-uva-navy/80
                                    rounded-xl group-hover:from-uva-orange
                                    group-hover:to-uva-orange-light transition-all">
                        <Laptop className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-serif font-bold text-uva-navy">
                          All Devices
                        </p>
                        <p className="text-sm text-gray-600">View inventory</p>
                      </div>
                    </div>
                  </button>

                  <button className="bg-white rounded-xl shadow-lg border-2 border-gray-100
                                   p-6 hover:shadow-2xl hover:border-uva-orange
                                   hover:-translate-y-2 transition-all duration-300
                                   text-left group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-uva-navy to-uva-navy/80
                                    rounded-xl group-hover:from-uva-orange
                                    group-hover:to-uva-orange-light transition-all">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-serif font-bold text-uva-navy">
                          Security
                        </p>
                        <p className="text-sm text-gray-600">Compliance reports</p>
                      </div>
                    </div>
                  </button>

                  <button className="bg-white rounded-xl shadow-lg border-2 border-gray-100
                                   p-6 hover:shadow-2xl hover:border-uva-orange
                                   hover:-translate-y-2 transition-all duration-300
                                   text-left group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-uva-navy to-uva-navy/80
                                    rounded-xl group-hover:from-uva-orange
                                    group-hover:to-uva-orange-light transition-all">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-serif font-bold text-uva-navy">
                          Alerts
                        </p>
                        <p className="text-sm text-gray-600">Active issues</p>
                      </div>
                    </div>
                  </button>

                  <button className="bg-white rounded-xl shadow-lg border-2 border-gray-100
                                   p-6 hover:shadow-2xl hover:border-uva-orange
                                   hover:-translate-y-2 transition-all duration-300
                                   text-left group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-uva-navy to-uva-navy/80
                                    rounded-xl group-hover:from-uva-orange
                                    group-hover:to-uva-orange-light transition-all">
                        <Database className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-serif font-bold text-uva-navy">
                          Reports
                        </p>
                        <p className="text-sm text-gray-600">Generate exports</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
