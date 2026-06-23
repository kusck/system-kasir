const prisma = require('./_lib/prisma');
const { rupiah, generateInvoiceNo, cors } = require('./_lib/helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';

  try {
    // GET /api/transactions
    if (req.method === 'GET') {
      const transactions = await prisma.transaction.findMany({
        include: { items: true },
        orderBy: { id: 'desc' }
      });
      return res.json(transactions);
    }

    // POST /api/transactions?action=checkout
    if (req.method === 'POST' && action === 'checkout') {
      const { items, paymentMethod, paidAmount, referenceNo } = req.body;
      if (!items?.length) return res.status(400).json({ message: 'Keranjang masih kosong' });

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
            data: { type: 'OUT', source: 'REFUND', amount: change, description: `Kembalian ${created.invoiceNo}`, transactionId: created.id }
          });
        }

        return created;
      });

      return res.json({ success: true, transaction });
    }

    res.status(400).json({ message: 'Action tidak dikenal' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
