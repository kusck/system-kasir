const prisma = require('../_lib/prisma');
const { rupiah, cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { amount, description, source } = req.body;
    const log = await prisma.cashLog.create({
      data: { type: 'IN', source: source || 'INCOME', amount: rupiah(amount), description }
    });
    res.json(log);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
