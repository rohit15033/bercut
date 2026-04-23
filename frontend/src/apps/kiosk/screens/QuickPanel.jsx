import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'
import { speak } from '../../../shared/speak.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

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
  const [addedItems, setAddedItems] = useState([])
  const filteredItems = items.filter(i => (i.category || 'Produk') === itemCat && i.kiosk_visible !== false && i.current_stock > 0)
  const toggleItem = id => setAddedItems(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const svcTotal  = services.filter(s => addedSvc.includes(s.id)).reduce((a, s) => a + parseFloat(s.price || s.base_price || 0), 0)
  const itemTotal = items.filter(i => addedItems.includes(i.id)).reduce((a, i) => a + parseFloat(i.price || 0), 0)
  const totalAdded = addedSvc.length + addedItems.length

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
                const sel = addedItems.includes(i.id)
                return (
                  <div key={i.id} onClick={() => toggleItem(i.id)} style={rowStyle(sel)}>
                    <div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', color: sel ? C.accentText : C.text }}>{i.name}</div>
                      <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: sel ? C.accentText : C.muted, marginTop: 2 }}>Stok: {i.current_stock}</div>
                    </div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.7vw,16px)', color: sel ? C.accentText : C.text }}>{fmt(parseFloat(i.price || 0))}</div>
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
            <button onClick={() => onConfirm({ serviceIds: addedSvc, itemIds: addedItems })}
              style={{ padding: 'clamp(13px,1.7vw,15px) clamp(20px,2.6vw,26px)', borderRadius: 12, background: C.topBg, color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', border: 'none', cursor: 'pointer', minHeight: 52 }}>
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

  const today = new Date().toISOString().slice(0, 10)

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
  }

  useEffect(() => { load() }, [branchId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lastQueueUpdate) load() }, [lastQueueUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const getActive = barberId => bookings.find(b => b.barber_id === barberId && b.status === 'in_progress') || null
  const getNext   = barberId => bookings.find(b => b.barber_id === barberId && b.status === 'confirmed')   || null

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
      const res = await kioskApi.patch(`/bookings/${bookingId}/complete`)
      onClose()
    } catch (err) { alert(err.message || 'Gagal menyelesaikan layanan') }
    finally { setBusyId(null) }
  }

  const handleAddItems = async (bookingId, { serviceIds = [], itemIds = [] }) => {
    setBusyId(bookingId)
    try {
      await Promise.all([
        serviceIds.length ? kioskApi.patch(`/bookings/${bookingId}/add-services`, { service_ids: serviceIds }) : Promise.resolve(),
        itemIds.length    ? kioskApi.patch(`/bookings/${bookingId}/add-extras`,   { item_ids: itemIds })       : Promise.resolve(),
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
              const rawStatus = (rawStatusFromDb === 'in_service' || rawStatusFromDb === 'busy') && !getActive(b.id) ? 'available' : rawStatusFromDb
              const sm        = STATUS_META[rawStatus] || STATUS_META.clocked_out
              const active    = getActive(b.id)
              const next      = getNext(b.id)
              const canStart  = !active && rawStatus !== 'clocked_out' && rawStatus !== 'on_break'
              const isCalling = calling[b.id]
              const sent      = alertSent[b.id]

              return (
                <div key={b.id} style={{ background: '#1a1a18', borderRadius: 16, border: '1.5px solid #2a2a28', overflow: 'hidden' }}>

                  {/* Barber row */}
                  <div style={{ padding: 'clamp(12px,1.6vw,16px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (active || next) ? '1px solid #252523' : 'none' }}>
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

                  {/* Active booking */}
                  {active && (
                    <div style={{ padding: 'clamp(12px,1.6vw,16px)', background: '#111', borderBottom: next ? '1px solid #252523' : 'none' }}>
                      <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: '#ef9a50', textTransform: 'uppercase', marginBottom: 7 }}>⚡ Sedang Dilayani</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.white, marginBottom: 8 }}>{active.customer_name || 'Guest'}</div>
                      {/* Service chips — tap × to remove (only shown when >1 service) */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {(active.booking_services || []).length === 0 && (
                          <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: '#888' }}>—</span>
                        )}
                        {(active.booking_services || []).map((s, si) => (
                          <div key={s.id || si} style={{ display: 'flex', alignItems: 'center', gap: 4, background: s.added_mid_cut ? '#1a1a10' : '#1e1e1c', border: `1px solid ${s.added_mid_cut ? '#3a3a18' : '#333'}`, borderRadius: 6, padding: s.added_mid_cut ? '5px 4px 5px 10px' : '5px 10px' }}>
                            <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: s.added_mid_cut ? C.accent : '#ccc', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{s.service_name || s.name}</span>
                            {s.added_mid_cut && (
                              <button onClick={() => handleRemoveService(active.id, s.service_id)}
                                style={{ background: 'none', border: 'none', color: '#666', fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, WebkitTapHighlightColor: 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.color = C.danger}
                                onMouseLeave={e => e.currentTarget.style.color = '#666'}
                              >×</button>
                            )}
                          </div>
                        ))}
                        {(active.booking_extras || []).map((e, ei) => (
                          <div key={e.id || ei} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#101a1a', border: '1px solid #183333', borderRadius: 6, padding: '5px 4px 5px 10px' }}>
                            <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: '#5dd', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>🛒 {e.name}</span>
                            <button onClick={() => handleRemoveExtra(active.id, e.id)}
                              style={{ background: 'none', border: 'none', color: '#666', fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, WebkitTapHighlightColor: 'transparent' }}
                              onMouseEnter={e2 => e2.currentTarget.style.color = C.danger}
                              onMouseLeave={e2 => e2.currentTarget.style.color = '#666'}
                            >×</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setShowAddSvc(active)}
                          style={{ flex: 1, padding: 'clamp(12px,1.6vw,15px)', borderRadius: 10, background: '#2a2a28', color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(12px,1.5vw,14px)', border: 'none', cursor: 'pointer', minHeight: 52 }}>
                          + Tambah
                        </button>
                        <button onClick={() => handleComplete(active.id)} disabled={busyId === active.id}
                          style={{ flex: 2, padding: 'clamp(12px,1.6vw,15px)', borderRadius: 10, background: C.accent, color: C.accentText, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,16px)', border: 'none', cursor: busyId === active.id ? 'not-allowed' : 'pointer', minHeight: 52, opacity: busyId === active.id ? 0.6 : 1 }}>
                          {busyId === active.id ? '…' : 'Selesai ✓'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Next booking */}
                  {next && (
                    <div style={{ padding: 'clamp(12px,1.6vw,16px)' }}>
                      <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: '#aaa', textTransform: 'uppercase', marginBottom: 7 }}>→ Berikutnya</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.white }}>{next.customer_name || 'Guest'}</div>
                        {next.total_amount > 0 && (
                          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: C.accent }}>{fmt(parseFloat(next.total_amount))}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: '#999', marginBottom: 12 }}>
                        {(next.booking_services || []).map(s => s.service_name || s.name).filter(Boolean).join(' + ') || '—'}
                        {next.slot_time ? ` · ${next.slot_time}` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => handleCall(b, next.customer_name)}
                          style={{ flex: 1, minWidth: 52, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: isCalling ? '#1a3a1a' : '#2a2a28', color: isCalling ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: 'pointer', minHeight: 48 }}>
                          {isCalling ? '✓ Dipanggil' : '📢 Panggil'}
                        </button>
                        <button onClick={() => !sent && handleClientNotArrived(next.id, b.id)} disabled={sent}
                          style={{ flex: 1, minWidth: 52, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: sent ? '#1a2a1a' : '#2a2a28', color: sent ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: sent ? 'default' : 'pointer', minHeight: 48 }}>
                          {sent ? '✓ Terkirim' : '⚠ Blm Datang'}
                        </button>
                        <button
                          onClick={() => canStart && !busyId && handleStart(next.id)}
                          disabled={!canStart || !!busyId}
                          style={{ flex: 2, minWidth: 100, padding: 'clamp(10px,1.4vw,13px)', borderRadius: 9, background: canStart ? C.white : '#2a2a28', color: canStart ? C.text : '#555', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', border: 'none', cursor: canStart ? 'pointer' : 'not-allowed', minHeight: 48 }}>
                          {busyId === next.id ? '…' : active ? 'Selesaikan dulu ↑' : !canStart ? 'Tidak tersedia' : 'Mulai Melayani →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* No bookings */}
                  {!active && !next && (
                    <div style={{ padding: 'clamp(12px,1.6vw,16px)', textAlign: 'center' }}>
                      <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#666' }}>
                        {rawStatus === 'clocked_out' ? 'Belum masuk' : rawStatus === 'on_break' ? 'Sedang istirahat' : 'Antrian kosong'}
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
