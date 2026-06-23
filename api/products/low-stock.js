const prisma = require('../_lib/prisma');
const { cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    res.json(products.filter(p => p.stock < p.minStock));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
