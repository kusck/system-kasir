const prisma = require('../utils/prisma');
const { rupiah } = require('../utils/helpers');
const { generateInvoiceNo } = require('../services/invoice.service');

async function checkout(req, res) {
  const { items, paymentMethod, paidAmount, referenceNo } = req.body;
  if (!items?.length) return res.status(400).json({ message: 'Keranjang masih kosong' });

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      let total = 0;
      const checked = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: Number(item.id || item.productId) } });
        if (!product) throw new Error('Produk tidak ditemukan');
        if (product.stock < Number(item.qty)) throw new Error(`Stok ${product.name} tidak cukup. Sisa ${product.stock}`);
        const subtotal = product.sellingPrice * Number(item.qty);
        total += subtotal;
        checked.push({ product, qty: Number(item.qty), subtotal });
      }

      const paid = paymentMethod === 'CASH' ? rupiah(paidAmount) : total;
      const change = paymentMethod === 'CASH' ? paid - total : 0;
      if (paymentMethod === 'CASH' && paid < total) throw new Error('Nominal bayar kurang');
      if (paymentMethod !== 'CASH' && !referenceNo) throw new Error('Nomor referensi wajib diisi untuk non-tunai');

      const created = await tx.transaction.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          totalAmount: total,
          paymentMethod,
          paidAmount: paid,
          changeAmount: change,
          referenceNo: referenceNo || null,
          items: {
            create: checked.map(({ product, qty, subtotal }) => ({
              productId: product.id,
              productName: product.name,
              qty,
              price: product.sellingPrice,
              subtotal
            }))
          }
        },
        include: { items: true }
      });

      for (const { product, qty } of checked) {
        await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: qty } } });
      }

      await tx.cashLog.create({
        data: { type: 'IN', source: 'SALE', amount: total, description: `Penjualan ${created.invoiceNo}`, transactionId: created.id }
      });

      if (paymentMethod === 'CASH' && change > 0) {
        await tx.cashLog.create({
          data: {
            type: 'OUT',
            source: 'REFUND',
            amount: change,
            description: `Kembalian ${created.invoiceNo}`,
            transactionId: created.id
          }
        });
      }

      return created;
    });

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listTransactions(req, res) {
  const transactions = await prisma.transaction.findMany({ include: { items: true }, orderBy: { id: 'desc' } });
  res.json(transactions);
}

module.exports = {
  checkout,
  listTransactions
};
