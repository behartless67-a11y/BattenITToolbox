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

type FilterView = 'attention' | 'all' | 'critical' | 'warning' | 'good' | 'inactive' | 'active' | 'jamf' | 'intune' | 'replacement'

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [filterView, setFilterView] = useState<FilterView>('attention')

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

  // Filter devices based on selected view
  const getFilteredDevices = (): Device[] => {
    switch (filterView) {
      case 'all':
        return devices
      case 'critical':
        return devices.filter(d => d.status === 'critical')
      case 'warning':
        return devices.filter(d => d.status === 'warning')
      case 'good':
        return devices.filter(d => d.status === 'good')
      case 'inactive':
        return devices.filter(d => d.status === 'inactive')
      case 'active':
        return devices.filter(d => d.activityStatus === 'active')
      case 'jamf':
        return devices.filter(d => d.source === 'jamf')
      case 'intune':
        return devices.filter(d => d.source === 'intune')
      case 'replacement':
        return devices.filter(d => d.replacementRecommended)
      case 'attention':
      default:
        return devices.filter(d => d.status === 'critical' || d.status === 'warning' || d.status === 'inactive')
    }
  }

  const filteredDevices = getFilteredDevices()

  // Get filter title and description
  const getFilterInfo = () => {
    switch (filterView) {
      case 'all':
        return { title: 'All Devices', description: 'Complete device inventory' }
      case 'critical':
        return { title: 'Critical Devices', description: 'Devices requiring immediate replacement' }
      case 'warning':
        return { title: 'Warning Devices', description: 'Devices approaching end-of-life' }
      case 'good':
        return { title: 'Good Devices', description: 'Devices in good condition' }
      case 'inactive':
        return { title: 'Inactive Devices', description: 'Not checked in for 30+ days' }
      case 'active':
        return { title: 'Active Devices', description: 'Checked in within 30 days' }
      case 'jamf':
        return { title: 'Jamf Devices', description: 'macOS devices from Jamf' }
      case 'intune':
        return { title: 'Intune Devices', description: 'Windows devices from Intune' }
      case 'replacement':
        return { title: 'Replacement Needed', description: 'Devices flagged for replacement' }
      case 'attention':
      default:
        return { title: 'Devices Needing Attention', description: 'Critical, Warning, and Inactive devices' }
    }
  }

  const filterInfo = getFilterInfo()

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
    {
      label: 'Inactive',
      value: summary.inactiveCount,
      subtext: 'Not checked in 30+ days',
      icon: Clock,
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconGradient: 'from-gray-500 to-gray-600',
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

              {/* Filter Buttons */}
              <div className="mb-8">
                <h2 className="text-2xl font-serif font-bold text-uva-navy mb-4">
                  Device List
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setFilterView('attention')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'attention'
                        ? 'bg-uva-orange text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-uva-orange'
                    }`}
                  >
                    Needs Attention ({summary.criticalCount + summary.warningCount + summary.inactiveCount})
                  </button>
                  <button
                    onClick={() => setFilterView('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'all'
                        ? 'bg-uva-orange text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-uva-orange'
                    }`}
                  >
                    All Devices ({summary.totalDevices})
                  </button>
                  <button
                    onClick={() => setFilterView('critical')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'critical'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600'
                    }`}
                  >
                    Critical ({summary.criticalCount})
                  </button>
                  <button
                    onClick={() => setFilterView('warning')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'warning'
                        ? 'bg-yellow-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-600'
                    }`}
                  >
                    Warning ({summary.warningCount})
                  </button>
                  <button
                    onClick={() => setFilterView('good')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'good'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-600'
                    }`}
                  >
                    Good ({summary.goodCount})
                  </button>
                  <button
                    onClick={() => setFilterView('inactive')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'inactive'
                        ? 'bg-gray-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-600'
                    }`}
                  >
                    Inactive ({summary.inactiveCount})
                  </button>
                  <button
                    onClick={() => setFilterView('active')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'active'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-600'
                    }`}
                  >
                    Active ({summary.activeDevices})
                  </button>
                  <button
                    onClick={() => setFilterView('jamf')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'jamf'
                        ? 'bg-uva-navy text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-uva-navy'
                    }`}
                  >
                    Jamf ({devices.filter(d => d.source === 'jamf').length})
                  </button>
                  <button
                    onClick={() => setFilterView('intune')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'intune'
                        ? 'bg-uva-navy text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-uva-navy'
                    }`}
                  >
                    Intune ({devices.filter(d => d.source === 'intune').length})
                  </button>
                  <button
                    onClick={() => setFilterView('replacement')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filterView === 'replacement'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600'
                    }`}
                  >
                    Replacement ({summary.devicesNeedingReplacement})
                  </button>
                </div>
                <p className="text-sm text-gray-600 italic">{filterInfo.description}</p>
              </div>

              {/* Device Table - Show filtered devices */}
              <div className="mb-12 animate-fade-in">
                <DeviceTable
                  devices={filteredDevices}
                  title={filterInfo.title}
                  showExport={true}
                />
              </div>

              {/* Statistics Section */}
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                  Device Statistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Average Device Age</h3>
                    <p className="text-4xl font-serif font-bold text-uva-navy">
                      {summary.averageAge.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">years</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Active Devices</h3>
                    <p className="text-4xl font-serif font-bold text-uva-navy">
                      {summary.activeDevices}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">checked in recently</p>
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
