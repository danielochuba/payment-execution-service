const PaymentMessages = require('@app/messages/payment');

function validateAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  if (amountStr.includes('-') || amountStr.includes('.')) {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  const amount = parseInt(amountStr, 10);

  if (Number.isNaN(amount) || amount <= 0 || amount.toString() !== amountStr.trim()) {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  return { valid: true };
}

module.exports = validateAmount;
