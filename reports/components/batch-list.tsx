"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Sparkline } from "@/components/ui/sparkline"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, ChevronLeft, ChevronRight, Search, Download, Info, AlertCircle, TrendingUp, DollarSign, Activity } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Batch, BatchListResponse } from "@/types/value-io"

interface BatchListProps {
  onBatchSelect: (batch: Batch) => void
}

export function BatchList({ onBatchSelect }: BatchListProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  // Default to last 30 days
  const [beginDate, setBeginDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date
  })
  const [endDate, setEndDate] = useState<Date>(() => new Date())
  const [destinationId, setDestinationId] = useState("")
  const [hasMore, setHasMore] = useState(false)
  const [destinations, setDestinations] = useState<Array<{id: string, name: string}>>([])
  const [loadingDestinations, setLoadingDestinations] = useState(false)
  const { toast } = useToast()
  

  const fetchBatches = async (page: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '5',
      })
      
      if (beginDate) {
        params.append('startDate', format(beginDate, 'yyyy-MM-dd'))
      }
      
      if (endDate) {
        params.append('endDate', format(endDate, 'yyyy-MM-dd'))
      }
      
      if (destinationId) {
        params.append('destinationId', destinationId)
      }
      
      const response = await fetch(`/api/batches?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error: ${response.status}`)
      }
      
      const data: BatchListResponse = await response.json()
      
      // Add the selected destination name to each batch
      const selectedDestination = destinations.find(d => d.id === destinationId)
      const batchesWithDestination = data.batches.map(batch => ({
        ...batch,
        destination_name: batch.destination_name || selectedDestination?.name || 'Unknown Destination'
      }))
      
      setBatches(batchesWithDestination)
      setHasMore(data.hasMore)
      setTotalPages(Math.ceil(data.total / data.pageSize))
    } catch (err) {
      console.error('Failed to fetch batches:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch batches')
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch destinations on mount
  useEffect(() => {
    fetchDestinations()
  }, [])

  const fetchDestinations = async () => {
    setLoadingDestinations(true)
    try {
      const response = await fetch('/api/destinations')
      if (!response.ok) {
        throw new Error('Failed to fetch destinations')
      }
      const data = await response.json()
      // Filter for ProPay (Gateway::VIOInstant) destinations only
      const proPayDestinations = data.destinations.filter((dest: any) => 
        dest.gateway === 'Gateway::VIOInstant'
      )
      setDestinations(proPayDestinations.map((dest: any) => ({
        id: dest.identifier,
        name: `${dest.identifier} - ${dest.name}`
      })))
    } catch (err) {
      console.error('Failed to fetch destinations:', err)
      toast({
        title: "Error",
        description: "Failed to load destinations. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoadingDestinations(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchBatches(1)
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="destination">Destination ID</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Destination ID Requirements:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Must be a valid merchant account ID</li>
                        <li>• Typically 8-10 digits long</li>
                        <li>• Used to filter batches for specific merchant accounts</li>
                        <li>• Leave empty to search all destinations</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={destinationId}
                onValueChange={setDestinationId}
                disabled={loadingDestinations}
              >
                <SelectTrigger id="destination">
                  <SelectValue placeholder={loadingDestinations ? "Loading destinations..." : "Select a destination"} />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((dest) => (
                    <SelectItem key={dest.id} value={dest.id}>
                      {dest.name}
                    </SelectItem>
                  ))}
                  {destinations.length === 0 && !loadingDestinations && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No ProPay destinations available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Begin Date</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-semibold">Date Range Requirements:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Begin date must be before or equal to end date</li>
                          <li>• Maximum date range is 90 days</li>
                          <li>• Dates are based on deposit/settlement date</li>
                          <li>• Leave empty to search all dates</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !beginDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {beginDate ? format(beginDate, "MM-dd-yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={beginDate} 
                      onSelect={(date) => date && setBeginDate(date)} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>End Date</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-semibold">End Date Requirements:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Must be after or equal to begin date</li>
                          <li>• Cannot be more than 90 days from begin date</li>
                          <li>• Cannot be a future date</li>
                          <li>• Includes all transactions up to 11:59 PM on this date</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MM-dd-yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={endDate} 
                      onSelect={(date) => date && setEndDate(date)} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSearch} className="flex-1 interactive bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl">
                <Search className="mr-2 h-4 w-4" />
                Search Batches
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-semibold">Search Requirements:</p>
                    <ul className="text-xs space-y-1">
                      <li>• At least one filter must be specified</li>
                      <li>• Results are limited to 1000 batches maximum</li>
                      <li>• Search may take up to 30 seconds for large date ranges</li>
                      <li>• Only settled batches will be returned</li>
                      <li>• Batches are sorted by deposit date (newest first)</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Batch List */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-2 rounded-full" />
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Skeleton className="h-8 w-24 ml-auto" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                  <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent shimmer"></div>
                </Card>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No batches found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or date range
                </p>
              </CardContent>
            </Card>
          ) : (
            batches.map((batch) => (
              <Card 
                key={batch.batch_id} 
                className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 hover:-translate-y-0.5"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3 flex-1" onClick={() => onBatchSelect(batch)}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">#{batch.batch_id}</span>
                          <Badge variant="secondary" className="font-medium">
                            {batch.settlement_currency}
                          </Badge>
                          {batch.status && (
                            <Badge 
                              variant={batch.status === 'completed' ? 'default' : 'outline'}
                              className="capitalize"
                            >
                              {batch.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📅 Deposited: <strong>{batch.deposit_date}</strong></span>
                        {batch.destination_name && (
                          <span>🏪 {batch.destination_name}</span>
                        )}
                        {batch.transaction_count && (
                          <span>📊 {batch.transaction_count} transactions</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(batch.deposit_amount, batch.settlement_currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">Net deposit</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log(`Downloading batch ${batch.batch_id}`)
                            }}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold">Download Batch Report:</p>
                            <ul className="text-xs space-y-1">
                              <li>• Downloads CSV file with batch summary</li>
                              <li>• Includes all transaction details</li>
                              <li>• File size may be large for batches with many transactions</li>
                              <li>• Download may take up to 60 seconds</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {(totalPages > 1 || batches.length > 0) && (
          <Card className="bg-muted/30">
            <CardContent className="flex items-center justify-between p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Page {currentPage} {totalPages > 0 && `of ${totalPages}`}
                </Badge>
                {batches.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {batches.length} batch{batches.length !== 1 ? 'es' : ''} shown
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasMore || loading}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
