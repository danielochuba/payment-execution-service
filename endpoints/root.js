const { createHandler } = require('@app-core/server');

module.exports = createHandler({
  path: '/',
  method: 'get',
  middlewares: [],
  async handler() {
    return {
      author: 'Daniel Ochuba Ugochukwu',
      status: 200,
      message: 'Welcome to the Payment Execution Service! 🎉',
      data: {
        message: 'Welcome to the Payment Execution Service! 🎉',
        version: '1.0.0',
        description:
          'API for processing payment instructions, built with Node.js and Express. This service parses natural language payment instructions, validates them against business rules, and executes transactions on provided accounts. 🚀',
        endpoints: {
          health_check: '/health',
          documentation: '/docs',
          payment_instructions: '/payment-instructions',
        },
      },
    };
  },
});
