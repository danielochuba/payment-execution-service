PaymentInstruction {
  accounts[] {
    id string // Account identifier (alphanumeric, hyphens, periods, @)
    balance number<min:0> // Account balance (must be non-negative)
    currency string<uppercase|length:3> // Currency code (NGN, USD, GBP, GHS)
  }
  instruction string<trim> // Payment instruction string in DEBIT or CREDIT format
}

