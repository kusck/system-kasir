const prisma = require('../utils/prisma');
const { rupiah } = require('../utils/helpers');

async function listProducts(req, res) {
  const q = req.query.q || '';
  const products = await prisma.product.findMany({
    where: q ? { OR: [
      { name: { contains: q } },
      { sku: { contains: q } },
      { barcode: { contains: q } }
    ] } : {},
    include: { category: true },
    orderBy: { id: 'desc' }
  });
  res.json(products);
}

async function getProductByBarcode(req, res) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ barcode: req.params.barcode }, { sku: req.params.barcode }] },
    include: { category: true }
  });
  if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(product);
}

async function createProduct(req, res) {
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
  res.json(product);
}

async function updateProduct(req, res) {
  const data = req.body;
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
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
  res.json(product);
}

async function deleteProduct(req, res) {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
}

async function listLowStockProducts(req, res) {
  const products = await prisma.product.findMany({ include: { category: true } });
  res.json(products.filter(p => p.stock < p.minStock));
}

module.exports = {
  listProducts,
  listLowStockProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct
};
