import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Package, ShoppingCart, Wallet, BarChart3, Printer, Trash2, LogOut, Lock } from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
const money = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));

// ── Auth Helper ──────────────────────────────────────
function getSession() {
  try { return JSON.parse(localStorage.getItem('session') || 'null'); } catch { return null; }
}
function saveSession(s) { localStorage.setItem('session', JSON.stringify(s)); }
function clearSession() { localStorage.removeItem('session'); }

// ── Login Page ───────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      saveSession(data);
      onLogin(data);
    } catch {
      setError('Gagal terhubung ke server');
    }
    setLoading(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>SYSTEM KASIR PASUNDAN</h1>
        <p className="login-sub">Masuk ke akun Anda</p>
        <form onSubmit={handleSubmit}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required autoFocus />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          {error && <div className="login-error">{error}</div>}
          <button className="checkout" type="submit" disabled={loading}>
            <Lock size={16}/> {loading ? 'Memuat...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────
function App() {
  const [session, setSession] = useState(getSession);
  const [page, setPage] = useState('pos');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
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

  const branchId = session?.branchId;
  const isOwner = session?.role === 'owner';
  const branchLabel = session?.branchName || 'Semua Cabang';

  async function loadAll(sess) {
    const s = sess || session;
    if (!s) return;
    const bid = s.branchId;
    const owner = s.role === 'owner';
    try {
      const bq = bid ? `branchId=${bid}` : '';
      const rq = owner ? `role=owner` : '';
      const sep = bq && rq ? '&' : '';
      const [p, c, sm, l] = await Promise.all([
        bid ? fetch(`${API}/products?${bq}`).then(r => r.json()) : Promise.resolve([]),
        bid ? fetch(`${API}/categories?${bq}`).then(r => r.json()) : Promise.resolve([]),
        fetch(`${API}/cash/summary?${bq}${sep}${rq}`).then(r => r.json()),
        fetch(`${API}/cash/logs?${bq}${sep}${rq}`).then(r => r.json()),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
      setSummary(sm);
      setCashLogs(Array.isArray(l) ? l : []);
    } catch (err) {
      console.warn('Gagal load data', err);
    }
  }

  function handleLogin(s) {
    saveSession(s);
    setSession(s);
    setPage(s.branchId ? 'pos' : 'cash');
    setCart([]);
    setProducts([]);
    setCategories([]);
    setCashLogs([]);
    setSummary({ income: 0, expense: 0, balance: 0 });
    loadAll(s);
  }

  function logout() {
    clearSession();
    setSession(null);
    setPage('pos');
    setCart([]);
    setProducts([]);
    setCategories([]);
    setCashLogs([]);
    setSummary({ income: 0, expense: 0, balance: 0 });
  }

  async function resetCashLogs() {
    if (!confirm('Yakin ingin reset semua catatan buku kas?')) return;
    const body = { branchId, role: session.role };
    const res = await fetch(`${API}/cash/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return alert(data?.message || 'Gagal reset');
    await loadAll();
    setToast('Catatan buku kas berhasil di-reset.');
    setTimeout(() => setToast(''), 5000);
  }

  // Load data saat session berubah
  useEffect(() => {
    if (session) loadAll(session);
  }, [session?.id]);

  useEffect(() => {
    if (session && page === 'pos') setTimeout(() => barcodeRef.current?.focus(), 100);
  }, [page, session?.id]);

  useEffect(() => {
    if (session && (page === 'cash' || page === 'dashboard')) loadAll(session);
  }, [page]);

  if (!session) return <LoginPage onLogin={handleLogin} />;

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
      const res = await fetch(`${API}/products/barcode/${code}?branchId=${branchId}`);
      if (!res.ok) throw new Error('Produk tidak ditemukan');
      const product = await res.json();
      addToCart(product);
    } catch (err) { alert(err.message); }
    e.target.value = '';
  }

  async function checkout() {
    const payload = {
      items: cart.map(i => ({ id: i.id, qty: i.qty })),
      paymentMethod, paidAmount: Number(paidAmount || 0), referenceNo, branchId
    };
    const res = await fetch(`${API}/transactions/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!data.success) return alert(data.message);
    setReceipt(data.transaction);
    setToast(`Transaksi ${data.transaction.invoiceNo} berhasil.`);
    setCart([]); setPaidAmount(''); setReferenceNo('');
    setPrintReady(true);
    await loadAll(session);
    setTimeout(() => setToast(''), 5000);
  }

  function printReceipt() {
    if (!receipt) return;
    window.print();
    setPrintReady(false);
    setReceipt(null);
  }

  return (
    <div className="app">
      {toast && <div className="toast-banner no-print">{toast}</div>}
      <aside className="sidebar no-print">
        <h1>SYSTEM KASIR PASUNDAN</h1>
        <div className="branch-badge">{branchLabel}</div>
        <div className="user-info">👤 {session.username} <span className={`role-tag ${session.role}`}>{session.role}</span></div>
        {branchId && <button onClick={() => setPage('pos')} className={page === 'pos' ? 'active' : ''}><ShoppingCart size={20}/> Kasir</button>}
        {branchId && <button onClick={() => setPage('menu')} className={page === 'menu' ? 'active' : ''}>🍽️ Menu & Harga</button>}
        {branchId && <button onClick={() => setPage('inventory')} className={page === 'inventory' ? 'active' : ''}><Package size={20}/> Inventory</button>}
        <button onClick={() => setPage('cash')} className={page === 'cash' ? 'active' : ''}><Wallet size={20}/> Buku Kas</button>
        <button onClick={() => setPage('dashboard')} className={page === 'dashboard' ? 'active' : ''}><BarChart3 size={20}/> Dashboard</button>
        <button onClick={logout} className="logout-btn"><LogOut size={20}/> Keluar</button>
      </aside>

      <nav className="mobile-nav no-print">
        {branchId && <button onClick={() => setPage('pos')} className={page === 'pos' ? 'active' : ''}><ShoppingCart size={18}/> Kasir</button>}
        {branchId && <button onClick={() => setPage('menu')} className={page === 'menu' ? 'active' : ''}>🍽️ Menu</button>}
        {branchId && <button onClick={() => setPage('inventory')} className={page === 'inventory' ? 'active' : ''}><Package size={18}/> Stok</button>}
        <button onClick={() => setPage('cash')} className={page === 'cash' ? 'active' : ''}><Wallet size={18}/> Kas</button>
        <button onClick={() => setPage('dashboard')} className={page === 'dashboard' ? 'active' : ''}><BarChart3 size={18}/> Dashboard</button>
        <button onClick={logout}><LogOut size={18}/> Keluar</button>
      </nav>

      <main className="main no-print">
        {page === 'pos' && branchId && <POSPage {...{ products: filteredProducts, categories, query, setQuery, cart, addToCart, updateQty, setCart, barcodeRef, handleBarcode, total, paymentMethod, setPaymentMethod, paidAmount, setPaidAmount, referenceNo, setReferenceNo, change, checkout, printReady, printReceipt }} />}
        {page === 'pos' && !branchId && <div className="panel"><p>Owner tidak memiliki cabang — gunakan menu Buku Kas atau Dashboard.</p></div>}
        {page === 'menu' && branchId && <MenuPage products={products} categories={categories} loadAll={() => loadAll(session)} branchId={branchId} isOwner={isOwner} />}
        {page === 'inventory' && branchId && <Inventory products={products} categories={categories} loadAll={() => loadAll(session)} branchId={branchId} isOwner={isOwner} />}
        {page === 'cash' && <CashPage cashLogs={cashLogs} loadAll={() => loadAll(session)} resetCashLogs={resetCashLogs} branchId={branchId} isOwner={isOwner} session={session} />}
        {page === 'dashboard' && <Dashboard summary={summary} products={products} cashLogs={cashLogs} resetCashLogs={resetCashLogs} isOwner={isOwner} />}
      </main>

      {receipt && printReady && <Receipt receipt={receipt} branchName={branchLabel} visible />}
    </div>
  );
}

// ── POS Page ──────────────────────────────────────────
function POSPage(props) {
  const { products, categories, query, setQuery, cart, addToCart, updateQty, setCart, barcodeRef, handleBarcode, total, paymentMethod, setPaymentMethod, paidAmount, setPaidAmount, referenceNo, setReferenceNo, change, checkout, printReady, printReceipt } = props;
  return (
    <div>
      <div className="topbar"><h2>Transaksi Kasir</h2><span>Scanner barcode aktif otomatis</span></div>
      <input ref={barcodeRef} onKeyDown={handleBarcode} className="barcode-input" placeholder="Scan barcode/SKU lalu Enter..." />
      <div className="pos-grid">
        <section className="panel">
          <input value={query} onChange={e => setQuery(e.target.value)} className="search" placeholder="Cari nama produk..." />
          <div className="product-grid">
            {products.map(p => (
              <button key={p.id} className="product-card" onClick={() => addToCart(p)}>
                <strong>{p.name}</strong>
                <span className="badge">{categories.find(c => c.id === p.categoryId)?.name || 'Umum'}</span>
                <small>{p.sku} • Stok {p.stock}</small>
                <b>{money(p.sellingPrice)}</b>
                {p.stock < p.minStock && <em>Low Stock</em>}
              </button>
            ))}
          </div>
        </section>
        <section className="panel cart-panel">
          <h3>Keranjang</h3>
          {cart.map(i => (
            <div key={i.id} className="cart-item">
              <div><strong>{i.name}</strong><small>{money(i.sellingPrice)}</small></div>
              <input type="number" value={i.qty} onChange={e => updateQty(i.id, e.target.value)} />
              <button onClick={() => setCart(cart.filter(x => x.id !== i.id))}><Trash2 size={16}/></button>
            </div>
          ))}
          <div className="total-row"><span>Total</span><b>{money(total)}</b></div>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="CASH">Tunai</option>
            <option value="QRIS">QRIS</option>
            <option value="TRANSFER">Transfer Bank</option>
            <option value="CARD">Debit/Kredit</option>
          </select>
          {paymentMethod === 'CASH'
            ? <><input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="Nominal bayar"/><div className="total-row"><span>Kembalian</span><b>{money(Math.max(change, 0))}</b></div></>
            : <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Nomor referensi / ID transaksi"/>
          }
          <button className="checkout" onClick={checkout} disabled={!cart.length}><Printer size={20}/> Selesaikan Transaksi</button>
          {printReady && <button className="checkout" style={{marginTop:'10px',background:'#0ea5a4'}} onClick={printReceipt}><Printer size={20}/> Cetak Struk</button>}
        </section>
      </div>
    </div>
  );
}

// ── Inventory ─────────────────────────────────────────
function Inventory({ products, categories, loadAll, branchId, isOwner }) {
  const blank = { name: '', sku: '', barcode: '', categoryId: '', costPrice: '', sellingPrice: '', stock: '', minStock: 5 };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [showCatForm, setShowCatForm] = useState(false);
  const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  // Generate SKU otomatis dari nama produk
  function generateSKU(name) {
    if (!name) return '';
    const words = name.trim().toUpperCase().split(/\s+/);
    const prefix = words.map(w => w.slice(0, 3)).join('-').slice(0, 12);
    const num = String(Math.floor(Math.random() * 900) + 100);
    return `${prefix}-${num}`;
  }

  // Generate barcode otomatis (13 digit EAN-style)
  function generateBarcode() {
    const base = '899' + String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return base.slice(0, 13);
  }

  // Saat nama diubah, auto-generate SKU & barcode kalau belum diisi manual
  function handleNameChange(val) {
    setForm(prev => ({
      ...prev,
      name: val,
      sku: prev.sku === '' || prev.sku === generateSKU(prev.name) ? generateSKU(val) : prev.sku,
      barcode: prev.barcode === '' ? generateBarcode() : prev.barcode
    }));
  }

  // Regenerate SKU manual
  function regenSKU() { setForm(prev => ({ ...prev, sku: generateSKU(prev.name) })); }
  // Regenerate barcode manual
  function regenBarcode() { setForm(prev => ({ ...prev, barcode: generateBarcode() })); }

  async function save(e) {
    e.preventDefault();
    const url = `${API_URL}/products${editingId ? '/' + editingId : ''}?branchId=${branchId}`;
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, branchId })
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.message || 'Gagal menyimpan');
    setForm(blank); setEditingId(null); loadAll();
  }

  async function del(id) {
    if (!isOwner) return alert('Hanya owner yang bisa menghapus produk');
    if (confirm('Hapus barang?')) {
      await fetch(`${API_URL}/products/${id}?branchId=${branchId}`, { method: 'DELETE' });
      loadAll();
    }
  }

  async function saveCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await fetch(`${API_URL}/categories?branchId=${branchId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory.trim(), branchId })
    });
    setNewCategory('');
    setShowCatForm(false);
    loadAll();
  }

  return (
    <div>
      <div className="topbar">
        <h2>Inventory</h2>
        <span>Stok {isOwner ? '(mode owner)' : 'cabang ini'}</span>
      </div>

      {isOwner && (
        <div className="panel inv-form-panel">
          <div className="inv-form-header">
            <h3 style={{margin:0}}>{editingId ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}</h3>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <button type="button" className="btn-secondary" onClick={() => setShowCatForm(v => !v)}>
                + Kategori Baru
              </button>
            </div>
          </div>

          {/* Form tambah kategori */}
          {showCatForm && (
            <form className="cat-form" onSubmit={saveCategory}>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nama kategori baru" required />
              <button className="checkout" type="submit">Simpan</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCatForm(false)}>Batal</button>
            </form>
          )}

          <form onSubmit={save}>
            <div className="inv-grid">
              {/* Nama */}
              <div className="inv-field full">
                <label>Nama Produk <span className="req">*</span></label>
                <input
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Contoh: Nasi Timbel Ayam"
                  required
                />
              </div>

              {/* SKU */}
              <div className="inv-field">
                <label>SKU <span className="req">*</span> <span className="auto-tag">otomatis</span></label>
                <div className="input-with-btn">
                  <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SKU produk" required />
                  <button type="button" className="btn-regen" onClick={regenSKU} title="Generate ulang SKU">🔄</button>
                </div>
              </div>

              {/* Barcode */}
              <div className="inv-field">
                <label>Barcode <span className="auto-tag">otomatis</span></label>
                <div className="input-with-btn">
                  <input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Barcode (opsional)" />
                  <button type="button" className="btn-regen" onClick={regenBarcode} title="Generate ulang barcode">🔄</button>
                </div>
              </div>

              {/* Kategori */}
              <div className="inv-field">
                <label>Kategori</label>
                <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                  <option value="">Pilih Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Harga Modal */}
              <div className="inv-field">
                <label>Harga Modal (Rp) <span className="req">*</span></label>
                <input type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} placeholder="0" required min="0" />
              </div>

              {/* Harga Jual */}
              <div className="inv-field">
                <label>Harga Jual (Rp) <span className="req">*</span></label>
                <input type="number" value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})} placeholder="0" required min="0" />
              </div>

              {/* Stok */}
              <div className="inv-field">
                <label>Stok Awal <span className="req">*</span></label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="0" required min="0" />
              </div>

              {/* Stok Minimum */}
              <div className="inv-field">
                <label>Stok Minimum</label>
                <input type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} placeholder="5" min="0" />
              </div>
            </div>

            <div className="inv-actions">
              <button className="checkout" type="submit">{editingId ? '💾 Update Produk' : '✅ Simpan Produk'}</button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={() => { setForm(blank); setEditingId(null); }}>
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tabel produk */}
      <div className="panel table-wrap">
        <div className="table-toolbar">
          <h3 style={{margin:0}}>Daftar Produk ({products.length})</h3>
        </div>
        <table>
          <thead>
            <tr><th>Nama</th><th>Kategori</th><th>SKU</th><th>Barcode</th><th>Harga Jual</th><th>Stok</th>{isOwner && <th>Aksi</th>}</tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td><span className="badge">{categories.find(c => c.id === p.categoryId)?.name || 'Umum'}</span></td>
                <td><code style={{fontSize:'12px'}}>{p.sku}</code></td>
                <td><code style={{fontSize:'11px',color:'#6b7280'}}>{p.barcode || '—'}</code></td>
                <td>{money(p.sellingPrice)}</td>
                <td className={p.stock < p.minStock ? 'danger' : ''}>{p.stock}</td>
                {isOwner && (
                  <td>
                    <button onClick={() => { setEditingId(p.id); setForm({...p, categoryId: p.categoryId || ''}); }}>Edit</button>
                    <button onClick={() => del(p.id)}>Hapus</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Cash Page ─────────────────────────────────────────
function CashPage({ cashLogs, loadAll, resetCashLogs, branchId, isOwner, session }) {
  const [mode, setMode] = useState('OUT');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('ALL');
  const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  useEffect(() => { setSource(''); setDescription(''); setAmount(''); }, [mode]);

  const filteredLogs = useMemo(() => {
    if (filter === 'ALL') return cashLogs;
    return cashLogs.filter(l => l.type === filter);
  }, [cashLogs, filter]);

  async function save(e) {
    e.preventDefault();
    const endpoint = mode === 'IN' ? `${API_URL}/cash/in` : `${API_URL}/cash/out`;
    const finalSource = source || (mode === 'IN' ? 'PENJUALAN' : 'BIAYA');
    const finalAmount = Number(amount || 0);
    if (!finalAmount || finalAmount <= 0) return alert('Isi jumlah dengan benar');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: finalAmount, description, source: finalSource, branchId, role: session.role })
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.message || 'Gagal menyimpan');
    setAmount(''); setSource(''); setDescription('');
    await loadAll();
  }

  return (
    <div>
      <div className="topbar">
        <div><h2>Buku Kas</h2><span>{isOwner ? 'Semua cabang' : 'Cabang ini'}</span></div>
        <button className="checkout" style={{background:'#dc2626',borderRadius:'12px'}} type="button" onClick={resetCashLogs}>Reset Kas</button>
      </div>

      <div className="cash-summary panel">
        <div className="cash-summary-item"><span>Uang Masuk</span><b>{money(cashLogs.filter(l => l.type === 'IN').reduce((a, b) => a + b.amount, 0))}</b></div>
        <div className="cash-summary-item"><span>Uang Keluar</span><b>{money(cashLogs.filter(l => l.type === 'OUT').reduce((a, b) => a + b.amount, 0))}</b></div>
        <div className="cash-summary-item"><span>Saldo</span><b>{money(cashLogs.reduce((a, b) => a + (b.type === 'IN' ? b.amount : -b.amount), 0))}</b></div>
      </div>

      {branchId && (
        <div className="cash-actions no-print">
          <div className="cash-tabs">
            <button className={mode === 'IN' ? 'active' : ''} type="button" onClick={() => setMode('IN')}>+ Uang Masuk</button>
            <button className={mode === 'OUT' ? 'active' : ''} type="button" onClick={() => setMode('OUT')}>− Uang Keluar</button>
          </div>
          <form className="panel cash-form" onSubmit={save}>
            <div className="cash-form-grid">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={mode === 'IN' ? 'Nominal uang masuk (Rp)' : 'Nominal uang keluar (Rp)'} required autoFocus />
              <select value={source} onChange={e => setSource(e.target.value)}>
                <option value="">Pilih sumber</option>
                {mode === 'IN' ? <><option value="PENJUALAN">Penjualan</option><option value="SETORAN">Setoran</option><option value="LAINNYA">Lainnya</option></> : <><option value="LISTRIK">Bayar Listrik</option><option value="AIR">Bayar Air</option><option value="SEWA">Bayar Sewa</option><option value="LAINNYA">Lainnya</option></>}
              </select>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan" required />
              <button className="checkout" type="submit">{mode === 'IN' ? 'Catat Uang Masuk' : 'Catat Uang Keluar'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="panel cash-log-header table-toolbar">
        <div className="table-title"><h3 style={{margin:0}}>Riwayat Kas</h3></div>
        <select className="cash-filter" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="ALL">Semua</option>
          <option value="IN">Masuk</option>
          <option value="OUT">Keluar</option>
        </select>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              {isOwner && <th>Cabang</th>}
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
                {isOwner && <td><span className="badge">{l.branch?.name || '-'}</span></td>}
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

// ── Dashboard ─────────────────────────────────────────
function Dashboard({ summary, products, cashLogs, resetCashLogs, isOwner }) {
  const low = products.filter(p => p.stock < p.minStock);
  return (
    <div>
      <div className="topbar" style={{justifyContent:'space-between',alignItems:'center'}}>
        <div><h2>Dashboard</h2><span>{isOwner ? 'Semua cabang' : 'Cabang ini'}</span></div>
        <button className="checkout" style={{background:'#dc2626',borderRadius:'12px',minHeight:'40px'}} onClick={resetCashLogs}>Reset Buku Kas</button>
      </div>
      <div className="cards">
        <div className="stat"><span>Uang Masuk</span><b>{money(summary.sales || summary.income || 0)}</b></div>
        <div className="stat"><span>Setoran</span><b>{money(summary.deposit || 0)}</b></div>
        <div className="stat"><span>Saldo Bersih</span><b>{money(summary.balance || 0)}</b></div>
      </div>
      {products.length > 0 && (
        <div className="panel">
          <h3 style={{marginTop:0}}>⚠️ Low Stock Alert</h3>
          {low.length ? <div style={{display:'grid',gap:'8px'}}>{low.map(p => <p key={p.id} className="danger" style={{margin:0,fontSize:'13px'}}>{p.name} sisa {p.stock} pcs</p>)}</div> : <p>Semua stok aman ✓</p>}
        </div>
      )}
    </div>
  );
}

// ── Menu & Harga Page ─────────────────────────────────
function MenuPage({ products, categories, loadAll, branchId, isOwner }) {
  const blank = { name: '', categoryId: '', sellingPrice: '', costPrice: '', stock: '99', minStock: '5', sku: '', barcode: '' };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showCatForm, setShowCatForm] = useState(false);
  const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  function generateSKU(name) {
    if (!name) return '';
    const words = name.trim().toUpperCase().split(/\s+/);
    return words.map(w => w.slice(0, 3)).join('-').slice(0, 12) + '-' + String(Math.floor(Math.random() * 900) + 100);
  }
  function generateBarcode() {
    return ('899' + String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 1000)).padStart(3, '0')).slice(0, 13);
  }

  function handleNameChange(val) {
    setForm(prev => ({
      ...prev, name: val,
      sku: prev.sku === '' ? generateSKU(val) : prev.sku,
      barcode: prev.barcode === '' ? generateBarcode() : prev.barcode
    }));
  }

  async function save(e) {
    e.preventDefault();
    const url = `${API_URL}/products${editingId ? '/' + editingId : ''}?branchId=${branchId}`;
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, branchId })
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.message || 'Gagal menyimpan');
    setForm(blank); setEditingId(null); loadAll();
  }

  async function del(id) {
    if (confirm('Hapus menu ini?')) {
      await fetch(`${API_URL}/products/${id}?branchId=${branchId}`, { method: 'DELETE' });
      loadAll();
    }
  }

  async function saveCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await fetch(`${API_URL}/categories?branchId=${branchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory.trim(), branchId })
    });
    setNewCategory(''); setShowCatForm(false); loadAll();
  }

  const filtered = filterCat ? products.filter(p => p.categoryId === Number(filterCat)) : products;

  // Group produk per kategori untuk tampilan menu
  const grouped = categories.map(cat => ({
    ...cat,
    items: filtered.filter(p => p.categoryId === cat.id)
  })).filter(g => g.items.length > 0);
  const uncategorized = filtered.filter(p => !p.categoryId);

  return (
    <div>
      <div className="topbar">
        <h2>🍽️ Menu & Harga</h2>
        <span>{isOwner ? 'Kelola menu dan harga' : 'Daftar menu'}</span>
      </div>

      {/* Form tambah/edit menu - hanya owner */}
      {isOwner && (
        <div className="panel inv-form-panel">
          <div className="inv-form-header">
            <h3 style={{margin:0}}>{editingId ? '✏️ Edit Menu' : '➕ Tambah Menu Baru'}</h3>
            <button type="button" className="btn-secondary" onClick={() => setShowCatForm(v => !v)}>
              + Kategori Baru
            </button>
          </div>

          {showCatForm && (
            <form className="cat-form" onSubmit={saveCategory}>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nama kategori (misal: Minuman, Makanan Berat)" required />
              <button className="checkout" type="submit">Simpan</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCatForm(false)}>Batal</button>
            </form>
          )}

          <form onSubmit={save}>
            <div className="inv-grid">
              <div className="inv-field full">
                <label>Nama Menu <span className="req">*</span></label>
                <input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Contoh: Nasi Timbel Spesial" required />
              </div>
              <div className="inv-field">
                <label>Kategori</label>
                <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                  <option value="">Pilih Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="inv-field">
                <label>Harga Modal (Rp) <span className="req">*</span></label>
                <input type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} placeholder="0" required min="0" />
              </div>
              <div className="inv-field">
                <label>Harga Jual (Rp) <span className="req">*</span></label>
                <input type="number" value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})} placeholder="0" required min="0" />
              </div>
              <div className="inv-field">
                <label>Stok <span className="auto-tag">opsional</span></label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="99" min="0" />
              </div>
              <div className="inv-field">
                <label>SKU <span className="auto-tag">otomatis</span></label>
                <div className="input-with-btn">
                  <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Otomatis dari nama" />
                  <button type="button" className="btn-regen" onClick={() => setForm(p => ({...p, sku: generateSKU(p.name)}))}>🔄</button>
                </div>
              </div>
            </div>
            <div className="inv-actions">
              <button className="checkout" type="submit">{editingId ? '💾 Update Menu' : '✅ Tambah ke Menu'}</button>
              {editingId && <button type="button" className="btn-secondary" onClick={() => { setForm(blank); setEditingId(null); }}>Batal</button>}
            </div>
          </form>
        </div>
      )}

      {/* Filter kategori */}
      <div className="menu-filter-bar panel" style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center',padding:'12px 16px'}}>
        <span style={{fontWeight:600,fontSize:13}}>Filter:</span>
        <button className={`cat-chip ${filterCat === '' ? 'active' : ''}`} onClick={() => setFilterCat('')}>Semua</button>
        {categories.map(c => (
          <button key={c.id} className={`cat-chip ${filterCat === String(c.id) ? 'active' : ''}`} onClick={() => setFilterCat(String(c.id))}>{c.name}</button>
        ))}
      </div>

      {/* Tampilan menu per kategori */}
      {grouped.map(group => (
        <div key={group.id} className="panel" style={{marginBottom:12}}>
          <h3 style={{margin:'0 0 12px',color:'var(--primary)',borderBottom:'2px solid #e2e8f0',paddingBottom:'8px'}}>
            {group.name} <span style={{color:'#9ca3af',fontWeight:400,fontSize:13}}>({group.items.length} menu)</span>
          </h3>
          <div className="menu-grid">
            {group.items.map(p => (
              <div key={p.id} className="menu-card">
                <div className="menu-card-name">{p.name}</div>
                <div className="menu-card-price">{money(p.sellingPrice)}</div>
                <div className="menu-card-meta">Modal: {money(p.costPrice)} • Stok: {p.stock}</div>
                {isOwner && (
                  <div className="menu-card-actions">
                    <button className="btn-edit-sm" onClick={() => { setEditingId(p.id); setForm({...p, categoryId: p.categoryId || ''}); }}>Edit</button>
                    <button className="btn-del-sm" onClick={() => del(p.id)}>Hapus</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div className="panel" style={{marginBottom:12}}>
          <h3 style={{margin:'0 0 12px',color:'#6b7280'}}>Tanpa Kategori</h3>
          <div className="menu-grid">
            {uncategorized.map(p => (
              <div key={p.id} className="menu-card">
                <div className="menu-card-name">{p.name}</div>
                <div className="menu-card-price">{money(p.sellingPrice)}</div>
                <div className="menu-card-meta">Modal: {money(p.costPrice)} • Stok: {p.stock}</div>
                {isOwner && (
                  <div className="menu-card-actions">
                    <button className="btn-edit-sm" onClick={() => { setEditingId(p.id); setForm({...p, categoryId: ''}); }}>Edit</button>
                    <button className="btn-del-sm" onClick={() => del(p.id)}>Hapus</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="panel" style={{textAlign:'center',color:'#9ca3af',padding:'40px'}}>
          Belum ada menu. {isOwner ? 'Tambahkan menu di atas.' : ''}
        </div>
      )}
    </div>
  );
}

// ── Receipt ───────────────────────────────────────────
function Receipt({ receipt, branchName, visible }) {
  return (
    <div className={`receipt${visible ? ' visible' : ''}`}>
      <h2>SYSTEM KASIR PASUNDAN</h2>
      <p style={{fontWeight:'bold'}}>{branchName}</p>
      <p>{receipt.invoiceNo}<br/>{new Date(receipt.createdAt).toLocaleString('id-ID')}</p>
      <div className="line"/>
      {receipt.items.map(i => (
        <div key={i.id}>
          <div>{i.productName}</div>
          <div className="rrow"><span>{i.qty} x {money(i.price)}</span><span>{money(i.subtotal)}</span></div>
        </div>
      ))}
      <div className="line"/>
      <div className="rrow"><b>Total</b><b>{money(receipt.totalAmount)}</b></div>
      <div className="rrow"><span>Metode</span><span>{receipt.paymentMethod}</span></div>
      <div className="rrow"><span>Bayar</span><span>{money(receipt.paidAmount)}</span></div>
      <div className="rrow"><span>Kembali</span><span>{money(receipt.changeAmount)}</span></div>
      <p className="thanks">Terima kasih sudah belanja</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
