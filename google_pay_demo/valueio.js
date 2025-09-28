var googlePayUiController = (function () {
  var DOMStrings = {
    googleButton: "ckoGooglePay",
    errorMessage: "ckoGooglePayError",
  };
  return {
    DOMStrings,
    displayGooglePayButton: function () {
      document.getElementById(DOMStrings.googleButton).style.display = "block";
    },
    hideGooglePayButton: function () {
      document.getElementById(DOMStrings.googleButton).style.display = "none";
    },
    displayErrorMessage: function () {
      document.getElementById(DOMStrings.errorMessage).style.display = "block";
    },
  };
})();

var googlePayController = (function (uiController) {
  var _googlePayAvailable = function () {
    return window.google && google.payments.api;
  };

  var _getGooglePayClient = function () {
    return new google.payments.api.PaymentsClient({
      environment:
        config.get("test_transaction") === "true" ? "TEST" : "PRODUCTION",
    });
  };

  var _getGooglePayPaymentDataRequest = function () {
    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: "CARD",
          parameters: {
            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
            allowedCardNetworks: ["VISA", "MASTERCARD"],
            billingAddressRequired: true,
            billingAddressParameters: {
              format: "FULL",
              phoneNumberRequired: true,
            },
          },
          tokenizationSpecification: {
            type: "PAYMENT_GATEWAY",
            parameters: {
              gateway: config.get("psp_gateway"),
              gatewayMerchantId: config.get("destination"),
            },
          },
        },
      ],
      merchantInfo: {
        merchantId: config.get("google_pay_merchant_id"),
        merchantName: config.get("display_name"),
      },
      transactionInfo: {
        totalPriceStatus: "FINAL",
        totalPriceLabel: "Total",
        totalPrice: config.get("amount"),
        currencyCode: "USD",
        countryCode: "US",
      },
    };
  };

  var _startGooglePaySession = function () {
    const client = _getGooglePayClient();
    const paymentDataRequest = _getGooglePayPaymentDataRequest();

    client
      .loadPaymentData(paymentDataRequest)
      .then(function (paymentData) {
        processGooglePayPayment(paymentData, function (response) {
          if (response.approved) {
            showAlert("Payment successful.", 5000);
          } else {
            showAlert("Payment failed.", 5000, true);
          }
        });
      })
      .catch(function (err) {
        if (err.statusCode === "CANCELED") {
          showAlert("User cancelled.", 5000, true);
        } else {
          showAlert("Error: " + err.message, 5000, true);
        }
      });
  };

  function processGooglePayPayment(paymentData, callback) {
    const address = paymentData.paymentMethodData.info.billingAddress;
    axios
      .post(
        config.get("base_url") + "/v1/credit_cards",
        {
          credit_card: {
            google_pay_token:
              paymentData.paymentMethodData.tokenizationData.token,
            first_name: address.name.split(" ")[0],
            last_name: address.name.split(" ").slice(1).join(" "),
            address1: address.address1,
            address2: address.address2,
            city: address.locality,
            state: address.administrativeArea,
            zip: address.postalCode,
            country: address.countryCode,
            email: paymentData.email,
            phone: paymentData.phoneNumber,
            vaulted: true,
          },
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            Authorization: generateBasicAuthHeader(),
          },
        }
      )
      .then(function (response) {
        // Extract the credit card identifier from the response
        const creditCardIdentifier =
          response.data.data.credit_card.credit_card_token_single_use;
        // Now make the payment using the credit card identifier
        return axios.post(
          config.get("base_url") + "/v1/payments",
          {
            payment: {
              amount: config.get("amount"),
              credit_card: creditCardIdentifier,
              destination: config.get("destination"),
              test: config.get("test_transaction"),
            },
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              Authorization: generateBasicAuthHeader(),
            },
          }
        );
      })
      .then(function (paymentResponse) {
        callback({ approved: true });
      })
      .catch(function (error) {
        console.error("Error processing Google Pay payment:", error);
        callback({ approved: false });
      });
  }

  function generateBasicAuthHeader() {
    var credentials = config.get("username") + ":" + config.get("password");
    var encodedCredentials = btoa(credentials);
    return "Basic " + encodedCredentials;
  }

  var _setButtonClickListener = function () {
    document
      .getElementById(uiController.DOMStrings.googleButton)
      .addEventListener("click", function () {
        _startGooglePaySession();
      });
  };

  var _createGooglePayButton = function () {
    const container = document.getElementById(
      uiController.DOMStrings.googleButton
    );
    const button = _getGooglePayClient().createButton({
      buttonColor: "default",
      buttonType: "pay",
      buttonRadius: 24,
      buttonLocale: "en",
      buttonSizeMode: "fill",
    });

    container.appendChild(button);
  };

  return {
    init: function () {
      _createGooglePayButton();

      if (_googlePayAvailable()) {
        uiController.displayGooglePayButton();
      } else {
        uiController.hideGooglePayButton();
        uiController.displayErrorMessage();
      }

      _setButtonClickListener();
    },
  };
})(googlePayUiController);

window.addEventListener("load", function () {
  googlePayController.init();
});
