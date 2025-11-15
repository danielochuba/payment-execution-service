const { createHandler } = require('@app-core/server');
const { processPaymentInstruction } = require('@app/services/payment-processor');

module.exports = createHandler({
  path: '/payment-instructions',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = rc.body;

    const response = await processPaymentInstruction(payload);
    const httpStatus =
      response.status === 'successful' || response.status === 'pending'
        ? helpers.http_statuses.HTTP_200_OK
        : helpers.http_statuses.HTTP_400_BAD_REQUEST;

    return {
      status: httpStatus,
      message: response.status_reason,
      data: response,
    };
  },
});
