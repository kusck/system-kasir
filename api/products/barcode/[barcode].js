const prisma = require('../../_lib/prisma');
const { cors } = require('../../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: req.query.barcode },
          { sku: req.query.barcode }
        ]
      },
      include: { category: true }
    });

    if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
