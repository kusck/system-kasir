const prisma = require('../utils/prisma');
const { rupiah } = require('../utils/helpers');

async function createCashIn(req, res) {
  const { amount, description, source } = req.body;
  const log = await prisma.cashLog.create({
    data: {
      type: 'IN',
      source: source || 'INCOME',
      amount: rupiah(amount),
      description
    }
  });
  res.json(log);
}

async function createCashOut(req, res) {
  const { amount, description, source } = req.body;
  const log = await prisma.cashLog.create({
    data: { type: 'OUT', source: source || 'EXPENSE', amount: rupiah(amount), description }
  });
  res.json(log);
}

async function refundCash(req, res) {
  const { amount, description, transactionId } = req.body;
  if (!amount) return res.status(400).json({ message: 'Nominal kembalian wajib diisi' });

  const log = await prisma.cashLog.create({
    data: {
      type: 'OUT',
      source: 'REFUND',
      amount: rupiah(amount),
      description: description || 'Kembalian/Retur Penjualan',
      transactionId: transactionId ? Number(transactionId) : null
    }
  });
  res.json(log);
}

async function depositCash(req, res) {
  const { amount, description, paymentMethod } = req.body;
  if (!amount) return res.status(400).json({ message: 'Nominal setoran wajib diisi' });

  const log = await prisma.cashLog.create({
    data: {
      type: 'IN',
      source: 'DEPOSIT',
      amount: rupiah(amount),
      description: description || `Setoran ${paymentMethod || 'Dana'}`
    }
  });
  res.json(log);
}

async function listCashLogs(req, res) {
  const logs = await prisma.cashLog.findMany({ orderBy: { id: 'desc' }, take: 100 });
  res.json(logs);
}

async function cashSummary(req, res) {
  const logs = await prisma.cashLog.findMany();
  const sales = logs.filter(l => l.type === 'IN' && l.source === 'SALE').reduce((a, b) => a + b.amount, 0);
  const deposit = logs.filter(l => l.type === 'IN' && l.source === 'DEPOSIT').reduce((a, b) => a + b.amount, 0);
  const otherIncome = logs.filter(l => l.type === 'IN' && l.source !== 'SALE' && l.source !== 'DEPOSIT').reduce((a, b) => a + b.amount, 0);
  const refund = logs.filter(l => l.type === 'OUT' && l.source === 'REFUND').reduce((a, b) => a + b.amount, 0);
  const expense = logs.filter(l => l.type === 'OUT' && l.source !== 'REFUND').reduce((a, b) => a + b.amount, 0);
  const income = sales + deposit + otherIncome;
  const totalOut = refund + expense;

  res.json({
    sales,
    deposit,
    otherIncome,
    refund,
    expense,
    income,
    totalOut,
    balance: income - totalOut
  });
}

async function resetCashLogs(req, res) {
  await prisma.cashLog.deleteMany();
  res.json({ success: true, message: 'Semua catatan buku kas telah di-reset.' });
}

module.exports = {
  createCashIn,
  createCashOut,
  refundCash,
  depositCash,
  listCashLogs,
  cashSummary,
  resetCashLogs
};
