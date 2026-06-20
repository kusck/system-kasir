const crypto = require('crypto');

const generateInvoiceNo = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${timestamp}${random}`;
};

module.exports = {
  generateInvoiceNo
};
