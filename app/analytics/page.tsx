"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Device } from '@/types/device'
import { loadDeviceData } from '@/utils/dataLoader'
import {
  getOSTypeDistribution,
  getSourceDistribution,
  getAgeDistribution,
  getTopModels,
  getOSVersionDistribution,
  getStatusDistribution,
  getActivityTimeline,
  getReplacementTimeline,
  getDepartmentDistribution,
  getMultiDeviceOwners,
  getUpdateCompliance,
  getReplacementCostProjection,
  getVulnerabilitySeverityDistribution,
  getTruRiskDistribution,
  getTopVulnerableDevices,
  getQualysCoverage,
  getVulnerabilityCountDistribution,
} from '@/utils/chartData'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts'
import { ArrowLeft, BarChart3, TrendingUp, Shield } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-uva-orange border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg text-gray-600">Loading analytics...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const osTypeData = getOSTypeDistribution(devices)
  const sourceData = getSourceDistribution(devices)
  const ageData = getAgeDistribution(devices)
  const modelData = getTopModels(devices, 10)
  const osVersionData = getOSVersionDistribution(devices)
  const statusData = getStatusDistribution(devices)
  const activityData = getActivityTimeline(devices)
  const replacementData = getReplacementTimeline(devices)
  const departmentData = getDepartmentDistribution(devices)
  const multiDeviceData = getMultiDeviceOwners(devices)
  const updateComplianceData = getUpdateCompliance(devices)
  const costProjectionData = getReplacementCostProjection(devices)

  const unassignedCount = devices.filter(
    d => !d.owner || d.owner === 'Unknown' || d.owner === 'Unassigned'
  ).length

  const fleetHealthScore = devices.length > 0
    ? ((devices.filter(d => d.status === 'good').length / devices.length) * 100).toFixed(0)
    : 0

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="max-w-[1920px] mx-auto px-8 py-12 pt-8">
          {/* Header with Back Button */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg
                         hover:border-uva-orange hover:bg-gray-50 transition-colors font-semibold text-uva-navy"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-uva-orange" />
                <h1 className="text-4xl font-serif font-bold text-uva-navy">
                  Device Analytics
                </h1>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-2xl border-4 border-green-200 px-6 py-4">
              <p className="text-sm text-gray-600 mb-1">Fleet Health Score</p>
              <p className="text-4xl font-serif font-bold text-green-600">{fleetHealthScore}%</p>
            </div>
          </div>

          {/* Device Distribution Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-uva-orange" />
              Device Distribution
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* OS Type */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">OS Type Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={osTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {osTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Source Distribution */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Source Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Device Age & Models */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">Device Age & Models</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Age Distribution */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Device Age Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#232D4B">
                      {ageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Models */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Top 10 Device Models</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={modelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#232D4B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Health & Compliance */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">Health & Compliance</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Activity Timeline (Last Check-in)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#232D4B">
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* OS Versions */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">Operating System Versions</h2>
            <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-uva-navy mb-4">OS Version Distribution (Top 15)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={osVersionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#232D4B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Update Compliance */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">Update Compliance</h2>
            <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-uva-navy mb-4">Update Status Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={updateComplianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#232D4B">
                    {updateComplianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Replacement Planning */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-uva-orange" />
              Replacement Planning & Forecasting
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Replacement Timeline */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Replacement Timeline by FY</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={replacementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#232D4B">
                      {replacementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cost Projection */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Replacement Cost Projection</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costProjectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="cost" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Note:</strong> Costs estimated at $1,500 per device average</p>
                </div>
              </div>
            </div>
          </div>

          {/* Departmental Analytics */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">Departmental Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Distribution */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Top 10 Departments by Device Count</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#232D4B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Multi-Device Owners */}
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-uva-navy mb-4">Users with Multiple Devices</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={multiDeviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#E57200" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Security & Vulnerability Analysis (Qualys) */}
          {devices.filter(d => d.qualysAgentId).length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-7 h-7 text-red-600" />
                <h2 className="text-2xl font-serif font-bold text-uva-navy">
                  Security & Vulnerability Analysis
                </h2>
              </div>

              {/* Security Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-2xl border-4 border-green-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Qualys Coverage</h3>
                  <p className="text-4xl font-serif font-bold text-green-600">
                    {devices.filter(d => d.qualysAgentId).length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((devices.filter(d => d.qualysAgentId).length / devices.length) * 100).toFixed(1)}% of devices
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-2xl border-4 border-red-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Vulnerabilities</h3>
                  <p className="text-4xl font-serif font-bold text-red-600">
                    {devices.filter(d => d.qualysAgentId).reduce((sum, d) => sum + (d.vulnerabilityCount || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Across all devices</p>
                </div>

                <div className="bg-white rounded-xl shadow-2xl border-4 border-orange-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Critical Vulnerabilities</h3>
                  <p className="text-4xl font-serif font-bold text-orange-600">
                    {devices.filter(d => d.qualysAgentId).reduce((sum, d) => sum + (d.criticalVulnCount || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Severity 4-5</p>
                </div>

                <div className="bg-white rounded-xl shadow-2xl border-4 border-blue-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Avg TruRisk Score</h3>
                  <p className="text-4xl font-serif font-bold text-blue-600">
                    {(() => {
                      const devicesWithScore = devices.filter(d => d.truRiskScore !== undefined)
                      if (devicesWithScore.length === 0) return 'N/A'
                      const avg = devicesWithScore.reduce((sum, d) => sum + (d.truRiskScore || 0), 0) / devicesWithScore.length
                      return avg.toFixed(0)
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Out of 1000</p>
                </div>
              </div>

              {/* Vulnerability Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vulnerability Severity Distribution */}
                <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-uva-navy mb-4">Vulnerability Severity Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getVulnerabilitySeverityDistribution(devices)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getVulnerabilitySeverityDistribution(devices).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* TruRisk Score Distribution */}
                <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-uva-navy mb-4">TruRisk Score Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getTruRiskDistribution(devices)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {getTruRiskDistribution(devices).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Vulnerability Count Distribution */}
                <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-uva-navy mb-4">Devices by Vulnerability Count</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getVulnerabilityCountDistribution(devices)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {getVulnerabilityCountDistribution(devices).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Qualys Coverage */}
                <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-uva-navy mb-4">Qualys Agent Coverage</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getQualysCoverage(devices)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getQualysCoverage(devices).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Vulnerable Devices */}
              {getTopVulnerableDevices(devices, 10).length > 0 && (
                <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6 mt-6">
                  <h3 className="text-lg font-semibold text-uva-navy mb-4">Top 10 Vulnerable Devices</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getTopVulnerableDevices(devices, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-3 border-2 border-gray-200 rounded shadow-lg">
                                <p className="font-semibold">{data.name}</p>
                                <p className="text-sm text-red-600">Total Vulns: {data.vulnerabilities}</p>
                                <p className="text-sm text-orange-600">Critical: {data.critical}</p>
                                <p className="text-sm text-blue-600">TruRisk: {data.truRisk}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="vulnerabilities" fill="#dc2626" name="Total Vulnerabilities" />
                      <Bar dataKey="critical" fill="#f97316" name="Critical Vulnerabilities" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Key Metrics Summary */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-uva-navy mb-6">Key Metrics Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Devices</h3>
                <p className="text-4xl font-serif font-bold text-uva-navy">{devices.length}</p>
              </div>

              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Unassigned Devices</h3>
                <p className="text-4xl font-serif font-bold text-uva-orange">{unassignedCount}</p>
              </div>

              <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Average Fleet Age</h3>
                <p className="text-4xl font-serif font-bold text-uva-navy">
                  {(devices.reduce((sum, d) => sum + d.ageInYears, 0) / devices.length).toFixed(1)}
                  <span className="text-lg"> yrs</span>
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-2xl border-4 border-green-200 p-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Compliance Rate</h3>
                <p className="text-4xl font-serif font-bold text-green-600">{fleetHealthScore}%</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
