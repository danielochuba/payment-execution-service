const PaymentMessages = require('@app/messages/payment');

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];

function validateCurrency(currency) {
  if (!currency) {
    return {
      valid: false,
      errorCode: 'CU02',
      errorMessage: PaymentMessages.UNSUPPORTED_CURRENCY,
    };
  }

  const upperCurrency = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upperCurrency)) {
    return {
      valid: false,
      errorCode: 'CU02',
      errorMessage: PaymentMessages.UNSUPPORTED_CURRENCY,
    };
  }

  return { valid: true };
}

module.exports = validateCurrency;
