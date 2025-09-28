# Google Pay Demo Application

A demo application showcasing Google Pay integration with Value.IO backend services.

## Prerequisites

### Google Pay Merchant Setup Required

To test the complete production flow, you'll need to set up a Google Pay merchant account. This is necessary for processing real transactions and accessing production features.

**[Set up your Google Pay Merchant Account](https://pay.google.com/business/console/)**

#### Merchant Setup Overview

Setting up a Google Pay merchant account involves:

1. **Basic Requirements:**
   - Your website must be served over HTTPS with a valid TLS certificate
   - A Google Account with a payment method added
   - Compliance with Google Pay API Acceptable Use Policy
   - A valid physical business address (PO boxes not accepted)
   - Bank account registered in the same country as your business

2. **Registration Process:**
   - Sign up through the [Google Pay Business Console](https://pay.google.com/business/console/)
   - Provide business information:
     - Legal business name and address
     - Website URL
     - Product/service category
     - Customer support contact information
   - Complete identity and business verification (may take 2-3 business days)

3. **Obtaining Your Merchant ID:**
   - After approval, you'll receive a Google merchant identifier
   - This ID is required when initializing PaymentsClient in PRODUCTION environment
   - Store this ID securely and update it in your configuration

4. **Testing vs Production:**
   - **TEST environment:** No merchant account required, use test card numbers
   - **PRODUCTION environment:** Valid merchant ID and approved account required

## Live Demo

You can see this integration working in production at [shop.value.io](https://shop.value.io)

## Usage

1. Open the application at http://localhost:8000
2. Fill in the form fields with your credentials and payment details:
   
   ### VALUE.IO API Configuration
   - **Username**: Your VALUE.IO account username
   - **API Key**: Your VALUE.IO API key (used as password for authentication)
   - **Base URL**: VALUE.IO API endpoint (e.g., `https://api.value.io`)
   - **Destination**: The VALUE.IO destination identifier for payment routing (also used as gatewayMerchantId for Google Pay)
   
   ### Google Pay Configuration
   - **Display Name**: Your merchant/business name shown to customers
   - **Google Pay Merchant ID**: Your production merchant ID from Google Pay Console (leave blank for TEST mode)
   - **PSP Gateway**: Payment gateway identifier (default: `inspirecommerce`)
   
   ### Transaction Details
   - **Amount**: Transaction amount in USD (e.g., `10.00`)
   - **Test Transaction**: Select `True` for TEST environment or `False` for PRODUCTION

3. Click the Google Pay button to initiate payment
4. Complete the payment through Google Pay interface

## Configuration

Before running in production:
- Update the merchant ID in your configuration
- Ensure all API keys and credentials are properly set
- Test thoroughly in TEST environment first

## Google Pay Button Brand Guidelines

When implementing Google Pay, it's crucial to follow Google's brand guidelines to ensure approval and maintain consistency with the Google Pay brand standards.

### Important Requirements
- The Google Pay button must align with approved standards
- Review and adjust your implementation according to platform-specific guidelines:
  - **Web Integration:** [Google Pay Web Brand Guidelines](https://developers.google.com/pay/api/web/guides/brand-guidelines#payment-buttons)
  - **Android Integration:** [Google Pay Android Brand Guidelines](https://developers.google.com/pay/api/android/guides/brand-guidelines#payment-buttons)

### Purchase Flow Documentation

When submitting your integration for review, you'll need to provide screenshots of your complete purchase flow:

1. **Required Screenshots:**
   - Initial product/service selection page
   - Cart or order summary page
   - Google Pay button placement and appearance
   - Payment confirmation screen
   - Order completion/thank you page

2. **Screenshot Guidelines:**
   - Capture the entire user journey from selection to completion
   - Ensure the Google Pay button is clearly visible and properly styled
   - Include both desktop and mobile views if applicable
   - Highlight any unique aspects of your implementation

3. **Review Process:**
   - Upload screenshots to the Google Pay Business Console
   - Ensure your button implementation matches the brand guidelines exactly
   - Be prepared to make adjustments based on Google's feedback

## Additional Resources

- [Google Pay API Documentation](https://developers.google.com/pay/api/web/guides/setup)
- [Google Pay Business Support](https://support.google.com/pay/business/)
- [Integration Testing Guide](https://developers.google.com/pay/api/web/guides/test-and-deploy)
- [Brand Guidelines - Web](https://developers.google.com/pay/api/web/guides/brand-guidelines#payment-buttons)
- [Brand Guidelines - Android](https://developers.google.com/pay/api/android/guides/brand-guidelines#payment-buttons)
