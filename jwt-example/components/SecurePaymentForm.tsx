'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

interface SecurePaymentFormProps {
  jwtToken: string;
  amount?: string;
  showReceipt?: boolean;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    valueio_write_only_token: string;
    valueio_form_selector: string;
    valueio_secure_form_title_1: string;
    valueio_secure_form_title_2: string;
    valueio_amount?: string;
    valueio_destination_id?: string;
    valueio_secure_form_collect_name: string;
    valueio_secure_form_collect_payment: string;
    valueio_secure_form_collect_payment_comment: string;
    valueio_secure_form_collect_payment_order_id: string;
    valueio_secure_form_collect_address: string;
    valueio_secure_form_collect_zip: string;
    valueio_secure_form_require_zip: string;
    valueio_secure_form_require_email: string;
    valueio_secure_form_require_phone: string;
    valueio_secure_form_collect_credit_card: string;
    valueio_secure_form_collect_cvv: string;
    valueio_show_receipt: string;
    valueio_send_receipt: string;
    valueio_vault: string;
    valueio_transact: string;
    valueio_authorize_only: string;
    valueio_on_success: () => void;
    valueio_iframe: {
      $form?: () => JQuery<HTMLFormElement>;
      handle_submit?: () => void;
    };
  }
}

interface JQuery<T> {
  [index: number]: T;
  submit: (handler?: unknown) => void;
}

export default function SecurePaymentForm({
  jwtToken,
  amount,
  showReceipt = true,
  onSuccess,
}: SecurePaymentFormProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  useEffect(() => {
    if (isScriptLoaded && jwtToken && !isFormInitialized) {
      // Configure Value.io with all required settings
      window.valueio_write_only_token = jwtToken;
      window.valueio_form_selector = '#checkout-form';
      window.valueio_secure_form_title_1 = 'JWT Example Store';
      window.valueio_secure_form_title_2 =
        'Secure Payment Demo with JWT Authentication';

      // Set destination ID if configured
      if (process.env.NEXT_PUBLIC_VIO_DESTINATION_ID) {
        window.valueio_destination_id = process.env.NEXT_PUBLIC_VIO_DESTINATION_ID;
      }

      // Optional settings
      if (amount) {
        window.valueio_amount = amount;
      }

      // Form collection settings
      window.valueio_secure_form_collect_name = 'true';
      window.valueio_secure_form_collect_payment = 'true';
      window.valueio_secure_form_collect_payment_comment = 'true';
      window.valueio_secure_form_collect_payment_order_id = 'false';
      window.valueio_secure_form_collect_address = 'false';
      window.valueio_secure_form_collect_zip = 'true';
      window.valueio_secure_form_require_zip = 'false';
      window.valueio_secure_form_require_email = 'false';
      window.valueio_secure_form_require_phone = 'false';
      window.valueio_secure_form_collect_credit_card = 'true';
      window.valueio_secure_form_collect_cvv = 'true';

      // Receipt settings
      window.valueio_show_receipt = showReceipt ? 'true' : 'false';
      window.valueio_send_receipt = 'false';

      // Transaction settings
      window.valueio_vault = 'collect';
      window.valueio_transact = 'true';
      window.valueio_authorize_only = 'false';

      // Success callback
      window.valueio_on_success = () => {
        console.log('Payment successful!');
        if (onSuccess) {
          onSuccess();
        } else {
          alert('Thank you for your payment!');
        }

        // Submit the merchant form if needed
        const merchantForm = window.valueio_iframe?.$form?.();
        if (merchantForm && merchantForm[0]) {
          merchantForm[0].onsubmit = null;
          merchantForm.submit(window.valueio_iframe.handle_submit);
        }
      };

      setIsFormInitialized(true);

      // Force Value.js to reinitialize with new token
      if (
        'ValueIO' in window &&
        window.ValueIO &&
        typeof window.ValueIO === 'object' &&
        'init' in window.ValueIO
      ) {
        (window.ValueIO as { init: () => void }).init();
      }
    }
  }, [
    isScriptLoaded,
    jwtToken,
    amount,
    showReceipt,
    onSuccess,
    isFormInitialized,
  ]);

  // Reset form when JWT changes
  useEffect(() => {
    if (jwtToken) {
      setIsFormInitialized(false);
    }
  }, [jwtToken]);

  return (
    <>
      <link
        rel="stylesheet"
        href={`${process.env.NEXT_PUBLIC_VIO_API_URL}assets/value.css`}
      />

      <Script
        src={`${process.env.NEXT_PUBLIC_VIO_API_URL}assets/value.js`}
        strategy="afterInteractive"
        onLoad={() => {
          setIsScriptLoaded(true);
          console.log(
            'Value.js loaded successfully from:',
            `${process.env.NEXT_PUBLIC_VIO_API_URL}assets/value.js`
          );
        }}
      />

      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Step 2: Secure Payment Form
        </h2>

        {!jwtToken ? (
          <div className="text-center py-8 text-gray-700">
            <p className="font-medium">
              Please generate a JWT token first to use the payment form.
            </p>
          </div>
        ) : (
          <>
            <form id="checkout-form" onSubmit={(e) => e.preventDefault()}>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-200 font-bold text-lg"
              >
                Pay Now
              </button>
            </form>

            <p className="mt-4 text-sm text-gray-700 font-medium">
              Test with card number: 4111-1111-1111-1111, any 3-digit CVV, and
              future expiration.
            </p>

            <div className="mt-4 p-3 bg-gray-50 rounded border text-xs">
              <p className="font-bold text-gray-900">Using JWT Token:</p>
              <p className="break-all mt-1 font-mono text-gray-700">
                {jwtToken.substring(0, 50)}...
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
