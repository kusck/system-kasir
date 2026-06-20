# POS Siap Pakai

Aplikasi kasir / Point of Sale full-stack siap jalan.

## Isi fitur

- Kasir / checkout
- Scan barcode otomatis dengan input auto-focus
- Live search produk
- Inventory CRUD
- Pengurangan stok otomatis setelah transaksi sukses
- Low stock alert
- Pembayaran tunai, QRIS, transfer, debit/kredit
- Nomor referensi pembayaran non-tunai
- Buku kas uang masuk otomatis dari penjualan
- Buku kas uang keluar manual
- Dashboard uang masuk, uang keluar, saldo bersih
- Cetak struk thermal 58mm menggunakan CSS @media print
- Responsive untuk HP, tablet, dan PC

## Cara menjalankan

Pastikan sudah install Node.js.

```bash
npm run setup
npm run dev
```

Buka:

```txt
http://localhost:5173
```

Backend API berjalan di:

```txt
http://localhost:4000
```

## Database

Project ini memakai SQLite agar langsung bisa dipakai tanpa install PostgreSQL.
File database otomatis dibuat di:

```txt
prisma/pos.db
```

## Contoh barcode untuk tes

```txt
899000000001 = Kopi Susu
899000000002 = Air Mineral
899000000003 = Roti Coklat
899000000004 = Mie Instan
```

Klik halaman Kasir, scan barcode atau ketik barcode lalu tekan Enter.

## Build production

```bash
npm run build
npm start
```

Lalu buka:

```txt
http://localhost:4000
```
