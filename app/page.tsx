"use client"

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MetricCard from '@/components/MetricCard'
import DeviceTable from '@/components/DeviceTable'
import InventoryTable from '@/components/InventoryTable'
import InventoryForm from '@/components/InventoryForm'
import LoanerTable from '@/components/LoanerTable'
import LoanerForm from '@/components/LoanerForm'
import { AlertCircle, AlertTriangle, CheckCircle, Laptop, Shield, Clock, Database, Search, User, DollarSign, TrendingUp, Upload, BarChart3, Settings, Package, Plus, MonitorSmartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Device } from '@/types/device'
import { MetricCardData } from '@/types/metric'
import { InventoryItem, InventorySummary, CATEGORY_LABELS, STATUS_LABELS } from '@/types/inventory'
import { LoanerLaptop, LoanerSummary, LoanHistory, STATUS_LABELS as LOANER_STATUS_LABELS } from '@/types/loaner'
import { loadDeviceData, calculateDeviceSummary, saveCSVToStorage } from '@/utils/dataLoader'
import { fetchDeviceSettings, updateRetiredStatus, updateDeviceNotes as apiUpdateNotes } from '@/utils/deviceSettingsApi'
import { fetchLoaners, createLoaner, updateLoaner, deleteLoaner as apiDeleteLoaner, addLoanHistoryEntry as apiAddLoanHistory, updateLoanHistoryEntry as apiUpdateLoanHistory } from '@/utils/loanerApi'
import CSVUploader from '@/components/CSVUploader'

type FilterView = 'attention' | 'all' | 'critical' | 'warning' | 'good' | 'inactive' | 'active' | 'jamf' | 'intune' | 'replacement' | 'retired' | 'no-qualys'
type TabView = 'overview' | 'devices' | 'security' | 'inventory' | 'loaners' | 'tools'

export default function Home() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabView>('overview')
  const [filterView, setFilterView] = useState<FilterView>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [userLookup, setUserLookup] = useState('')
  const [showBudgetTool, setShowBudgetTool] = useState(false)
  const [showCSVUploader, setShowCSVUploader] = useState(false)
  const [devicesPerPage, setDevicesPerPage] = useState<number>(25)

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  // Loaner state
  const [loanerLaptops, setLoanerLaptops] = useState<LoanerLaptop[]>([])
  const [loanHistory, setLoanHistory] = useState<LoanHistory[]>([])
  const [showLoanerForm, setShowLoanerForm] = useState(false)
  const [editingLoaner, setEditingLoaner] = useState<LoanerLaptop | null>(null)
  const [loanerFormMode, setLoanerFormMode] = useState<'add' | 'edit' | 'checkout' | 'return'>('add')

  // Toggle device retired status - uses API with localStorage fallback
  const handleToggleRetire = async (deviceId: string, isRetired: boolean) => {
    // Optimistically update UI
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId
          ? { ...device, isRetired }
          : device
      )
    )

    // Sync to API (handles localStorage fallback internally)
    await updateRetiredStatus(deviceId, isRetired)
  }

  // Update device notes - uses API with localStorage fallback
  const handleUpdateNotes = async (deviceId: string, notes: string) => {
    // Optimistically update UI
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId
          ? { ...device, notes: notes.trim() || undefined }
          : device
      )
    )

    // Sync to API (handles localStorage fallback internally)
    await apiUpdateNotes(deviceId, notes)
  }

  // Load device data on mount
  useEffect(() => {
    loadData()
    loadInventory()
    loadLoaners()
  }, [])

  // Load inventory from localStorage
  const loadInventory = () => {
    try {
      const stored = localStorage.getItem('batten-inventory')
      if (stored) {
        const items = JSON.parse(stored).map((item: InventoryItem) => ({
          ...item,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : undefined,
          warrantyExpiration: item.warrantyExpiration ? new Date(item.warrantyExpiration) : undefined,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }))
        setInventoryItems(items)
      }
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  // Save inventory to localStorage
  const saveInventory = (items: InventoryItem[]) => {
    try {
      localStorage.setItem('batten-inventory', JSON.stringify(items))
    } catch (error) {
      console.error('Error saving inventory:', error)
    }
  }

  // Handle inventory item save (add or edit)
  const handleInventorySave = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date()

    if (itemData.id) {
      // Edit existing item
      const updatedItems = inventoryItems.map(item =>
        item.id === itemData.id
          ? { ...item, ...itemData, updatedAt: now }
          : item
      )
      setInventoryItems(updatedItems)
      saveInventory(updatedItems)
    } else {
      // Add new item
      const newItem: InventoryItem = {
        ...itemData,
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      } as InventoryItem
      const updatedItems = [...inventoryItems, newItem]
      setInventoryItems(updatedItems)
      saveInventory(updatedItems)
    }

    setShowInventoryForm(false)
    setEditingItem(null)
  }

  // Handle inventory item delete
  const handleInventoryDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const updatedItems = inventoryItems.filter(item => item.id !== id)
      setInventoryItems(updatedItems)
      saveInventory(updatedItems)
    }
  }

  // Handle inventory item edit
  const handleInventoryEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setShowInventoryForm(true)
  }

  // Load loaners from API with localStorage fallback
  const loadLoaners = async () => {
    try {
      const data = await fetchLoaners()
      setLoanerLaptops(data.loaners)
      setLoanHistory(data.loanHistory)
    } catch (error) {
      console.error('Error loading loaners:', error)
    }
  }

  // Handle loaner save (add, edit, checkout, return) - syncs to API
  const handleLoanerSave = async (loanerData: Omit<LoanerLaptop, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date()
    const existingLoaner = loanerData.id ? loanerLaptops.find(l => l.id === loanerData.id) : null

    if (loanerData.id) {
      // Edit existing loaner
      const updatedLoaner: LoanerLaptop = {
        ...existingLoaner!,
        ...loanerData,
        id: loanerData.id,
        updatedAt: now,
      } as LoanerLaptop

      // Optimistically update UI
      const updatedLoaners = loanerLaptops.map(loaner =>
        loaner.id === loanerData.id ? updatedLoaner : loaner
      )
      setLoanerLaptops(updatedLoaners)

      // Sync to API
      await updateLoaner(updatedLoaner)

      // Track checkout: if status changed from available to checked-out
      if (existingLoaner && existingLoaner.status === 'available' && loanerData.status === 'checked-out') {
        const historyEntry: LoanHistory = {
          id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          loanerId: loanerData.id,
          borrowerName: loanerData.borrowerName || 'Unknown',
          borrowerEmail: loanerData.borrowerEmail,
          borrowerDepartment: loanerData.borrowerDepartment,
          checkoutDate: loanerData.checkoutDate || now,
          expectedReturnDate: loanerData.expectedReturnDate,
          notes: loanerData.notes,
        }
        setLoanHistory(prev => [...prev, historyEntry])
        await apiAddLoanHistory(historyEntry)
      }

      // Track return: if status changed from checked-out to available
      if (existingLoaner && existingLoaner.status === 'checked-out' && loanerData.status === 'available') {
        // Find the active history entry and update it
        const activeEntry = loanHistory.find(h => h.loanerId === loanerData.id && !h.actualReturnDate)
        if (activeEntry) {
          const updatedHistory = loanHistory.map(entry =>
            entry.id === activeEntry.id
              ? { ...entry, actualReturnDate: loanerData.actualReturnDate || now, notes: loanerData.notes || entry.notes }
              : entry
          )
          setLoanHistory(updatedHistory)
          await apiUpdateLoanHistory(activeEntry.id, {
            actualReturnDate: loanerData.actualReturnDate || now,
            notes: loanerData.notes || activeEntry.notes
          })
        }
      }
    } else {
      // Add new loaner
      const newLoaner: LoanerLaptop = {
        ...loanerData,
        id: `loaner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      } as LoanerLaptop

      // Optimistically update UI
      setLoanerLaptops(prev => [...prev, newLoaner])

      // Sync to API
      await createLoaner(newLoaner)
    }

    setShowLoanerForm(false)
    setEditingLoaner(null)
    setLoanerFormMode('add')
  }

  // Handle loaner delete - syncs to API
  const handleLoanerDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this loaner laptop?')) {
      // Optimistically update UI
      setLoanerLaptops(prev => prev.filter(loaner => loaner.id !== id))
      setLoanHistory(prev => prev.filter(h => h.loanerId !== id))

      // Sync to API
      await apiDeleteLoaner(id)
    }
  }

  // Handle loaner edit
  const handleLoanerEdit = (loaner: LoanerLaptop) => {
    setEditingLoaner(loaner)
    setLoanerFormMode('edit')
    setShowLoanerForm(true)
  }

  // Handle loaner checkout
  const handleLoanerCheckout = (loaner: LoanerLaptop) => {
    setEditingLoaner(loaner)
    setLoanerFormMode('checkout')
    setShowLoanerForm(true)
  }

  // Handle loaner return
  const handleLoanerReturn = (loaner: LoanerLaptop) => {
    setEditingLoaner(loaner)
    setLoanerFormMode('return')
    setShowLoanerForm(true)
  }

  // Calculate loaner summary
  const loanerSummary: LoanerSummary = {
    totalLoaners: loanerLaptops.length,
    available: loanerLaptops.filter(l => l.status === 'available').length,
    checkedOut: loanerLaptops.filter(l => l.status === 'checked-out').length,
    inMaintenance: loanerLaptops.filter(l => l.status === 'maintenance').length,
    retired: loanerLaptops.filter(l => l.status === 'retired').length,
    overdueCount: loanerLaptops.filter(l => {
      if (l.status !== 'checked-out' || !l.expectedReturnDate) return false
      return new Date(l.expectedReturnDate) < new Date()
    }).length,
  }

  // Calculate inventory summary
  const inventorySummary: InventorySummary = {
    totalItems: inventoryItems.length,
    totalValue: inventoryItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0),
    byCategory: inventoryItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {} as Record<string, number>) as InventorySummary['byCategory'],
    byStatus: inventoryItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) as InventorySummary['byStatus'],
    warrantyExpiringSoon: inventoryItems.filter(item => {
      if (!item.warrantyExpiration) return false
      const daysUntilExpiry = (new Date(item.warrantyExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90
    }).length,
    recentlyAdded: inventoryItems.filter(item => {
      const daysSinceAdded = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceAdded <= 30
    }).length,
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const deviceData = await loadDeviceData()

      // Fetch device settings from API (with localStorage fallback)
      const settings = await fetchDeviceSettings()
      const retiredSet = new Set(settings.retiredDevices)

      const devicesWithSettings = deviceData.map(device => ({
        ...device,
        isRetired: retiredSet.has(device.id),
        notes: settings.deviceNotes[device.id] || device.notes
      }))

      setDevices(devicesWithSettings)
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
        filtered = devices.filter(d => d.status === 'critical' && !d.isRetired)
        break
      case 'warning':
        filtered = devices.filter(d => d.status === 'warning' && !d.isRetired)
        break
      case 'good':
        filtered = devices.filter(d => d.status === 'good' && !d.isRetired)
        break
      case 'inactive':
        filtered = devices.filter(d => d.status === 'inactive' && !d.isRetired)
        break
      case 'active':
        filtered = devices.filter(d => d.activityStatus === 'active' && !d.isRetired)
        break
      case 'jamf':
        filtered = devices.filter(d => d.source === 'jamf' && !d.isRetired)
        break
      case 'intune':
        filtered = devices.filter(d => d.source === 'intune' && !d.isRetired)
        break
      case 'replacement':
        filtered = devices.filter(d => d.replacementRecommended && !d.isRetired)
        break
      case 'attention':
        filtered = devices.filter(d => !d.isRetired && (d.status === 'critical' || d.status === 'warning' || d.replacementRecommended))
        break
      case 'retired':
        filtered = devices.filter(d => d.isRetired)
        break
      case 'no-qualys':
        filtered = devices.filter(d => !d.qualysAgentId && !d.isRetired)
        break
      case 'all':
      default:
        // Show all non-retired by default, unless explicitly searching
        filtered = devices.filter(d => !d.isRetired)
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
      case 'retired':
        return { title: 'Retired Devices', description: 'Devices marked as retired (excluded from counts)' }
      case 'no-qualys':
        return { title: 'Missing Qualys Agent', description: 'Devices without Qualys security agent installed' }
      case 'attention':
      default:
        return { title: 'Devices Needing Attention', description: 'Critical, warning, or replacement recommended' }
    }
  }

  const filterInfo = getFilterInfo()

  // Helper to navigate to devices tab with a filter
  const goToDevices = (filter: FilterView) => {
    setFilterView(filter)
    setActiveTab('devices')
  }

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
      onClick: () => goToDevices('critical'),
    },
    {
      label: 'Warning Devices',
      value: summary.warningCount,
      subtext: 'Approaching end of life',
      icon: AlertTriangle,
      bgColor: 'bg-white',
      borderColor: 'border-yellow-200',
      iconGradient: 'from-yellow-500 to-yellow-600',
      onClick: () => goToDevices('warning'),
    },
    {
      label: 'Good Devices',
      value: summary.goodCount,
      subtext: 'In good condition',
      icon: CheckCircle,
      bgColor: 'bg-white',
      borderColor: 'border-green-200',
      iconGradient: 'from-green-500 to-green-600',
      onClick: () => goToDevices('good'),
    },
    {
      label: 'Total Devices',
      value: summary.totalDevices,
      subtext: `Avg age: ${summary.averageAge.toFixed(1)} years`,
      icon: Laptop,
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconGradient: 'from-gray-500 to-gray-600',
      onClick: () => goToDevices('all'),
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
      onClick: () => goToDevices('active'),
    },
    {
      label: 'Replacement Needed',
      value: summary.devicesNeedingReplacement,
      subtext: `$${(summary.devicesNeedingReplacement * 1500).toLocaleString()} est. cost`,
      icon: TrendingUp,
      bgColor: 'bg-white',
      borderColor: 'border-red-200',
      iconGradient: 'from-red-500 to-red-600',
      onClick: () => goToDevices('replacement'),
    },
    {
      label: 'Out of Date',
      value: summary.outOfDateDevices,
      subtext: '60+ days since update',
      icon: AlertTriangle,
      bgColor: 'bg-white',
      borderColor: 'border-orange-200',
      iconGradient: 'from-orange-500 to-orange-600',
      onClick: () => goToDevices('attention'),
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
        <section className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
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
              {/* Tab Navigation - Folder Style */}
              <div className="mb-6">
                <div className="flex gap-1 overflow-x-auto pb-0">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-8 py-3 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl border-2 border-b-0 relative ${
                      activeTab === 'overview'
                        ? 'bg-white text-uva-orange border-gray-300 shadow-sm z-10 -mb-[2px]'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-uva-navy'
                    }`}
                    style={activeTab === 'overview' ? { paddingBottom: 'calc(0.75rem + 2px)' } : {}}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('devices')}
                    className={`px-8 py-3 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl border-2 border-b-0 relative ${
                      activeTab === 'devices'
                        ? 'bg-white text-uva-orange border-gray-300 shadow-sm z-10 -mb-[2px]'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-uva-navy'
                    }`}
                    style={activeTab === 'devices' ? { paddingBottom: 'calc(0.75rem + 2px)' } : {}}
                  >
                    All Devices
                  </button>
                  {securityMetrics.length > 0 && (
                    <button
                      onClick={() => setActiveTab('security')}
                      className={`px-8 py-3 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl border-2 border-b-0 relative ${
                        activeTab === 'security'
                          ? 'bg-white text-uva-orange border-gray-300 shadow-sm z-10 -mb-[2px]'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-uva-navy'
                      }`}
                      style={activeTab === 'security' ? { paddingBottom: 'calc(0.75rem + 2px)' } : {}}
                    >
                      Security
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-8 py-3 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl border-2 border-b-0 relative flex items-center gap-2 ${
                      activeTab === 'inventory'
                        ? 'bg-white text-uva-orange border-gray-300 shadow-sm z-10 -mb-[2px]'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-uva-navy'
                    }`}
                    style={activeTab === 'inventory' ? { paddingBottom: 'calc(0.75rem + 2px)' } : {}}
                  >
                    Inventory
                    {inventoryItems.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                        {inventoryItems.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('loaners')}
                    className={`px-8 py-3 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl border-2 border-b-0 relative flex items-center gap-2 ${
                      activeTab === 'loaners'
                        ? 'bg-white text-uva-orange border-gray-300 shadow-sm z-10 -mb-[2px]'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-uva-navy'
                    }`}
                    style={activeTab === 'loaners' ? { paddingBottom: 'calc(0.75rem + 2px)' } : {}}
                  >
                    Loaner Laptops
                    {loanerLaptops.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        loanerSummary.overdueCount > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {loanerLaptops.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('tools')}
                    className={`px-8 py-3 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl border-2 border-b-0 relative ${
                      activeTab === 'tools'
                        ? 'bg-white text-uva-orange border-gray-300 shadow-sm z-10 -mb-[2px]'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-uva-navy'
                    }`}
                    style={activeTab === 'tools' ? { paddingBottom: 'calc(0.75rem + 2px)' } : {}}
                  >
                    Tools & Settings
                  </button>
                </div>
                <div className="border-t-2 border-gray-300"></div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="animate-fade-in">
                  {/* Primary Metrics */}
                  <div className="mb-8">
                    <h2 className="text-xl font-serif font-bold text-uva-navy mb-4">
                      Device Health
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="mb-8">
                    <h2 className="text-xl font-serif font-bold text-uva-navy mb-4">
                      Activity & Updates
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-6 h-6 text-red-600" />
                        <h2 className="text-xl font-serif font-bold text-uva-navy">
                          Security
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="mb-8">
                    <h2 className="text-xl font-serif font-bold text-uva-navy mb-4">
                      Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button
                        onClick={() => setActiveTab('devices')}
                        className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-4 hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                      >
                        <Laptop className="w-8 h-8 text-blue-600 mb-2" />
                        <h3 className="text-sm font-bold text-uva-navy">All Devices</h3>
                      </button>

                      {securityMetrics.length > 0 && (
                        <button
                          onClick={() => setActiveTab('security')}
                          className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-4 hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                        >
                          <Shield className="w-8 h-8 text-red-600 mb-2" />
                          <h3 className="text-sm font-bold text-uva-navy">Security</h3>
                        </button>
                      )}

                      <button
                        onClick={() => router.push('/analytics')}
                        className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-4 hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                      >
                        <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
                        <h3 className="text-sm font-bold text-uva-navy">Analytics</h3>
                      </button>

                      <button
                        onClick={() => setActiveTab('tools')}
                        className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4 hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                      >
                        <Settings className="w-8 h-8 text-gray-600 mb-2" />
                        <h3 className="text-sm font-bold text-uva-navy">Tools</h3>
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
                      {summary.retiredCount > 0 && (
                        <button
                          onClick={() => setFilterView('retired')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            filterView === 'retired'
                              ? 'bg-gray-600 text-white shadow-lg'
                              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-600'
                          }`}
                        >
                          Retired ({summary.retiredCount})
                        </button>
                      )}
                      <button
                        onClick={() => setFilterView('no-qualys')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          filterView === 'no-qualys'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-600'
                        }`}
                      >
                        Missing Qualys ({devices.filter(d => !d.qualysAgentId && !d.isRetired).length})
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
                      onToggleRetire={handleToggleRetire}
                      onUpdateNotes={handleUpdateNotes}
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
                      onToggleRetire={handleToggleRetire}
                      onUpdateNotes={handleUpdateNotes}
                    />
                  </div>

                  {/* Devices Missing Qualys */}
                  {devices.filter(d => !d.qualysAgentId && !d.isRetired).length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-6 h-6 text-purple-600" />
                        <h3 className="text-xl font-bold text-uva-navy">Missing Qualys Agent</h3>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                          {devices.filter(d => !d.qualysAgentId && !d.isRetired).length} devices
                        </span>
                      </div>
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-purple-800">
                          These devices do not have the Qualys agent installed. All managed devices should have Qualys for security monitoring.
                        </p>
                      </div>
                      <DeviceTable
                        devices={devices.filter(d => !d.qualysAgentId && !d.isRetired).slice(0, 50)}
                        title="Devices Without Qualys Agent"
                        showExport={true}
                        onToggleRetire={handleToggleRetire}
                        onUpdateNotes={handleUpdateNotes}
                      />
                    </div>
                  )}

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

              {/* INVENTORY TAB */}
              {activeTab === 'inventory' && (
                <div className="animate-fade-in">
                  {/* Header with Add Button */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-purple-600" />
                      <div>
                        <h2 className="text-3xl font-serif font-bold text-uva-navy">
                          Inventory Management
                        </h2>
                        <p className="text-gray-600">Track expensive items, equipment, and assets</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingItem(null)
                        setShowInventoryForm(true)
                      }}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold
                               hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Item
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-2xl border-4 border-purple-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-6 h-6 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-600">Total Items</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-uva-navy">{inventorySummary.totalItems}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-green-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-semibold text-gray-600">Total Value</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-green-600">
                        ${inventorySummary.totalValue.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-yellow-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        <span className="text-sm font-semibold text-gray-600">Warranty Expiring</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-yellow-600">{inventorySummary.warrantyExpiringSoon}</p>
                      <p className="text-xs text-gray-500">Within 90 days</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-blue-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-600">Recently Added</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-blue-600">{inventorySummary.recentlyAdded}</p>
                      <p className="text-xs text-gray-500">Last 30 days</p>
                    </div>
                  </div>

                  {/* Inventory Table */}
                  {inventoryItems.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-uva-navy mb-2">No Inventory Items</h3>
                      <p className="text-gray-600 mb-6">
                        Start tracking your expensive equipment, monitors, printers, and other assets.
                      </p>
                      <button
                        onClick={() => {
                          setEditingItem(null)
                          setShowInventoryForm(true)
                        }}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold
                                 hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add Your First Item
                      </button>
                    </div>
                  ) : (
                    <InventoryTable
                      items={inventoryItems}
                      onEdit={handleInventoryEdit}
                      onDelete={handleInventoryDelete}
                      title="All Inventory Items"
                    />
                  )}
                </div>
              )}

              {/* LOANERS TAB */}
              {activeTab === 'loaners' && (
                <div className="animate-fade-in">
                  {/* Header with Add Button */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <MonitorSmartphone className="w-8 h-8 text-cyan-600" />
                      <div>
                        <h2 className="text-3xl font-serif font-bold text-uva-navy">
                          Loaner Laptop Management
                        </h2>
                        <p className="text-gray-600">Track loaner devices, checkouts, and returns</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingLoaner(null)
                        setLoanerFormMode('add')
                        setShowLoanerForm(true)
                      }}
                      className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold
                               hover:bg-cyan-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Loaner
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-2xl border-4 border-cyan-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <MonitorSmartphone className="w-6 h-6 text-cyan-600" />
                        <span className="text-sm font-semibold text-gray-600">Total Loaners</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-uva-navy">{loanerSummary.totalLoaners}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-green-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-semibold text-gray-600">Available</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-green-600">{loanerSummary.available}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-yellow-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-6 h-6 text-yellow-600" />
                        <span className="text-sm font-semibold text-gray-600">Checked Out</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-yellow-600">{loanerSummary.checkedOut}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-red-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <span className="text-sm font-semibold text-gray-600">Overdue</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-red-600">{loanerSummary.overdueCount}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-4 border-blue-200 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-600">In Maintenance</span>
                      </div>
                      <p className="text-3xl font-serif font-bold text-blue-600">{loanerSummary.inMaintenance}</p>
                    </div>
                  </div>

                  {/* Loaner Table */}
                  {loanerLaptops.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
                      <MonitorSmartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-uva-navy mb-2">No Loaner Laptops</h3>
                      <p className="text-gray-600 mb-6">
                        Start tracking your loaner laptop pool for temporary device assignments.
                      </p>
                      <button
                        onClick={() => {
                          setEditingLoaner(null)
                          setLoanerFormMode('add')
                          setShowLoanerForm(true)
                        }}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold
                                 hover:bg-cyan-700 transition-colors inline-flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add Your First Loaner
                      </button>
                    </div>
                  ) : (
                    <LoanerTable
                      loaners={loanerLaptops}
                      loanHistory={loanHistory}
                      onEdit={handleLoanerEdit}
                      onDelete={handleLoanerDelete}
                      onCheckout={handleLoanerCheckout}
                      onReturn={handleLoanerReturn}
                      title="All Loaner Laptops"
                    />
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

      {/* Inventory Form Modal */}
      {showInventoryForm && (
        <InventoryForm
          item={editingItem}
          onSave={handleInventorySave}
          onClose={() => {
            setShowInventoryForm(false)
            setEditingItem(null)
          }}
        />
      )}

      {/* Loaner Form Modal */}
      {showLoanerForm && (
        <LoanerForm
          loaner={editingLoaner}
          onSave={handleLoanerSave}
          onClose={() => {
            setShowLoanerForm(false)
            setEditingLoaner(null)
            setLoanerFormMode('add')
          }}
          mode={loanerFormMode}
        />
      )}
    </div>
  )
}
