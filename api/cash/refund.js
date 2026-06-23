const prisma = require('../_lib/prisma');
const { rupiah, cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { amount, description, transactionId } = req.body;
    if (!amount) return res.status(400).json({ message: 'Nominal kembalian wajib diisi' });

    const log = await prisma.cashLog.create({
      data: {
        type: 'OUT', source: 'REFUND', amount: rupiah(amount),
        description: description || 'Kembalian/Retur Penjualan',
        transactionId: transactionId ? Number(transactionId) : null
      }
    });
    res.json(log);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
