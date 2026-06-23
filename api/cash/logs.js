const prisma = require('../_lib/prisma');
const { cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const logs = await prisma.cashLog.findMany({ orderBy: { id: 'desc' }, take: 100 });
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
