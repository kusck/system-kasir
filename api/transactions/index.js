const prisma = require('../_lib/prisma');
const { cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const transactions = await prisma.transaction.findMany({
      include: { items: true },
      orderBy: { id: 'desc' }
    });
    res.json(transactions);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
