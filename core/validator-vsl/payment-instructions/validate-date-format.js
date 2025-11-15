const PaymentMessages = require('@app/messages/payment');

function validateDateFormat(dateStr) {
  if (
    !dateStr ||
    dateStr.trim() === '' ||
    dateStr.length !== 10 ||
    dateStr[4] !== '-' ||
    dateStr[7] !== '-'
  ) {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(5, 7);
  const day = dateStr.substring(8, 10);

  const isNumeric = (str) => {
    for (let i = 0; i < str.length; i++) {
      if (str[i] < '0' || str[i] > '9') return false;
    }
    return true;
  };

  if (!isNumeric(year) || !isNumeric(month) || !isNumeric(day)) {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);

  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  return { valid: true };
}

module.exports = validateDateFormat;
