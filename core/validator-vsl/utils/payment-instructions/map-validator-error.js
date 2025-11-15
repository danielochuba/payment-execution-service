const PaymentMessages = require('@app/messages/payment');

/*
This function maps a validator error to a payment message.
It takes an error object and returns a payment message.
*/
function mapValidatorErrorToPaymentMessage(error) {
  const msg = (error.message || '').toLowerCase();
  const details = error.details || {};
  const firstMsg = (details.__$app_first_message || msg).toLowerCase();

  const text = [
    firstMsg,
    typeof details.instruction === 'string' ? details.instruction.toLowerCase() : '',
    typeof details.accounts === 'string' ? details.accounts.toLowerCase() : '',
    msg,
  ].join(' | ');

  const has = (words) => words.some((w) => text.includes(w));

  let result = PaymentMessages.INVALID_REQUEST_FORMAT;

  if (has(['instruction']) && has(['required', 'missing'])) {
    result = PaymentMessages.MISSING_INSTRUCTION;
  } else if (has(['accounts']) && has(['required', 'missing'])) {
    result = PaymentMessages.MISSING_ACCOUNTS;
  } else if (has(['instruction']) && has(['string', 'type'])) {
    result = PaymentMessages.INVALID_INSTRUCTION_TYPE;
  } else if (has(['accounts']) && has(['array', 'type'])) {
    result = PaymentMessages.INVALID_ACCOUNTS_TYPE;
  }

  return result;
}

module.exports = mapValidatorErrorToPaymentMessage;
