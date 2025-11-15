const PaymentMessages = require('@app/messages/payment');

function validateAccountIdFormat(accountId) {
  if (!accountId || accountId.trim() === '') {
    return {
      valid: false,
      errorCode: 'AC04',
      errorMessage: PaymentMessages.INVALID_ACCOUNT_ID,
    };
  }

  for (let i = 0; i < accountId.length; i++) {
    const char = accountId[i];
    const isLetter = (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    const isNumber = char >= '0' && char <= '9';
    const isHyphen = char === '-';
    const isPeriod = char === '.';
    const isAt = char === '@';

    if (!isLetter && !isNumber && !isHyphen && !isPeriod && !isAt) {
      return {
        valid: false,
        errorCode: 'AC04',
        errorMessage: PaymentMessages.INVALID_ACCOUNT_ID,
      };
    }
  }

  return { valid: true };
}

module.exports = validateAccountIdFormat;
