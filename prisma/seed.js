const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Category untuk rumah makan sunda
  const kategoriMakanan = await prisma.category.upsert({
    where: { name: 'Makanan' },
    update: {},
    create: { name: 'Makanan' }
  });

  const kategoriMinuman = await prisma.category.upsert({
    where: { name: 'Minuman' },
    update: {},
    create: { name: 'Minuman' }
  });


  const products = [
    // ===================== MAKANAN SUNDA =====================
    // Paket/Kombo
    { name: 'Paket Nasi Timbel + Ayam Goreng', sku: 'PK-NT-AG', barcode: '899000100001', categoryId: kategoriMakanan.id, costPrice: 18000, sellingPrice: 35000, stock: 25, minStock: 5 },
    { name: 'Paket Nasi Timbel + Ikan Asin', sku: 'PK-NT-IA', barcode: '899000100002', categoryId: kategoriMakanan.id, costPrice: 17500, sellingPrice: 33000, stock: 18, minStock: 5 },
    { name: 'Paket Nasi Liwet Spesial', sku: 'PK-NL-SP', barcode: '899000100003', categoryId: kategoriMakanan.id, costPrice: 16000, sellingPrice: 31000, stock: 20, minStock: 5 },

    // Nasi
    { name: 'Nasi Timbel Ayam', sku: 'NT-AY', barcode: '899000100101', categoryId: kategoriMakanan.id, costPrice: 12000, sellingPrice: 24000, stock: 30, minStock: 6 },
    { name: 'Nasi Timbel Ikan Asin', sku: 'NT-IA', barcode: '899000100102', categoryId: kategoriMakanan.id, costPrice: 11500, sellingPrice: 23000, stock: 22, minStock: 6 },
    { name: 'Nasi Liwet Biasa', sku: 'NL-BS', barcode: '899000100103', categoryId: kategoriMakanan.id, costPrice: 9000, sellingPrice: 18000, stock: 28, minStock: 6 },

    // Lauk
    { name: 'Ayam Goreng Kremes', sku: 'AG-KR', barcode: '899000100201', categoryId: kategoriMakanan.id, costPrice: 11000, sellingPrice: 22000, stock: 24, minStock: 5 },
    { name: 'Tumis Jamur Tahu', sku: 'TJ-JT', barcode: '899000100202', categoryId: kategoriMakanan.id, costPrice: 7500, sellingPrice: 15000, stock: 20, minStock: 5 },
    { name: 'Gepuk Daging', sku: 'GD-DS', barcode: '899000100203', categoryId: kategoriMakanan.id, costPrice: 12500, sellingPrice: 26000, stock: 15, minStock: 4 },

    // Sayur & Pelengkap
    { name: 'Sambal Terasi (Extra)', sku: 'PL-STX', barcode: '899000100301', categoryId: kategoriMakanan.id, costPrice: 2500, sellingPrice: 6000, stock: 60, minStock: 10 },
    { name: 'Pecel/ Lalap Sunda', sku: 'PL-LL', barcode: '899000100302', categoryId: kategoriMakanan.id, costPrice: 3500, sellingPrice: 8000, stock: 40, minStock: 8 },
    { name: 'Tumis Kangkung Terasi', sku: 'TK-KT', barcode: '899000100303', categoryId: kategoriMakanan.id, costPrice: 5000, sellingPrice: 11000, stock: 26, minStock: 6 },

    // Kerupuk & lainnya
    { name: 'Kerupuk Udang', sku: 'KR-UD', barcode: '899000100401', categoryId: kategoriMakanan.id, costPrice: 1800, sellingPrice: 5000, stock: 80, minStock: 15 },
    { name: 'Kerupuk Rambak', sku: 'KR-RB', barcode: '899000100402', categoryId: kategoriMakanan.id, costPrice: 1600, sellingPrice: 4500, stock: 70, minStock: 15 },

    // Soto & Sup
    { name: 'Soto Ayam Sunda', sku: 'ST-AY', barcode: '899000100501', categoryId: kategoriMakanan.id, costPrice: 9500, sellingPrice: 19000, stock: 20, minStock: 5 },
    { name: 'Soto Sunda Asli', sku: 'ST-AS', barcode: '899000100502', categoryId: kategoriMakanan.id, costPrice: 8500, sellingPrice: 17000, stock: 18, minStock: 5 },

    // Tahu & Kedelai
    { name: 'Tahu Goreng Kuah', sku: 'TH-GK', barcode: '899000100601', categoryId: kategoriMakanan.id, costPrice: 5000, sellingPrice: 12000, stock: 35, minStock: 8 },
    { name: 'Tahu Isi Sunda', sku: 'TH-IS', barcode: '899000100602', categoryId: kategoriMakanan.id, costPrice: 6000, sellingPrice: 13000, stock: 28, minStock: 6 },

    // Penggangan & Gorengan
    { name: 'Perkedel Kentang', sku: 'GR-PK', barcode: '899000100701', categoryId: kategoriMakanan.id, costPrice: 4000, sellingPrice: 10000, stock: 40, minStock: 10 },
    { name: 'Lumpia Sunda', sku: 'GR-LS', barcode: '899000100702', categoryId: kategoriMakanan.id, costPrice: 5500, sellingPrice: 12000, stock: 30, minStock: 8 },
    { name: 'Onde-onde', sku: 'GR-OD', barcode: '899000100703', categoryId: kategoriMakanan.id, costPrice: 2500, sellingPrice: 6000, stock: 50, minStock: 10 },

    // Ulat & Daging Olahan
    { name: 'Semur Daging Sunda', sku: 'DG-SM', barcode: '899000100801', categoryId: kategoriMakanan.id, costPrice: 14000, sellingPrice: 28000, stock: 12, minStock: 4 },
    { name: 'Sate Sunda Ayam', sku: 'DG-ST', barcode: '899000100802', categoryId: kategoriMakanan.id, costPrice: 13000, sellingPrice: 26000, stock: 16, minStock: 5 },

    // Sayur Istimewa
    { name: 'Karedok (Sayur Mentah)', sku: 'SY-KD', barcode: '899000100901', categoryId: kategoriMakanan.id, costPrice: 4500, sellingPrice: 10000, stock: 32, minStock: 8 },
    { name: 'Gado-gado Sunda', sku: 'SY-GD', barcode: '899000100902', categoryId: kategoriMakanan.id, costPrice: 6500, sellingPrice: 14000, stock: 26, minStock: 6 },

    // ===================== MINUMAN SUNDA =====================
    { name: 'Es Teh Manis', sku: 'MN-ETM', barcode: '899000200001', categoryId: kategoriMinuman.id, costPrice: 3000, sellingPrice: 6000, stock: 60, minStock: 15 },
    { name: 'Es Jeruk', sku: 'MN-EJ', barcode: '899000200002', categoryId: kategoriMinuman.id, costPrice: 3500, sellingPrice: 7000, stock: 55, minStock: 15 },
    { name: 'Es Degan', sku: 'MN-ED', barcode: '899000200003', categoryId: kategoriMinuman.id, costPrice: 9000, sellingPrice: 16000, stock: 20, minStock: 6 },
    { name: 'Bandrek Hangat', sku: 'MN-BH', barcode: '899000200004', categoryId: kategoriMinuman.id, costPrice: 7000, sellingPrice: 14000, stock: 25, minStock: 6 }
  ];

  for (const p of products) {
    // upsert berdasarkan SKU (unik)
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

