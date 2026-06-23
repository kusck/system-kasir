const prisma = require('./_lib/prisma');
const { cors } = require('./_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const branchId = Number(req.query.branchId);
  if (!branchId) return res.status(400).json({ message: 'branchId wajib diisi' });

  try {
    if (req.method === 'GET') {
      const categories = await prisma.category.findMany({
        where: { branchId },
        orderBy: { name: 'asc' }
      });
      return res.json(categories);
    }

    if (req.method === 'POST') {
      const { name } = req.body;
      const category = await prisma.category.create({
        data: { name, branchId }
      });
      return res.json(category);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
