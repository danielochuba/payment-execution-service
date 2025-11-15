/*
This function builds a failed response.
It takes a parsed instruction, an error message, and an error code.
It returns a failed response.
*/

const PaymentMessages = require('@app/messages/payment');

function buildFailedResponse(parsed, errorMessage, errorCode) {
  const amount = parsed.amount ? parseInt(parsed.amount, 10) : null;
  return {
    type: parsed.type,
    amount,
    currency: parsed.currency,
    debit_account: parsed.debit_account,
    credit_account: parsed.credit_account,
    execute_by: parsed.execute_by,
    status: 'failed',
    status_reason: errorMessage || PaymentMessages.MALFORMED_INSTRUCTION,
    status_code: errorCode || 'SY03',
    accounts: [],
  };
}

module.exports = buildFailedResponse;
