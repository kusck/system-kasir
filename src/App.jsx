import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Package, ShoppingCart, Wallet, BarChart3, Printer, Trash2 } from 'lucide-react';
import './style.css';

const initialCategories = [
  { id: 'sayur', name: 'Sayuran' },
  { id: 'minuman', name: 'Minuman' },
  { id: 'sunda', name: 'Makanan Sunda' }
];

const initialProducts = [
  { id: 1, name: 'Kangkung Segar', sku: 'SYR001', barcode: '8901000000010', categoryId: 'sayur', costPrice: 3000, sellingPrice: 4500, stock: 24, minStock: 8 },
  { id: 2, name: 'Bayam Organik', sku: 'SYR002', barcode: '8901000000027', categoryId: 'sayur', costPrice: 4000, sellingPrice: 6000, stock: 18, minStock: 7 },
  { id: 3, name: 'Wortel Segar', sku: 'SYR003', barcode: '8901000000034', categoryId: 'sayur', costPrice: 5000, sellingPrice: 7500, stock: 12, minStock: 6 },
  { id: 4, name: 'Teh Tawar Panas', sku: 'DRK001', barcode: '8901000000041', categoryId: 'minuman', costPrice: 2000, sellingPrice: 4000, stock: 38, minStock: 12 },
  { id: 5, name: 'Es Jeruk Segar', sku: 'DRK002', barcode: '8901000000058', categoryId: 'minuman', costPrice: 5000, sellingPrice: 9000, stock: 22, minStock: 10 },
  { id: 6, name: 'Kopi Tubruk', sku: 'DRK003', barcode: '8901000000065', categoryId: 'minuman', costPrice: 6000, sellingPrice: 12000, stock: 14, minStock: 6 },
  { id: 7, name: 'Tahu Gejrot', sku: 'SND001', barcode: '8901000000072', categoryId: 'sunda', costPrice: 8000, sellingPrice: 15000, stock: 16, minStock: 5 },
  { id: 8, name: 'Lotek Bandung', sku: 'SND002', barcode: '8901000000089', categoryId: 'sunda', costPrice: 12000, sellingPrice: 22000, stock: 10, minStock: 4 },
  { id: 9, name: 'Tempe Mendoan', sku: 'SND003', barcode: '8901000000096', categoryId: 'sunda', costPrice: 9000, sellingPrice: 18000, stock: 20, minStock: 8 }
];

const API = import.meta.env.VITE_API_BASE_URL || '/api';
const money = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));

function App() {
  const [page, setPage] = useState('pos');
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [cashLogs, setCashLogs] = useState([]);
  const [toast, setToast] = useState('');
  const [printReady, setPrintReady] = useState(false);
  const barcodeRef = useRef(null);

  async function loadAll() {
    try {
      const [p, c, s, l] = await Promise.all([
        fetch(`${API}/products`).then(r => r.json()),
        fetch(`${API}/categories`).then(r => r.json()),
        fetch(`${API}/cash/summary`).then(r => r.json()),
        fetch(`${API}/cash/logs`).then(r => r.json())
      ]);
      setProducts(p);
      setCategories(c);
      setSummary(s);
      setCashLogs(l);
    } catch (err) {
      console.warn('API load failed, using sample inventory', err);
      setProducts(initialProducts);
      setCategories(initialCategories);
      setSummary({ income: 0, expense: 0, balance: 0 });
      setCashLogs([]);
    }
  }

  async function resetCashLogs() {
    if (!confirm('Yakin ingin reset semua catatan buku kas?')) return;
    const res = await fetch(`${API}/cash/reset`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return alert(data?.message || 'Gagal reset catatan kas');

    setCashLogs([]);
    setSummary({ income: 0, expense: 0, balance: 0, sales: 0, deposit: 0, otherIncome: 0, refund: 0, totalOut: 0 });

    await loadAll();
    setToast('Catatan buku kas berhasil di-reset.');
    setTimeout(() => setToast(''), 5000);
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (page === 'pos') setTimeout(() => barcodeRef.current?.focus(), 100); }, [page]);
  useEffect(() => {
    if (page === 'cash' || page === 'dashboard') {
      loadAll();
    }
  }, [page]);

  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode || '').includes(q));
  }, [products, query]);

  const total = cart.reduce((a, b) => a + b.sellingPrice * b.qty, 0);
  const change = paymentMethod === 'CASH' ? Number(paidAmount || 0) - total : 0;

  function addToCart(product) {
    if (product.stock <= 0) return alert('Stok habis');
    setCart(prev => {
      const found = prev.find(i => i.id === product.id);
      if (found) return prev.map(i => i.id === product.id ? { ...i, qty: Math.min(i.qty + 1, product.stock) } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function updateQty(id, qty) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, Math.min(Number(qty), i.stock)) } : i));
  }

  async function handleBarcode(e) {
    if (e.key !== 'Enter') return;
    const code = e.target.value.trim();
    if (!code) return;
    try {
      const res = await fetch(`${API}/products/barcode/${code}`);
      if (!res.ok) throw new Error('Produk tidak ditemukan');
      const product = await res.json();
      addToCart(product);
    } catch (err) { alert(err.message); }
    e.target.value = '';
  }

  async function checkout() {
    const payload = {
      items: cart.map(i => ({ id: i.id, qty: i.qty })), paymentMethod, paidAmount: Number(paidAmount || 0), referenceNo
    };
    const res = await fetch(`${API}/transactions/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!data.success) return alert(data.message);
    setReceipt(data.transaction);
    setToast(`Transaksi ${data.transaction.invoiceNo} berhasil disimpan.`);
    setCart([]); setPaidAmount(''); setReferenceNo('');
    setPrintReady(true);
    await loadAll();
    setTimeout(() => setToast(''), 5000);
  }

  function printReceipt() {
    if (!receipt) return;
    window.print();
    setPrintReady(false);
    setReceipt(null);
  }

  return <div className="app">
    {toast && <div className="toast-banner no-print">{toast}</div>}
    <aside className="sidebar no-print">
      <h1>RUMAH MAKAN PASUNDAN</h1>
      <button onClick={() => setPage('pos')} className={page === 'pos' ? 'active' : ''}><ShoppingCart size={20}/> Kasir</button>
      <button onClick={() => setPage('inventory')} className={page === 'inventory' ? 'active' : ''}><Package size={20}/> Inventory</button>
      <button onClick={() => setPage('cash')} className={page === 'cash' ? 'active' : ''}><Wallet size={20}/> Buku Kas</button>
      <button onClick={() => setPage('dashboard')} className={page === 'dashboard' ? 'active' : ''}><BarChart3 size={20}/> Dashboard</button>
    </aside>

    <nav className="mobile-nav no-print">
      <button onClick={() => setPage('pos')} className={page === 'pos' ? 'active' : ''}><ShoppingCart size={18}/> Kasir</button>
      <button onClick={() => setPage('inventory')} className={page === 'inventory' ? 'active' : ''}><Package size={18}/> Inventory</button>
      <button onClick={() => setPage('cash')} className={page === 'cash' ? 'active' : ''}><Wallet size={18}/> Buku Kas</button>
      <button onClick={() => setPage('dashboard')} className={page === 'dashboard' ? 'active' : ''}><BarChart3 size={18}/> Dashboard</button>
    </nav>

    <main className="main no-print">
      {page === 'pos' && <POSPage {...{ products: filteredProducts, categories, query, setQuery, cart, addToCart, updateQty, setCart, barcodeRef, handleBarcode, total, paymentMethod, setPaymentMethod, paidAmount, setPaidAmount, referenceNo, setReferenceNo, change, checkout, printReady, printReceipt }} />}
      {page === 'inventory' && <Inventory products={products} categories={categories} loadAll={loadAll} />}
      {page === 'cash' && <CashPage cashLogs={cashLogs} loadAll={loadAll} resetCashLogs={resetCashLogs} />}
      {page === 'dashboard' && <Dashboard summary={summary} products={products} cashLogs={cashLogs} resetCashLogs={resetCashLogs} />}
    </main>

    {receipt && printReady && <Receipt receipt={receipt} visible />}
  </div>;
}

function POSPage(props) {
  const { products, categories, query, setQuery, cart, addToCart, updateQty, setCart, barcodeRef, handleBarcode, total, paymentMethod, setPaymentMethod, paidAmount, setPaidAmount, referenceNo, setReferenceNo, change, checkout, printReady, printReceipt } = props;
  return <div>
    <div className="topbar"><h2>Transaksi Kasir</h2><span>Scanner barcode aktif otomatis</span></div>
    <input ref={barcodeRef} onKeyDown={handleBarcode} className="barcode-input" placeholder="Scan barcode/SKU lalu Enter..." />
    <div className="pos-grid">
      <section className="panel">
        <input value={query} onChange={e => setQuery(e.target.value)} className="search" placeholder="Cari nama produk..." />
        <div className="product-grid">
          {products.map(p => <button key={p.id} className="product-card" onClick={() => addToCart(p)}>
            <strong>{p.name}</strong>
            <span className="badge">{categories.find(c => c.id === p.categoryId)?.name || 'Umum'}</span>
            <small>{p.sku} • Stok {p.stock}</small>
            <b>{money(p.sellingPrice)}</b>
            {p.stock < p.minStock && <em>Low Stock</em>}
          </button>)}
        </div>
      </section>
      <section className="panel cart-panel">
        <h3>Keranjang</h3>
        {cart.map(i => <div key={i.id} className="cart-item"><div><strong>{i.name}</strong><small>{money(i.sellingPrice)}</small></div><input type="number" value={i.qty} onChange={e => updateQty(i.id, e.target.value)} /><button onClick={() => setCart(cart.filter(x => x.id !== i.id))}><Trash2 size={16}/></button></div>)}
        <div className="total-row"><span>Total</span><b>{money(total)}</b></div>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="CASH">Tunai</option><option value="QRIS">QRIS</option><option value="TRANSFER">Transfer Bank</option><option value="CARD">Debit/Kredit</option></select>
        {paymentMethod === 'CASH' ? <><input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="Nominal bayar"/><div className="total-row"><span>Kembalian</span><b>{money(Math.max(change, 0))}</b></div></> : <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Nomor referensi / ID transaksi"/>}
        <button className="checkout" onClick={checkout} disabled={!cart.length}><Printer size={20}/> Selesaikan Transaksi</button>
        {printReady && <button className="checkout" style={{marginTop: '10px', background: '#0ea5a4'}} onClick={printReceipt}><Printer size={20}/> Cetak Struk</button>}
      </section>
    </div>
  </div>;
}

function Inventory({ products, categories, loadAll }) {
  const blank = { name: '', sku: '', barcode: '', categoryId: '', costPrice: '', sellingPrice: '', stock: '', minStock: 5 };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  async function save(e) {
    e.preventDefault();
    await fetch(`${API}/products${editingId ? '/' + editingId : ''}`, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm(blank); setEditingId(null); loadAll();
  }
  async function del(id) { if (confirm('Hapus barang?')) { await fetch(`${API}/products/${id}`, { method: 'DELETE' }); loadAll(); } }
  return <div>
    <div className="topbar"><h2>Inventory</h2><span>CRUD stok barang</span></div>
    <form className="form-grid panel" onSubmit={save}>
      {['name','sku','barcode','costPrice','sellingPrice','stock','minStock'].map(k => <input key={k} required={k !== 'barcode'} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={k}/>) }
      <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}><option value="">Kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="checkout">{editingId ? 'Update Barang' : 'Tambah Barang'}</button>
    </form>
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr><th>Nama</th><th>Kategori</th><th>SKU</th><th>Harga Jual</th><th>Stok</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          {products.map(p => <tr key={p.id}><td>{p.name}</td><td><span className="badge">{categories.find(c => c.id === p.categoryId)?.name || 'Umum'}</span></td><td>{p.sku}</td><td>{money(p.sellingPrice)}</td><td className={p.stock < p.minStock ? 'danger' : ''}>{p.stock}</td><td><button onClick={() => {setEditingId(p.id); setForm({...p, categoryId:p.categoryId||''});}}>Edit</button><button onClick={() => del(p.id)}>Hapus</button></td></tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

function CashPage({ cashLogs, loadAll, resetCashLogs }) {
  const [mode, setMode] = useState('OUT'); // OUT = uang keluar, IN = uang masuk
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | IN | OUT

  useEffect(() => {
    setSource('');
    setDescription('');
    setAmount('');
  }, [mode]);

  const filteredLogs = useMemo(() => {
    if (filter === 'ALL') return cashLogs;
    return cashLogs.filter(l => l.type === filter);
  }, [cashLogs, filter]);

  async function save(e) {
    e.preventDefault();
    const endpoint = mode === 'IN' ? `${API}/cash/in` : `${API}/cash/out`;
    const finalSource = source || (mode === 'IN' ? 'PENJUALAN' : 'BIAYA');
    const finalAmount = Number(amount || 0);
    if (!finalAmount || finalAmount <= 0) return alert('Isi jumlah dengan benar');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: finalAmount, description, source: finalSource })
    });

    const data = await res.json();
    if (!res.ok) return alert(data?.message || 'Gagal menyimpan');

    setAmount('');
    setSource('');
    setDescription('');
    await loadAll();
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Buku Kas</h2>
          <span>Uang masuk & keluar tercatat otomatis/manual</span>
        </div>
        <button className="checkout" style={{background:'#dc2626',borderRadius:'12px'}} type="button" onClick={resetCashLogs}>Reset Catatan Kas</button>
      </div>

      <div className="cash-summary panel">
        <div className="cash-summary-item">
          <span>Uang Masuk</span>
          <b>{money(cashLogs.filter(l => l.type === 'IN').reduce((a, b) => a + b.amount, 0))}</b>
        </div>
        <div className="cash-summary-item">
          <span>Uang Keluar</span>
          <b>{money(cashLogs.filter(l => l.type === 'OUT').reduce((a, b) => a + b.amount, 0))}</b>
        </div>
        <div className="cash-summary-item">
          <span>Saldo</span>
          <b>{money(cashLogs.reduce((a, b) => a + (b.type === 'IN' ? b.amount : -b.amount), 0))}</b>
        </div>
      </div>

      <div className="cash-actions no-print">
        <div className="cash-tabs">
          <button className={mode === 'IN' ? 'active' : ''} type="button" onClick={() => setMode('IN')}>
            + Uang Masuk
          </button>
          <button className={mode === 'OUT' ? 'active' : ''} type="button" onClick={() => setMode('OUT')}>
            − Uang Keluar
          </button>
        </div>

        <form className="panel cash-form" onSubmit={save}>
          <div className="cash-form-grid">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={mode === 'IN' ? 'Nominal uang masuk (Rp)' : 'Nominal uang keluar (Rp)'}
              required
              autoFocus
            />
            <select value={source} onChange={e => setSource(e.target.value)}>
              <option value="">Pilih sumber</option>
              {mode === 'IN' ? (
                <>
                  <option value="PENJUALAN">Penjualan</option>
                  <option value="SETORAN">Setoran</option>
                  <option value="LAINNYA">Lainnya</option>
                </>
              ) : (
                <>
                  <option value="LISTRIK">Bayar Listrik</option>
                  <option value="AIR">Bayar Air</option>
                  <option value="SEWA">Bayar Sewa</option>
                  <option value="LAINNYA">Lainnya</option>
                </>
              )}
            </select>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={mode === 'IN' ? 'Contoh: setoran penjualan / piutang masuk' : 'Contoh: bayar listrik / ATK'}
              required
            />
            <button className="checkout" type="submit">
              {mode === 'IN' ? 'Catat Uang Masuk' : 'Catat Uang Keluar'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel cash-log-header table-toolbar">
        <div className="table-title">
          <h3 style={{ margin: 0 }}>Riwayat Kas</h3>
          <span>{filter === 'ALL' ? 'Semua' : filter === 'IN' ? 'Uang Masuk' : 'Uang Keluar'}</span>
        </div>
        <select className="cash-filter" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="IN">IN (Masuk)</option>
          <option value="OUT">OUT (Keluar)</option>
        </select>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Tipe</th>
              <th>Sumber</th>
              <th>Jumlah</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(l => (
              <tr key={l.id}>
                <td>{new Date(l.createdAt).toLocaleString('id-ID')}</td>
                <td className={l.type === 'IN' ? 'in-tag' : 'out-tag'}>{l.type}</td>
                <td>{l.source}</td>
                <td>{money(l.amount)}</td>
                <td>{l.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function Dashboard({ summary, products, resetCashLogs }) {
  const low = products.filter(p => p.stock < p.minStock);
  return <div>
    <div className="topbar" style={{justifyContent: 'space-between', alignItems: 'center'}}>
      <div>
        <h2>Dashboard</h2>
        <span>Ringkasan toko</span>
      </div>
      <button className="checkout" style={{background:'#dc2626',borderRadius:'12px',minHeight:'40px'}} type="button" onClick={resetCashLogs}>Reset Buku Kas</button>
    </div>
    <div className="cards">
      <div className="stat"><span>Uang Masuk</span><b>{money(summary.sales || summary.income || 0)}</b></div>
      <div className="stat"><span>Setoran</span><b>{money(summary.deposit || 0)}</b></div>
      <div className="stat"><span>Saldo Bersih</span><b>{money(summary.balance || 0)}</b></div>
    </div>
    <div className="panel">
      <h3 style={{marginTop: 0}}>⚠️ Low Stock Alert</h3>
      {low.length ? <div style={{display: 'grid', gap: '8px'}}>{low.map(p => <p key={p.id} className="danger" style={{margin: 0, fontSize: '13px'}}>{p.name} sisa {p.stock} pcs</p>)}</div> : <p>Semua stok aman ✓</p>}
    </div>
  </div>;
}

function Receipt({ receipt, visible }) {
  return <div className={`receipt${visible ? ' visible' : ''}`}>
    <h2>RUMAH MAKAN PASUNDAN</h2>
    <p>{receipt.invoiceNo}<br/>{new Date(receipt.createdAt).toLocaleString('id-ID')}</p>
    <div className="line"/>
    {receipt.items.map(i => <div key={i.id}><div>{i.productName}</div><div className="rrow"><span>{i.qty} x {money(i.price)}</span><span>{money(i.subtotal)}</span></div></div>)}
    <div className="line"/>
    <div className="rrow"><b>Total</b><b>{money(receipt.totalAmount)}</b></div>
    <div className="rrow"><span>Metode</span><span>{receipt.paymentMethod}</span></div>
    <div className="rrow"><span>Bayar</span><span>{money(receipt.paidAmount)}</span></div>
    <div className="rrow"><span>Kembali</span><span>{money(receipt.changeAmount)}</span></div>
    <p className="thanks">Terima kasih sudah belanja</p>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
