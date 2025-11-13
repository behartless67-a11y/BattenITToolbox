"use client"

import { Device } from '@/types/device'
import { AlertCircle, AlertTriangle, CheckCircle, Download, Search } from 'lucide-react'
import { useState } from 'react'

interface DeviceTableProps {
  devices: Device[]
  title?: string
  showExport?: boolean
}

export default function DeviceTable({
  devices,
  title = "Devices",
  showExport = true
}: DeviceTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof Device>('ageInYears')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filter devices based on search
  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.model.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort devices
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    // Handle Date objects
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime()
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const handleSort = (field: keyof Device) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleExport = () => {
    // Convert to CSV
    const headers = ['Device Name', 'Owner', 'Model', 'OS Version', 'Age (Years)', 'Status', 'Last Seen']
    const csvData = sortedDevices.map(device => [
      device.name,
      device.owner,
      device.model,
      device.osVersion,
      device.ageInYears.toFixed(1),
      device.status,
      device.lastSeen.toLocaleDateString()
    ])

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: Device['status']) => {
    switch (status) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: Device['status']) => {
    const styles = {
      critical: 'bg-red-50 text-red-700 border-red-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      good: 'bg-green-50 text-green-700 border-green-200',
      unknown: 'bg-gray-50 text-gray-700 border-gray-200',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-uva-navy">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {sortedDevices.length} of {devices.length} devices
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:border-uva-orange transition-colors"
            />
          </div>

          {/* Export Button */}
          {showExport && (
            <button
              onClick={handleExport}
              className="px-6 py-2 bg-uva-orange text-white rounded-lg font-semibold
                       hover:bg-uva-orange-light transition-colors flex items-center gap-2
                       justify-center whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-4 py-3 text-left text-sm font-semibold text-uva-navy cursor-pointer hover:bg-gray-100"
              >
                Device Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('owner')}
                className="px-4 py-3 text-left text-sm font-semibold text-uva-navy cursor-pointer hover:bg-gray-100"
              >
                Owner {sortField === 'owner' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-uva-navy">
                Model
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-uva-navy">
                OS Version
              </th>
              <th
                onClick={() => handleSort('ageInYears')}
                className="px-4 py-3 text-left text-sm font-semibold text-uva-navy cursor-pointer hover:bg-gray-100"
              >
                Age {sortField === 'ageInYears' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-4 py-3 text-left text-sm font-semibold text-uva-navy cursor-pointer hover:bg-gray-100"
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('lastSeen')}
                className="px-4 py-3 text-left text-sm font-semibold text-uva-navy cursor-pointer hover:bg-gray-100"
              >
                Last Seen {sortField === 'lastSeen' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedDevices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No devices found matching your criteria
                </td>
              </tr>
            ) : (
              sortedDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(device.status)}
                      <div className="flex flex-col">
                        <span className="font-medium text-uva-navy">{device.name}</span>
                        {device.statusReason && (
                          <span className="text-xs text-gray-500 mt-1 group-hover:text-gray-700" title={device.statusReasons?.join('; ')}>
                            {device.statusReason.length > 80 ? device.statusReason.substring(0, 80) + '...' : device.statusReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {device.owner}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {device.model}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {device.osType} {device.osVersion}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-semibold ${
                      device.ageInYears >= 5 ? 'text-red-600' :
                      device.ageInYears >= 3 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {device.ageInYears.toFixed(1)} yr
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(device.status)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {device.lastSeen.toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
