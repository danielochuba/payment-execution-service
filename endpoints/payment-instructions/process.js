const { createHandler } = require('@app-core/server');
const processPaymentInstruction = require('@app/services/payment-processor/process-instruction');

module.exports = createHandler({
  path: '/payment-instructions',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = rc.body;

    const response = await processPaymentInstruction(payload);

    // Determine HTTP status code based on response status
    const httpStatus =
      response.status === 'successful' || response.status === 'pending'
        ? helpers.http_statuses.HTTP_200_OK
        : helpers.http_statuses.HTTP_400_BAD_REQUEST;

    return {
      status: httpStatus,
      data: response,
    };
  },
});

