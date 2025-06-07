import axios from 'axios';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, duration = 86400 } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    const adminKey = process.env.VIO_ADMIN_KEY;
    const account = process.env.VIO_ACCOUNT;
    const vioApiUrl =
      process.env.NEXT_PUBLIC_VIO_API_URL || 'http://localhost:3000/v1';
    const apiUrl = vioApiUrl.endsWith('/')
      ? vioApiUrl + 'v1'
      : vioApiUrl + '/v1';

    if (!adminKey || !account) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Call Value.io API to create JWT
    const response = await axios.post(
      `${apiUrl}/api_keys/jwt`,
      {
        jwt: {
          api_key: apiKey,
          duration: duration.toString(),
        },
      },
      {
        auth: {
          username: account,
          password: adminKey,
        },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    console.log('Value.io JWT Response:', response.data);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('JWT creation error:', error);

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response: { data: unknown; status: number };
      };
      console.error('API Error Response:', axiosError.response.data);
      return NextResponse.json(
        axiosError.response.data || { error: 'Failed to create JWT' },
        { status: axiosError.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create JWT' },
      { status: 500 }
    );
  }
}
