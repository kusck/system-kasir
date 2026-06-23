const prisma = require('./_lib/prisma');
const { cors } = require('./_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
