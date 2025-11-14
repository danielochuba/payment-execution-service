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

/**
 * Normalize instruction by handling multiple spaces
 * @param {string} instruction
 * @returns {string}
 */
function normalizeInstruction(instruction) {
  let normalized = instruction.trim();
  // Replace multiple spaces with single space
  while (normalized.includes('  ')) {
    normalized = normalized.replace('  ', ' ');
  }
  return normalized;
}

/**
 * Find keyword position (case-insensitive)
 * @param {string} text
 * @param {string} keyword
 * @returns {number}
 */
function findKeyword(text, keyword) {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  return lowerText.indexOf(lowerKeyword);
}

/**
 * Parse DEBIT format instruction
 * Format: DEBIT [amount] [currency] FROM ACCOUNT [id] FOR CREDIT TO ACCOUNT [id] [ON [date]]
 * @param {string} instruction
 * @returns {object|null}
 */
function parseDebitFormat(instruction) {
  const normalized = normalizeInstruction(instruction);

  // Check for required keywords in order
  const debitPos = findKeyword(normalized, 'DEBIT');
  const fromPos = findKeyword(normalized, 'FROM');
  const accountPos = findKeyword(normalized, 'ACCOUNT');
  const forPos = findKeyword(normalized, 'FOR');
  const creditPos = findKeyword(normalized, 'CREDIT');
  const toPos = findKeyword(normalized, 'TO');
  const account2Pos = normalized.toLowerCase().indexOf('account', accountPos + 7);

  if (
    debitPos === -1 ||
    fromPos === -1 ||
    accountPos === -1 ||
    forPos === -1 ||
    creditPos === -1 ||
    toPos === -1 ||
    account2Pos === -1
  ) {
    return null;
  }

  // Check keyword order
  if (
    !(
      debitPos < fromPos &&
      fromPos < accountPos &&
      accountPos < forPos &&
      forPos < creditPos &&
      creditPos < toPos &&
      toPos < account2Pos
    )
  ) {
    return null;
  }

  // Extract amount and currency (between DEBIT and FROM)
  const afterDebit = normalized.substring(debitPos + 5, fromPos).trim();
  const parts = afterDebit.split(' ');
  if (parts.length < 2) return null;

  const amountStr = parts[0];
  const currency = parts[1].toUpperCase();

  // Extract debit account (between ACCOUNT and FOR)
  const afterAccount1 = normalized.substring(accountPos + 7, forPos).trim();
  const debitAccount = afterAccount1;

  // Extract credit account (between second ACCOUNT and end or ON)
  const afterAccount2 = normalized.substring(account2Pos + 7).trim();
  const onPos = findKeyword(afterAccount2, 'ON');
  let creditAccount;
  let executeBy = null;

  if (onPos !== -1) {
    creditAccount = afterAccount2.substring(0, onPos).trim();
    const afterOn = afterAccount2.substring(onPos + 2).trim();
    executeBy = afterOn || null;
  } else {
    creditAccount = afterAccount2;
  }

  if (!amountStr || !currency || !debitAccount || !creditAccount) {
    return null;
  }

  return {
    type: 'DEBIT',
    amount: amountStr,
    currency,
    debit_account: debitAccount,
    credit_account: creditAccount,
    execute_by: executeBy,
  };
}

/**
 * Parse CREDIT format instruction
 * Format: CREDIT [amount] [currency] TO ACCOUNT [id] FOR DEBIT FROM ACCOUNT [id] [ON [date]]
 * @param {string} instruction
 * @returns {object|null}
 */
function parseCreditFormat(instruction) {
  const normalized = normalizeInstruction(instruction);

  // Check for required keywords in order
  const creditPos = findKeyword(normalized, 'CREDIT');
  const toPos = findKeyword(normalized, 'TO');
  const accountPos = findKeyword(normalized, 'ACCOUNT');
  const forPos = findKeyword(normalized, 'FOR');
  const debitPos = findKeyword(normalized, 'DEBIT');
  const fromPos = findKeyword(normalized, 'FROM');
  const account2Pos = normalized.toLowerCase().indexOf('account', accountPos + 7);

  if (
    creditPos === -1 ||
    toPos === -1 ||
    accountPos === -1 ||
    forPos === -1 ||
    debitPos === -1 ||
    fromPos === -1 ||
    account2Pos === -1
  ) {
    return null;
  }

  // Check keyword order
  if (
    !(
      creditPos < toPos &&
      toPos < accountPos &&
      accountPos < forPos &&
      forPos < debitPos &&
      debitPos < fromPos &&
      fromPos < account2Pos
    )
  ) {
    return null;
  }

  // Extract amount and currency (between CREDIT and TO)
  const afterCredit = normalized.substring(creditPos + 6, toPos).trim();
  const parts = afterCredit.split(' ');
  if (parts.length < 2) return null;

  const amountStr = parts[0];
  const currency = parts[1].toUpperCase();

  // Extract credit account (between first ACCOUNT and FOR)
  const afterAccount1 = normalized.substring(accountPos + 7, forPos).trim();
  const creditAccount = afterAccount1;

  // Extract debit account (between second ACCOUNT and end or ON)
  const afterAccount2 = normalized.substring(account2Pos + 7).trim();
  const onPos = findKeyword(afterAccount2, 'ON');
  let debitAccount;
  let executeBy = null;

  if (onPos !== -1) {
    debitAccount = afterAccount2.substring(0, onPos).trim();
    const afterOn = afterAccount2.substring(onPos + 2).trim();
    executeBy = afterOn || null;
  } else {
    debitAccount = afterAccount2;
  }

  if (!amountStr || !currency || !debitAccount || !creditAccount) {
    return null;
  }

  return {
    type: 'CREDIT',
    amount: amountStr,
    currency,
    debit_account: debitAccount,
    credit_account: creditAccount,
    execute_by: executeBy,
  };
}

/**
 * Parse payment instruction
 * @param {string} instruction
 * @returns {object|null}
 */
function parseInstruction(instruction) {
  if (!instruction || typeof instruction !== 'string') {
    return null;
  }

  const normalized = normalizeInstruction(instruction);
  const lowerInstruction = normalized.toLowerCase();

  // Determine format by first keyword
  if (lowerInstruction.startsWith('debit')) {
    return parseDebitFormat(normalized);
  }
  if (lowerInstruction.startsWith('credit')) {
    return parseCreditFormat(normalized);
  }

  return null;
}

/**
 * Supported currencies
 */
const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];

/**
 * Validate amount is positive integer
 * @param {string} amountStr
 * @returns {{valid: boolean, errorCode?: string, errorMessage?: string}}
 */
function validateAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  // Check for negative sign
  if (amountStr.includes('-')) {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  // Check for decimal point
  if (amountStr.includes('.')) {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  // Try to parse as integer
  const amount = parseInt(amountStr, 10);

  // Check if it's a valid number and positive
  if (Number.isNaN(amount) || amount <= 0) {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  // Check if the string representation matches (to catch cases like "100abc")
  if (amount.toString() !== amountStr.trim()) {
    return {
      valid: false,
      errorCode: 'AM01',
      errorMessage: PaymentMessages.INVALID_AMOUNT,
    };
  }

  return { valid: true };
}

/**
 * Validate currency is supported
 * @param {string} currency
 * @returns {{valid: boolean, errorCode?: string, errorMessage?: string}}
 */
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

/**
 * Validate account ID format (letters, numbers, hyphens, periods, @ only)
 * @param {string} accountId
 * @returns {{valid: boolean, errorCode?: string, errorMessage?: string}}
 */
function validateAccountIdFormat(accountId) {
  if (!accountId || accountId.trim() === '') {
    return {
      valid: false,
      errorCode: 'AC04',
      errorMessage: PaymentMessages.INVALID_ACCOUNT_ID,
    };
  }

  // Check each character - must be letter, number, hyphen, period, or @
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

/**
 * Validate date format YYYY-MM-DD
 * @param {string} dateStr
 * @returns {{valid: boolean, errorCode?: string, errorMessage?: string}}
 */
function validateDateFormat(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  // Check format: YYYY-MM-DD (exactly 10 characters)
  if (dateStr.length !== 10) {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  // Check for hyphens at positions 4 and 7
  if (dateStr[4] !== '-' || dateStr[7] !== '-') {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  // Extract parts
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(5, 7);
  const day = dateStr.substring(8, 10);

  // Check all parts are numeric
  const isNumeric = (str) => {
    for (let i = 0; i < str.length; i++) {
      if (str[i] < '0' || str[i] > '9') {
        return false;
      }
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

  // Validate month range (01-12)
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  // Validate day range (01-31)
  const dayNum = parseInt(day, 10);
  if (dayNum < 1 || dayNum > 31) {
    return {
      valid: false,
      errorCode: 'DT01',
      errorMessage: PaymentMessages.INVALID_DATE_FORMAT,
    };
  }

  return { valid: true };
}

/**
 * Validate parsed instruction syntax and format
 * @param {object} parsed
 * @returns {{valid: boolean, errorCode?: string, errorMessage?: string}}
 */
function validateSyntaxAndFormat(parsed) {
  // Validate amount
  const amountValidation = validateAmount(parsed.amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }

  // Validate currency
  const currencyValidation = validateCurrency(parsed.currency);
  if (!currencyValidation.valid) {
    return currencyValidation;
  }

  // Validate account IDs
  const debitAccountValidation = validateAccountIdFormat(parsed.debit_account);
  if (!debitAccountValidation.valid) {
    return debitAccountValidation;
  }

  const creditAccountValidation = validateAccountIdFormat(parsed.credit_account);
  if (!creditAccountValidation.valid) {
    return creditAccountValidation;
  }

  // Validate date format if present
  if (parsed.execute_by) {
    const dateValidation = validateDateFormat(parsed.execute_by);
    if (!dateValidation.valid) {
      return dateValidation;
    }
  }

  return { valid: true };
}

/**
 * Find account by ID in accounts array
 * @param {Array} accounts
 * @param {string} accountId
 * @returns {object|null}
 */
function findAccount(accounts, accountId) {
  if (!accounts || !Array.isArray(accounts)) {
    return null;
  }

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].id === accountId) {
      return accounts[i];
    }
  }

  return null;
}

/**
 * Validate business logic rules
 * @param {object} parsed
 * @param {Array} accounts
 * @returns {{valid: boolean, errorCode?: string, errorMessage?: string, debitAccount?: object, creditAccount?: object}}
 */
function validateBusinessLogic(parsed, accounts) {
  // Find debit account
  const debitAccount = findAccount(accounts, parsed.debit_account);
  if (!debitAccount) {
    return {
      valid: false,
      errorCode: 'AC03',
      errorMessage: PaymentMessages.ACCOUNT_NOT_FOUND,
    };
  }

  // Find credit account
  const creditAccount = findAccount(accounts, parsed.credit_account);
  if (!creditAccount) {
    return {
      valid: false,
      errorCode: 'AC03',
      errorMessage: PaymentMessages.ACCOUNT_NOT_FOUND,
    };
  }

  // Check if debit and credit accounts are the same
  if (parsed.debit_account === parsed.credit_account) {
    return {
      valid: false,
      errorCode: 'AC02',
      errorMessage: PaymentMessages.SAME_ACCOUNT_ERROR,
      debitAccount,
      creditAccount,
    };
  }

  // Check currency mismatch
  const parsedCurrency = parsed.currency.toUpperCase();
  const debitCurrency = debitAccount.currency.toUpperCase();
  const creditCurrency = creditAccount.currency.toUpperCase();

  if (debitCurrency !== creditCurrency) {
    return {
      valid: false,
      errorCode: 'CU01',
      errorMessage: PaymentMessages.CURRENCY_MISMATCH,
      debitAccount,
      creditAccount,
    };
  }

  // Check if parsed currency matches account currencies
  if (parsedCurrency !== debitCurrency || parsedCurrency !== creditCurrency) {
    return {
      valid: false,
      errorCode: 'CU01',
      errorMessage: PaymentMessages.CURRENCY_MISMATCH,
      debitAccount,
      creditAccount,
    };
  }

  // Check insufficient funds
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

/**
 * Compare date with current UTC date (date portion only)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number} - Negative if date is in past, 0 if today, positive if in future
 */
function compareDateWithToday(dateStr) {
  if (!dateStr) {
    return -1; // No date means execute immediately
  }

  // Parse date string
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return -1; // Invalid format, treat as immediate
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date
  const day = parseInt(parts[2], 10);

  // Create date object (UTC)
  const instructionDate = new Date(Date.UTC(year, month, day));
  const today = new Date();

  // Get UTC date components for today
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth();
  const todayDay = today.getUTCDate();

  // Create UTC date for today (midnight)
  const todayUTC = new Date(Date.UTC(todayYear, todayMonth, todayDay));

  // Compare dates (date portion only)
  const instructionTime = instructionDate.getTime();
  const todayTime = todayUTC.getTime();

  if (instructionTime < todayTime) {
    return -1; // Past date - execute immediately
  }
  if (instructionTime === todayTime) {
    return 0; // Today - execute immediately
  }
  return 1; // Future date - pending
}

/**
 * Execute transaction and update balances
 * @param {object} debitAccount
 * @param {object} creditAccount
 * @param {number} amount
 * @returns {object} Updated accounts with balance_before
 */
function executeTransaction(debitAccount, creditAccount, amount) {
  // Store original balances
  const debitBalanceBefore = debitAccount.balance;
  const creditBalanceBefore = creditAccount.balance;

  // Update balances
  const updatedDebitAccount = {
    id: debitAccount.id,
    balance: debitBalanceBefore - amount,
    balance_before: debitBalanceBefore,
    currency: debitAccount.currency,
  };

  const updatedCreditAccount = {
    id: creditAccount.id,
    balance: creditBalanceBefore + amount,
    balance_before: creditBalanceBefore,
    currency: creditAccount.currency,
  };

  return {
    debitAccount: updatedDebitAccount,
    creditAccount: updatedCreditAccount,
  };
}

async function processPaymentInstruction(serviceData, _options = {}) {
  let response;

  try {
    // Validate input data
    const data = validator.validate(serviceData, parsedSpec);

    appLogger.info({ instruction: data.instruction }, 'parsing-instruction-start');

    // Parse the instruction
    const parsed = parseInstruction(data.instruction);

    if (!parsed) {
      // Completely unparseable instruction
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
      // Validate syntax and format
      const syntaxValidation = validateSyntaxAndFormat(parsed);

      if (!syntaxValidation.valid) {
        // Syntax/format validation failed
        const amount = parsed.amount ? parseInt(parsed.amount, 10) : null;

        response = {
          type: parsed.type,
          amount,
          currency: parsed.currency,
          debit_account: parsed.debit_account,
          credit_account: parsed.credit_account,
          execute_by: parsed.execute_by,
          status: 'failed',
          status_reason: syntaxValidation.errorMessage || 'Validation failed',
          status_code: syntaxValidation.errorCode || 'SY03',
          accounts: [], // Will be populated in later stages
        };
      } else {
        // Successfully parsed and validated syntax/format
        // Now validate business logic
        const businessValidation = validateBusinessLogic(parsed, data.accounts);

        if (!businessValidation.valid) {
          // Business logic validation failed
          const amount = parsed.amount ? parseInt(parsed.amount, 10) : null;

          // Prepare accounts array with balance_before (unchanged balances)
          const accountsArray = [];
          if (businessValidation.debitAccount) {
            accountsArray.push({
              id: businessValidation.debitAccount.id,
              balance: businessValidation.debitAccount.balance,
              balance_before: businessValidation.debitAccount.balance,
              currency: businessValidation.debitAccount.currency,
            });
          }
          if (businessValidation.creditAccount) {
            accountsArray.push({
              id: businessValidation.creditAccount.id,
              balance: businessValidation.creditAccount.balance,
              balance_before: businessValidation.creditAccount.balance,
              currency: businessValidation.creditAccount.currency,
            });
          }

          // Maintain order from request
          const orderedAccounts = [];
          for (let i = 0; i < data.accounts.length; i++) {
            const acc = data.accounts[i];
            if (acc.id === parsed.debit_account || acc.id === parsed.credit_account) {
              orderedAccounts.push({
                id: acc.id,
                balance: acc.balance,
                balance_before: acc.balance,
                currency: acc.currency,
              });
            }
          }

          response = {
            type: parsed.type,
            amount,
            currency: parsed.currency,
            debit_account: parsed.debit_account,
            credit_account: parsed.credit_account,
            execute_by: parsed.execute_by,
            status: 'failed',
            status_reason: businessValidation.errorMessage || 'Business validation failed',
            status_code: businessValidation.errorCode || 'SY03',
            accounts: orderedAccounts,
          };
        } else {
          // Successfully parsed and validated - execute transaction
          const amount = parsed.amount ? parseInt(parsed.amount, 10) : null;
          const { debitAccount } = businessValidation;
          const { creditAccount } = businessValidation;

          // Check if transaction should execute immediately or be pending
          const dateComparison = compareDateWithToday(parsed.execute_by);

          if (dateComparison <= 0) {
            // Execute immediately (no date, past date, or today)
            const executed = executeTransaction(debitAccount, creditAccount, amount);

            // Maintain order from request
            const orderedAccounts = [];
            for (let i = 0; i < data.accounts.length; i++) {
              const acc = data.accounts[i];
              if (acc.id === parsed.debit_account) {
                orderedAccounts.push(executed.debitAccount);
              }
              if (acc.id === parsed.credit_account) {
                orderedAccounts.push(executed.creditAccount);
              }
            }

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
            // Future date - pending execution (no balance changes)
            // Maintain order from request
            const orderedAccounts = [];
            for (let i = 0; i < data.accounts.length; i++) {
              const acc = data.accounts[i];
              if (acc.id === parsed.debit_account || acc.id === parsed.credit_account) {
                orderedAccounts.push({
                  id: acc.id,
                  balance: acc.balance,
                  balance_before: acc.balance,
                  currency: acc.currency,
                });
              }
            }

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
