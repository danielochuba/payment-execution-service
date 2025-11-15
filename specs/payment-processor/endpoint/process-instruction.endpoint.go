ProcessPaymentInstruction {
  path /payment-instructions
  method POST
  
  body {
    accounts[] {
      id string
      balance number<min:0>
      currency string<uppercase|length:3>
    }
    instruction string<trim>
  }
  
  response.ok {
    http.code 200
    status successful|pending
    message "Transaction processed successfully"
    data {
      type string(DEBIT|CREDIT)
      amount number
      currency string
      debit_account string
      credit_account string
      execute_by? string
      status string(successful|pending|failed)
      status_reason string
      status_code string
      accounts[] {
        id string
        balance number
        balance_before number
        currency string
      }
    }
  }
  
  response.error {
    http.code 400
    status error
    message "Validation failed"
    data {
      errors[] {
        field string
        message string
        code string
      }
    }
  }
}

