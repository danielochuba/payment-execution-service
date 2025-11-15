function executeTransaction(debitAccount, creditAccount, amount) {
  const debitBalanceBefore = debitAccount.balance;
  const creditBalanceBefore = creditAccount.balance;

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

module.exports = executeTransaction;
