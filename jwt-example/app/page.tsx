'use client';

import { useState } from 'react';

import SecurePaymentForm from '@/components/SecurePaymentForm';

export default function Home() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const writeOnlyToken =
    process.env.NEXT_PUBLIC_VIO_WRITE_ONLY_TOKEN ||
    '7ef669f4-a2c1-4004-ab37-7f3069af482d';

  const generateJWT = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: writeOnlyToken,
          duration: 86400, // 24 hours
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate JWT');
      }

      console.log('JWT Response:', data); // Debug log

      if (data.data?.jwt) {
        setJwt(data.data.jwt.token);
        console.log(
          'JWT expires at:',
          new Date(data.data.jwt.expires_at * 1000).toLocaleString()
        );
      } else if (data.jwt) {
        setJwt(data.jwt.token);
        console.log(
          'JWT expires at:',
          new Date(data.jwt.expires_at * 1000).toLocaleString()
        );
      } else if (data.token) {
        setJwt(data.token);
      } else {
        console.error('Unexpected response structure:', data);
        throw new Error('JWT token not found in response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    alert('Payment completed successfully!');
    // You can add additional logic here, such as redirecting to a success page
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            Value.io JWT Authentication Example
          </h1>
          <p className="text-lg text-gray-800 font-medium">
            Demonstrating secure payment form integration with JWT
            authentication
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Step 1: Generate JWT Token
          </h2>

          <p className="text-gray-700 font-medium mb-6">
            Click the button below to generate a JWT token using your write-only
            API key. This token will be valid for 24 hours.
          </p>

          <button
            onClick={generateJWT}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors duration-200 font-semibold text-base"
          >
            {isLoading ? 'Generating...' : 'Generate JWT Token'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-semibold">Error: {error}</p>
            </div>
          )}

          {jwt && (
            <div className="mt-6">
              <h3 className="font-bold text-gray-900 mb-2">
                Generated JWT Token:
              </h3>
              <div className="bg-gray-100 p-4 rounded-md break-all border">
                <code className="text-sm font-mono text-gray-900 font-medium">
                  {jwt}
                </code>
              </div>
              <p className="mt-2 text-sm text-gray-700 font-medium">
                This token can be used to authenticate API requests to Value.io
              </p>
            </div>
          )}
        </div>

        {jwt && (
          <div className="mb-8">
            <SecurePaymentForm
              jwtToken={jwt}
              amount="$10.00"
              showReceipt={true}
              onSuccess={handlePaymentSuccess}
            />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            API Configuration
          </h3>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-800">
              <strong className="text-gray-900">API URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_VIO_API_URL}
            </p>
            <p className="font-medium text-gray-800">
              <strong className="text-gray-900">Account:</strong>{' '}
              {process.env.NEXT_PUBLIC_VIO_ACCOUNT || 'dev'}
            </p>
            <p className="font-medium text-gray-800">
              <strong className="text-gray-900">Write-Only Token:</strong>{' '}
              <span className="font-mono">
                {writeOnlyToken.substring(0, 8)}...
              </span>
            </p>
            {process.env.NEXT_PUBLIC_VIO_DESTINATION_ID && (
              <p className="font-medium text-gray-800">
                <strong className="text-gray-900">Destination ID:</strong>{' '}
                {process.env.NEXT_PUBLIC_VIO_DESTINATION_ID}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
