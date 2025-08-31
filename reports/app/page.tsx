"use client"

import { useState } from "react"
import { BatchList } from "@/components/batch-list"
import { TransactionDetail } from "@/components/transaction-detail"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"

export default function PaymentDashboard() {
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [showTransactionDetail, setShowTransactionDetail] = useState(false)

  const handleBatchSelect = (batch: any) => {
    setSelectedBatch(batch)
    setShowTransactionDetail(true)
  }

  const handleBackToBatches = () => {
    setShowTransactionDetail(false)
    setSelectedBatch(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-elegant">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Value.io
                  </h1>
                  <p className="text-xs text-muted-foreground">Payment Dashboard</p>
                </div>
              </div>
              
              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6 ml-8">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {showTransactionDetail && selectedBatch && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); handleBackToBatches(); }}>
                            Batches
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Batch #{selectedBatch.batch_id}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </nav>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Main Content */}
        {!showTransactionDetail ? (
          <>
            <Card className="backdrop-blur-sm bg-card/95 border-slate-200/50 dark:border-slate-700/50 shadow-xl card-hover">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      Payment Batches
                      <Badge variant="outline" className="text-xs font-mono">
                        {new Date().toLocaleDateString()}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Filter and view payment batches by date range
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <BatchList onBatchSelect={handleBatchSelect} />
              </CardContent>
            </Card>

          </>
        ) : (
          <div className="space-y-6">
            <TransactionDetail batch={selectedBatch} onBack={handleBackToBatches} />
          </div>
        )}
      </div>
      
      {/* Simple Footer */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 Value.io Payment Dashboard Example
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
