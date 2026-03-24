import React, { useState, useEffect, useCallback } from 'react'
import { Brain, TrendingUp, BarChart3, Activity, Target, Zap, RefreshCw, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { useApp } from '@/context/AppContext'
import { fetchIntelligenceData } from '@/lib/api'
import { formatNumber, formatDuration, formatPct, todayDateString } from '@/lib/utils'

export default function Intelligence() {
  const { baseUrl, token, toast } = useApp()
  const [selectedDate, setSelectedDate] = useState(todayDateString())
  const [loading, setLoading] = useState(false)
  const [intelligence, setIntelligence] = useState(null)

  const loadIntelligence = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchIntelligenceData(baseUrl, token, selectedDate)
      if (res.success) {
        setIntelligence(res.data)
      } else {
        toast(res.error || 'Failed to load intelligence data', 'error')
      }
    } catch (error) {
      toast('Failed to load intelligence data', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, token, selectedDate, toast])

  useEffect(() => {
    loadIntelligence()
  }, [loadIntelligence])

  const getPerformanceLevel = (score) => {
    if (score >= 90) return { level: 'Excellent', color: 'success' }
    if (score >= 80) return { level: 'Good', color: 'success' }
    if (score >= 70) return { level: 'Fair', color: 'warning' }
    return { level: 'Poor', color: 'danger' }
  }

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="size-4 text-green-500" />
    if (trend < 0) return <TrendingUp className="size-4 text-red-500 rotate-180" />
    return <Activity className="size-4 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Analytics</h1>
          <p className="text-muted-foreground">Advanced analytics and predictive insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="intel-date" className="sr-only">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="intel-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 w-40"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadIntelligence} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
      ) : intelligence ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5" />
              Overall Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold">
                  {intelligence.overallScore || 0}
                </div>
                <div>
                  <Badge variant={getPerformanceLevel(intelligence.overallScore).color}>
                    {getPerformanceLevel(intelligence.overallScore).level}
                  </Badge>
                  <div className="flex items-center gap-2 mt-2">
                    {getTrendIcon(intelligence.scoreTrend)}
                    <span className="text-sm text-muted-foreground">
                      {intelligence.scoreTrend > 0 ? '+' : ''}{intelligence.scoreTrend}% from last period
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Efficiency</div>
                  <div className="font-semibold">{formatPct(intelligence.efficiency || 0)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Utilization</div>
                  <div className="font-semibold">{formatPct(intelligence.utilization || 0)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Service Level</div>
                  <div className="font-semibold">{formatPct(intelligence.serviceLevel || 0)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Quality Score</div>
                  <div className="font-semibold">{formatPct(intelligence.qualityScore || 0)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Key Metrics Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : intelligence ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Call Volume</p>
                  <p className="text-2xl font-bold">{formatNumber(intelligence.callVolume || 0)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(intelligence.callVolumeTrend)}
                    <span className="text-xs text-muted-foreground">
                      {intelligence.callVolumeTrend > 0 ? '+' : ''}{intelligence.callVolumeTrend}%
                    </span>
                  </div>
                </div>
                <Activity className="size-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold">{formatDuration(intelligence.avgResponseTime || 0)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(intelligence.responseTimeTrend * -1)}
                    <span className="text-xs text-muted-foreground">
                      {intelligence.responseTimeTrend > 0 ? '+' : ''}{intelligence.responseTimeTrend}s
                    </span>
                  </div>
                </div>
                <Zap className="size-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{formatPct(intelligence.conversionRate || 0)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(intelligence.conversionRateTrend)}
                    <span className="text-xs text-muted-foreground">
                      {intelligence.conversionRateTrend > 0 ? '+' : ''}{intelligence.conversionRateTrend}%
                    </span>
                  </div>
                </div>
                <Target className="size-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agent Productivity</p>
                  <p className="text-2xl font-bold">{formatPct(intelligence.agentProductivity || 0)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(intelligence.productivityTrend)}
                    <span className="text-xs text-muted-foreground">
                      {intelligence.productivityTrend > 0 ? '+' : ''}{intelligence.productivityTrend}%
                    </span>
                  </div>
                </div>
                <BarChart3 className="size-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Predictive Analytics */}
      {intelligence?.predictions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Predictive Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {intelligence.predictions.map((prediction, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{prediction.metric}</h4>
                    <Badge variant={prediction.confidence >= 80 ? 'success' : prediction.confidence >= 60 ? 'warning' : 'danger'}>
                      {prediction.confidence}% confidence
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current:</span>
                      <span>{prediction.currentValue}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Predicted:</span>
                      <span className="font-medium">{prediction.predictedValue}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Timeframe:</span>
                      <span>{prediction.timeframe}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          prediction.trend === 'up' ? 'bg-green-500' : 
                          prediction.trend === 'down' ? 'bg-red-500' : 'bg-gray-500'
                        }`}
                        style={{ width: `${Math.abs(prediction.change)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-center mt-1">
                      {prediction.trend === 'up' && <TrendingUp className="size-3 text-green-500 mr-1" />}
                      {prediction.trend === 'down' && <TrendingUp className="size-3 text-red-500 mr-1 rotate-180" />}
                      <span className="text-xs text-muted-foreground">
                        {prediction.change > 0 ? '+' : ''}{prediction.change}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights & Recommendations */}
      {intelligence?.insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intelligence.insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={insight.severity === 'high' ? 'danger' : insight.severity === 'medium' ? 'warning' : 'success'}>
                        {insight.severity}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{insight.category}</span>
                    </div>
                    <p className="text-sm">{insight.description}</p>
                    {insight.impact && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Impact: {insight.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intelligence.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'success'}>
                        {rec.priority} priority
                      </Badge>
                      <span className="text-sm text-muted-foreground">{rec.category}</span>
                    </div>
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                    {rec.expectedImpact && (
                      <p className="text-xs text-green-600 mt-1">
                        Expected impact: {rec.expectedImpact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Trends */}
      {intelligence?.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {intelligence.trends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{trend.metric}</div>
                    <div className="text-sm text-muted-foreground">{trend.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trend.change)}
                      <span className="font-medium">{trend.change > 0 ? '+' : ''}{trend.change}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Last {trend.period}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
