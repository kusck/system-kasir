const prisma = require('../_lib/prisma');
const { cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const logs = await prisma.cashLog.findMany();
    const sales      = logs.filter(l => l.type === 'IN'  && l.source === 'SALE').reduce((a, b) => a + b.amount, 0);
    const deposit    = logs.filter(l => l.type === 'IN'  && l.source === 'DEPOSIT').reduce((a, b) => a + b.amount, 0);
    const otherIncome= logs.filter(l => l.type === 'IN'  && l.source !== 'SALE' && l.source !== 'DEPOSIT').reduce((a, b) => a + b.amount, 0);
    const refund     = logs.filter(l => l.type === 'OUT' && l.source === 'REFUND').reduce((a, b) => a + b.amount, 0);
    const expense    = logs.filter(l => l.type === 'OUT' && l.source !== 'REFUND').reduce((a, b) => a + b.amount, 0);
    const income     = sales + deposit + otherIncome;
    const totalOut   = refund + expense;

    res.json({ sales, deposit, otherIncome, refund, expense, income, totalOut, balance: income - totalOut });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
