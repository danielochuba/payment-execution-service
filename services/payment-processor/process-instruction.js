const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const PaymentMessages = require('@app/messages/payment');

// Validation spec for request payload
const spec = `root {
  accounts[] {
    id string
    balance number<min:0>
    currency string<uppercase|length:3>
  }
  instruction string<trim>
}`;

// Parse the spec once (outside the function)
const parsedSpec = validator.parse(spec);

async function processPaymentInstruction(serviceData, options = {}) {
  let response;

  try {
    // Validate input data
    const data = validator.validate(serviceData, parsedSpec);

    // For now, return a placeholder response
    // This will be implemented in subsequent stages
    response = {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: 'Not yet implemented',
      status_code: 'SY03',
      accounts: [],
    };
  } catch (error) {
    appLogger.errorX({ error }, 'process-instruction-error');
    throw error;
  }

  return response;
}

module.exports = processPaymentInstruction;

