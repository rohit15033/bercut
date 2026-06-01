import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'
import { speak } from '../../../shared/speak.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtTime = t => t ? t.slice(0, 5) : null

const STATUS_META = {
  available:   { dot: '#4caf50', label: 'Siap',        bg: '#1a3a1a' },
  busy:        { dot: '#ef9a50', label: 'Melayani',    bg: '#3a2a0a' },
  in_service:  { dot: '#ef9a50', label: 'Melayani',    bg: '#3a2a0a' },
  on_break:    { dot: C.accent,  label: 'Istirahat',   bg: '#2a2a0a' },
  clocked_out: { dot: '#444',    label: 'Belum Masuk', bg: '#1a1a1a' },
}

// ── Add Service / Product Modal ───────────────────────────────────────────────

function AddServiceModal({ booking, services, items, onConfirm, onClose }) {
  const [tab, setTab] = useState('services')

  // Services state
  const svcCats = [...new Set(services.map(s => s.category || 'Layanan'))]
  const [svcCat, setSvcCat] = useState(svcCats[0] || '')
  const [addedSvc, setAddedSvc] = useState([])
  const existingSvcIds = (booking.booking_services || []).map(s => s.service_id)
  const filteredSvcs = services.filter(s => (s.category || 'Layanan') === svcCat && !existingSvcIds.includes(s.id))
  const toggleSvc = id => setAddedSvc(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  // Items state
  const itemCats = [...new Set(items.map(i => i.category || 'Produk'))]
  const [itemCat, setItemCat] = useState(itemCats[0] || '')
  const [addedItems, setAddedItems] = useState(new Map())
  const filteredItems = items.filter(i => (i.category || 'Produk') === itemCat && i.kiosk_visible !== false && i.current_stock > 0)

  function toggleItem(item) {
    setAddedItems(prev => {
      const next = new Map(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.set(item.id, { item, qty: 1 })
      return next
    })
  }

  function adjustQty(item, delta) {
    setAddedItems(prev => {
      const next = new Map(prev)
      const entry = next.get(item.id)
      if (!entry) return prev
      const newQty = entry.qty + delta
      if (newQty < 1) next.delete(item.id)
      else next.set(item.id, { ...entry, qty: Math.min(newQty, item.current_stock) })
      return next
    })
  }

  const svcTotal  = services.filter(s => addedSvc.includes(s.id)).reduce((a, s) => a + parseFloat(s.price || s.base_price || 0), 0)
  const itemTotal = [...addedItems.values()].reduce((a, {item, qty}) => a + parseFloat(item.price||0) * qty, 0)
  const totalAdded = addedSvc.length + addedItems.size

  const rowStyle = (sel) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 'clamp(12px,1.6vw,14px)', marginBottom: 8, borderRadius: 12,
    border: `1.5px solid ${sel ? C.accent : C.border}`,
    background: sel ? C.accent : C.white, cursor: 'pointer', minHeight: 60,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 8100, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: 'clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Tambah Item</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.text }}>untuk {booking.customer_name || 'Guest'}</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: 'none', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1.5px solid ${C.border}`, flexShrink: 0 }}>
          {[['services', '✂ Layanan'], ['items', '🛒 Produk & Minuman']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: 'clamp(11px,1.4vw,14px)', border: 'none', borderBottom: `3px solid ${tab === key ? C.topBg : 'transparent'}`, background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontWeight: tab === key ? 700 : 500, fontSize: 'clamp(12px,1.5vw,14px)', color: tab === key ? C.text : C.muted, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Service categories */}
        {tab === 'services' && svcCats.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px clamp(20px,2.6vw,28px)', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
            {svcCats.map(c => (
              <button key={c} onClick={() => setSvcCat(c)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${svcCat === c ? C.text : C.border}`, background: svcCat === c ? C.text : C.white, color: svcCat === c ? C.white : C.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Item categories */}
        {tab === 'items' && itemCats.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px clamp(20px,2.6vw,28px)', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
            {itemCats.map(c => (
              <button key={c} onClick={() => setItemCat(c)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${itemCat === c ? C.text : C.border}`, background: itemCat === c ? C.text : C.white, color: itemCat === c ? C.white : C.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)', WebkitOverflowScrolling: 'touch' }}>
          {tab === 'services' && (
            <>
              {filteredSvcs.map(s => {
                const sel = addedSvc.includes(s.id)
                return (
                  <div key={s.id} onClick={() => toggleSvc(s.id)} style={rowStyle(sel)}>
                    <div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', color: sel ? C.accentText : C.text }}>{s.name}</div>
                      <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: sel ? C.accentText : C.muted, marginTop: 2 }}>⏱ {s.duration_minutes || 0} min</div>
                    </div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.7vw,16px)', color: sel ? C.accentText : C.text }}>{fmt(parseFloat(s.price || s.base_price || 0))}</div>
                  </div>
                )
              })}
              {filteredSvcs.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: '24px 0', fontSize: 'clamp(13px,1.5vw,14px)' }}>Tidak ada layanan tersedia</div>}
            </>
          )}
          {tab === 'items' && (
            <>
              {filteredItems.map(i => {
                const entry = addedItems.get(i.id)
                const sel = !!entry
                const qty = entry?.qty || 0
                return (
                  <div key={i.id}
                    data-testid={`item-card-${i.id}`}
                    onClick={() => !sel && toggleItem(i)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: sel ? 'clamp(10px,1.4vw,12px) clamp(12px,1.6vw,14px)' : 'clamp(12px,1.6vw,14px)',
                      marginBottom: 8, borderRadius: 12,
                      border: `1.5px solid ${sel ? C.accent : C.border}`,
                      background: sel ? C.accent : C.white,
                      cursor: sel ? 'default' : 'pointer',
                      transition: 'background 0.15s ease',
                    }}>
                    {/* Left: name + stock */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', color: sel ? C.accentText : C.text }}>{i.name}</div>
                      <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: sel ? C.accentText : C.muted, marginTop: 2 }}>Stok: {i.current_stock}</div>
                    </div>
                    {/* Right: price (unselected) or price line + stepper (selected) */}
                    {!sel ? (
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.7vw,16px)', color: C.text }}>{fmt(parseFloat(i.price||0))}</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.4vw,14px)', color: C.accentText }}>
                          {qty} × {fmt(parseFloat(i.price||0))} = {fmt(parseFloat(i.price||0) * qty)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={e => { e.stopPropagation(); adjustQty(i, -1) }}
                            style={{ width: 44, height: 44, borderRadius: 10, background: C.topBg, color: C.white, border: 'none', fontSize: 22, fontWeight: 700, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            −
                          </button>
                          <span style={{ minWidth: 28, textAlign: 'center', fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.7vw,16px)', color: C.accentText }}>{qty}</span>
                          <button
                            onClick={e => { e.stopPropagation(); adjustQty(i, 1) }}
                            style={{ width: 44, height: 44, borderRadius: 10, background: C.topBg, color: C.white, border: 'none', fontSize: 22, fontWeight: 700, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty >= i.current_stock ? 0.35 : 1, pointerEvents: qty >= i.current_stock ? 'none' : 'auto' }}>
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredItems.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: '24px 0', fontSize: 'clamp(13px,1.5vw,14px)' }}>Tidak ada produk tersedia</div>}
            </>
          )}
        </div>

        {/* Footer */}
        {totalAdded > 0 && (
          <div style={{ padding: 'clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)', borderTop: `1.5px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: C.muted }}>Tambahan total</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(16px,2vw,20px)', color: C.text }}>+{fmt(svcTotal + itemTotal)}</div>
            </div>
            <button onClick={() => onConfirm({ serviceIds: addedSvc, items: [...addedItems.values()].map(({item, qty}) => ({ item_id: item.id, quantity: qty })) })}
              style={{ padding: 'clamp(13px,1.7vw,15px) clamp(20px,2.6vw,26px)', borderRadius: 12, background: C.topBg, color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', border: 'none', cursor: 'pointer', minHeight: 56 }}>
              Konfirmasi ({totalAdded}) →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quick Panel ───────────────────────────────────────────────────────────────

export default function QuickPanel({ branchId, services, triggerPayment, onHome, onClose, lastQueueUpdate }) {
  const [barbers,    setBarbers]    = useState([])
  const [bookings,   setBookings]   = useState([])
  const [menuItems,  setMenuItems]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [busyId,     setBusyId]     = useState(null)
  const [showAddSvc, setShowAddSvc] = useState(null)
  const [alertSent,  setAlertSent]  = useState({})
  const [calling,    setCalling]    = useState({})
  const [confirmModal, setConfirmModal] = useState(null)
  // shape: { bookingId, customerName, services, extras, accentColor }
  const [unassigned, setUnassigned] = useState(null)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' })

  const load = () => {
    setLoading(true)
    Promise.all([
      kioskApi.get(`/barbers?branch_id=${branchId}`),
      kioskApi.get(`/bookings?branch_id=${branchId}&date=${today}`),
      kioskApi.get(`/inventory/kiosk-menu?branch_id=${branchId}`),
    ])
      .then(([b, bk, menu]) => {
        setBarbers(Array.isArray(b)    ? b : [])
        setBookings(Array.isArray(bk)  ? bk : [])
        setMenuItems(Array.isArray(menu) ? menu : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    kioskApi.get(`/bookings/unassigned?branch_id=${branchId}`)
      .then(data => setUnassigned(data))
      .catch(() => setUnassigned(null))
  }

  useEffect(() => { load() }, [branchId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lastQueueUpdate) load() }, [lastQueueUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const getActives = barberId => bookings.filter(b => b.barber_id === barberId && b.status === 'in_progress')
  const getNext    = barberId => bookings.find(b => b.barber_id === barberId && b.status === 'confirmed')   || null

  const handleStart = async (bookingId) => {
    setBusyId(bookingId)
    try {
      await kioskApi.patch(`/bookings/${bookingId}/start`)
      onHome()
    } catch (err) { alert(err.message || 'Gagal memulai layanan') }
    finally { setBusyId(null) }
  }

  const handleComplete = async (bookingId) => {
    setBusyId(bookingId)
    try {
      await kioskApi.patch(`/bookings/${bookingId}/complete`)
      setConfirmModal(null)   // clear only on success
      onClose()
    } catch (err) { alert(err.message || 'Gagal menyelesaikan layanan') }
    finally { setBusyId(null) }
  }

  const requestComplete = (booking, accentColor = C.accent) => {
    const services = (booking.booking_services || []).map(s => s.service_name || s.name).filter(Boolean)
    const extras   = (booking.booking_extras   || []).map(e => `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`).filter(Boolean)
    setConfirmModal({
      bookingId: booking.id,
      customerName: booking.customer_name || 'Guest',
      services,
      extras,
      accentColor,
    })
  }

  const handleAddItems = async (bookingId, { serviceIds = [], items = [] }) => {
    setBusyId(bookingId)
    try {
      await Promise.all([
        serviceIds.length ? kioskApi.patch(`/bookings/${bookingId}/add-services`, { service_ids: serviceIds }) : Promise.resolve(),
        items.length      ? kioskApi.patch(`/bookings/${bookingId}/add-extras`,   { items })                  : Promise.resolve(),
      ])
      setShowAddSvc(null)
      load()
    } catch (err) { alert(err.message || 'Gagal menambah item') }
    finally { setBusyId(null) }
  }

  const handleRemoveService = async (bookingId, serviceId) => {
    try {
      await kioskApi.delete(`/bookings/${bookingId}/services/${serviceId}`)
      load()
    } catch (err) { alert(err.message || 'Gagal menghapus layanan') }
  }

  const handleRemoveExtra = async (bookingId, extraId) => {
    try {
      await kioskApi.delete(`/bookings/${bookingId}/extras/${extraId}`)
      load()
    } catch (err) { alert(err.message || 'Gagal menghapus produk') }
  }

  const handleClientNotArrived = (bookingId, barberId) => {
    setAlertSent(prev => ({ ...prev, [barberId]: true }))
    kioskApi.post(`/bookings/${bookingId}/client-not-arrived`).catch(() => {})
  }

  const handleCall = (barber, customerName) => {
    speak(`Panggil kapster ${barber.name}. Tamu atas nama ${customerName} sedang menunggu.`, { rate: 0.95 })
    setCalling(prev => ({ ...prev, [barber.id]: true }))
    setTimeout(() => setCalling(prev => ({ ...prev, [barber.id]: false })), 3000)
  }

  const handleClaimAndStart = async (bookingId, barberId) => {
    setBusyId(bookingId)
    try {
      await kioskApi.patch(`/bookings/${bookingId}/claim-and-start`, { barber_id: barberId })
      onHome()
    } catch (err) {
      if (err.status === 409 || /already claimed/i.test(err.message)) {
        load()
      } else {
        alert(err.message || 'Gagal mengambil antrian')
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7500, background: C.topBg, display: 'flex', flexDirection: 'column' }}>

      {showAddSvc && (
        <AddServiceModal
          booking={showAddSvc}
          services={services}
          items={menuItems}
          onConfirm={selection => handleAddItems(showAddSvc.id, selection)}
          onClose={() => setShowAddSvc(null)}
        />
      )}

      {/* Header */}
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain' }} />
          <div style={{ width: 1, height: 24, background: '#2a2a28' }} />
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: C.white }}>Antrian Kapster</div>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#555' }}>Barber Queue · {today}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: '8px 14px', color: '#888', fontSize: 'clamp(12px,1.4vw,14px)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>↻</button>
          <button onClick={onClose} style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, width: 36, height: 36, color: '#888', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,8,0.82)', zIndex: 8200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null) }}>
          <div style={{ background: '#1e1e1c', border: '1.5px solid #333', borderRadius: 14, padding: '20px 18px', width: 'clamp(260px,32vw,320px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center', fontSize: 22 }}>✂️</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.8vw,17px)', color: C.white, textAlign: 'center', lineHeight: 1.3 }}>
              Selesai melayani<br />{confirmModal.customerName}?
            </div>
            <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
              Layar pembayaran akan muncul<br />otomatis untuk pelanggan
            </div>
            {(confirmModal.services.length > 0 || confirmModal.extras.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {confirmModal.services.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {confirmModal.services.map((s, i) => (
                      <span key={i} style={{ background: '#1c1c1a', border: '1px solid #2a2a28', borderRadius: 6, padding: '4px 10px', fontSize: 'clamp(11px,1.3vw,13px)', fontWeight: 600, color: '#ccc' }}>{s}</span>
                    ))}
                  </div>
                )}
                {confirmModal.extras.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                    {confirmModal.extras.map((e, i) => (
                      <span key={i} style={{ background: '#101a1a', border: '1px solid #183333', borderRadius: 6, padding: '3px 8px', fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 500, color: '#5dd' }}>🛒 {e}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, height: 44, borderRadius: 9, background: '#2a2a28', color: '#888', border: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={() => !busyId && handleComplete(confirmModal.bookingId)}
                disabled={!!busyId}
                style={{ flex: 2, height: 44, borderRadius: 9, background: confirmModal.accentColor, color: confirmModal.accentColor === C.accent ? C.accentText : '#fff', border: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: busyId ? 'not-allowed' : 'pointer', opacity: busyId ? 0.6 : 1 }}>
                {busyId ? '…' : 'Ya, Selesai ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barber grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(14px,2vw,22px) clamp(16px,2.4vw,28px)', WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#555', paddingTop: 60, fontSize: 'clamp(14px,1.6vw,16px)' }}>Loading…</div>
        )}
        {!loading && barbers.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', paddingTop: 60, fontSize: 'clamp(14px,1.6vw,16px)' }}>Tidak ada kapster aktif</div>
        )}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(280px,30vw,420px), 1fr))', gap: 'clamp(12px,1.6vw,18px)' }}>
            {barbers.map(b => {
              const rawStatusFromDb = b.current_status || b.status || 'clocked_out'
              const actives     = getActives(b.id)
              const activeCount = actives.length
              const rawStatus   = rawStatusFromDb === 'in_service' && activeCount === 0 ? 'available' : rawStatusFromDb
              const sm          = STATUS_META[rawStatus] || STATUS_META.clocked_out
              const next        = getNext(b.id)
              const isCalling = calling[b.id]
              const sent      = alertSent[b.id]

              return (
                <div key={b.id} style={{ background: '#1a1a18', borderRadius: 16, border: '1.5px solid #2a2a28', overflow: 'hidden' }}>

                  {/* Barber row */}
                  <div style={{ padding: 'clamp(12px,1.5vw,15px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (activeCount > 0 || next) ? '1px solid #252523' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 'clamp(42px,5.2vw,52px)', height: 'clamp(42px,5.2vw,52px)', borderRadius: '50%', background: '#111110', border: `2px solid ${rawStatus === 'clocked_out' ? '#2a2a28' : C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(12px,1.5vw,16px)', color: rawStatus === 'clocked_out' ? '#444' : C.accent }}>{b.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,17px)', color: rawStatus === 'clocked_out' ? '#555' : C.white }}>{b.name}</div>
                        <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: '#555', marginTop: 2 }}>
                          {b.specialization || b.spec || 'Barber'}
                          {(b.chair_number || b.chair) ? ` · Kursi ${b.chair_number || b.chair}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: sm.bg, padding: '4px 10px', borderRadius: 6, flexShrink: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot }} />
                      <span style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, color: sm.dot }}>{sm.label}</span>
                    </div>
                  </div>

                  {/* Active booking(s) — supports 1 or 2 parallel in_progress */}
                  {activeCount >= 1 && (
                    <div style={{ padding: 'clamp(12px,1.5vw,14px)', background: '#111', borderBottom: next ? '1px solid #252523' : 'none' }}>
                      {/* Section kicker */}
                      <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: C.accent, textTransform: 'uppercase', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ⚡ Sedang Dilayani
                        {activeCount === 2 && (
                          <span style={{ background: C.accent, color: C.accentText, fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>2</span>
                        )}
                      </div>

                      {actives.map((act, idx) => {
                        const COLORS = ['#F5E200', '#4caf50']
                        const accentColor = COLORS[idx] || COLORS[0]
                        const bgTint = idx === 0 ? 'rgba(245,226,0,0.06)' : 'rgba(76,175,80,0.06)'

                        return (
                          <div key={act.id}>
                            {idx > 0 && <div style={{ borderTop: '1px solid #1c1c1a', margin: '6px 0' }} />}
                            <div style={{ background: bgTint, borderLeft: `3px solid ${accentColor}`, borderRadius: 10, padding: '12px 12px 12px 14px' }}>
                              {/* Customer name */}
                              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.7vw,16px)', color: C.white, marginBottom: 5 }}>{act.customer_name || 'Guest'}</div>
                              {/* Service chips */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
                                {(act.booking_services || []).length === 0 && (
                                  <span style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: '#888' }}>—</span>
                                )}
                                {(act.booking_services || []).map((s, si) => (
                                  <div key={s.id || si} style={{ display: 'flex', alignItems: 'center', gap: 4, background: s.added_mid_cut ? '#1a1a10' : '#1c1c1a', border: `1px solid ${s.added_mid_cut ? '#3a3a18' : '#2a2a28'}`, borderRadius: 6, padding: s.added_mid_cut ? '4px 4px 4px 10px' : '4px 10px' }}>
                                    <span style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: s.added_mid_cut ? C.accent : '#bbb', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{s.service_name || s.name}</span>
                                    {s.added_mid_cut && (
                                      <button onClick={() => handleRemoveService(act.id, s.service_id)}
                                        style={{ background: 'none', border: 'none', color: '#666', fontSize: 15, lineHeight: 1, cursor: 'pointer', padding: '0 3px', borderRadius: 4, WebkitTapHighlightColor: 'transparent' }}
                                        onMouseEnter={e => e.currentTarget.style.color = C.danger}
                                        onMouseLeave={e => e.currentTarget.style.color = '#666'}
                                      >×</button>
                                    )}
                                  </div>
                                ))}
                                {(act.booking_extras || []).map((e, ei) => (
                                  <div key={e.id || ei} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#101a1a', border: '1px solid #183333', borderRadius: 6, padding: '4px 4px 4px 10px' }}>
                                    <span style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: '#5dd', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>🛒 {e.name}</span>
                                    <button onClick={() => handleRemoveExtra(act.id, e.id)}
                                      style={{ background: 'none', border: 'none', color: '#666', fontSize: 15, lineHeight: 1, cursor: 'pointer', padding: '0 3px', borderRadius: 4, WebkitTapHighlightColor: 'transparent' }}
                                      onMouseEnter={e2 => e2.currentTarget.style.color = C.danger}
                                      onMouseLeave={e2 => e2.currentTarget.style.color = '#666'}
                                    >×</button>
                                  </div>
                                ))}
                              </div>
                              {/* Progress row */}
                              {(() => {
                                const totalDur = (act.booking_services || []).reduce((s, sv) => s + (sv.duration_minutes || 0), 0) || 30
                                const elapsedMs = act.started_at ? Date.now() - new Date(act.started_at).getTime() : 0
                                const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60000))
                                const pct = Math.min(100, Math.round(elapsedMin / totalDur * 100))
                                const estEnd = act.started_at
                                  ? new Date(new Date(act.started_at).getTime() + totalDur * 60000)
                                      .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
                                  : null
                                const startStr = act.started_at
                                  ? new Date(act.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
                                  : null
                                return (
                                  <div style={{ marginTop: 6, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 700, color: '#aaa' }}>{elapsedMin} menit</span>
                                      {startStr && estEnd && (
                                        <span style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: '#555' }}>
                                          Mulai {startStr} · Est. selesai {estEnd}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ height: 4, background: '#2a2a28', borderRadius: 2, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: accentColor, borderRadius: 2 }} />
                                    </div>
                                  </div>
                                )
                              })()}
                              {/* Buttons */}
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowAddSvc(act)}
                                  style={{ flex: 1, padding: 'clamp(10px,1.4vw,12px)', borderRadius: 9, background: '#2a2a28', color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: 'pointer', minHeight: 56 }}>
                                  + Tambah
                                </button>
                                <button onClick={() => !busyId && requestComplete(act, accentColor)} disabled={!!busyId}
                                  style={{ flex: 2, padding: 'clamp(10px,1.4vw,12px)', borderRadius: 9, background: accentColor, color: idx === 0 ? C.accentText : '#111', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', border: 'none', cursor: busyId ? 'not-allowed' : 'pointer', minHeight: 56, opacity: busyId ? 0.6 : 1 }}>
                                  {busyId === act.id ? '…' : 'Selesai ✓'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Next booking — full always. Compact inline-strip mode preserved below but disabled.
                      To re-enable compact: change isCompact = false to isCompact = activeCount === 1 && !!unassigned */}
                  {next && (() => {
                    const isCompact = false // compact mode disabled — screen is large enough
                    return (
                      <div style={{ padding: isCompact ? 'clamp(8px,1.1vw,10px) clamp(12px,1.5vw,14px)' : 'clamp(12px,1.5vw,14px)', borderBottom: isCompact ? '1px solid #252523' : 'none' }}>
                        {!isCompact && <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: '#aaa', textTransform: 'uppercase', marginBottom: 5 }}>→ Berikutnya</div>}
                        {!isCompact && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.white }}>{next.customer_name || 'Guest'}</div>
                              {next.slot_time && <span style={{ fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', color: '#aaa', whiteSpace: 'nowrap' }}>{fmtTime(next.slot_time)}</span>}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                              {(next.booking_services || []).map((s, si) => (
                                <span key={s.id || si} style={{ display: 'inline-block', background: '#1c1c1a', border: '1px solid #2a2a28', borderRadius: 6, padding: '3px 9px', fontSize: 'clamp(10px,1.1vw,12px)', fontWeight: 500, color: '#bbb' }}>
                                  {s.service_name || s.name}{s.duration_minutes ? ` · ${s.duration_minutes}m` : ''}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                        {/* Compact: inline strip — kicker + name/service + time + button */}
                        {isCompact ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 'clamp(9px,1.0vw,10px)', fontWeight: 700, letterSpacing: '0.12em', color: '#555', textTransform: 'uppercase', marginBottom: 2 }}>→ Berikutnya</div>
                              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,1.5vw,15px)', color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.customer_name || 'Guest'}</div>
                              {(next.booking_services || []).slice(0, 1).map((s, si) => (
                                <div key={si} style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: '#888', marginTop: 1 }}>
                                  {s.service_name || s.name}{s.duration_minutes ? ` · ${s.duration_minutes}m` : ''}
                                </div>
                              ))}
                            </div>
                            {next.slot_time && (
                              <span style={{ fontWeight: 700, fontSize: 'clamp(12px,1.4vw,14px)', color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtTime(next.slot_time)}</span>
                            )}
                            <button
                              onClick={() => { if (!busyId) handleStart(next.id) }}
                              disabled={!!busyId}
                              style={{
                                flexShrink: 0, padding: 'clamp(10px,1.3vw,12px) clamp(14px,1.8vw,18px)', borderRadius: 9,
                                background: `rgba(245,226,0,0.12)`, color: C.accent,
                                border: `1.5px solid ${C.accent}`,
                                fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(11px,1.3vw,13px)',
                                cursor: busyId ? 'not-allowed' : 'pointer', minHeight: 48,
                              }}>
                              {busyId === next.id ? '…' : 'Mulai Juga ↗'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleCall(b, next.customer_name)}
                              style={{ flex: 1, minWidth: 52, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: isCalling ? '#1a3a1a' : '#2a2a28', color: isCalling ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: 'pointer', minHeight: 56 }}>
                              {isCalling ? '✓ Dipanggil' : '📢 Panggil'}
                            </button>
                            <button onClick={() => !sent && handleClientNotArrived(next.id, b.id)} disabled={sent}
                              style={{ flex: 1, minWidth: 52, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: sent ? '#1a2a1a' : '#2a2a28', color: sent ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: sent ? 'default' : 'pointer', minHeight: 56 }}>
                              {sent ? '✓ Terkirim' : '⚠ Blm Datang'}
                            </button>
                            <button
                              onClick={() => {
                                if (activeCount < 2 && !busyId && rawStatus !== 'clocked_out' && rawStatus !== 'on_break') handleStart(next.id)
                              }}
                              disabled={activeCount >= 2 || !!busyId || rawStatus === 'clocked_out' || rawStatus === 'on_break'}
                              style={{
                                flex: 2, minWidth: 100, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9,
                                background: activeCount === 0 ? C.white : activeCount === 1 ? `rgba(245,226,0,0.12)` : '#2a2a28',
                                color:      activeCount === 0 ? C.text  : activeCount === 1 ? C.accent               : '#555',
                                border: activeCount === 1 ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                                fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)',
                                cursor: activeCount < 2 && !busyId && rawStatus !== 'clocked_out' && rawStatus !== 'on_break' ? 'pointer' : 'not-allowed',
                                minHeight: 56,
                              }}>
                              {busyId === next.id ? '…' : activeCount === 0 ? 'Mulai Melayani →' : activeCount === 1 ? 'Mulai Juga ↗' : 'Tidak tersedia'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* No bookings */}
                  {activeCount === 0 && !next && (
                    <div style={{ padding: 'clamp(12px,1.6vw,16px)', textAlign: 'center' }}>
                      <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#666' }}>
                        {rawStatus === 'clocked_out' ? 'Belum masuk' : rawStatus === 'on_break' ? 'Sedang istirahat' : 'Antrian kosong'}
                      </div>
                    </div>
                  )}

                  {/* Antrian Bebas — shown whenever barber has capacity, even with a far-future next */}
                  {activeCount < 2 && unassigned && (
                    <div style={{ padding: 'clamp(12px,1.5vw,14px)', borderTop: '1px solid #252523' }}>
                      <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: '#4caf50', textTransform: 'uppercase', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ◎ ANTRIAN BEBAS
                      </div>
                      {/* Name + time */}
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.white }}>
                          {unassigned.customer_name || 'Guest'}
                        </div>
                        <span style={{ fontSize: 'clamp(13px,1.6vw,15px)', fontWeight: 700, color: '#aaa', whiteSpace: 'nowrap' }}>
                          {fmtTime(unassigned.slot_time) || (unassigned.scheduled_at ? new Date(unassigned.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : 'Menunggu')}
                        </span>
                      </div>
                      {/* Service chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 'clamp(10px,1.4vw,12px)' }}>
                        {(unassigned.booking_services || []).map((s, si) => (
                          <span key={s.id || si} style={{ display: 'inline-block', background: '#1c1c1a', border: '1px solid #2a2a28', borderRadius: 6, padding: '3px 9px', fontSize: 'clamp(10px,1.1vw,12px)', fontWeight: 500, color: '#bbb' }}>
                            {s.service_name || s.name}{s.duration_minutes ? ` · ${s.duration_minutes}m` : ''}
                          </span>
                        ))}
                      </div>
                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleCall(b, unassigned.customer_name)}
                          style={{ flex: 1, minWidth: 52, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: '#2a2a28', color: '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: 'pointer', minHeight: 56 }}>
                          📢 Panggil
                        </button>
                        <button
                          onClick={() => !busyId && handleClaimAndStart(unassigned.id, b.id)}
                          disabled={!!busyId}
                          style={{ flex: 2, minWidth: 100, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: 'rgba(76,175,80,0.12)', border: '1.5px solid #4caf50', color: '#4caf50', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', cursor: busyId ? 'not-allowed' : 'pointer', minHeight: 56, opacity: busyId ? 0.6 : 1 }}>
                          {busyId ? '…' : activeCount === 0 ? 'Ambil & Mulai →' : 'Ambil & Mulai Juga ↗'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
