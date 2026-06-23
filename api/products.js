const prisma = require('./_lib/prisma');
const { rupiah, cors } = require('./_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/products?q=...
    if (req.method === 'GET') {
      const q = req.query.q || '';
      const products = await prisma.product.findMany({
        where: q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q } }
          ]
        } : {},
        include: { category: true },
        orderBy: { id: 'desc' }
      });
      return res.json(products);
    }

    // POST /api/products
    if (req.method === 'POST') {
      const data = req.body;
      const product = await prisma.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          barcode: data.barcode || null,
          categoryId: data.categoryId ? Number(data.categoryId) : null,
          costPrice: rupiah(data.costPrice),
          sellingPrice: rupiah(data.sellingPrice),
          stock: Number(data.stock || 0),
          minStock: Number(data.minStock || 5)
        }
      });
      return res.json(product);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
