const prisma = require('../_lib/prisma');
const { rupiah, cors } = require('../_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = Number(req.query.id);
  const branchId = Number(req.query.branchId);

  try {
    if (req.method === 'PUT') {
      const data = req.body;
      const product = await prisma.product.update({
        where: { id },
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

    if (req.method === 'DELETE') {
      await prisma.product.delete({ where: { id } });
      return res.json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
