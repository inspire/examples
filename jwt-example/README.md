# Value.io JWT Authentication Example

This Next.js application demonstrates how to integrate Value.io's secure payment form with JWT authentication.

## Features

- JWT token generation using Value.io API
- Secure payment form integration with Value.js
- Real-time form rendering with JWT authentication
- API call examples using JWT tokens
- TypeScript support
- Tailwind CSS styling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```env
# Value.io API Configuration
NEXT_PUBLIC_VIO_API_URL=https://api.value.io/
NEXT_PUBLIC_VIO_WRITE_ONLY_TOKEN=your-write-only-token
NEXT_PUBLIC_VIO_ACCOUNT=your-account
NEXT_PUBLIC_VIO_DESTINATION_ID=your-destination-id
VIO_ADMIN_KEY=your-admin-key
VIO_WRITE_ONLY_TOKEN=your-write-only-token
VIO_ACCOUNT=your-account
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## How It Works

### 1. JWT Generation
The application uses your admin API key to generate a JWT token that's valid for 24 hours:
- Admin token authenticates to `/v1/api_keys/jwt` endpoint
- Provides a write-only token that has JWT permissions
- Receives a JWT token that can be used for API calls

### 2. Secure Payment Form
The payment form is dynamically loaded using Value.js:
- Uses the generated JWT token as `window.valueio_write_only_token`
- Loads Value.js and Value.css from `https://api.value.io/assets/`
- Configures form collection settings and callbacks
- Handles all sensitive payment data securely
- Processes payments through Value.io's PCI-compliant infrastructure

### 3. API Integration
- **Frontend**: Uses JWT tokens for authenticated API calls
- **Backend**: Uses admin token to generate JWTs securely
- **Security**: All sensitive operations happen server-side
- **Example**: Demonstrates creating payments programmatically with JWT auth

## Testing

Use the following test card details:
- Card Number: 4111-1111-1111-1111
- CVV: Any 3 digits
- Expiration: Any future date

## Architecture

```
app/
├── api/
│   └── auth/
│       └── jwt/
│           └── route.ts    # JWT generation endpoint
├── page.tsx               # Main page with JWT demo
└── layout.tsx            # Root layout

components/
└── SecurePaymentForm.tsx # Payment form component
```

## Security Notes

- Never expose your admin API key on the client side
- Write-only tokens are safe for client-side use
- JWTs should have appropriate expiration times
- Always use HTTPS in production