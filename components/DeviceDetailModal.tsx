"use client"

import { useState, useEffect } from 'react'
import { X, Laptop, User, Calendar, Shield, AlertTriangle, AlertCircle, CheckCircle, Clock, Mail, Building, Cpu, HardDrive, Monitor, Info, ExternalLink, Archive, ArchiveRestore, StickyNote, Save, Edit3, History } from 'lucide-react'
import { Device, Vulnerability } from '@/types/device'
import { AuditEntry, ACTION_LABELS, FIELD_LABELS } from '@/types/audit'
import { getAuditHistory } from '@/utils/auditApi'

interface DeviceDetailModalProps {
  device: Device
  onClose: () => void
  onToggleRetire?: (deviceId: string, isRetired: boolean) => void
  onUpdateNotes?: (deviceId: string, notes: string) => void
  onUpdateOwner?: (deviceId: string, owner: string) => void
}

const STATUS_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: AlertTriangle },
  good: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
  inactive: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: Clock },
  unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', icon: Info },
}

const SEVERITY_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  5: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
  2: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Low' },
  1: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Info' },
}

export default function DeviceDetailModal({ device, onClose, onToggleRetire, onUpdateNotes, onUpdateOwner }: DeviceDetailModalProps) {
  const statusStyle = STATUS_STYLES[device.status] || STATUS_STYLES.unknown
  const StatusIcon = statusStyle.icon

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(device.notes || '')

  // Owner editing state
  const [isEditingOwner, setIsEditingOwner] = useState(false)
  const [ownerValue, setOwnerValue] = useState(device.owner || '')

  // Check if owner is unassigned
  const isUnassigned = !device.owner || device.owner.toLowerCase() === 'unassigned' || device.owner.toLowerCase() === 'unknown'

  // Audit history state
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [showAuditHistory, setShowAuditHistory] = useState(false)

  // Fetch audit history when expanded
  useEffect(() => {
    if (showAuditHistory && auditHistory.length === 0) {
      setLoadingAudit(true)
      getAuditHistory('device', device.id)
        .then(entries => setAuditHistory(entries))
        .finally(() => setLoadingAudit(false))
    }
  }, [showAuditHistory, device.id, auditHistory.length])

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (date: Date | undefined): string => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${statusStyle.bg} ${statusStyle.border} border-b-2 px-6 py-4`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${statusStyle.bg} ${statusStyle.border} border-2 rounded-xl flex items-center justify-center`}>
                <Laptop className={`w-6 h-6 ${statusStyle.text}`} />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-uva-navy">{device.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                    <StatusIcon className="w-3 h-3 inline mr-1" />
                    {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-600">
                    {device.osType} • {device.source.charAt(0).toUpperCase() + device.source.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Device Info */}
            <div className="space-y-6">
              {/* Owner Information */}
              <div className={`rounded-xl p-4 border ${isUnassigned ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-uva-navy flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Owner Information
                    {isUnassigned && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                        Unassigned
                      </span>
                    )}
                  </h3>
                  {onUpdateOwner && !isEditingOwner && (
                    <button
                      onClick={() => setIsEditingOwner(true)}
                      className="text-uva-orange hover:text-uva-orange/80 text-sm flex items-center gap-1"
                    >
                      <Edit3 className="w-4 h-4" />
                      {isUnassigned ? 'Assign Owner' : 'Edit'}
                    </button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {isEditingOwner && onUpdateOwner ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-gray-600 text-xs">Primary Owner</label>
                        <input
                          type="text"
                          value={ownerValue}
                          onChange={(e) => setOwnerValue(e.target.value)}
                          placeholder="Enter owner name..."
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uva-orange mt-1"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setIsEditingOwner(false)
                            setOwnerValue(device.owner || '')
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onUpdateOwner(device.id, ownerValue)
                            setIsEditingOwner(false)
                          }}
                          className="px-3 py-1.5 bg-uva-orange text-white rounded-lg text-sm font-semibold hover:bg-uva-orange/90 flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Primary Owner</span>
                        <span className={`font-medium ${isUnassigned ? 'text-yellow-600 italic' : ''}`}>
                          {device.owner || 'Unassigned'}
                        </span>
                      </div>
                      {device.ownerEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email</span>
                          <a href={`mailto:${device.ownerEmail}`} className="font-medium text-uva-orange hover:underline flex items-center gap-1">
                            {device.ownerEmail}
                            <Mail className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {device.additionalOwner && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Additional Owner</span>
                          <span className="font-medium">{device.additionalOwner}</span>
                        </div>
                      )}
                      {device.department && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Department</span>
                          <span className="font-medium">{device.department}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Hardware Details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-uva-navy flex items-center gap-2 mb-3">
                  <Monitor className="w-5 h-5" />
                  Hardware Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model</span>
                    <span className="font-medium">{device.model}</span>
                  </div>
                  {device.manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manufacturer</span>
                      <span className="font-medium">{device.manufacturer}</span>
                    </div>
                  )}
                  {device.serialNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Serial Number</span>
                      <span className="font-medium font-mono text-xs">{device.serialNumber}</span>
                    </div>
                  )}
                  {device.processor && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processor</span>
                      <span className="font-medium">{device.processor}</span>
                    </div>
                  )}
                  {device.ram && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">RAM</span>
                      <span className="font-medium">{device.ram} GB</span>
                    </div>
                  )}
                  {device.storage && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage</span>
                      <span className="font-medium">{device.storage} GB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates & Activity */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-uva-navy flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5" />
                  Dates & Activity
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age</span>
                    <span className="font-medium">{device.ageInYears.toFixed(1)} years</span>
                  </div>
                  {device.purchaseDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase Date</span>
                      <span className="font-medium">{formatDate(device.purchaseDate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Seen</span>
                    <span className="font-medium">{formatDateTime(device.lastSeen)}</span>
                  </div>
                  {device.lastUpdateDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Update</span>
                      <span className="font-medium">{formatDate(device.lastUpdateDate)}</span>
                    </div>
                  )}
                  {device.daysSinceUpdate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Days Since Update</span>
                      <span className={`font-medium ${device.daysSinceUpdate > 30 ? 'text-red-600' : ''}`}>
                        {device.daysSinceUpdate} days
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Security & Status */}
            <div className="space-y-6">
              {/* Status Reasons */}
              {device.statusReasons && device.statusReasons.length > 0 && (
                <div className={`${statusStyle.bg} rounded-xl p-4 border-2 ${statusStyle.border}`}>
                  <h3 className={`font-semibold ${statusStyle.text} flex items-center gap-2 mb-3`}>
                    <StatusIcon className="w-5 h-5" />
                    Status Analysis
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {device.statusReasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${statusStyle.text} bg-current flex-shrink-0`}></span>
                        <span className="text-gray-700">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Replacement Recommendation */}
              {device.replacementRecommended && (
                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Replacement Recommended
                  </h3>
                  <p className="text-sm text-red-600">{device.replacementReason}</p>
                </div>
              )}

              {/* Security Metrics */}
              {(device.truRiskScore !== undefined || device.vulnerabilityCount !== undefined) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-uva-navy flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" />
                    Security Metrics (Qualys)
                  </h3>
                  <div className="space-y-2 text-sm">
                    {device.truRiskScore !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">TruRisk Score</span>
                        <span className={`font-bold text-lg ${
                          device.truRiskScore >= 700 ? 'text-red-600' :
                          device.truRiskScore >= 400 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {device.truRiskScore}
                        </span>
                      </div>
                    )}
                    {device.vulnerabilityCount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Vulnerabilities</span>
                        <span className="font-medium">{device.vulnerabilityCount}</span>
                      </div>
                    )}
                    {device.criticalVulnCount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Critical/High (Sev 4-5)</span>
                        <span className={`font-medium ${device.criticalVulnCount > 0 ? 'text-red-600' : ''}`}>
                          {device.criticalVulnCount}
                        </span>
                      </div>
                    )}
                    {device.lastVulnScan && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Scan</span>
                        <span className="font-medium">{formatDate(device.lastVulnScan)}</span>
                      </div>
                    )}
                    {device.ipAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">IP Address</span>
                        <span className="font-medium font-mono text-xs">{device.ipAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Top CVEs */}
                  {device.topCVEs && device.topCVEs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Top CVEs:</p>
                      <div className="flex flex-wrap gap-1">
                        {device.topCVEs.map((cve, index) => (
                          <a
                            key={index}
                            href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono hover:bg-red-200 transition-colors flex items-center gap-1"
                          >
                            {cve}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vulnerability List */}
              {device.vulnerabilities && device.vulnerabilities.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-uva-navy flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    Vulnerabilities ({device.vulnerabilities.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {device.vulnerabilities.slice(0, 20).map((vuln, index) => {
                      const sevStyle = SEVERITY_STYLES[vuln.severity] || SEVERITY_STYLES[1]
                      return (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{vuln.title}</p>
                              {vuln.cveId && (
                                <a
                                  href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-uva-orange hover:underline"
                                >
                                  {vuln.cveId}
                                </a>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sevStyle.bg} ${sevStyle.text} whitespace-nowrap`}>
                              {sevStyle.label}
                            </span>
                          </div>
                          {vuln.category && (
                            <p className="text-xs text-gray-500 mt-1">{vuln.category}</p>
                          )}
                        </div>
                      )
                    })}
                    {device.vulnerabilities.length > 20 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        And {device.vulnerabilities.length - 20} more...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes - Always shown for editing */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                    <StickyNote className="w-5 h-5" />
                    Notes
                  </h3>
                  {onUpdateNotes && !isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Edit3 className="w-4 h-4" />
                      {device.notes ? 'Edit' : 'Add Note'}
                    </button>
                  )}
                </div>
                {isEditingNotes && onUpdateNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add notes about this device..."
                      className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 min-h-[80px] resize-y"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setIsEditingNotes(false)
                          setNotesValue(device.notes || '')
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onUpdateNotes(device.id, notesValue)
                          setIsEditingNotes(false)
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-800">
                    {device.notes || <span className="text-blue-400 italic">No notes added yet</span>}
                  </p>
                )}
              </div>

              {/* Audit History */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <button
                  onClick={() => setShowAuditHistory(!showAuditHistory)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Change History
                  </h3>
                  <span className="text-gray-500 text-sm">
                    {showAuditHistory ? 'Hide' : 'Show'}
                  </span>
                </button>
                {showAuditHistory && (
                  <div className="mt-3 space-y-2">
                    {loadingAudit ? (
                      <p className="text-sm text-gray-500 italic">Loading history...</p>
                    ) : auditHistory.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No changes recorded yet</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {auditHistory.map((entry) => (
                          <div key={entry.id} className="text-xs bg-white rounded p-2 border border-gray-100">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-gray-700">
                                {ACTION_LABELS[entry.action] || entry.action}
                                {entry.field && ` - ${FIELD_LABELS[entry.field] || entry.field}`}
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.userName && (
                              <div className="text-gray-500 mt-0.5">by {entry.userName}</div>
                            )}
                            {entry.oldValue && entry.newValue && entry.oldValue !== entry.newValue && (
                              <div className="text-gray-500 mt-1">
                                <span className="line-through text-red-400">{entry.oldValue}</span>
                                {' → '}
                                <span className="text-green-600">{entry.newValue}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            ID: <span className="font-mono text-xs">{device.id}</span>
          </div>
          <div className="flex gap-3">
            {onToggleRetire && (
              <button
                onClick={() => {
                  onToggleRetire(device.id, !device.isRetired)
                  onClose()
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2
                         ${device.isRetired
                           ? 'bg-green-600 text-white hover:bg-green-700'
                           : 'bg-gray-500 text-white hover:bg-gray-600'
                         }`}
                title={device.isRetired ? 'Restore device to active' : 'Mark as retired'}
              >
                {device.isRetired ? (
                  <>
                    <ArchiveRestore className="w-4 h-4" />
                    Restore Device
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Retire Device
                  </>
                )}
              </button>
            )}
            {device.ownerEmail && (
              <a
                href={`mailto:${device.ownerEmail}?subject=Regarding device: ${device.name}`}
                className="px-4 py-2 bg-uva-orange text-white rounded-lg font-semibold hover:bg-uva-orange/90 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Contact Owner
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
