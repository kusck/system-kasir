-- =============================================
-- MIGRATION: Add Branch, User, branchId columns
-- =============================================

-- 1. Hapus data lama (mulai fresh dengan struktur baru)
DROP TABLE IF EXISTS "CashLog" CASCADE;
DROP TABLE IF EXISTS "TransactionItem" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;

-- 2. Tabel Branch
CREATE TABLE IF NOT EXISTS "Branch" (
  "id"   SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE
);

-- 3. Tabel User
CREATE TABLE IF NOT EXISTS "User" (
  "id"        SERIAL PRIMARY KEY,
  "username"  TEXT NOT NULL UNIQUE,
  "password"  TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "branchId"  INTEGER REFERENCES "Branch"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Category (per cabang)
CREATE TABLE IF NOT EXISTS "Category" (
  "id"       SERIAL PRIMARY KEY,
  "name"     TEXT NOT NULL,
  "branchId" INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
  UNIQUE ("name", "branchId")
);

-- 5. Tabel Product (per cabang)
CREATE TABLE IF NOT EXISTS "Product" (
  "id"           SERIAL PRIMARY KEY,
  "name"         TEXT NOT NULL,
  "sku"          TEXT NOT NULL,
  "barcode"      TEXT,
  "categoryId"   INTEGER REFERENCES "Category"("id") ON DELETE SET NULL,
  "branchId"     INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
  "costPrice"    DOUBLE PRECISION NOT NULL,
  "sellingPrice" DOUBLE PRECISION NOT NULL,
  "stock"        INTEGER NOT NULL DEFAULT 0,
  "minStock"     INTEGER NOT NULL DEFAULT 5,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sku", "branchId"),
  UNIQUE ("barcode", "branchId")
);

-- 6. Tabel Transaction (per cabang)
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id"            SERIAL PRIMARY KEY,
  "invoiceNo"     TEXT NOT NULL UNIQUE,
  "totalAmount"   DOUBLE PRECISION NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paidAmount"    DOUBLE PRECISION,
  "changeAmount"  DOUBLE PRECISION,
  "referenceNo"   TEXT,
  "branchId"      INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel TransactionItem
CREATE TABLE IF NOT EXISTS "TransactionItem" (
  "id"            SERIAL PRIMARY KEY,
  "transactionId" INTEGER NOT NULL REFERENCES "Transaction"("id") ON DELETE CASCADE,
  "productId"     INTEGER NOT NULL REFERENCES "Product"("id"),
  "productName"   TEXT NOT NULL,
  "qty"           INTEGER NOT NULL,
  "price"         DOUBLE PRECISION NOT NULL,
  "subtotal"      DOUBLE PRECISION NOT NULL
);

-- 8. Tabel CashLog (per cabang)
CREATE TABLE IF NOT EXISTS "CashLog" (
  "id"            SERIAL PRIMARY KEY,
  "type"          TEXT NOT NULL,
  "source"        TEXT NOT NULL,
  "amount"        DOUBLE PRECISION NOT NULL,
  "description"   TEXT,
  "transactionId" INTEGER REFERENCES "Transaction"("id"),
  "branchId"      INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_updated_at ON "Product";
CREATE TRIGGER product_updated_at
BEFORE UPDATE ON "Product"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED: 4 Cabang
-- =============================================
INSERT INTO "Branch" ("name") VALUES
  ('RM Pasundan 1'),
  ('RM Pasundan 2'),
  ('RM Pasundan 3'),
  ('RM Pasundan 4')
ON CONFLICT ("name") DO NOTHING;

-- =============================================
-- SEED: Users
-- =============================================
INSERT INTO "User" ("username","password","role","branchId") VALUES
  ('kasir1', 'kasir123', 'kasir', (SELECT id FROM "Branch" WHERE name='RM Pasundan 1')),
  ('kasir2', 'kasir123', 'kasir', (SELECT id FROM "Branch" WHERE name='RM Pasundan 2')),
  ('kasir3', 'kasir123', 'kasir', (SELECT id FROM "Branch" WHERE name='RM Pasundan 3')),
  ('kasir4', 'kasir123', 'kasir', (SELECT id FROM "Branch" WHERE name='RM Pasundan 4')),
  ('owner',  'yuningsih1973', 'owner', NULL)
ON CONFLICT ("username") DO NOTHING;

-- =============================================
-- SEED: Kategori per cabang
-- =============================================
INSERT INTO "Category" ("name","branchId")
SELECT 'Makanan', id FROM "Branch"
ON CONFLICT ("name","branchId") DO NOTHING;

INSERT INTO "Category" ("name","branchId")
SELECT 'Minuman', id FROM "Branch"
ON CONFLICT ("name","branchId") DO NOTHING;

-- =============================================
-- SEED: Produk untuk semua cabang
-- =============================================
DO $$
DECLARE b RECORD;
BEGIN
  FOR b IN SELECT id FROM "Branch" LOOP
    INSERT INTO "Product" ("name","sku","barcode","categoryId","branchId","costPrice","sellingPrice","stock","minStock","createdAt","updatedAt") VALUES
      ('Paket Nasi Timbel + Ayam Goreng','PK-NT-AG','899000100001',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,18000,35000,25,5,NOW(),NOW()),
      ('Paket Nasi Timbel + Ikan Asin','PK-NT-IA','899000100002',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,17500,33000,18,5,NOW(),NOW()),
      ('Paket Nasi Liwet Spesial','PK-NL-SP','899000100003',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,16000,31000,20,5,NOW(),NOW()),
      ('Nasi Timbel Ayam','NT-AY','899000100101',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,12000,24000,30,6,NOW(),NOW()),
      ('Nasi Timbel Ikan Asin','NT-IA','899000100102',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,11500,23000,22,6,NOW(),NOW()),
      ('Nasi Liwet Biasa','NL-BS','899000100103',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,9000,18000,28,6,NOW(),NOW()),
      ('Ayam Goreng Kremes','AG-KR','899000100201',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,11000,22000,24,5,NOW(),NOW()),
      ('Tumis Jamur Tahu','TJ-JT','899000100202',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,7500,15000,20,5,NOW(),NOW()),
      ('Gepuk Daging','GD-DS','899000100203',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,12500,26000,15,4,NOW(),NOW()),
      ('Sambal Terasi (Extra)','PL-STX','899000100301',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,2500,6000,60,10,NOW(),NOW()),
      ('Pecel/ Lalap Sunda','PL-LL','899000100302',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,3500,8000,40,8,NOW(),NOW()),
      ('Tumis Kangkung Terasi','TK-KT','899000100303',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,5000,11000,26,6,NOW(),NOW()),
      ('Kerupuk Udang','KR-UD','899000100401',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,1800,5000,80,15,NOW(),NOW()),
      ('Kerupuk Rambak','KR-RB','899000100402',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,1600,4500,70,15,NOW(),NOW()),
      ('Soto Ayam Sunda','ST-AY','899000100501',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,9500,19000,20,5,NOW(),NOW()),
      ('Soto Sunda Asli','ST-AS','899000100502',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,8500,17000,18,5,NOW(),NOW()),
      ('Tahu Goreng Kuah','TH-GK','899000100601',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,5000,12000,35,8,NOW(),NOW()),
      ('Tahu Isi Sunda','TH-IS','899000100602',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,6000,13000,28,6,NOW(),NOW()),
      ('Perkedel Kentang','GR-PK','899000100701',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,4000,10000,40,10,NOW(),NOW()),
      ('Lumpia Sunda','GR-LS','899000100702',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,5500,12000,30,8,NOW(),NOW()),
      ('Onde-onde','GR-OD','899000100703',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,2500,6000,50,10,NOW(),NOW()),
      ('Semur Daging Sunda','DG-SM','899000100801',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,14000,28000,12,4,NOW(),NOW()),
      ('Sate Sunda Ayam','DG-ST','899000100802',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,13000,26000,16,5,NOW(),NOW()),
      ('Karedok (Sayur Mentah)','SY-KD','899000100901',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,4500,10000,32,8,NOW(),NOW()),
      ('Gado-gado Sunda','SY-GD','899000100902',(SELECT id FROM "Category" WHERE name='Makanan' AND "branchId"=b.id),b.id,6500,14000,26,6,NOW(),NOW()),
      ('Es Teh Manis','MN-ETM','899000200001',(SELECT id FROM "Category" WHERE name='Minuman' AND "branchId"=b.id),b.id,3000,6000,60,15,NOW(),NOW()),
      ('Es Jeruk','MN-EJ','899000200002',(SELECT id FROM "Category" WHERE name='Minuman' AND "branchId"=b.id),b.id,3500,7000,55,15,NOW(),NOW()),
      ('Es Degan','MN-ED','899000200003',(SELECT id FROM "Category" WHERE name='Minuman' AND "branchId"=b.id),b.id,9000,16000,20,6,NOW(),NOW()),
      ('Bandrek Hangat','MN-BH','899000200004',(SELECT id FROM "Category" WHERE name='Minuman' AND "branchId"=b.id),b.id,7000,14000,25,6,NOW(),NOW())
    ON CONFLICT ("sku","branchId") DO NOTHING;
  END LOOP;
END $$;
