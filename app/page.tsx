"use client"

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MetricCard from '@/components/MetricCard'
import DeviceTable from '@/components/DeviceTable'
import { AlertCircle, AlertTriangle, CheckCircle, Laptop, Shield, Clock, Database, Search, User, DollarSign, TrendingUp, Upload, BarChart3, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Device } from '@/types/device'
import { MetricCardData } from '@/types/metric'
import { loadDeviceData, calculateDeviceSummary, saveCSVToStorage } from '@/utils/dataLoader'
import CSVUploader from '@/components/CSVUploader'

type FilterView = 'attention' | 'all' | 'critical' | 'warning' | 'good' | 'inactive' | 'active' | 'jamf' | 'intune' | 'replacement'
type TabView = 'overview' | 'devices' | 'security' | 'tools'

export default function Home() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabView>('overview')
  const [filterView, setFilterView] = useState<FilterView>('attention')
  const [searchTerm, setSearchTerm] = useState('')
  const [userLookup, setUserLookup] = useState('')
  const [showBudgetTool, setShowBudgetTool] = useState(false)
  const [showCSVUploader, setShowCSVUploader] = useState(false)
  const [devicesPerPage, setDevicesPerPage] = useState<number>(25)

  // Load device data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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

  const handleCSVUpload = async (type: 'jamf' | 'intune' | 'users' | 'coreview' | 'qualys', file: File) => {
    const text = await file.text()
    saveCSVToStorage(type, text)
    console.log(`Uploaded ${type} CSV: ${file.name}`)
  }

  const handleCSVUploadComplete = () => {
    setShowCSVUploader(false)
    // Reload data with new CSVs
    loadData()
  }

  const summary = calculateDeviceSummary(devices)

  // Filter devices based on current filter view and search
  const getFilteredDevices = () => {
    let filtered = devices

    // Apply status/source filters
    switch (filterView) {
      case 'critical':
        filtered = devices.filter(d => d.status === 'critical')
        break
      case 'warning':
        filtered = devices.filter(d => d.status === 'warning')
        break
      case 'good':
        filtered = devices.filter(d => d.status === 'good')
        break
      case 'inactive':
        filtered = devices.filter(d => d.status === 'inactive')
        break
      case 'active':
        filtered = devices.filter(d => d.activityStatus === 'active')
        break
      case 'jamf':
        filtered = devices.filter(d => d.source === 'jamf')
        break
      case 'intune':
        filtered = devices.filter(d => d.source === 'intune')
        break
      case 'replacement':
        filtered = devices.filter(d => d.replacementRecommended)
        break
      case 'attention':
        filtered = devices.filter(d => d.status === 'critical' || d.status === 'warning' || d.replacementRecommended)
        break
      case 'all':
      default:
        // No filter
        break
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.additionalOwner && device.additionalOwner.toLowerCase().includes(searchTerm.toLowerCase())) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply user lookup filter
    if (userLookup) {
      filtered = filtered.filter(device =>
        device.owner.toLowerCase().includes(userLookup.toLowerCase()) ||
        (device.ownerEmail && device.ownerEmail.toLowerCase().includes(userLookup.toLowerCase())) ||
        (device.additionalOwner && device.additionalOwner.toLowerCase().includes(userLookup.toLowerCase()))
      )
    }

    return filtered
  }

  const filteredDevices = getFilteredDevices()

  // Paginate devices
  const displayedDevices = devicesPerPage === -1
    ? filteredDevices
    : filteredDevices.slice(0, devicesPerPage)

  // Get filter title and description
  const getFilterInfo = () => {
    switch (filterView) {
      case 'all':
        return { title: 'All Devices', description: 'Complete device inventory' }
      case 'critical':
        return { title: 'Critical Devices', description: 'Devices requiring immediate replacement' }
      case 'warning':
        return { title: 'Warning Devices', description: 'Devices approaching end of life' }
      case 'good':
        return { title: 'Good Devices', description: 'Devices in good condition' }
      case 'inactive':
        return { title: 'Inactive Devices', description: 'Devices not seen recently' }
      case 'active':
        return { title: 'Active Devices', description: 'Devices with recent activity' }
      case 'jamf':
        return { title: 'Jamf Devices', description: 'Devices managed by Jamf Pro' }
      case 'intune':
        return { title: 'Intune Devices', description: 'Devices managed by Microsoft Intune' }
      case 'replacement':
        return { title: 'Replacement Needed', description: 'Devices flagged for replacement' }
      case 'attention':
      default:
        return { title: 'Devices Needing Attention', description: 'Critical, warning, or replacement recommended' }
    }
  }

  const filterInfo = getFilterInfo()

  // Primary metric cards
  const metricCards: MetricCardData[] = [
    {
      label: 'Critical Devices',
      value: summary.criticalCount,
      subtext: `${((summary.criticalCount / summary.totalDevices) * 100).toFixed(1)}% of fleet`,
      icon: AlertCircle,
      bgColor: 'bg-white',
      borderColor: 'border-red-200',
      iconGradient: 'from-red-500 to-red-600',
    },
    {
      label: 'Warning Devices',
      value: summary.warningCount,
      subtext: 'Approaching end of life',
      icon: AlertTriangle,
      bgColor: 'bg-white',
      borderColor: 'border-yellow-200',
      iconGradient: 'from-yellow-500 to-yellow-600',
    },
    {
      label: 'Good Devices',
      value: summary.goodCount,
      subtext: 'In good condition',
      icon: CheckCircle,
      bgColor: 'bg-white',
      borderColor: 'border-green-200',
      iconGradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Total Devices',
      value: summary.totalDevices,
      subtext: `Avg age: ${summary.averageAge.toFixed(1)} years`,
      icon: Laptop,
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconGradient: 'from-gray-500 to-gray-600',
    },
  ]

  // Secondary metrics
  const additionalMetrics: MetricCardData[] = [
    {
      label: 'Active Devices',
      value: summary.activeDevices,
      subtext: 'Seen in last 30 days',
      icon: Clock,
      bgColor: 'bg-white',
      borderColor: 'border-blue-200',
      iconGradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Replacement Needed',
      value: summary.devicesNeedingReplacement,
      subtext: `$${(summary.devicesNeedingReplacement * 1500).toLocaleString()} est. cost`,
      icon: TrendingUp,
      bgColor: 'bg-white',
      borderColor: 'border-red-200',
      iconGradient: 'from-red-500 to-red-600',
    },
    {
      label: 'Out of Date',
      value: summary.outOfDateDevices,
      subtext: '60+ days since update',
      icon: AlertTriangle,
      bgColor: 'bg-white',
      borderColor: 'border-orange-200',
      iconGradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Data Sources',
      value: '2',
      subtext: 'Jamf & Intune',
      icon: Database,
      bgColor: 'bg-white',
      borderColor: 'border-blue-200',
      iconGradient: 'from-blue-500 to-blue-600',
    },
  ]

  // Security metrics (Qualys)
  const securityMetrics: MetricCardData[] = summary.devicesWithQualysData && summary.devicesWithQualysData > 0 ? [
    {
      label: 'Qualys Coverage',
      value: `${summary.devicesWithQualysData}/${summary.totalDevices}`,
      subtext: `${((summary.devicesWithQualysData / summary.totalDevices) * 100).toFixed(1)}% of devices`,
      icon: Shield,
      bgColor: 'bg-white',
      borderColor: 'border-green-200',
      iconGradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Vulnerabilities',
      value: summary.totalVulnerabilities || 0,
      subtext: 'Total across fleet',
      icon: AlertTriangle,
      bgColor: 'bg-white',
      borderColor: 'border-red-200',
      iconGradient: 'from-red-500 to-red-600',
    },
    {
      label: 'Critical Vulns',
      value: summary.criticalVulnerabilities || 0,
      subtext: 'Severity 4-5',
      icon: AlertCircle,
      bgColor: 'bg-white',
      borderColor: 'border-orange-200',
      iconGradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Avg TruRisk',
      value: summary.averageTruRiskScore || 'N/A',
      subtext: 'Out of 1000',
      icon: TrendingUp,
      bgColor: 'bg-white',
      borderColor: 'border-blue-200',
      iconGradient: 'from-blue-500 to-blue-600',
    },
  ] : []

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Main Content */}
        <section className="max-w-[1920px] mx-auto px-8 py-12 pt-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-uva-orange mb-4"></div>
                <p className="text-xl text-uva-navy font-semibold">Loading device data...</p>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-serif font-bold text-uva-navy mb-2">
                No Data Available
              </h2>
              <p className="text-gray-600">
                Unable to load device data. Please check that CSV files are available.
              </p>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="mb-8">
                <div className="border-b-2 border-gray-200">
                  <div className="flex gap-1 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-6 py-3 font-semibold text-sm transition-all whitespace-nowrap ${
                        activeTab === 'overview'
                          ? 'border-b-4 border-uva-orange text-uva-orange bg-orange-50'
                          : 'text-gray-600 hover:text-uva-navy hover:bg-gray-50'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('devices')}
                      className={`px-6 py-3 font-semibold text-sm transition-all whitespace-nowrap ${
                        activeTab === 'devices'
                          ? 'border-b-4 border-uva-orange text-uva-orange bg-orange-50'
                          : 'text-gray-600 hover:text-uva-navy hover:bg-gray-50'
                      }`}
                    >
                      All Devices
                    </button>
                    {securityMetrics.length > 0 && (
                      <button
                        onClick={() => setActiveTab('security')}
                        className={`px-6 py-3 font-semibold text-sm transition-all whitespace-nowrap ${
                          activeTab === 'security'
                            ? 'border-b-4 border-uva-orange text-uva-orange bg-orange-50'
                            : 'text-gray-600 hover:text-uva-navy hover:bg-gray-50'
                        }`}
                      >
                        Security
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('tools')}
                      className={`px-6 py-3 font-semibold text-sm transition-all whitespace-nowrap ${
                        activeTab === 'tools'
                          ? 'border-b-4 border-uva-orange text-uva-orange bg-orange-50'
                          : 'text-gray-600 hover:text-uva-navy hover:bg-gray-50'
                      }`}
                    >
                      Tools & Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="animate-fade-in">
                  {/* Primary Metrics */}
                  <div className="mb-12">
                    <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                      Device Health Overview
                    </h2>

                    {/* Explanation Section */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg">
                      <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        How Device Health is Calculated
                      </h3>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p>
                          <strong>Critical Devices:</strong> Devices that are 7+ years old OR have failed OS compliance checks.
                          These devices require immediate replacement due to age, security vulnerabilities, or inability to run current software.
                        </p>
                        <p>
                          <strong>Warning Devices:</strong> Devices that are 5-7 years old. These are approaching end-of-life and should
                          be planned for replacement within the next fiscal year.
                        </p>
                        <p>
                          <strong>Good Devices:</strong> Devices less than 5 years old that are functioning normally and meet security requirements.
                        </p>
                        <p>
                          <strong>Age Calculation:</strong> Device age is calculated from the purchase date (if available) or enrollment date.
                          Average fleet age helps identify when bulk replacements may be needed.
                        </p>
                      </div>
                    </div>

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

                    {/* Explanation Section */}
                    <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6 rounded-r-lg">
                      <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Understanding Activity & Update Metrics
                      </h3>
                      <div className="text-sm text-green-800 space-y-2">
                        <p>
                          <strong>Active Devices:</strong> Devices that have checked in with Jamf or Intune within the last 30 days.
                          Inactive devices may be lost, stolen, in storage, or retired without being properly deprovisioned.
                        </p>
                        <p>
                          <strong>Replacement Needed:</strong> Count of devices flagged for replacement based on age, compliance failures,
                          or hardware issues. The estimated cost assumes $1,500 per device replacement.
                        </p>
                        <p>
                          <strong>Out of Date:</strong> Devices that haven't received OS updates in 60+ days. These devices may have
                          security vulnerabilities and should be investigated for update failures or user-deferred updates.
                        </p>
                        <p>
                          <strong>Data Sources:</strong> This dashboard aggregates data from Jamf Pro (macOS devices), Microsoft Intune
                          (Windows devices), Qualys (vulnerabilities), and UVA user directory.
                        </p>
                      </div>
                    </div>

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

                  {/* Security Metrics (Qualys) */}
                  {securityMetrics.length > 0 && (
                    <div className="mb-12">
                      <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-7 h-7 text-red-600" />
                        <h2 className="text-2xl font-serif font-bold text-uva-navy">
                          Security & Vulnerability Insights
                        </h2>
                      </div>

                      {/* Explanation Section */}
                      <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 rounded-r-lg">
                        <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Understanding Qualys Security Metrics
                        </h3>
                        <div className="text-sm text-red-800 space-y-2">
                          <p>
                            <strong>Qualys Coverage:</strong> Number of devices with active Qualys agents performing security scans.
                            Devices are matched to Qualys data by hostname, NetBIOS name, or user computing ID. Not all devices may have
                            Qualys agents installed, especially personal or newly provisioned devices.
                          </p>
                          <p>
                            <strong>Vulnerabilities:</strong> Total count of all security vulnerabilities detected across the fleet,
                            including software outdated versions, missing patches, and configuration issues identified by Qualys scans.
                          </p>
                          <p>
                            <strong>Critical Vulnerabilities:</strong> High-priority vulnerabilities (severity 4-5) that pose immediate
                            security risks and should be remediated urgently. These often include remotely exploitable flaws and zero-day vulnerabilities.
                          </p>
                          <p>
                            <strong>TruRisk Score:</strong> Qualys' proprietary risk scoring (0-1000) that combines vulnerability severity,
                            asset criticality, and threat intelligence. Higher scores indicate greater risk exposure. The average helps
                            prioritize remediation efforts across the fleet.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {securityMetrics.map((card, index) => (
                          <MetricCard
                            key={card.label}
                            data={card}
                            animationDelay={`animation-delay-${index * 200}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="mb-12">
                    <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">
                      Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button
                        onClick={() => setActiveTab('devices')}
                        className="bg-white rounded-xl shadow-2xl border-4 border-blue-200 p-8 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:-translate-y-2 transition-all text-left"
                      >
                        <Laptop className="w-12 h-12 text-blue-600 mb-4" />
                        <h3 className="text-xl font-bold text-uva-navy mb-2">View All Devices</h3>
                        <p className="text-gray-600">Browse and search all {devices.length} devices with filtering</p>
                      </button>

                      {securityMetrics.length > 0 && (
                        <button
                          onClick={() => setActiveTab('security')}
                          className="bg-white rounded-xl shadow-2xl border-4 border-red-200 p-8 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:-translate-y-2 transition-all text-left"
                        >
                          <Shield className="w-12 h-12 text-red-600 mb-4" />
                          <h3 className="text-xl font-bold text-uva-navy mb-2">Security Dashboard</h3>
                          <p className="text-gray-600">View vulnerability data and security metrics</p>
                        </button>
                      )}

                      <button
                        onClick={() => router.push('/analytics')}
                        className="bg-white rounded-xl shadow-2xl border-4 border-green-200 p-8 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:-translate-y-2 transition-all text-left"
                      >
                        <BarChart3 className="w-12 h-12 text-green-600 mb-4" />
                        <h3 className="text-xl font-bold text-uva-navy mb-2">Analytics & Charts</h3>
                        <p className="text-gray-600">View detailed visualizations and reports</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DEVICES TAB */}
              {activeTab === 'devices' && (
                <div className="animate-fade-in">
                  {/* Search Bar */}
                  <div className="mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by device name, owner, or model..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm
                                   focus:outline-none focus:border-uva-orange transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Lookup by user/owner..."
                          value={userLookup}
                          onChange={(e) => setUserLookup(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm
                                   focus:outline-none focus:border-uva-orange transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter Buttons */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-uva-navy mb-4">Filter Devices</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setFilterView('attention')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          filterView === 'attention'
                            ? 'bg-uva-orange text-white shadow-lg'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-uva-orange'
                        }`}
                      >
                        Needs Attention ({summary.criticalCount + summary.warningCount})
                      </button>
                      <button
                        onClick={() => setFilterView('all')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          filterView === 'all'
                            ? 'bg-gray-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-600'
                        }`}
                      >
                        All ({summary.totalDevices})
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
                    <p className="text-sm text-gray-600 italic mt-2">{filterInfo.description}</p>
                  </div>

                  {/* Device Table */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          Showing {displayedDevices.length} of {filteredDevices.length} devices
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="devicesPerPage" className="text-sm text-gray-600">
                          Show:
                        </label>
                        <select
                          id="devicesPerPage"
                          value={devicesPerPage}
                          onChange={(e) => setDevicesPerPage(Number(e.target.value))}
                          className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm font-semibold
                                   focus:border-uva-orange focus:outline-none transition-colors bg-white"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={-1}>All</option>
                        </select>
                      </div>
                    </div>

                    <DeviceTable
                      devices={displayedDevices}
                      title={filterInfo.title}
                      showExport={true}
                    />
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && securityMetrics.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-8">
                    <Shield className="w-8 h-8 text-red-600" />
                    <h2 className="text-3xl font-serif font-bold text-uva-navy">
                      Security & Vulnerability Analysis
                    </h2>
                  </div>

                  {/* Security Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {securityMetrics.map((card, index) => (
                      <MetricCard
                        key={card.label}
                        data={card}
                        animationDelay={`animation-delay-${index * 200}`}
                      />
                    ))}
                  </div>

                  {/* All Vulnerabilities Breakdown */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-uva-navy mb-4">All Vulnerabilities by Device</h3>
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-uva-navy">Device</th>
                              <th className="px-4 py-3 text-left font-semibold text-uva-navy">Vulnerability</th>
                              <th className="px-4 py-3 text-center font-semibold text-uva-navy">Severity</th>
                              <th className="px-4 py-3 text-left font-semibold text-uva-navy">CVE</th>
                              <th className="px-4 py-3 text-center font-semibold text-uva-navy">TruRisk</th>
                              <th className="px-4 py-3 text-left font-semibold text-uva-navy">First Detected</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {devices
                              .filter(d => d.vulnerabilities && d.vulnerabilities.length > 0)
                              .flatMap(d =>
                                d.vulnerabilities!.slice(0, 5).map((v, i) => ({
                                  deviceName: d.name,
                                  deviceOwner: d.owner,
                                  ...v,
                                  key: `${d.id}-${i}`
                                }))
                              )
                              .sort((a, b) => b.severity - a.severity || (b.truRiskScore || 0) - (a.truRiskScore || 0))
                              .slice(0, 100)
                              .map(item => (
                                <tr key={item.key} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{item.deviceName}</div>
                                    <div className="text-xs text-gray-500">{item.deviceOwner}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="max-w-xs truncate" title={item.title}>{item.title}</div>
                                    {item.category && (
                                      <div className="text-xs text-gray-500">{item.category}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      item.severity === 5 ? 'bg-red-100 text-red-700' :
                                      item.severity === 4 ? 'bg-orange-100 text-orange-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {item.severity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.cveId ? (
                                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1 rounded">
                                        {item.cveId}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {item.truRiskScore ? (
                                      <span className={`text-xs font-bold ${
                                        item.truRiskScore >= 70 ? 'text-red-600' :
                                        item.truRiskScore >= 40 ? 'text-orange-600' :
                                        'text-gray-600'
                                      }`}>
                                        {item.truRiskScore}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-600">
                                    {item.firstDetected ? item.firstDetected.toLocaleDateString() : '-'}
                                  </td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t">
                        Showing top 100 vulnerabilities sorted by severity and TruRisk score
                      </div>
                    </div>
                  </div>

                  {/* Devices with Vulnerabilities */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-uva-navy mb-4">Vulnerable Devices</h3>
                    <DeviceTable
                      devices={devices.filter(d => d.qualysAgentId && d.vulnerabilityCount && d.vulnerabilityCount > 0).slice(0, 50)}
                      title="Devices with Security Vulnerabilities"
                      showExport={true}
                    />
                  </div>

                  {/* Link to Full Analytics */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">View Detailed Security Analytics</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      For comprehensive charts, graphs, and vulnerability analysis, visit the Analytics page.
                    </p>
                    <button
                      onClick={() => router.push('/analytics')}
                      className="px-6 py-2 bg-uva-navy text-white rounded-lg font-semibold hover:bg-uva-blue-light transition-colors flex items-center gap-2"
                    >
                      <BarChart3 className="w-5 h-5" />
                      View Full Analytics
                    </button>
                  </div>
                </div>
              )}

              {/* TOOLS TAB */}
              {activeTab === 'tools' && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-8">
                    <Settings className="w-8 h-8 text-gray-600" />
                    <h2 className="text-3xl font-serif font-bold text-uva-navy">
                      Tools & Settings
                    </h2>
                  </div>

                  {/* Tool Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* CSV Uploader */}
                    <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Upload className="w-6 h-6 text-uva-orange" />
                        <h3 className="text-lg font-semibold text-uva-navy">Upload Data Files</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Update device data from Jamf, Intune, Qualys, or user directory exports.
                      </p>
                      <button
                        onClick={() => setShowCSVUploader(true)}
                        className="w-full px-4 py-2 bg-uva-navy text-white rounded-lg hover:bg-uva-blue-light transition-colors font-semibold"
                      >
                        Upload CSV Files
                      </button>
                    </div>

                    {/* Budget Calculator */}
                    <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-uva-navy">Budget Calculator</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Calculate replacement costs and budget planning for device lifecycle management.
                      </p>
                      <button
                        onClick={() => setShowBudgetTool(!showBudgetTool)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                      >
                        {showBudgetTool ? 'Hide' : 'Show'} Calculator
                      </button>
                    </div>

                    {/* Analytics Link */}
                    <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-uva-navy">Analytics & Reports</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        View detailed charts, visualizations, and comprehensive analytics dashboards.
                      </p>
                      <button
                        onClick={() => router.push('/analytics')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        View Analytics
                      </button>
                    </div>
                  </div>

                  {/* Budget Planning Tool */}
                  {showBudgetTool && (
                    <div className="mb-8 animate-fade-in">
                      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-2xl border-4 border-green-200 p-8">
                        <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6 flex items-center gap-2">
                          <DollarSign className="w-6 h-6 text-green-600" />
                          Replacement Budget Calculator
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          <div className="bg-white rounded-lg p-6 border-2 border-green-300">
                            <p className="text-sm text-gray-600 mb-2">Critical (Immediate)</p>
                            <p className="text-3xl font-bold text-red-600">{summary.criticalCount}</p>
                            <p className="text-sm text-gray-700 mt-2">
                              Est. Cost: <span className="font-semibold">${(summary.criticalCount * 1500).toLocaleString()}</span>
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-6 border-2 border-yellow-300">
                            <p className="text-sm text-gray-600 mb-2">Warning (Next Year)</p>
                            <p className="text-3xl font-bold text-yellow-600">{summary.warningCount}</p>
                            <p className="text-sm text-gray-700 mt-2">
                              Est. Cost: <span className="font-semibold">${(summary.warningCount * 1500).toLocaleString()}</span>
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-6 border-2 border-blue-300">
                            <p className="text-sm text-gray-600 mb-2">Total Replacement Needed</p>
                            <p className="text-3xl font-bold text-blue-600">{summary.devicesNeedingReplacement}</p>
                            <p className="text-sm text-gray-700 mt-2">
                              Est. Cost: <span className="font-semibold">${(summary.devicesNeedingReplacement * 1500).toLocaleString()}</span>
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                          <h3 className="font-semibold text-uva-navy mb-2">Budget Assumptions</h3>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Average device replacement cost: $1,500</li>
                            <li>• Critical devices need immediate replacement (current fiscal year)</li>
                            <li>• Warning devices should be replaced in next fiscal year</li>
                            <li>• Costs do not include setup, configuration, or disposal fees</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />

      {/* CSV Uploader Modal */}
      {showCSVUploader && (
        <CSVUploader
          onUpload={handleCSVUpload}
          onClose={handleCSVUploadComplete}
        />
      )}
    </div>
  )
}
