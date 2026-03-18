import { useState, useEffect, useCallback } from 'react'
import { Database, RefreshCw, Search, List, AlignLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import NativeSelect from '@/components/ui/NativeSelect'
import Skeleton from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useApp } from '@/context/AppContext'
import { fetchDbTables, fetchDbSchema, fetchDbRows } from '@/lib/api'

export default function AdvancedDB() {
  const { baseUrl, token, toast } = useApp()
  const [tables, setTables] = useState([])
  const [table, setTable] = useState('')
  const [schema, setSchema] = useState(null)
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)

  // Load table list
  useEffect(() => {
    async function loadTables() {
      const res = await fetchDbTables(baseUrl, token)
      if (res.success) {
        const list = res.data?.tables ?? []
        setTables(list)
        if (list.length > 0 && !table) setTable(list[0])
      } else {
        toast(res.error || 'Failed to load tables', 'error')
      }
    }
    loadTables()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, token])

  // Load schema + rows when table changes
  const loadTable = useCallback(async () => {
    if (!table) return
    setLoading(true)
    const [schemaRes, rowsRes] = await Promise.all([
      fetchDbSchema(baseUrl, token, table),
      fetchDbRows(baseUrl, token, table, { filter }),
    ])
    setLoading(false)
    if (schemaRes.success) setSchema(schemaRes.data?.schema ?? null)
    if (rowsRes.success) {
      setRows(rowsRes.data?.rows ?? [])
      if (!rowsRes.success) toast(rowsRes.error || 'Failed to load rows', 'error')
    }
  }, [baseUrl, token, table, filter, toast])

  useEffect(() => { if (table) loadTable() }, [table, loadTable])

  async function handleSearch() {
    setLoadingRows(true)
    const res = await fetchDbRows(baseUrl, token, table, { filter })
    setLoadingRows(false)
    if (res.success) setRows(res.data?.rows ?? [])
    else toast(res.error || 'Search failed', 'error')
  }

  const cols = rows.length > 0 ? Object.keys(rows[0]) : (schema?.columns?.map((c) => c.name) ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Database Explorer</h1>
          <p className="text-sm text-muted-foreground">Browse and inspect database tables</p>
        </div>
      </div>

      {/* Table selector */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label htmlFor="db-table">Table</Label>
          <NativeSelect
            id="db-table"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="w-56"
          >
            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5 flex-1 min-w-40">
          <Label htmlFor="db-filter">Filter (WHERE clause or keyword)</Label>
          <div className="flex gap-2">
            <Input
              id="db-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. status = 'active'"
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={handleSearch} disabled={loadingRows}>
              <Search className="size-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadTable} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Schema + Rows tabs */}
      <Tabs defaultValue="rows">
        <TabsList>
          <TabsTrigger value="rows"><List className="size-3.5 mr-1.5" />Rows</TabsTrigger>
          <TabsTrigger value="schema"><AlignLeft className="size-3.5 mr-1.5" />Schema</TabsTrigger>
        </TabsList>

        {/* Rows */}
        <TabsContent value="rows">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4" />
                {table || 'Select a table'} · {rows.length} rows
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-center">
                  <Database className="size-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No rows found</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b">
                        {cols.map((c) => (
                          <th key={c} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          {cols.map((c) => (
                            <td key={c} className="px-3 py-1.5 text-xs font-mono whitespace-nowrap max-w-[200px] truncate" title={String(row[c] ?? '')}>
                              {row[c] == null ? <span className="text-muted-foreground/50">null</span> : String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema */}
        <TabsContent value="schema">
          <Card>
            <CardHeader><CardTitle>Schema — {table}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : !schema ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No schema info</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Column</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nullable</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(schema.columns ?? []).map((col) => (
                        <tr key={col.name} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-2 font-medium text-xs">{col.name}</td>
                          <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{col.type}</td>
                          <td className="px-4 py-2 text-xs">{col.nullable ? 'YES' : 'NO'}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{col.default ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
