# Value.io Payment Dashboard

A modern, production-ready payment reporting dashboard for Value.io merchants. This Next.js application provides real-time access to payment batches and transaction details through the Value.io API, with advanced filtering, search, and export capabilities.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![Value.io](https://img.shields.io/badge/Value.io-API-green?style=flat-square)

## Overview

This dashboard demonstrates best practices for integrating with the Value.io payment processing API. It provides merchants with a comprehensive view of their payment settlements, including:

- **Batch Management**: View and filter payment batches by date range and destination
- **Transaction Details**: Drill down into individual transactions within each batch
- **Advanced Filtering**: Filter transactions by type, amount, date, and search terms
- **Data Export**: Download transaction reports in CSV format
- **Real-time Data**: Live integration with Value.io production API
- **Responsive Design**: Mobile-first approach with dark mode support

## Features

### Core Functionality
- 📊 **Payment Batch Overview** - Synthetic batch creation by grouping payments by date and destination
- 🔍 **Advanced Search & Filtering** - Multi-parameter search with date ranges, amounts, and transaction types
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- 🌓 **Dark Mode Support** - Toggle between light and dark themes
- 📥 **CSV Export** - Download filtered transaction data for offline analysis
- 🔐 **Secure API Integration** - Basic authentication with environment-based configuration
- ⚡ **Performance Optimized** - Client-side caching and pagination for large datasets

### Technical Features
- **Type-safe API client** with comprehensive error handling
- **LRU caching** with TTL for optimal performance
- **Exponential backoff** retry logic for resilient API calls
- **PII sanitization** for sensitive data protection
- **ProPay destination filtering** (Gateway::VIOInstant only)

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/) with strict mode
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **UI Components**: Radix UI primitives via shadcn/ui
- **Date Handling**: [date-fns](https://date-fns.org/)
- **Forms**: [react-hook-form](https://react-hook-form.com/) with [zod](https://zod.dev/) validation
- **Icons**: [Lucide React](https://lucide.dev/)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18.17** or higher installed
- **npm** or **yarn** package manager
- **Value.io API credentials** (contact Value.io support for access)
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/value-io-payment-dashboard.git
cd value-io-payment-dashboard
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Value.io API credentials:

```env
# Value.io API Configuration
VALUE_IO_API_USER=your_api_username
VALUE_IO_API_KEY=your_api_key
VALUE_IO_BASE_URL=https://api.value.io/v1

# Or use staging environment for testing
# VALUE_IO_BASE_URL=https://api.value.io/v1
```

> **Security Note**: Never commit `.env.local` to version control. The `.gitignore` file is configured to exclude it.

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── batches/          # Batch synthesis endpoint
│   │   ├── destinations/     # Destination filtering
│   │   └── transactions/     # Transaction data endpoint
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Main dashboard page
│   └── globals.css           # Global styles and Tailwind config
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── batch-list.tsx        # Batch listing component
│   ├── transaction-detail.tsx # Transaction detail view
│   └── theme-toggle.tsx      # Dark mode toggle
│
├── lib/                      # Utilities and services
│   ├── value-io-service.ts   # Value.io SDK implementation
│   └── utils.ts              # Helper functions
│
├── types/                    # TypeScript definitions
│   └── value-io.ts           # API response types
│
├── public/                   # Static assets
├── .env.example              # Environment template
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── package.json              # Dependencies and scripts
```

## Usage Guide

### Viewing Payment Batches

1. **Set Date Range**: Use the date pickers to select start and end dates (max 90 days)
2. **Filter by Destination**: Select a specific destination from the dropdown or view all
3. **Search**: Click "Search Batches" to load results
4. **Navigate**: Use pagination controls to browse through batches

### Viewing Transaction Details

1. **Select a Batch**: Click on any batch from the list
2. **View Summary**: See batch totals, transaction counts, and date information
3. **Filter Transactions**: Use the filter panel to narrow down results:
   - Search by payer name, invoice, or reference
   - Filter by transaction type (Credit Card, ACH Credit, ACH Debit)
   - Set amount ranges
   - Filter by transaction or fund dates
4. **Export Data**: Click "Download Report" to export filtered transactions as CSV

### Understanding Transaction Types

- **+CC**: Credit Card payments (credits)
- **+ACH**: ACH Credit transfers (credits)
- **-ACH**: ACH Debit transfers (debits)
- **Check types** (*-CK, PCK, +CK, PCK+*): Filtered out by default

## API Integration

The application uses a custom Value.io SDK service (`lib/value-io-service.ts`) with:

### Features
- **Singleton pattern** for consistent API client instance
- **Basic authentication** using API credentials
- **Request retry logic** with exponential backoff
- **LRU caching** to minimize API calls
- **Error handling** with detailed error messages
- **Date formatting** for Value.io's MM-DD-YYYY format

### Available Methods
```typescript
// Get filtered destinations (ProPay only)
await valueIoService.getDestinations()

// Get payments for batch synthesis
await valueIoService.getPayments(params)

// Get transactions with filtering
await valueIoService.getTransactions(params)

// Create synthetic batches
await valueIoService.getBatches(params)
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Configuration

### Tailwind CSS
The project uses Tailwind CSS v3 with a custom grey-based theme. Configuration is in `tailwind.config.ts`.

### shadcn/ui Components
UI components are installed from shadcn/ui and located in `components/ui/`. To add new components:

```bash
npx shadcn-ui@latest add [component-name]
```

### TypeScript
Strict mode is enabled for type safety. Configuration is in `tsconfig.json`.

## Business Rules

- **Date Range Limit**: Maximum 90 days for batch searches
- **Destination Filter**: Only shows Gateway::VIOInstant (ProPay) destinations
- **Batch Synthesis**: Batches are created by grouping payments by date and destination
- **PII Protection**: Names are automatically sanitized (e.g., "John Doe" → "J*** Doe")
- **Check Filtering**: Check transaction types are hidden by default
- **Pagination**: 5 batches per page, 10 transactions per page

## Troubleshooting

### Common Issues

**API Authentication Errors**
- Verify your API credentials in `.env.local`
- Ensure credentials have proper permissions
- Check if using correct API endpoint (production vs staging)

**No Batches Found**
- Verify date range has transaction data
- Check if destinations exist for your account
- Ensure ProPay destinations are configured

**Styling Issues**
- Clear browser cache
- Restart development server
- Verify Tailwind CSS version compatibility

**Build Errors**
- Delete `node_modules` and `.next` folders
- Run `npm install` to reinstall dependencies
- Check for TypeScript errors with `npm run type-check`

## Security Considerations

- **Never commit API credentials** to version control
- **Use environment variables** for all sensitive configuration
- **Implement rate limiting** in production deployments
- **Add authentication** before deploying to public servers
- **Enable HTTPS** for production deployments
- **Sanitize PII** in logs and error messages

## Production Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Self-Hosted
1. Build the application:
   ```bash
   npm run build
   ```
2. Set environment variables
3. Start the server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues related to:
- **Value.io API**: Contact Value.io support
- **Application bugs**: Open an issue on GitHub
- **Feature requests**: Submit via GitHub discussions

## License

This project is provided as an example implementation for Value.io merchants. See LICENSE file for details.

## Acknowledgments

- [Value.io](https://value.io) for the payment processing API
- [Vercel](https://vercel.com) for Next.js and hosting
- [shadcn](https://ui.shadcn.com) for the UI component library
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework

---

Built with ❤️ for Value.io merchants