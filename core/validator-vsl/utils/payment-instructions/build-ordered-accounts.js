/*
This function builds an ordered accounts array.
It takes an accounts array, a debit account id, a credit account id, and an executed accounts object.
It returns an ordered accounts array.
*/

function buildOrderedAccounts(accounts, debitAccountId, creditAccountId, executedAccounts = null) {
  const orderedAccounts = [];
  const accountMap = executedAccounts
    ? {
        [executedAccounts.debitAccount.id]: executedAccounts.debitAccount,
        [executedAccounts.creditAccount.id]: executedAccounts.creditAccount,
      }
    : null;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (acc.id === debitAccountId || acc.id === creditAccountId) {
      if (accountMap && accountMap[acc.id]) {
        orderedAccounts.push(accountMap[acc.id]);
      } else {
        orderedAccounts.push({
          id: acc.id,
          balance: acc.balance,
          balance_before: acc.balance,
          currency: acc.currency,
        });
      }
    }
  }

  return orderedAccounts;
}

module.exports = buildOrderedAccounts;
