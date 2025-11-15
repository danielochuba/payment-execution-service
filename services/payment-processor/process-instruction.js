const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const PaymentMessages = require('@app/messages/payment');
const parseInstruction = require('@app-core/validator/utils/payment-instructions/parse-instruction');
const {
  validateSyntaxAndFormat,
  validateBusinessLogic,
} = require('@app-core/validator/payment-instructions');
const { compareDateWithToday } = require('@app-core/validator/utils/helpers');
const executeTransaction = require('@app-core/validator/utils/payment-instructions/execute-transaction');
const mapValidatorErrorToPaymentMessage = require('@app-core/validator/utils/payment-instructions/map-validator-error');
const buildOrderedAccounts = require('@app-core/validator/utils/payment-instructions/build-ordered-accounts');
const buildFailedResponse = require('@app-core/validator/utils/payment-instructions/build-failed-response');

const spec = `root {
  accounts[] {
    id string
    balance number<min:0>
    currency string<uppercase|length:3>
  }
  instruction string<trim>
}`;

const parsedSpec = validator.parse(spec);

async function processPaymentInstruction(serviceData, _options = {}) {
  let response;

  try {
    let data;
    try {
      data = validator.validate(serviceData, parsedSpec);
    } catch (validatorError) {
      const paymentMessage = mapValidatorErrorToPaymentMessage(validatorError);
      throwAppError(paymentMessage, ERROR_CODE.INVLDDATA, validatorError.details);
    }

    appLogger.info({ instruction: data.instruction }, 'parsing-instruction-start');

    const parsed = parseInstruction(data.instruction);

    if (!parsed) {
      response = {
        type: null,
        amount: null,
        currency: null,
        debit_account: null,
        credit_account: null,
        execute_by: null,
        status: 'failed',
        status_reason: PaymentMessages.MALFORMED_INSTRUCTION,
        status_code: 'SY03',
        accounts: [],
      };
    } else {
      const syntaxValidation = validateSyntaxAndFormat(parsed);

      if (!syntaxValidation.valid) {
        response = buildFailedResponse(
          parsed,
          syntaxValidation.errorMessage,
          syntaxValidation.errorCode
        );
      } else {
        const businessValidation = validateBusinessLogic(parsed, data.accounts);

        if (!businessValidation.valid) {
          const amount = parsed.amount ? parseInt(parsed.amount, 10) : null;
          const orderedAccounts = buildOrderedAccounts(
            data.accounts,
            parsed.debit_account,
            parsed.credit_account
          );

          response = {
            type: parsed.type,
            amount,
            currency: parsed.currency,
            debit_account: parsed.debit_account,
            credit_account: parsed.credit_account,
            execute_by: parsed.execute_by,
            status: 'failed',
            status_reason: businessValidation.errorMessage || PaymentMessages.MALFORMED_INSTRUCTION,
            status_code: businessValidation.errorCode || 'SY03',
            accounts: orderedAccounts,
          };
        } else {
          const amount = parsed.amount ? parseInt(parsed.amount, 10) : null;
          const { debitAccount } = businessValidation;
          const { creditAccount } = businessValidation;

          const dateComparison = compareDateWithToday(parsed.execute_by);

          if (dateComparison <= 0) {
            const executed = executeTransaction(debitAccount, creditAccount, amount);
            const orderedAccounts = buildOrderedAccounts(
              data.accounts,
              parsed.debit_account,
              parsed.credit_account,
              executed
            );

            response = {
              type: parsed.type,
              amount,
              currency: parsed.currency,
              debit_account: parsed.debit_account,
              credit_account: parsed.credit_account,
              execute_by: parsed.execute_by,
              status: 'successful',
              status_reason: PaymentMessages.TRANSACTION_SUCCESSFUL,
              status_code: 'AP00',
              accounts: orderedAccounts,
            };
          } else {
            const orderedAccounts = buildOrderedAccounts(
              data.accounts,
              parsed.debit_account,
              parsed.credit_account
            );

            response = {
              type: parsed.type,
              amount,
              currency: parsed.currency,
              debit_account: parsed.debit_account,
              credit_account: parsed.credit_account,
              execute_by: parsed.execute_by,
              status: 'pending',
              status_reason: PaymentMessages.TRANSACTION_PENDING,
              status_code: 'AP02',
              accounts: orderedAccounts,
            };
          }
        }
      }
    }

    appLogger.info({ parsed, response }, 'parsing-instruction-complete');
  } catch (error) {
    appLogger.errorX({ error }, 'process-instruction-error');
    throw error;
  }

  return response;
}

module.exports = processPaymentInstruction;
