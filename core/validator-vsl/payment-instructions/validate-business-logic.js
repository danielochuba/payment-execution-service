const PaymentMessages = require('@app/messages/payment');
const findAccount = require('./find-account');

function validateBusinessLogic(parsed, accounts) {
  const debitAccount = findAccount(accounts, parsed.debit_account);
  if (!debitAccount) {
    return {
      valid: false,
      errorCode: 'AC03',
      errorMessage: PaymentMessages.ACCOUNT_NOT_FOUND,
    };
  }

  const creditAccount = findAccount(accounts, parsed.credit_account);
  if (!creditAccount) {
    return {
      valid: false,
      errorCode: 'AC03',
      errorMessage: PaymentMessages.ACCOUNT_NOT_FOUND,
    };
  }

  if (parsed.debit_account === parsed.credit_account) {
    return {
      valid: false,
      errorCode: 'AC02',
      errorMessage: PaymentMessages.SAME_ACCOUNT_ERROR,
      debitAccount,
      creditAccount,
    };
  }

  const parsedCurrency = parsed.currency.toUpperCase();
  const debitCurrency = debitAccount.currency.toUpperCase();
  const creditCurrency = creditAccount.currency.toUpperCase();

  if (
    debitCurrency !== creditCurrency ||
    parsedCurrency !== debitCurrency ||
    parsedCurrency !== creditCurrency
  ) {
    return {
      valid: false,
      errorCode: 'CU01',
      errorMessage: PaymentMessages.CURRENCY_MISMATCH,
      debitAccount,
      creditAccount,
    };
  }

  const amount = parseInt(parsed.amount, 10);
  if (debitAccount.balance < amount) {
    return {
      valid: false,
      errorCode: 'AC01',
      errorMessage: PaymentMessages.INSUFFICIENT_FUNDS,
      debitAccount,
      creditAccount,
    };
  }

  return {
    valid: true,
    debitAccount,
    creditAccount,
  };
}

module.exports = validateBusinessLogic;
