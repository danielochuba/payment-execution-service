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

module.exports = findAccount;
