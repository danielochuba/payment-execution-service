/**
 * Parse payment instruction string into structured data
 * Supports DEBIT and CREDIT formats
 */

function normalizeInstruction(instruction) {
  const normalized = instruction.trim();
  let result = '';
  let lastChar = '';

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const isWhitespace = char === ' ' || char === '\t' || char === '\n' || char === '\r';

    if (isWhitespace) {
      if (lastChar !== ' ') {
        result += ' ';
        lastChar = ' ';
      }
    } else {
      result += char;
      lastChar = char;
    }
  }

  return result.trim();
}

function findKeyword(text, keyword) {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  return lowerText.indexOf(lowerKeyword);
}

function isKeywordProperlySeparated(text, keyword, position) {
  if (position === -1) {
    return false;
  }

  const keywordLength = keyword.length;
  const textLength = text.length;

  if (position + keywordLength > textLength) {
    return false;
  }

  const actualKeyword = text.substring(position, position + keywordLength);
  const keywordLower = keyword.toLowerCase();
  const actualKeywordLower = actualKeyword.toLowerCase();

  if (actualKeywordLower !== keywordLower) {
    return false;
  }

  const charBefore = position > 0 ? text[position - 1] : null;
  const charAfter = position + keywordLength < textLength ? text[position + keywordLength] : null;

  const isWhitespaceBefore =
    charBefore === null ||
    charBefore === ' ' ||
    charBefore === '\t' ||
    charBefore === '\n' ||
    charBefore === '\r';
  const isWhitespaceAfter =
    charAfter === null ||
    charAfter === ' ' ||
    charAfter === '\t' ||
    charAfter === '\n' ||
    charAfter === '\r';

  return isWhitespaceBefore && isWhitespaceAfter;
}

function parseDebitFormat(instruction) {
  let result = null;

  const normalized = normalizeInstruction(instruction);

  // Find keyword positions
  const debitPos = findKeyword(normalized, 'DEBIT');
  const fromPos = findKeyword(normalized, 'FROM');
  const accountPos = findKeyword(normalized, 'ACCOUNT');
  const forPos = findKeyword(normalized, 'FOR');
  const creditPos = findKeyword(normalized, 'CREDIT');
  const toPos = findKeyword(normalized, 'TO');
  const account2Pos = normalized.toLowerCase().indexOf('account', accountPos + 7);

  // Validate keyword presence
  const allPresent =
    debitPos !== -1 &&
    fromPos !== -1 &&
    accountPos !== -1 &&
    forPos !== -1 &&
    creditPos !== -1 &&
    toPos !== -1 &&
    account2Pos !== -1;

  if (allPresent) {
    const keywordsValid =
      isKeywordProperlySeparated(normalized, 'DEBIT', debitPos) &&
      isKeywordProperlySeparated(normalized, 'FROM', fromPos) &&
      isKeywordProperlySeparated(normalized, 'ACCOUNT', accountPos) &&
      isKeywordProperlySeparated(normalized, 'FOR', forPos) &&
      isKeywordProperlySeparated(normalized, 'CREDIT', creditPos) &&
      isKeywordProperlySeparated(normalized, 'TO', toPos) &&
      isKeywordProperlySeparated(normalized, 'ACCOUNT', account2Pos);

    if (!keywordsValid) {
      return result;
    }

    // Validate order of keywords
    const correctOrder =
      debitPos < fromPos &&
      fromPos < accountPos &&
      accountPos < forPos &&
      forPos < creditPos &&
      creditPos < toPos &&
      toPos < account2Pos;

    if (correctOrder) {
      // Extract amount + currency
      const afterDebit = normalized.substring(debitPos + 5, fromPos).trim();
      const parts = afterDebit.split(' ');

      if (parts.length >= 2) {
        const amountStr = parts[0];
        const currency = parts[1].toUpperCase();

        // Debit account
        const debitAccount = normalized.substring(accountPos + 7, forPos).trim();

        // Credit account + optional "ON"
        const afterAccount2 = normalized.substring(account2Pos + 7).trim();
        const onPos = findKeyword(afterAccount2, 'ON');

        let creditAccount = afterAccount2;
        let executeBy = null;

        if (onPos !== -1) {
          creditAccount = afterAccount2.substring(0, onPos).trim();
          const afterOn = afterAccount2.substring(onPos + 2).trim();
          executeBy = afterOn || null;
        }

        // Final validation
        if (amountStr && currency && debitAccount && creditAccount) {
          result = {
            type: 'DEBIT',
            amount: amountStr,
            currency,
            debit_account: debitAccount,
            credit_account: creditAccount,
            execute_by: executeBy,
          };
        }
      }
    }
  }

  return result;
}

function parseCreditFormat(instruction) {
  let result = null;

  const normalized = normalizeInstruction(instruction);

  // Keyword positions
  const creditPos = findKeyword(normalized, 'CREDIT');
  const toPos = findKeyword(normalized, 'TO');
  const accountPos = findKeyword(normalized, 'ACCOUNT');
  const forPos = findKeyword(normalized, 'FOR');
  const debitPos = findKeyword(normalized, 'DEBIT');
  const fromPos = findKeyword(normalized, 'FROM');
  const account2Pos = normalized.toLowerCase().indexOf('account', accountPos + 7);

  // Validate keyword presence
  const allKeywordsPresent =
    creditPos !== -1 &&
    toPos !== -1 &&
    accountPos !== -1 &&
    forPos !== -1 &&
    debitPos !== -1 &&
    fromPos !== -1 &&
    account2Pos !== -1;

  if (allKeywordsPresent) {
    const keywordsValid =
      isKeywordProperlySeparated(normalized, 'CREDIT', creditPos) &&
      isKeywordProperlySeparated(normalized, 'TO', toPos) &&
      isKeywordProperlySeparated(normalized, 'ACCOUNT', accountPos) &&
      isKeywordProperlySeparated(normalized, 'FOR', forPos) &&
      isKeywordProperlySeparated(normalized, 'DEBIT', debitPos) &&
      isKeywordProperlySeparated(normalized, 'FROM', fromPos) &&
      isKeywordProperlySeparated(normalized, 'ACCOUNT', account2Pos);

    if (!keywordsValid) {
      return result;
    }

    // Validate order
    const correctOrder =
      creditPos < toPos &&
      toPos < accountPos &&
      accountPos < forPos &&
      forPos < debitPos &&
      debitPos < fromPos &&
      fromPos < account2Pos;

    if (correctOrder) {
      // Extract amount + currency
      const afterCredit = normalized.substring(creditPos + 6, toPos).trim();
      const parts = afterCredit.split(' ');

      if (parts.length >= 2) {
        const amountStr = parts[0];
        const currency = parts[1].toUpperCase();

        // Extract accounts
        const creditAccount = normalized.substring(accountPos + 7, forPos).trim();

        const afterAccount2 = normalized.substring(account2Pos + 7).trim();
        const onPos = findKeyword(afterAccount2, 'ON');

        let debitAccount = afterAccount2;
        let executeBy = null;

        if (onPos !== -1) {
          debitAccount = afterAccount2.substring(0, onPos).trim();
          const afterOn = afterAccount2.substring(onPos + 2).trim();
          executeBy = afterOn || null;
        }

        // Final validation
        if (amountStr && currency && debitAccount && creditAccount) {
          result = {
            type: 'CREDIT',
            amount: amountStr,
            currency,
            debit_account: debitAccount,
            credit_account: creditAccount,
            execute_by: executeBy,
          };
        }
      }
    }
  }

  return result;
}

function parseInstruction(instruction) {
  let result = null;
  if (!instruction || typeof instruction !== 'string') {
    return result;
  }

  const normalized = normalizeInstruction(instruction);
  const lowerInstruction = normalized.toLowerCase();

  // Determine format by first keyword
  if (lowerInstruction.startsWith('debit')) {
    result = parseDebitFormat(normalized);
  }
  if (lowerInstruction.startsWith('credit')) {
    result = parseCreditFormat(normalized);
  }

  return result;
}

module.exports = parseInstruction;
