# Payment Execution Service

A robust Node.js REST API service for processing payment instructions. This service parses natural language payment instructions, validates them against business rules, and executes transactions on provided accounts.

## 🚀 Quick Links

- [🔄 Gitflow Workflow](#gitflow-workflow)

## 📗 Table of Contents

- [About the Project](#about-project)
  - [Built With](#built-with)
  - [Key Features](#key-features)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Installation](#installation)
  - [Usage](#usage)
- [Payment Instruction Format](#payment-instruction-format)
- [Error Handling](#error-handling)
- [Project Structure](#project-structure)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## 🔄 Gitflow Workflow <a name="gitflow-workflow"></a>

This project follows the **Gitflow** branching model for organized development and release management.

### Branch Structure

```
master (production)
  └── develop (integration)
       ├── feature/* (new features)
       ├── bugfix/* (bug fixes)
       ├── hotfix/* (urgent production fixes)
       └── release/* (preparation for releases)
```

### Branch Types

#### 🌿 **Master Branch**
- **Purpose**: Production-ready code
- **Protection**: Protected, requires PR approval
- **Merges**: Only from `release/*` or `hotfix/*` branches

#### 🔧 **Dev Branch**
- **Purpose**: Integration branch for ongoing development
- **Protection**: Protected, requires PR approval
- **Merges**: From `feature/*`, `bugfix/*`, and `release/*` branches

#### ✨ **Feature Branches** (`feature/*`)
- **Naming**: `feature/description-of-feature` (e.g., `feature/payment-validation`)
- **Purpose**: Develop new features
- **Source**: Branch from `dev`
- **Merge**: Back to `dev` via Pull Request
- **Lifecycle**: Delete after merge

**Example:**
```bash
# Create feature branch
git checkout dev
git pull origin dev
git checkout -b feature/add-currency-validation

# Work on feature, commit changes
git add .
git commit -m "feat: add currency validation"

# Push and create PR
git push origin feature/add-currency-validation
# Create PR: feature/add-currency-validation → develop
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(payment): add currency validation
fix(parser): handle edge case in date parsing
docs(readme): update deployment instructions
refactor(validation): extract validation logic to separate module
```

### Pull Request Process

1. **Create PR** from feature/bugfix branch to `dev`
2. **PR Title**: Use conventional commit format
3. **PR Description**: Include:
   - What changed and why
   - Testing steps
   - Screenshots (if UI changes)
   - Related issues
4. **Review**: At least one approval required
5. **CI/CD**: All checks must pass
6. **Merge**: Squash and merge (keeps history clean)

### Branch Protection Rules

- **Main & Develop**: Protected branches
- **Required Reviews**: At least 1 approval
- **Status Checks**: All CI/CD checks must pass
- **No Force Push**: Disabled
- **No Direct Commits**: Must use PRs

---

## 📖 About the Project <a name="about-project"></a>

The Payment Execution Service is a Node.js backend application that processes payment instructions written in a natural language format. It supports two instruction formats (DEBIT and CREDIT), validates syntax and business rules, and executes transactions with proper balance tracking.

### 🛠 Built With <a name="built-with"></a>

#### Tech Stack

<details>
  <summary>Server</summary>
  <ul>
    <li><a href="https://nodejs.org/">Node.js</a></li>
    <li><a href="https://expressjs.com/">Express.js</a></li>
  </ul>
</details>

<details>
  <summary>Core Libraries</summary>
  <ul>
    <li>Custom Validator (VSL - Validation Specification Language)</li>
    <li>Custom Logger</li>
    <li>Custom Error Handling</li>
  </ul>
</details>

### Key Features <a name="key-features"></a>

- **Natural Language Processing**: Parses payment instructions in plain English
- **Dual Format Support**: Handles both DEBIT and CREDIT instruction formats
- **Comprehensive Validation**: Syntax, format, and business logic validation
- **Transaction Execution**: Immediate and scheduled transaction processing
- **Balance Tracking**: Maintains `balance_before` for audit purposes
- **Error Handling**: Detailed error messages with specific error codes
- **Request Validation**: Validates request body structure before processing

## 🏗 Architecture <a name="architecture"></a>

The application follows a layered architecture pattern:

```
Request → Endpoint → Service → Validation → Execution → Response
```

### Key Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Single Responsibility**: Each module handles one concern
3. **Validation First**: Input validation happens at the earliest stage
4. **Functional Programming**: Pure functions with single exit points
5. **Error Handling**: Centralized error handling with structured responses

### Layer Responsibilities

- **Endpoints**: HTTP routing and request/response handling
- **Services**: Business logic orchestration
- **Validation**: Syntax, format, and business rule validation
- **Execution**: Transaction processing and balance updates

## 📚 API Documentation <a name="api-documentation"></a>

### POST /payment-instructions

Processes a payment instruction and executes the transaction.

#### Request Body

```json
{
  "accounts": [
    {
      "id": "account-1",
      "balance": 1000,
      "currency": "USD"
    },
    {
      "id": "account-2",
      "balance": 500,
      "currency": "USD"
    }
  ],
  "instruction": "DEBIT 100 USD FROM ACCOUNT account-1 FOR CREDIT TO ACCOUNT account-2"
}
```

#### Request Validation

The endpoint validates:
- Request body is not empty
- Request body is a valid JSON object
- `accounts` array is present and not empty
- `instruction` field is present and is a string
- Each account has required fields (id, balance, currency)

#### Success Response (200 OK)

```json
{
  "data": {
    "type": "DEBIT",
    "amount": 100,
    "currency": "USD",
    "debit_account": "account-1",
    "credit_account": "account-2",
    "execute_by": null,
    "status": "successful",
    "status_reason": "Transaction executed successfully",
    "status_code": "AP00",
    "accounts": [
      {
        "id": "account-1",
        "balance": 900,
        "balance_before": 1000,
        "currency": "USD"
      },
      {
        "id": "account-2",
        "balance": 600,
        "balance_before": 500,
        "currency": "USD"
      }
    ]
  }
}
```

#### Pending Response (200 OK)

When transaction is scheduled for future execution:

```json
{
  "data": {
    "type": "DEBIT",
    "amount": 100,
    "currency": "USD",
    "debit_account": "account-1",
    "credit_account": "account-2",
    "execute_by": "2025-12-31",
    "status": "pending",
    "status_reason": "Transaction scheduled for future execution",
    "status_code": "AP02",
    "accounts": [
      {
        "id": "account-1",
        "balance": 1000,
        "balance_before": 1000,
        "currency": "USD"
      },
      {
        "id": "account-2",
        "balance": 500,
        "balance_before": 500,
        "currency": "USD"
      }
    ]
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "status": "error",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR"
}
```

## 💻 Getting Started <a name="getting-started"></a>

### Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- MongoDB (if using database features)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/danielochuba/payment-execution-service.git
cd payment-execution-service
```

2. Install dependencies:
```bash
npm install
```

### Usage

Start the development server:

```bash
node app.js
```

The server will start on port 8811 (or the port specified in `.env`).

### Testing the API

Using cURL:

```bash
curl -X POST http://localhost:8811/payment-instructions \
  -H "Content-Type: application/json" \
  -d '{
    "accounts": [
      {"id": "a", "balance": 230, "currency": "USD"},
      {"id": "b", "balance": 300, "currency": "USD"}
    ],
    "instruction": "DEBIT 30 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
  }'
```

Using Postman or Thunder Client:
1. Set method to POST
2. URL: `http://localhost:8811/payment-instructions`
3. Headers: `Content-Type: application/json`
4. Body: JSON payload as shown above

## 📝 Payment Instruction Format <a name="payment-instruction-format"></a>

### DEBIT Format

```
DEBIT [amount] [currency] FROM ACCOUNT [debit_account_id] FOR CREDIT TO ACCOUNT [credit_account_id] [ON [date]]
```

**Example:**
```
DEBIT 100 USD FROM ACCOUNT account-1 FOR CREDIT TO ACCOUNT account-2
DEBIT 50 GBP FROM ACCOUNT acc-1 FOR CREDIT TO ACCOUNT acc-2 ON 2025-12-31
```

### CREDIT Format

```
CREDIT [amount] [currency] TO ACCOUNT [credit_account_id] FOR DEBIT FROM ACCOUNT [debit_account_id] [ON [date]]
```

**Example:**
```
CREDIT 100 USD TO ACCOUNT account-2 FOR DEBIT FROM ACCOUNT account-1
CREDIT 50 GBP TO ACCOUNT acc-2 FOR DEBIT FROM ACCOUNT acc-1 ON 2025-12-31
```

### Format Rules

- **Case Insensitive**: Keywords can be in any case (DEBIT, debit, Debit)
- **Whitespace**: Multiple spaces are normalized to single spaces
- **Optional Date**: The `ON [date]` clause is optional
- **Date Format**: Must be YYYY-MM-DD if provided
- **Supported Currencies**: NGN, USD, GBP, GHS

## ⚠️ Error Handling <a name="error-handling"></a>

### Validation Error Codes

| Code | Description |
|------|-------------|
| AM01 | Invalid amount (must be positive integer) |
| CU01 | Currency mismatch between accounts |
| CU02 | Unsupported currency |
| AC01 | Insufficient funds in debit account |
| AC02 | Debit and credit accounts cannot be the same |
| AC03 | Account not found |
| AC04 | Invalid account ID format |
| DT01 | Invalid date format (must be YYYY-MM-DD) |
| SY03 | Malformed instruction (parsing failed) |

### Request Validation Errors

| Error | Code |
|-------|------|
| Empty request body | INVLDREQ |
| Invalid request format | INVLDREQ |
| Missing accounts array | VALIDATIONERR |
| Empty accounts array | VALIDATIONERR |
| Missing instruction | VALIDATIONERR |
| Invalid instruction type | VALIDATIONERR |

### Error Response Format

```json
{
  "status": "error",
  "message": "Error message description",
  "code": "ERROR_CODE"
}
```

## 📁 Project Structure <a name="project-structure"></a>

```
payment-execution-service/
├── app.js                          # Application entry point
├── bootstrap.js                    # Server bootstrap
├── core/                          # Core utilities
│   ├── errors/                    # Error handling
│   ├── logger/                    # Logging utilities
│   ├── validator/                 # VSL validator
│   └── server/                    # Server setup
├── endpoints/                     # API endpoints
│   └── payment-instructions/
│       └── process.js             # Payment instruction endpoint
├── services/                      # Business logic
│   └── payment-processor/
│       ├── index.js               # Module exports
│       ├── process-instruction.js # Main service
│       ├── parse-instruction.js   # Instruction parser
│       ├── validate-instruction.js # Validation logic
│       └── execute-transaction.js # Transaction execution
├── messages/                      # Error messages
│   ├── index.js
│   └── payment.js
├── specs/                         # Validation specs
│   └── payment-processor/
│       ├── data/
│       │   └── process-instruction.go
│       └── endpoint/
│           └── process-instruction.endpoint.go
└── README.md                      # Project documentation
```

## 🎯 Code Quality <a name="code-quality"></a>

### Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Validation First**: Input validation happens before processing
3. **Single Exit Point**: Functions have one return statement
4. **Error Messages**: All errors use messages from message files
5. **No Regex**: String manipulation only (no regular expressions)
6. **Functional Style**: Pure functions where possible

### Code Conventions

- **File Naming**: kebab-case (e.g., `process-instruction.js`)
- **Functions**: camelCase (e.g., `processPaymentInstruction`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `SUPPORTED_CURRENCIES`)
- **Response Fields**: snake_case (e.g., `debit_account`)

## 🧪 Testing <a name="testing"></a>

### Manual Testing

Test various scenarios:

1. **Successful Transaction**:
```json
{
  "accounts": [
    {"id": "a", "balance": 1000, "currency": "USD"},
    {"id": "b", "balance": 500, "currency": "USD"}
  ],
  "instruction": "DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
}
```

2. **Pending Transaction**:
```json
{
  "accounts": [
    {"id": "a", "balance": 1000, "currency": "USD"},
    {"id": "b", "balance": 500, "currency": "USD"}
  ],
  "instruction": "DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b ON 2025-12-31"
}
```

3. **Insufficient Funds**:
```json
{
  "accounts": [
    {"id": "a", "balance": 50, "currency": "USD"},
    {"id": "b", "balance": 500, "currency": "USD"}
  ],
  "instruction": "DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
}
```

4. **Currency Mismatch**:
```json
{
  "accounts": [
    {"id": "a", "balance": 1000, "currency": "USD"},
    {"id": "b", "balance": 500, "currency": "GBP"}
  ],
  "instruction": "DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
}
```

5. **Invalid Request**:
```json
{}
```

## 🤝 Contributing <a name="contributing"></a>

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write clear commit messages
- Update documentation for new features
- Ensure all validations are in place
- Test your changes thoroughly



<p align="right">(<a href="#readme-top">back to top</a>)</p>
