# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Project Overview

This is a Next.js 14 payment reporting dashboard application for Value.io that allows merchants to view and manage payment batches and transactions. It demonstrates complex filtering, data visualization, and report generation capabilities.

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **State Management**: React hooks (useState, useEffect, useMemo)
- **Date Handling**: date-fns library
- **Forms**: react-hook-form with zod validation

### Component Structure

The application follows a client-side rendering approach with three main components:

1. **BatchList** (`components/batch-list.tsx`): Handles batch search, filtering, and listing with pagination
2. **TransactionDetail** (`components/transaction-detail.tsx`): Displays detailed transaction view with advanced filtering
3. **ProductNotes** (`components/product-notes.tsx`): Documentation component showing system requirements and specifications

### Key Patterns

- **Real Value.io API Integration**: Fully integrated with Value.io production API using real payment and destination data
- **ProPay Destination Filtering**: Only displays batches and transactions from Gateway::VIOInstant destinations (ProPay)
- **Batch Synthesis**: Since Value.io doesn't have dedicated batch endpoints, batches are synthesized by grouping payments by date and destination
- **Filter State Management**: Complex filter states managed with React hooks and useMemo for performance
- **Tooltips for Requirements**: Extensive use of tooltips to display business requirements and validation rules inline
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Component Composition**: Uses shadcn/ui primitive components composed into larger features

### Data Flow

1. Main page (`app/page.tsx`) manages navigation state between batch list and transaction detail views
2. BatchList component handles batch search with date range and destination ID filtering
3. Clicking a batch passes the batch object to TransactionDetail component
4. TransactionDetail fetches and displays paginated transactions with multi-field filtering

### Import Aliases

Uses `@/` prefix for absolute imports mapped to the project root directory (configured in tsconfig.json).

## Business Logic Notes

- **Date Ranges**: Maximum 90-day range for batch searches
- **Pagination**: 5 batches per page in list view, 10 transactions per page in detail view
- **Transaction Types**: Supports +CC (Credit Card), +ACH (ACH Credit), -ACH (ACH Debit)
- **PII Handling**: Real-time PII sanitization (e.g., "David Clements" → "D*** Clements")
- **ProPay Filtering**: Only shows data from Gateway::VIOInstant destinations
- **Export Limits**: Maximum 10,000 transactions per export (not yet implemented)

## Value.io API Integration

- **Base URL**: https://api.value.io/v1 (production API)
- **Authentication**: Basic Auth with API user and key
- **Destination Filtering**: Only Gateway::VIOInstant destinations are displayed
- **Batch Creation**: Synthetic batches created by grouping payments by date and destination
- **Real-time Data**: All data comes directly from Value.io API with proper caching

## UI Components

All UI components are from shadcn/ui library located in `components/ui/`. These are primitive components that should not be modified directly. Create new composite components in `components/` directory when needed.