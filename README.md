# Value.IO / Inspire Commerce Examples

This repository contains example applications demonstrating Value.io payment integration patterns and best practices. Each example showcases different aspects of the Value.io API and payment processing capabilities.

## 📁 Available Examples

### 1. JWT Authentication Example (`jwt-example/`)
A Next.js application demonstrating secure JWT-based authentication with Value.io's payment forms.

**Key Features:**
- JWT token generation using Value.io API
- Secure payment form integration with Value.js
- Real-time form rendering with JWT authentication
- TypeScript implementation with proper type safety

**Use Case:** When you need to implement secure, tokenized payment forms with time-limited authentication.

**Get Started:**
```bash
cd jwt-example
npm install
npm run dev
```

### 2. Google Pay Demo (`google_pay_demo/`)
A comprehensive demonstration of Google Pay integration with Value.IO backend services, showcasing production-ready payment processing.

**Key Features:**
- Complete Google Pay Web API integration with Value.IO payment gateway
- Support for both TEST and PRODUCTION environments
- Real-time payment processing through Value.IO API
- Merchant account configuration and setup guidance
- Interactive form for testing different payment scenarios

**Use Case:** When you need to accept Google Pay payments through Value.IO's payment processing infrastructure.

**Live Demo:** See this integration working in production at [shop.value.io](https://shop.value.io)

**Get Started:**
```bash
cd google_pay_demo
# Follow README for merchant account setup and configuration
```

**Note:** Production usage requires a Google Pay merchant account. See the [Google Pay Business Console](https://pay.google.com/business/console/) for setup.

### 3. Payment Reports Dashboard (`reports/`)
A production-ready payment reporting dashboard for Value.io merchants with advanced analytics and data management.

![Kapture 2025-09-03 at 10 18 29](https://github.com/user-attachments/assets/84b6e95a-11e8-4bc9-9ffd-0a8472ebd21c)


**Key Features:**
- Real-time payment batch management and transaction tracking
- Advanced filtering, search, and data export capabilities
- ProPay destination filtering (Gateway::VIOInstant)
- Synthetic batch creation from payment data
- Mobile-responsive design with dark mode support
- CSV export for offline analysis

**Use Case:** When you need comprehensive payment reporting, transaction reconciliation, and batch management capabilities.

**Get Started:**
```bash
cd reports
npm install
npm run dev
```

## 🚀 Quick Start

1. **Choose an example** based on your integration needs:
   - **JWT Authentication** - For secure tokenized payment forms
   - **Google Pay Demo** - For Google Pay payment acceptance
   - **Reports Dashboard** - For payment analytics and management
2. **Navigate to the example directory** and follow its specific README
3. **Configure your Value.io API credentials** in the `.env.local` file
4. **Run the development server** to explore the implementation

## 📋 Prerequisites

All examples require:
- Node.js 18.17 or higher
- npm or yarn package manager
- Value.io API credentials (contact Value.io support)

## 🔑 API Configuration

Each example uses environment variables for API configuration. Create a `.env.local` file in the example directory:

```env
# For JWT Example
NEXT_PUBLIC_VIO_API_URL=https://api.value.io/
NEXT_PUBLIC_VIO_WRITE_ONLY_TOKEN=your-write-only-token
VIO_ADMIN_KEY=your-admin-key

# For Reports Dashboard
VALUE_IO_API_USER=your_api_username
VALUE_IO_API_KEY=your_api_key
VALUE_IO_BASE_URL=https://api.value.io/v1
```


## 🛠 Technology Stack

All examples are built with modern web technologies:
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Value.io API** - Payment processing integration

## 📖 Learning Path

1. **Start with JWT Example** if you're new to Value.io integration
2. **Try the Google Pay Demo** to understand payment gateway integration
3. **Explore the Reports Dashboard** for advanced API usage patterns
4. **Review the AI documentation** for architectural decisions and best practices

## 🤝 Support

- **Value.io API Issues**: Contact Value.io support
- **Example Code Issues**: Open an issue in this repository
- **Integration Questions**: Refer to individual example READMEs

## 📄 License

These examples are provided for educational and integration purposes. See individual example directories for specific licensing information.
