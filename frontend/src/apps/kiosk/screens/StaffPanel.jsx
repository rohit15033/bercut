import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function StaffPanel({ branchId, onClose }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  const load = () => {
    setLoading(true)
    kioskApi.get(`/bookings?branch_id=${branchId}&date=${today}`)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const STATUS_COLORS = {
    confirmed:       '#1d4ed8',
    in_progress:     '#15803d',
    pending_payment: '#d97706',
    completed:       '#555',
    cancelled:       '#7f1d1d',
    no_show:         '#4a2020',
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:7000, background:C.topBg, display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'#1a1a18', padding:'clamp(12px,1.6vw,18px) clamp(16px,2.2vw,24px)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(16px,2vw,20px)', color:C.white }}>All Bookings Today</div>
          <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555' }}>{today} · {bookings.length} total</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ background:'#2a2a28', border:'none', borderRadius:8, padding:'8px 14px', color:'#888', fontSize:'clamp(12px,1.4vw,14px)', cursor:'pointer' }}>↻</button>
          <button onClick={onClose} style={{ background:'#2a2a28', border:'none', borderRadius:8, width:36, height:36, color:'#888', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
      </div>

      {/* List */}
      <div className="scroll-y" style={{ flex:1, padding:'clamp(12px,1.6vw,18px) clamp(16px,2.2vw,24px)' }}>
        {loading && <div style={{ color:'#555', textAlign:'center', paddingTop:40 }}>Loading…</div>}
        {!loading && bookings.length === 0 && (
          <div style={{ textAlign:'center', color:'#555', paddingTop:48, fontSize:'clamp(14px,1.6vw,16px)' }}>
            No bookings today · Tidak ada booking hari ini
          </div>
        )}
        {!loading && bookings.map(bk => (
          <div key={bk.id} style={{ background:'#1a1a18', borderRadius:12, padding:'clamp(12px,1.6vw,16px)', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(13px,1.5vw,16px)', color:C.white }}>{bk.customer_name || 'Guest'}</div>
              <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666', marginTop:2 }}>
                {bk.barber_name} · {bk.slot_time || 'Now'} · {fmt(bk.total_amount)}
              </div>
            </div>
            <span style={{ padding:'3px 8px', borderRadius:6, fontSize:'clamp(10px,1.1vw,11px)', fontWeight:700, background:STATUS_COLORS[bk.status] || '#2a2a28', color:C.white, flexShrink:0 }}>
              {bk.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
