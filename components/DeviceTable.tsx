"use client"

import { Device } from '@/types/device'
import { AlertCircle, AlertTriangle, CheckCircle, Download, Search, ChevronDown, ChevronRight } from 'lucide-react'
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Toggle row expansion
  const toggleRow = (deviceId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(deviceId)) {
      newExpanded.delete(deviceId)
    } else {
      newExpanded.add(deviceId)
    }
    setExpandedRows(newExpanded)
  }

  // Filter devices based on search
  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (device.additionalOwner && device.additionalOwner.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
    const headers = ['Device Name', 'Owner', 'Additional Owner', 'Model', 'OS Version', 'Age (Years)', 'Status', 'Last Seen']
    const csvData = sortedDevices.map(device => [
      device.name,
      device.owner,
      device.additionalOwner || '',
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
      inactive: 'bg-gray-50 text-gray-700 border-gray-300',
      unknown: 'bg-gray-50 text-gray-700 border-gray-200',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.unknown}`}>
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-uva-navy w-8">
                {/* Expand column */}
              </th>
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
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No devices found matching your criteria
                </td>
              </tr>
            ) : (
              sortedDevices.map((device) => (
                <>
                  {/* Main Row */}
                  <tr key={device.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleRow(device.id)}
                        className="text-gray-500 hover:text-uva-navy transition-colors"
                      >
                        {expandedRows.has(device.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(device.status)}
                        <span className="font-medium text-uva-navy">{device.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span>{device.owner}</span>
                        {device.additionalOwner && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            ({device.additionalOwner})
                          </span>
                        )}
                      </div>
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

                  {/* Expanded Detail Row */}
                  {expandedRows.has(device.id) && (
                    <tr key={`${device.id}-details`} className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Basic Info */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Device Information</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700">ID:</span> <span className="text-gray-600">{device.id}</span></div>
                              <div><span className="font-medium text-gray-700">Name:</span> <span className="text-gray-600">{device.name}</span></div>
                              <div><span className="font-medium text-gray-700">Serial Number:</span> <span className="text-gray-600">{device.serialNumber || 'N/A'}</span></div>
                              <div><span className="font-medium text-gray-700">Manufacturer:</span> <span className="text-gray-600">{device.manufacturer || 'N/A'}</span></div>
                              <div><span className="font-medium text-gray-700">Model:</span> <span className="text-gray-600">{device.model}</span></div>
                              <div><span className="font-medium text-gray-700">Source:</span> <span className="text-gray-600 uppercase">{device.source}</span></div>
                            </div>
                          </div>

                          {/* Owner Info */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Owner Information</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700">Primary Owner:</span> <span className="text-gray-600">{device.owner}</span></div>
                              {device.ownerEmail && (
                                <div><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-600">{device.ownerEmail}</span></div>
                              )}
                              {device.additionalOwner && (
                                <div><span className="font-medium text-gray-700">Additional Owner:</span> <span className="text-gray-600">{device.additionalOwner}</span></div>
                              )}
                              {device.department && (
                                <div><span className="font-medium text-gray-700">Department:</span> <span className="text-gray-600">{device.department}</span></div>
                              )}
                            </div>
                          </div>

                          {/* System Info */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">System Details</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700">OS Type:</span> <span className="text-gray-600">{device.osType}</span></div>
                              <div><span className="font-medium text-gray-700">OS Version:</span> <span className="text-gray-600">{device.osVersion}</span></div>
                              {device.processor && (
                                <div><span className="font-medium text-gray-700">Processor:</span> <span className="text-gray-600">{device.processor}</span></div>
                              )}
                              {device.ram && (
                                <div><span className="font-medium text-gray-700">RAM:</span> <span className="text-gray-600">{device.ram} GB</span></div>
                              )}
                              {device.storage && (
                                <div><span className="font-medium text-gray-700">Storage:</span> <span className="text-gray-600">{device.storage} GB</span></div>
                              )}
                            </div>
                          </div>

                          {/* Status & Dates */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Status & Activity</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700">Status:</span> <span className="text-gray-600 capitalize">{device.status}</span></div>
                              <div><span className="font-medium text-gray-700">Activity:</span> <span className="text-gray-600 capitalize">{device.activityStatus}</span></div>
                              <div><span className="font-medium text-gray-700">Age:</span> <span className="text-gray-600">{device.ageInYears.toFixed(1)} years</span></div>
                              {device.purchaseDate && (
                                <div><span className="font-medium text-gray-700">Purchase Date:</span> <span className="text-gray-600">{device.purchaseDate.toLocaleDateString()}</span></div>
                              )}
                              <div><span className="font-medium text-gray-700">Last Seen:</span> <span className="text-gray-600">{device.lastSeen.toLocaleDateString()}</span></div>
                              {device.lastUpdateDate && (
                                <div><span className="font-medium text-gray-700">Last Update:</span> <span className="text-gray-600">{device.lastUpdateDate.toLocaleDateString()}</span></div>
                              )}
                              {device.daysSinceUpdate !== undefined && (
                                <div><span className="font-medium text-gray-700">Days Since Update:</span> <span className="text-gray-600">{device.daysSinceUpdate} days</span></div>
                              )}
                              {device.ipAddress && (
                                <div><span className="font-medium text-gray-700">IP Address:</span> <span className="text-gray-600">{device.ipAddress}</span></div>
                              )}
                            </div>
                          </div>

                          {/* Compliance & Security */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Compliance & Security</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700">Compliant:</span> <span className={device.isCompliant ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{device.isCompliant ? 'Yes' : 'No'}</span></div>
                              {device.vulnerabilityCount !== undefined && (
                                <div><span className="font-medium text-gray-700">Vulnerabilities:</span> <span className="text-gray-600">{device.vulnerabilityCount}</span></div>
                              )}
                              {device.missingPatches !== undefined && (
                                <div><span className="font-medium text-gray-700">Missing Patches:</span> <span className="text-gray-600">{device.missingPatches}</span></div>
                              )}
                            </div>
                          </div>

                          {/* Replacement Info */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Replacement Status</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700">Replacement Recommended:</span> <span className={device.replacementRecommended ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>{device.replacementRecommended ? 'Yes' : 'No'}</span></div>
                              {device.replacementReason && (
                                <div className="mt-2">
                                  <span className="font-medium text-gray-700 block mb-1">Reason:</span>
                                  <span className="text-gray-600 text-xs">{device.replacementReason}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Reasons - Full Width */}
                          {device.statusReasons && device.statusReasons.length > 0 && (
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-3">
                              <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Status Analysis</h4>
                              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                {device.statusReasons.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Notes */}
                          {device.notes && (
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-3">
                              <h4 className="font-semibold text-uva-navy text-sm uppercase tracking-wide border-b pb-2">Notes</h4>
                              <p className="text-sm text-gray-600">{device.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
