"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  Search,
  ArrowLeft,
  CalendarIcon,
  Filter,
  X,
  Download,
  Info,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Receipt,
  CircleDollarSign,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Transaction, TransactionListResponse, Batch } from "@/types/value-io"
import { useToast } from "@/hooks/use-toast"
import { AnimatedCounter } from "@/components/ui/animated-counter"

interface TransactionFilters {
  searchQuery: string
  transactionType: string
  transactionDateFrom: Date | undefined
  transactionDateTo: Date | undefined
  fundDateFrom: Date | undefined
  fundDateTo: Date | undefined
  minAmount: string
  maxAmount: string
  currency: string
  amountType: string
}

interface TransactionDetailProps {
  batch: Batch
  onBack: () => void
}


export function TransactionDetail({ batch, onBack }: TransactionDetailProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 10
  const { toast } = useToast()

  const handleDownloadReport = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Transaction #',
        'Transaction Date',
        'Fund Date',
        'Type',
        'Payer Name',
        'Invoice Number',
        'Gateway Transaction ID',
        'Gross Amount',
        'Fees',
        'Net Amount',
        'Currency',
        'Status'
      ];

      // Prepare CSV rows
      const rows = transactions.map(transaction => [
        transaction.transaction_number || '',
        formatDate(transaction.transaction_date),
        formatDate(transaction.fund_date),
        getTransactionTypeLabel(transaction.transaction_type),
        transaction.payer_name || '',
        transaction.invoice_number || '',
        transaction.gateway_transaction_id || '',
        transaction.gross_amount?.toFixed(2) || '0.00',
        '0.00', // fees field not available in API
        transaction.net_amount?.toFixed(2) || '0.00',
        transaction.settlement_currency || 'USD',
        transaction.transaction_type.startsWith('+') ? 'Credit' : 'Debit'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escape commas and quotes in cell data
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with batch ID and current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `transactions_batch_${batch.batch_id}_${date}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report Downloaded",
        description: `Successfully exported ${transactions.length} transactions to ${filename}`,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [filters, setFilters] = useState<TransactionFilters>({
    searchQuery: "",
    transactionType: "all",
    transactionDateFrom: undefined,
    transactionDateTo: undefined,
    fundDateFrom: undefined,
    fundDateTo: undefined,
    minAmount: "",
    maxAmount: "",
    currency: "all",
    amountType: "net_amount",
  })

  const fetchTransactions = async (page: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: itemsPerPage.toString(),
      })
      
      // Add filters to API call
      if (filters.transactionType !== 'all') {
        params.append('transactionType', filters.transactionType)
      }
      if (filters.searchQuery) {
        params.append('searchTerm', filters.searchQuery)
      }
      if (filters.minAmount) {
        params.append('minAmount', filters.minAmount)
      }
      if (filters.maxAmount) {
        params.append('maxAmount', filters.maxAmount)
      }
      if (filters.currency !== 'all') {
        params.append('currency', filters.currency)
      }
      
      const response = await fetch(`/api/batches/${batch.batch_id}/transactions?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error: ${response.status}`)
      }
      
      const data: TransactionListResponse = await response.json()
      setTransactions(data.transactions)
      setTotalPages(Math.ceil(data.total / data.pageSize))
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(currentPage)
  }, [batch.batch_id, currentPage])

  // Refetch when filters change
  useEffect(() => {
    setCurrentPage(1)
    fetchTransactions(1)
  }, [filters])


  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Handle MM-DD-YYYY HH:MM:SS format from Value.io API
    if (!dateString) return 'N/A';
    
    // Parse MM-DD-YYYY HH:MM:SS format
    const match = dateString.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [_, month, day, year, hour, minute, second] = match;
      // Create date in YYYY-MM-DD HH:MM:SS format that JavaScript understands
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }
    
    // Try parsing as-is as fallback
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString();
    }
    
    // If all parsing fails, return the original string
    return dateString;
  }

  const getTransactionIcon = (type: string) => {
    if (type.startsWith("P")) {
      return <CreditCard className="h-4 w-4 text-yellow-600" />
    } else if (type.startsWith("+") || type === "+CK") {
      return <Plus className="h-4 w-4 text-green-600" />
    } else if (type.startsWith("-") || type === "PCK") {
      return <Minus className="h-4 w-4 text-red-600" />
    }
    return <CreditCard className="h-4 w-4" />
  }
  
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'settled':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      "+CC": "Credit Card",
      "+ACH": "ACH Credit",
      "-ACH": "ACH Debit",
    }
    return typeMap[type] || type
  }
  
  // Since filtering is now done server-side, use transactions directly
  const filteredTransactions = transactions

  const clearAllFilters = () => {
    setFilters({
      searchQuery: "",
      transactionType: "all",
      transactionDateFrom: undefined,
      transactionDateTo: undefined,
      fundDateFrom: undefined,
      fundDateTo: undefined,
      minAmount: "",
      maxAmount: "",
      currency: "all",
      amountType: "net_amount",
    })
    setCurrentPage(0)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.searchQuery.trim()) count++
    if (filters.transactionType !== "all") count++
    if (filters.currency !== "all") count++
    if (filters.minAmount || filters.maxAmount) count++
    if (filters.transactionDateFrom || filters.transactionDateTo) count++
    if (filters.fundDateFrom || filters.fundDateTo) count++
    return count
  }

  // Use transactions directly since they're already paginated from the API
  const paginatedTransactions = transactions

  // Get unique values for filter dropdowns
  const uniqueTransactionTypes = Array.from(new Set(transactions.map((t) => t.transaction_type)))
  const uniqueCurrencies = Array.from(new Set(transactions.map((t) => t.settlement_currency)))

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center gap-6">
          <Skeleton className="h-10 w-32 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        
        {/* Batch Summary Skeleton */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-2 rounded-full" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent shimmer"></div>
        </Card>
        
        {/* Transactions Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md mt-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, j) => (
                            <div key={j} className="space-y-2">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right space-y-3 ml-6">
                        <Skeleton className="h-8 w-24 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                  <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent shimmer"></div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 animate-slide-up">
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="interactive flex items-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Batches
          </Button>
          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Batch #{batch.batch_id}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  Value.io
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {batch.settlement_currency}
                </Badge>
                <Badge className="text-xs status-completed">
                  {batch.status || 'Completed'}
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-lg">
              Transaction details for payment batch
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Processing active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Summary */}
        <Card className="bg-gradient-to-br from-card to-muted/10 border-slate-200/50 dark:border-slate-700/50 shadow-xl card-hover animate-fade-in-scale">
          <CardHeader className="pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Batch Summary
                    <Badge variant="outline" className="text-xs font-mono">
                      #{batch.batch_id}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete transaction breakdown
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <div className="space-y-2">
                      <p className="font-semibold">Batch Information:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Batch ID: Unique identifier for this settlement batch</li>
                        <li>• Deposit Date: When funds were deposited to your account</li>
                        <li>• Total Amount: Net amount after all fees and adjustments</li>
                        <li>• Total Transactions: Number of individual transactions in this batch</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="interactive flex items-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-primary/20"
                  onClick={handleDownloadReport}
                  disabled={transactions.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 animate-slide-up">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">#</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Batch ID</p>
                </div>
                <p className="font-bold text-xl">#{batch.batch_id}</p>
              </div>

              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/20 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Destination</p>
                </div>
                <div>
                  <p className="font-bold text-lg truncate" title={batch.destination_name}>
                    {batch.destination_name || 'ProPay Account'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.destination_identifier || batch.destination_id || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-slate-500/5 to-slate-500/10 border border-slate-500/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Deposit Date</p>
                </div>
                <p className="font-bold text-xl">{batch.deposit_date}</p>
              </div>
              
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Total Amount</p>
                </div>
                <AnimatedCounter 
                  value={batch.deposit_amount}
                  currency={batch.settlement_currency}
                  decimals={2}
                  duration={1200}
                  className="font-bold text-xl text-green-600"
                />
              </div>
              
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Transactions</p>
                </div>
                <AnimatedCounter 
                  value={transactions.length}
                  duration={800}
                  className="font-bold text-xl text-orange-600"
                />
              </div>
            </div>
            
            {/* Summary Stats */}
          </CardContent>
        </Card>

        {/* Transactions Section */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div>
                    <CardTitle>Transactions</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredTransactions.length} of {transactions.length} transactions
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? "s" : ""} active
                        </Badge>
                      )}
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold">Transaction Filtering:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Use quick search for transaction numbers, payer names, or invoice numbers</li>
                          <li>• Advanced filters allow date ranges, amount ranges, and transaction types</li>
                          <li>• Filters work together - all conditions must be met</li>
                          <li>• Results are paginated - use pagination to see all matches</li>
                          <li>• Maximum 10,000 transactions can be displayed</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {getActiveFilterCount() > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                  {getActiveFilterCount() > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Search */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction #, payer name, invoice, or gateway ID... (Press Enter)"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchTransactions(1);
                    }
                  }}
                  className="flex-1"
                />
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Transaction Type */}
                      <div className="space-y-2">
                        <Label>Transaction Type</Label>
                        <Select
                          value={filters.transactionType}
                          onValueChange={(value) => setFilters((prev) => ({ ...prev, transactionType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types (excl. checks)</SelectItem>
                            <SelectItem value="checks">Checks Only</SelectItem>
                            {uniqueTransactionTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {getTransactionTypeLabel(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Currency */}
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={filters.currency}
                          onValueChange={(value) => setFilters((prev) => ({ ...prev, currency: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Currencies</SelectItem>
                            {uniqueCurrencies.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount Type */}
                      <div className="space-y-2">
                        <Label>Amount Type</Label>
                        <Select
                          value={filters.amountType}
                          onValueChange={(value) => setFilters((prev) => ({ ...prev, amountType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="net_amount">Net Amount</SelectItem>
                            <SelectItem value="gross_amount">Gross Amount</SelectItem>
                            <SelectItem value="authorization_amount">Authorization Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount Range */}
                      <div className="space-y-2">
                        <Label>Min Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={filters.minAmount}
                          onChange={(e) => setFilters((prev) => ({ ...prev, minAmount: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Amount</Label>
                        <Input
                          type="number"
                          placeholder="999999.99"
                          value={filters.maxAmount}
                          onChange={(e) => setFilters((prev) => ({ ...prev, maxAmount: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Transaction Date From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !filters.transactionDateFrom && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.transactionDateFrom
                                ? format(filters.transactionDateFrom, "MM-dd-yyyy")
                                : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.transactionDateFrom}
                              onSelect={(date) => setFilters((prev) => ({ ...prev, transactionDateFrom: date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Transaction Date To</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !filters.transactionDateTo && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.transactionDateTo
                                ? format(filters.transactionDateTo, "MM-dd-yyyy")
                                : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.transactionDateTo}
                              onSelect={(date) => setFilters((prev) => ({ ...prev, transactionDateTo: date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Fund Date From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !filters.fundDateFrom && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.fundDateFrom ? format(filters.fundDateFrom, "MM-dd-yyyy") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.fundDateFrom}
                              onSelect={(date) => setFilters((prev) => ({ ...prev, fundDateFrom: date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Fund Date To</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !filters.fundDateTo && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.fundDateTo ? format(filters.fundDateTo, "MM-dd-yyyy") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.fundDateTo}
                              onSelect={(date) => setFilters((prev) => ({ ...prev, fundDateTo: date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, j) => (
                              <div key={j} className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right space-y-3 ml-6">
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-16 ml-auto" />
                            <div className="flex items-center gap-2 justify-end">
                              <Skeleton className="h-8 w-2 rounded-full" />
                              <Skeleton className="h-8 w-24" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-12 ml-auto" />
                            <Skeleton className="h-5 w-16 ml-auto" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent shimmer"></div>
                  </Card>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center space-y-6 animate-fade-in-scale">
                <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center animate-bounce-in">
                  <Filter className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-xl">No transactions found</h3>
                  <p className="text-muted-foreground max-w-sm">
                    No transactions match your current search criteria. Try adjusting your filters or search terms.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {getActiveFilterCount() > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={clearAllFilters}
                      className="interactive flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear all filters
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => toast({ title: "Search Tips", description: "Try using broader date ranges or different transaction types" })}
                    className="interactive flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    Search Tips
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {paginatedTransactions.map((transaction, index) => {
                      const isPositive = transaction.net_amount >= 0
                      
                      return (
                        <Card
                          key={`${transaction.transaction_number}-${index}`}
                          className="group card-hover border-l-4 border-l-transparent hover:border-l-primary animate-slide-up"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center relative">
                                  {getTransactionIcon(transaction.transaction_type)}
                                  <div className="absolute -top-1 -right-1">
                                    {getStatusIcon('completed')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xl">#{transaction.transaction_number}</span>
                                  <Badge variant="outline" className="font-medium px-3 py-1">
                                    {getTransactionTypeLabel(transaction.transaction_type)}
                                  </Badge>
                                  {transaction.gateway_transaction_id && (
                                    <Badge variant="secondary" className="text-xs font-mono">
                                      Gateway: {transaction.gateway_transaction_id}
                                    </Badge>
                                  )}
                                  <Badge className="text-xs status-completed">
                                    Settled
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground font-medium">Payer</span>
                                  <p className="font-semibold">{transaction.payer_name}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground font-medium">Invoice</span>
                                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                    {transaction.invoice_number}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground font-medium">Transaction Date</span>
                                  <p>{formatDate(transaction.transaction_date)}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground font-medium">Fund Date</span>
                                  <p>{formatDate(transaction.fund_date)}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground font-medium">Authorization</span>
                                  <p>
                                    {formatCurrency(
                                      transaction.authorization_amount,
                                      transaction.authorization_currency,
                                    )}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground font-medium">Gross Amount</span>
                                  <p>{formatCurrency(transaction.gross_amount, transaction.settlement_currency)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="text-right space-y-4 ml-6">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 justify-end">
                                  <DollarSign className="h-4 w-4" />
                                  Net Amount
                                </p>
                                <div className="flex items-center gap-3 justify-end">
                                  <div className={`w-3 h-10 rounded-full ${
                                    isPositive 
                                      ? "bg-gradient-to-b from-green-500 to-green-600" 
                                      : "bg-gradient-to-b from-red-500 to-red-600"
                                  }`}></div>
                                  <div className="text-right">
                                    <AnimatedCounter 
                                      value={transaction.net_amount}
                                      currency={transaction.settlement_currency}
                                      decimals={2}
                                      duration={600}
                                      className={`font-bold text-2xl ${
                                        isPositive ? "text-green-600" : "text-red-600"
                                      }`}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {isPositive ? 'Credit' : 'Debit'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {transaction.total_fee > 0 && (
                                <div className="space-y-1 text-right">
                                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 justify-end">
                                    <CircleDollarSign className="h-3 w-3" />
                                    Processing Fee
                                  </p>
                                  <p className="text-base font-semibold text-orange-600">
                                    -{formatCurrency(transaction.total_fee, transaction.settlement_currency)}
                                  </p>
                                </div>
                              )}
                              
                              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 justify-end text-xs text-muted-foreground">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>Processed successfully</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        
                        {/* Progress indicator */}
                        <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      </Card>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {filteredTransactions.length} results
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
