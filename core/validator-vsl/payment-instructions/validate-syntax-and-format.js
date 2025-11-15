const validateAmount = require('./validate-amount');
const validateCurrency = require('./validate-currency');
const validateAccountIdFormat = require('./validate-account-id-format');
const validateDateFormat = require('./validate-date-format');

function validateSyntaxAndFormat(parsed) {
  const amountValidation = validateAmount(parsed.amount);
  if (!amountValidation.valid) return amountValidation;

  const currencyValidation = validateCurrency(parsed.currency);
  if (!currencyValidation.valid) return currencyValidation;

  const debitAccountValidation = validateAccountIdFormat(parsed.debit_account);
  if (!debitAccountValidation.valid) return debitAccountValidation;

  const creditAccountValidation = validateAccountIdFormat(parsed.credit_account);
  if (!creditAccountValidation.valid) return creditAccountValidation;

  if (parsed.execute_by) {
    const dateValidation = validateDateFormat(parsed.execute_by);
    if (!dateValidation.valid) return dateValidation;
  }

  return { valid: true };
}

module.exports = validateSyntaxAndFormat;
