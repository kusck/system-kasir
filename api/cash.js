const prisma = require('./_lib/prisma');
const { rupiah, cors } = require('./_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  try {
    // GET /api/cash?action=logs
    if (req.method === 'GET' && action === 'logs') {
      const logs = await prisma.cashLog.findMany({ orderBy: { id: 'desc' }, take: 100 });
      return res.json(logs);
    }

    // GET /api/cash?action=summary
    if (req.method === 'GET' && action === 'summary') {
      const logs = await prisma.cashLog.findMany();
      const sales       = logs.filter(l => l.type === 'IN'  && l.source === 'SALE').reduce((a, b) => a + b.amount, 0);
      const deposit     = logs.filter(l => l.type === 'IN'  && l.source === 'DEPOSIT').reduce((a, b) => a + b.amount, 0);
      const otherIncome = logs.filter(l => l.type === 'IN'  && l.source !== 'SALE' && l.source !== 'DEPOSIT').reduce((a, b) => a + b.amount, 0);
      const refund      = logs.filter(l => l.type === 'OUT' && l.source === 'REFUND').reduce((a, b) => a + b.amount, 0);
      const expense     = logs.filter(l => l.type === 'OUT' && l.source !== 'REFUND').reduce((a, b) => a + b.amount, 0);
      const income      = sales + deposit + otherIncome;
      const totalOut    = refund + expense;
      return res.json({ sales, deposit, otherIncome, refund, expense, income, totalOut, balance: income - totalOut });
    }

    if (req.method === 'POST') {
      // POST /api/cash?action=in
      if (action === 'in') {
        const { amount, description, source } = req.body;
        const log = await prisma.cashLog.create({
          data: { type: 'IN', source: source || 'INCOME', amount: rupiah(amount), description }
        });
        return res.json(log);
      }

      // POST /api/cash?action=out
      if (action === 'out') {
        const { amount, description, source } = req.body;
        const log = await prisma.cashLog.create({
          data: { type: 'OUT', source: source || 'EXPENSE', amount: rupiah(amount), description }
        });
        return res.json(log);
      }

      // POST /api/cash?action=refund
      if (action === 'refund') {
        const { amount, description, transactionId } = req.body;
        if (!amount) return res.status(400).json({ message: 'Nominal kembalian wajib diisi' });
        const log = await prisma.cashLog.create({
          data: {
            type: 'OUT', source: 'REFUND', amount: rupiah(amount),
            description: description || 'Kembalian/Retur Penjualan',
            transactionId: transactionId ? Number(transactionId) : null
          }
        });
        return res.json(log);
      }

      // POST /api/cash?action=deposit
      if (action === 'deposit') {
        const { amount, description, paymentMethod } = req.body;
        if (!amount) return res.status(400).json({ message: 'Nominal setoran wajib diisi' });
        const log = await prisma.cashLog.create({
          data: {
            type: 'IN', source: 'DEPOSIT', amount: rupiah(amount),
            description: description || `Setoran ${paymentMethod || 'Dana'}`
          }
        });
        return res.json(log);
      }

      // POST /api/cash?action=reset
      if (action === 'reset') {
        await prisma.cashLog.deleteMany();
        return res.json({ success: true, message: 'Semua catatan buku kas telah di-reset.' });
      }
    }

    res.status(400).json({ message: 'Action tidak dikenal' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
