const rupiah = (value) => Number(value || 0);

const generateInvoiceNo = () => {
  const crypto = require('crypto');
  const timestamp = Date.now().toString().slice(-6);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${timestamp}${random}`;
};

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = { rupiah, generateInvoiceNo, cors };
