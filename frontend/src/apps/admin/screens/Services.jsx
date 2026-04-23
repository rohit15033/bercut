import { useEffect, useState, useCallback } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

const CAT_FILTERS = [
  { key: 'all',        label: 'All'        },
  { key: 'haircut',    label: 'Haircut'    },
  { key: 'beard',      label: 'Beard'      },
  { key: 'treatment',  label: 'Treatment'  },
  { key: 'package',    label: 'Package'    },
  { key: 'hair_color', label: 'Hair Color' },
]

const SVC_CAT_META = {
  haircut:    { label: 'Haircut',    color: '#1D4ED8', bg: '#DBEAFE' },
  beard:      { label: 'Beard',      color: '#065F46', bg: '#D1FAE5' },
  treatment:  { label: 'Treatment',  color: '#6D28D9', bg: '#EDE9FE' },
  hair_color: { label: 'Hair Color', color: '#B45309', bg: '#FEF3C7' },
  package:    { label: 'Package',    color: '#1E40AF', bg: '#DBEAFE' },
}

// ── ServiceModal ──────────────────────────────────────────────────────────────

function ServiceModal({ service, consumableItems, onClose, onSaved }) {
  const isNew = !service
  const [form, setForm] = useState(service ? {
    name: service.name || '', name_id: service.name_id || '', category: service.category || 'haircut',
    duration_minutes: service.duration_minutes || 30, base_price: service.price || service.base_price || 0,
    badge: service.badge || '', is_active: service.is_active !== false,
    image_url: service.image_url || '',
    description: service.description || '',
    sort_order: service.sort_order || 0,
    mutex_group: service.mutex_group || null,
    consumables: [],
    packageServices: [],
  } : {
    name: '', name_id: '', category: 'haircut', duration_minutes: 30, base_price: 0, badge: '', is_active: true, image_url: '',
    description: '', sort_order: 0, mutex_group: null, consumables: [],
    packageServices: [],
  })
  const [allServices, setAllServices] = useState([])
  const [orPairs,    setOrPairs]    = useState([]) // [{ a: serviceId, b: serviceId }, ...]
  const [addItem,    setAddItem]    = useState('')
  const [addQty,     setAddQty]     = useState(1)
  const [saving,     setSaving]     = useState(false)
  const [uploading,  setUploading]  = useState(false) // reused for save phase
  const [pendingFile, setPendingFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(service?.image_url || '')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/services').then(rows => {
      if (Array.isArray(rows)) {
        setAllServices(rows.filter(s => s.id !== service?.id && s.category !== 'package'))
      }
    }).catch(() => {})

    if (service?.id) {
      api.get(`/services/${service.id}/consumables`).then(rows => {
        if (Array.isArray(rows)) {
          setForm(f => ({ ...f, consumables: rows.map(r => ({ itemId: r.item_id, qty: r.qty_per_use, name: r.item_name, unit: r.unit })) }))
        }
      }).catch(() => {})

      if (service.category === 'package') {
        api.get(`/services/${service.id}/package-services`).then(rows => {
          if (Array.isArray(rows)) {
            setForm(f => ({ ...f, packageServices: rows.map(r => r.service_id) }))
            // Rebuild orPairs from or_group values
            const grouped = {}
            rows.forEach(r => { if (r.or_group) { (grouped[r.or_group] = grouped[r.or_group] || []).push(r.service_id) } })
            setOrPairs(Object.values(grouped).filter(g => g.length === 2).map(([a, b]) => ({ a, b })))
          }
        }).catch(() => {})
      }
    }
  }, [service?.id, service?.category])

  function addConsumable() {
    if (!addItem) return
    if (form.consumables.some(c => c.itemId === addItem)) return
    const item = consumableItems.find(i => i.id === addItem)
    set('consumables', [...form.consumables, { itemId: addItem, qty: addQty, name: item?.name, unit: item?.unit }])
    setAddItem(''); setAddQty(1)
  }
  function removeConsumable(itemId) { set('consumables', form.consumables.filter(c => c.itemId !== itemId)) }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const MAX = 1200 
        
        if (width > height) {
          if (width > MAX) {
            height *= MAX / width
            width = MAX
          }
        } else {
          if (height > MAX) {
            width *= MAX / height
            height = MAX
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
          setPendingFile(optimizedFile)
          setImgPreview(canvas.toDataURL('image/jpeg', 0.9))
        }, 'image/jpeg', 0.9)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  function togglePackageService(id) {
    if (form.packageServices.includes(id)) {
      set('packageServices', form.packageServices.filter(x => x !== id))
      setOrPairs(p => p.filter(pair => pair.a !== id && pair.b !== id))
    } else {
      set('packageServices', [...form.packageServices, id])
    }
  }

  function addOrPair()              { setOrPairs(p => [...p, { a: '', b: '' }]) }
  function removeOrPair(idx)        { setOrPairs(p => p.filter((_, i) => i !== idx)) }
  function updateOrPair(idx, side, val) {
    setOrPairs(p => p.map((pair, i) => i === idx ? { ...pair, [side]: val } : pair))
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    try {
      let finalImageUrl = form.image_url
      const oldImageUrl = service?.image_url

      // 1. Upload pending file if exists
      if (pendingFile) {
        const formData = new FormData()
        formData.append('image', pendingFile)
        const res = await api.post('/upload/image', formData)
        finalImageUrl = res.url
      }

      // 2. Prepare payload
      const payload = {
        name: form.name,
        name_id: form.name_id,
        category: form.category,
        base_price: form.base_price,
        duration_minutes: form.duration_minutes,
        badge: form.badge || null,
        is_active: form.is_active,
        image_url: finalImageUrl || null,
        description: form.description || null,
        sort_order: form.sort_order || 0,
        mutex_group: form.mutex_group || null,
      }

      // 3. Save Service
      let svcId = service?.id
      if (isNew) {
        const r = await api.post('/services', payload)
        svcId = r.id
      } else {
        await api.patch(`/services/${service.id}`, payload)
      }

      // 3b. Save Package Services with or_group assignments
      if (form.category === 'package') {
        const orGroupMap = {}
        orPairs.forEach((pair, idx) => {
          if (pair.a && pair.b) { orGroupMap[pair.a] = idx + 1; orGroupMap[pair.b] = idx + 1 }
        })
        await api.put(`/services/${svcId}/package-services`, {
          services: form.packageServices.map(id => ({ service_id: id, or_group: orGroupMap[id] || null }))
        })
      }

      if (svcId) {
        await api.put(`/services/${svcId}/consumables`, {
          consumables: form.consumables.map(c => ({ item_id: c.itemId, qty_per_use: c.qty }))
        })
      }

      // 4. Cleanup old image if it was replaced or removed
      if (oldImageUrl && oldImageUrl !== finalImageUrl && oldImageUrl.startsWith('/uploads/')) {
        api.delete('/upload/image', { url: oldImageUrl }).catch(err => console.error('Failed to cleanup old image:', err))
      }

      onSaved()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fldStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, boxSizing: 'border-box', background: T.white }
  const lblStyle = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 500, padding: '24px 28px', animation: 'scaleIn 0.2s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 18, color: T.text }}>{isNew ? 'Add Service' : 'Edit Service'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lblStyle}>Name (English)</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={fldStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lblStyle}>Name (Bahasa Indonesia)</label>
            <input value={form.name_id} onChange={e => set('name_id', e.target.value)} style={fldStyle} />
          </div>
          <div>
            <label style={lblStyle}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...fldStyle, padding: '9px 11px' }}>
              {CAT_FILTERS.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lblStyle}>Duration (min)</label>
            <input type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value) || 0)} style={fldStyle} />
          </div>
          <div>
            <label style={lblStyle}>Base Price (IDR)</label>
            <input type="number" value={form.base_price} onChange={e => set('base_price', parseInt(e.target.value) || 0)} style={fldStyle} />
          </div>
           <div>
            <label style={lblStyle}>Badge (optional)</label>
            <input value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g. Popular" style={fldStyle} />
          </div>
          <div>
            <label style={lblStyle}>Mutex Group (optional)</label>
            <input value={form.mutex_group || ''} onChange={e => set('mutex_group', e.target.value || null)} placeholder="e.g. haircut_type" style={fldStyle} />
          </div>
        </div>

        {/* Image — Hidden for Packages */}
        {form.category !== 'package' ? (
          <div style={{ marginTop: 14 }}>
            <label style={lblStyle}>Service Photo</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 72, height: 72, borderRadius: 10, border: `2px dashed ${T.border}`, background: T.surface, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imgPreview
                  ? <img src={imgPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22, color: T.muted }}>🖼</span>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-block', transition: 'all 0.15s' }}>
                    {imgPreview ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                  {imgPreview && (
                    <button onClick={() => { set('image_url', ''); setImgPreview(''); setPendingFile(null) }}
                      style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
                  Images are automatically optimized for kiosks.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#F0F9FF', borderRadius: 10, border: '1px solid #BAE6FD', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 18 }}>ℹ️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1' }}>Package Visuals</div>
              <div style={{ fontSize: 12, color: '#0EA5E9', marginTop: 2, lineHeight: 1.4 }}>
                Packages don't need a photo. They will automatically display a beautiful mosaic of the services included in the bundle.
              </div>
            </div>
          </div>
        )}


        {/* Package: Included Services + OR Pairs */}
        {form.category === 'package' && (
          <>
            {/* 1. Service checklist */}
            <div style={{ marginTop: 14 }}>
              <label style={lblStyle}>Included Services</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', padding: 12, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, maxHeight: 200, overflowY: 'auto' }}>
                {allServices.filter(s => !s.name.toLowerCase().includes('highlight')).map(s => {
                  const active = form.packageServices.includes(s.id)
                  return (
                    <div key={s.id} onClick={() => togglePackageService(s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: active ? T.white : 'transparent', border: `1px solid ${active ? T.topBg : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${active ? T.topBg : T.border}`, background: active ? T.topBg : T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {active && <span style={{ color: T.white, fontSize: 12, fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? T.text : T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. OR Pairs — only shown when 2+ services selected */}
            {form.packageServices.length >= 2 && (
              <div style={{ marginTop: 12 }}>
                <label style={lblStyle}>OR Pairs <span style={{ fontWeight: 400, textTransform: 'none', color: T.muted }}>(optional)</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orPairs.map((pair, idx) => {
                    const available = (side) => allServices
                      .filter(s => form.packageServices.includes(s.id))
                      .filter(s => {
                        const other = side === 'a' ? pair.b : pair.a
                        if (s.id === other) return false
                        // Not already used in another pair
                        return !orPairs.some((p, i) => i !== idx && (p.a === s.id || p.b === s.id))
                      })
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select value={pair.a} onChange={e => updateOrPair(idx, 'a', e.target.value)}
                          style={{ ...fldStyle, flex: 1, padding: '7px 9px', fontSize: 13 }}>
                          <option value="">Select service…</option>
                          {available('a').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          {pair.a && allServices.find(s => s.id === pair.a) && (
                            <option value={pair.a}>{allServices.find(s => s.id === pair.a).name}</option>
                          )}
                        </select>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>or</span>
                        <select value={pair.b} onChange={e => updateOrPair(idx, 'b', e.target.value)}
                          style={{ ...fldStyle, flex: 1, padding: '7px 9px', fontSize: 13 }}>
                          <option value="">Select service…</option>
                          {available('b').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          {pair.b && allServices.find(s => s.id === pair.b) && (
                            <option value={pair.b}>{allServices.find(s => s.id === pair.b).name}</option>
                          )}
                        </select>
                        <button onClick={() => removeOrPair(idx)}
                          style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                          ×
                        </button>
                      </div>
                    )
                  })}
                  <button onClick={addOrPair}
                    style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 7, border: `1.5px dashed ${T.border}`, background: 'transparent', color: T.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    + Add OR Pair
                  </button>
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                  Paired services show as <strong>A / B</strong> on the kiosk — barber asks the customer which they prefer.
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading || !form.name}
            style={{ flex: 2, padding: 11, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: (saving || uploading) ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isNew ? 'Add Service' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BranchConfigRow ───────────────────────────────────────────────────────────

function BranchConfigRow({ service, branches, onClose, onSaved }) {
  const [configs,  setConfigs]  = useState(() => Object.fromEntries(branches.map(b => [b.id, { is_available: true, price: '', commission_rate: '' }])))
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    api.get(`/services/${service.id}/branch-config`).then(rows => {
      const map = Object.fromEntries(branches.map(b => [b.id, { is_available: true, price: '', commission_rate: '' }]))
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (map[r.branch_id]) {
            map[r.branch_id] = {
              is_available: r.is_available !== false,
              price: r.price ? String(r.price) : '',
              commission_rate: r.commission_rate ? String(r.commission_rate) : ''
            }
          }
        })
      }
      setConfigs(map)
    }).catch(() => {})
  }, [service.id, branches])

  function setAvailable(branchId, val) { setConfigs(p => ({ ...p, [branchId]: { ...p[branchId], is_available: val } })) }
  function setPrice(branchId, val)     { setConfigs(p => ({ ...p, [branchId]: { ...p[branchId], price: val } })) }
  function setCommRate(branchId, val)  { setConfigs(p => ({ ...p, [branchId]: { ...p[branchId], commission_rate: val } })) }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all(branches.map(b => {
        const c = configs[b.id]
          return api.put(`/services/${service.id}/branch-config`, {
            branch_id: b.id,
            is_available: c.is_available,
            price: (c.price !== '' && c.price !== null) ? parseInt(c.price) : null,
            commission_rate: (c.commission_rate !== '' && c.commission_rate !== null) ? parseFloat(c.commission_rate) : null,
          })
      }))
      onSaved()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ gridColumn: '1 / -1', padding: '16px 18px 18px', background: T.bg, borderTop: `1px solid ${T.surface}`, borderBottom: `1px solid ${T.surface}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.1em' }}>
          Per-Branch Availability & Price
        </div>
        <div style={{ fontSize: 12, color: T.muted }}>Base price: {fmt(service.price || service.base_price)}. Leave price blank to keep default.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 16 }}>
        {branches.map(b => {
          const c = configs[b.id] || {}
          const available = c.is_available !== false
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: available ? T.white : T.surface2, border: `1px solid ${available ? T.border : T.surface2}`, transition: 'all 0.15s' }}>
              <div onClick={() => setAvailable(b.id, !available)}
                style={{ width: 34, height: 19, borderRadius: 10, background: available ? T.topBg : T.muted, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}>
                <div style={{ position: 'absolute', top: 2, left: available ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: T.white, transition: 'left 0.15s' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: available ? T.text : T.muted, minWidth: 72, flexShrink: 0 }}>{b.name}</span>
              {available ? (
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, borderRadius: 7, border: `1.5px solid ${c.price ? T.topBg : T.border}`, overflow: 'hidden', background: T.white }}>
                    <span style={{ padding: '0 6px', fontSize: 10, color: T.muted, background: T.surface, borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap', lineHeight: '30px' }}>Rp</span>
                    <input type="number" value={c.price} onChange={e => setPrice(b.id, e.target.value)}
                      placeholder={String(service.price || service.base_price || 0)}
                      style={{ flex: 1, padding: '6px 6px', border: 'none', fontSize: 12, color: c.price ? T.text : T.muted, background: 'transparent', minWidth: 0 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', width: 72, borderRadius: 7, border: `1.5px solid ${c.commission_rate ? T.topBg : T.border}`, overflow: 'hidden', background: T.white }}>
                    <input type="number" value={c.commission_rate} onChange={e => setCommRate(b.id, e.target.value)}
                      placeholder="35"
                      style={{ flex: 1, padding: '6px 6px', border: 'none', fontSize: 12, color: c.commission_rate ? T.text : T.muted, background: 'transparent', minWidth: 0, textAlign: 'right' }} />
                    <span style={{ padding: '0 6px', fontSize: 10, color: T.muted, background: T.surface, borderLeft: `1px solid ${T.border}`, lineHeight: '30px' }}>%</span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: T.muted, flex: 1, fontStyle: 'italic' }}>Not offered at this branch</span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '7px 16px', borderRadius: 7, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Config'}
        </button>
        <button onClick={onClose}
          style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Services() {
  const [branches,       setBranches]       = useState([])
  const [services,       setServices]       = useState([])
  const [consumables,    setConsumables]    = useState([])
  const [catFilter,      setCatFilter]      = useState('all')
  const [showModal,      setShowModal]      = useState(false)
  const [editService,    setEditService]    = useState(null)
  const [expandedConfig, setExpandedConfig] = useState(null)
  const [loading,        setLoading]        = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [brs, svcs, inv] = await Promise.all([
        api.get('/branches'),
        api.get('/services'),
        api.get('/inventory?category=service_consumable').catch(() => []),
      ])
      setBranches(Array.isArray(brs) ? brs : [])
      setServices(Array.isArray(svcs) ? svcs : [])
      setConsumables(Array.isArray(inv) ? inv.filter(i => i.category === 'service_consumable' || i.is_consumable) : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered    = catFilter === 'all' ? services : services.filter(s => s.category === catFilter)
  const activeCount = services.filter(s => s.is_active !== false).length

  if (loading) return <div style={{ padding: 40, color: T.muted }}>Loading…</div>

  return (
    <div style={{ padding: '28px 32px' }}>
      <style>{`@keyframes scaleIn { from { transform: scale(0.96); opacity:0; } to { transform: scale(1); opacity:1; } }`}</style>
      {showModal && (
        <ServiceModal service={editService} consumableItems={consumables}
          onClose={() => { setShowModal(false); setEditService(null) }}
          onSaved={loadData} />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Service Catalogue</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{activeCount} active services</div>
        </div>
        <button onClick={() => { setEditService(null); setShowModal(true) }}
          style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Add Service
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {CAT_FILTERS.map(f => (
          <button key={f.key} onClick={() => setCatFilter(f.key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${catFilter === f.key ? T.topBg : T.border}`, background: catFilter === f.key ? T.topBg : 'transparent', color: catFilter === f.key ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1fr 0.5fr 0.9fr 0.8fr 1fr 0.7fr 0.5fr', padding: '10px 18px', borderBottom: `1px solid ${T.surface}` }}>
          {['', 'Service', 'Category', 'Duration', 'Base Price', 'Consumables', 'Branch Config', 'Status', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
          ))}
        </div>

        <div style={{ maxHeight: 'calc(100vh - 240px)', minHeight: 200, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No services in this category</div>
          )}
          {filtered.map((s, i) => {
            const cm = SVC_CAT_META[s.category] || { label: s.category, color: T.text, bg: T.surface }
            const isExpanded = expandedConfig === s.id

            return (
              <div key={s.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.surface}` : 'none', opacity: s.is_active !== false ? 1 : 0.5, animation: `fadeUp 0.2s ease ${i * 0.025}s both` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1fr 0.5fr 0.9fr 0.8fr 1fr 0.7fr 0.5fr', padding: '12px 18px', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Thumbnail */}
                  <div style={{ width: 36, height: 36, borderRadius: 7, background: T.surface2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.image_url
                      ? <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                      : <span style={{ fontSize: 16, color: T.muted }}>✂</span>}
                  </div>

                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{s.name}</div>
                    {s.name_id && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{s.name_id}</div>}
                  </div>

                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cm.bg, color: cm.color }}>{cm.label}</span>
                  </div>

                  <div style={{ fontSize: 13, color: T.text2 }}>{s.duration_minutes} min</div>

                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{fmt(s.price || s.base_price || 0)}</div>

                  <div>
                    <span style={{ fontSize: 11, color: T.muted }}>—</span>
                  </div>

                  <div>
                    <button onClick={() => setExpandedConfig(v => v === s.id ? null : s.id)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      Configure ▾
                    </button>
                  </div>

                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: s.is_active !== false ? '#F0FDF4' : T.surface2, color: s.is_active !== false ? '#16A34A' : T.muted }}>
                      {s.is_active !== false ? 'Active' : 'Off'}
                    </span>
                  </div>

                  <button onClick={() => { setEditService(s); setShowModal(true) }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>

                {isExpanded && (
                  <BranchConfigRow service={s} branches={branches}
                    onClose={() => setExpandedConfig(null)} onSaved={loadData} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
