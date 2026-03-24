import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, RefreshCw, Download, BarChart3, TrendingUp, Calendar, Filter } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import { useApp } from '@/context/AppContext'
import { fetchReports, generateReport } from '@/lib/api'
import { formatDate, todayDateString } from '@/lib/utils'

// Enhanced Report Generator with Modern Templates
class EnhancedReportGenerator {
  constructor(data) {
    this.data = data
  }

  // Modern HTML Report Template
  generateHTMLReport(reportType = 'comprehensive') {
    const timestamp = new Date().toLocaleString()
    const styles = this.getModernStyles()
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medalert Monitor Pro - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
    <style>${styles}</style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <header class="report-header">
            <div class="logo">
                <div class="logo-icon">M</div>
                <div>
                    <h1>Medalert Monitor Pro</h1>
                    <p>Vicidial Operations Intelligence</p>
                </div>
            </div>
            <div class="report-meta">
                <div class="report-type">${reportType.toUpperCase()} REPORT</div>
                <div class="timestamp">Generated: ${timestamp}</div>
            </div>
        </header>

        <!-- Executive Summary -->
        <section class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="summary-grid">
                <div class="metric-card">
                    <div class="metric-icon">
                        <svg width="24" height="24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${this.data.totalCalls || 0}</div>
                        <div class="metric-label">Total Calls</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">
                        <svg width="24" height="24" fill="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${this.data.agentsOnline || 0}</div>
                        <div class="metric-label">Agents Online</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">
                        <svg width="24" height="24" fill="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${this.data.activeCalls || 0}</div>
                        <div class="metric-label">Active Calls</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">
                        <svg width="24" height="24" fill="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${this.data.avgWaitTime || 0}s</div>
                        <div class="metric-label">Avg Wait Time</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Performance Metrics -->
        <section class="performance-metrics">
            <h2>Performance Metrics</h2>
            <div class="metrics-table">
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Current</th>
                            <th>Target</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Answer Rate</td>
                            <td>${this.calculateAnswerRate()}%</td>
                            <td>85%</td>
                            <td class="${this.getAnswerRateStatus()}">${this.getAnswerRateStatus().toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td>Abandon Rate</td>
                            <td>${this.calculateAbandonRate()}%</td>
                            <td>5%</td>
                            <td class="${this.getAbandonRateStatus()}">${this.getAbandonRateStatus().toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td>Avg Handle Time</td>
                            <td>${this.data.avgHandleTime || 0}s</td>
                            <td>240s</td>
                            <td class="${this.getHandleTimeStatus()}">${this.getHandleTimeStatus().toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td>Agent Efficiency</td>
                            <td>${this.calculateAgentEfficiency()}%</td>
                            <td>80%</td>
                            <td class="${this.getEfficiencyStatus()}">${this.getEfficiencyStatus().toUpperCase()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Footer -->
        <footer class="report-footer">
            <div class="footer-content">
                <div class="system-info">
                    <p>Report generated by Medalert Monitor Pro</p>
                    <p>System Version: 2.0.0 | Data freshness: Real-time</p>
                </div>
                <div class="page-number">Page 1 of 1</div>
            </div>
        </footer>
    </div>
</body>
</html>`
  }

  getModernStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.6;
        color: #1e293b;
        background: #ffffff;
      }

      .report-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
      }

      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 30px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border-radius: 12px;
        margin-bottom: 30px;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2);
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .logo-icon {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 20px;
      }

      .logo h1 {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .logo p {
        opacity: 0.8;
        font-size: 14px;
      }

      .report-meta {
        text-align: right;
      }

      .report-type {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 1px;
        opacity: 0.8;
        margin-bottom: 4px;
      }

      .timestamp {
        font-size: 14px;
        opacity: 0.9;
      }

      .executive-summary {
        margin-bottom: 40px;
      }

      .executive-summary h2 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #1e293b;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }

      .metric-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .metric-icon {
        width: 48px;
        height: 48px;
        background: #f1f5f9;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #3b82f6;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 4px;
      }

      .metric-label {
        font-size: 14px;
        color: #64748b;
      }

      .performance-metrics {
        margin-bottom: 40px;
      }

      .performance-metrics h2 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #1e293b;
      }

      .metrics-table {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .metrics-table table {
        width: 100%;
        border-collapse: collapse;
      }

      .metrics-table th {
        background: #f8fafc;
        padding: 15px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 1px solid #e2e8f0;
      }

      .metrics-table td {
        padding: 15px;
        border-bottom: 1px solid #e2e8f0;
      }

      .metrics-table tr:last-child td {
        border-bottom: none;
      }

      .good { color: #16a34a; font-weight: 600; }
      .warning { color: #d97706; font-weight: 600; }
      .danger { color: #dc2626; font-weight: 600; }

      .report-footer {
        margin-top: 60px;
        padding: 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #64748b;
        font-size: 14px;
      }

      @media print {
        .report-container {
          padding: 20px;
        }
        
        .report-header {
          background: #3b82f6 !important;
          -webkit-print-color-adjust: exact;
        }
        
        .metric-card {
          break-inside: avoid;
        }
      }

      @media (max-width: 768px) {
        .report-header {
          flex-direction: column;
          text-align: center;
          gap: 20px;
        }
        
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  }

  calculateAnswerRate() {
    const total = this.data.totalCallsToday || 0
    const answered = this.data.answeredCalls || 0
    return total > 0 ? Math.round((answered / total) * 100) : 0
  }

  calculateAbandonRate() {
    const total = this.data.totalCallsToday || 0
    const abandoned = this.data.abandonedCalls || 0
    return total > 0 ? Math.round((abandoned / total) * 100) : 0
  }

  calculateAgentEfficiency() {
    const agents = this.data.agentsOnline || 0
    const calls = this.data.activeCalls || 0
    return agents > 0 ? Math.round((calls / agents) * 100) : 0
  }

  getAnswerRateStatus() {
    const rate = this.calculateAnswerRate()
    return rate >= 85 ? 'good' : rate >= 70 ? 'warning' : 'danger'
  }

  getAbandonRateStatus() {
    const rate = this.calculateAbandonRate()
    return rate <= 5 ? 'good' : rate <= 10 ? 'warning' : 'danger'
  }

  getHandleTimeStatus() {
    const time = this.data.avgHandleTime || 0
    return time <= 240 ? 'good' : time <= 360 ? 'warning' : 'danger'
  }

  getEfficiencyStatus() {
    const eff = this.calculateAgentEfficiency()
    return eff >= 80 ? 'good' : eff >= 60 ? 'warning' : 'danger'
  }

  // PDF Generation using browser print API
  generatePDFReport(htmlContent) {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }
}

export default function Reports() {
  const { baseUrl, token, toast, latestSnapshot } = useApp()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genDate, setGenDate] = useState(todayDateString())
  const [reportType, setReportType] = useState('comprehensive')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchReports(baseUrl, token)
    setLoading(false)
    if (res.success) setReports(res.data?.reports ?? [])
    else toast(res.error || 'Failed to load reports', 'error')
  }, [baseUrl, token, toast])

  useEffect(() => { load() }, [load])

  const handleGenerateReport = async (format = 'html') => {
    setGenerating(true)
    
    try {
      const generator = new EnhancedReportGenerator(latestSnapshot?.summary || {})
      const htmlContent = generator.generateHTMLReport(reportType)
      
      if (format === 'html') {
        // Download HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `medalert-report-${reportType}-${Date.now()}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast('HTML report downloaded successfully', 'success')
      } else if (format === 'pdf') {
        // Generate PDF using print
        generator.generatePDFReport(htmlContent)
        toast('PDF generation initiated', 'success')
      }
    } catch (error) {
      toast('Failed to generate report', 'error')
      console.error('Report generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    const res = await generateReport(baseUrl, token, { date: genDate })
    setGenerating(false)
    if (!res.success) { toast(res.error || 'Failed to generate report', 'error'); return }
    toast('Report generated', 'success')
    load()
  }

  const reportTypes = [
    { id: 'comprehensive', label: 'Comprehensive', description: 'Complete system overview' },
    { id: 'performance', label: 'Performance', description: 'Call center metrics' },
    { id: 'agent', label: 'Agent Analysis', description: 'Agent productivity' },
    { id: 'executive', label: 'Executive', description: 'Management summary' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and download comprehensive analytics reports</p>
        </div>
        <Badge variant="outline">
          <FileText className="size-3 mr-1" />
          Enhanced Reports
        </Badge>
      </div>

      {/* Enhanced Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Enhanced Report Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Report Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.map((type) => (
                <div
                  key={type.id}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all
                    ${reportType === type.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                    }
                  `}
                  onClick={() => setReportType(type.id)}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <select 
                value={genDate} 
                onChange={(e) => setGenDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value={todayDateString()}>Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => handleGenerateReport('html')}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <Download className="size-4" />
              {generating ? 'Generating...' : 'Download HTML'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleGenerateReport('pdf')}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <FileText className="size-4" />
              {generating ? 'Generating...' : 'Generate PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legacy Report Generation */}
      <Card>
        <CardHeader><CardTitle>Legacy Shift Reports</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="report-date">Shift Date</Label>
              <Input
                id="report-date"
                type="date"
                value={genDate}
                onChange={(e) => setGenDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              <Plus className="size-4" />
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report list */}
      <Card>
        <CardHeader><CardTitle>Report History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id ?? r.date} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{r.date ?? '—'}</td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{r.type ?? 'shift'}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={r.status === 'ready' ? 'success' : r.status === 'error' ? 'danger' : 'muted'}>
                          {r.status ?? 'unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                            <Button variant="ghost" size="sm">
                              <Download className="size-3.5" />
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
