import { useState, useEffect, useRef } from "react";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');`;

const C = {
  bg: "#FAFAF8", surface: "#F2F0EB", surface2: "#ECEAE4",
  accent: "#F5E200", accentText: "#111110",
  text: "#111110", text2: "#3a3a38", muted: "#88887e",
  border: "#DDDBD4", topBg: "#111110", topText: "#F5E200",
  white: "#FFFFFF", danger: "#C0272D", green: "#1e5c3a",
};

const SERVICES = [
  { id:1, cat:"Haircut", name:"Classic Cut", nameId:"Potong Klasik", dur:30, price:85000 },
  { id:2, cat:"Haircut", name:"Fade & Style", nameId:"Fade & Styling", dur:45, price:120000 },
  { id:3, cat:"Haircut", name:"Kids Cut", nameId:"Potong Anak", dur:25, price:65000 },
  { id:4, cat:"Beard", name:"Beard Trim", nameId:"Rapikan Jenggot", dur:20, price:60000 },
  { id:5, cat:"Beard", name:"Hot Towel Shave", nameId:"Cukur Mewah", dur:35, price:95000 },
  { id:6, cat:"Color", name:"Full Color", nameId:"Pewarnaan Penuh", dur:90, price:250000 },
  { id:7, cat:"Color", name:"Highlights", nameId:"Highlight Rambut", dur:75, price:200000 },
  { id:8, cat:"Package", name:"Cut + Beard", nameId:"Potong + Jenggot", dur:55, price:165000, badge:"Hemat 10%" },
  { id:9, cat:"Package", name:"Full Groom", nameId:"Perawatan Lengkap", dur:130, price:380000, badge:"Terbaik" },
];

const BARBERS = [
  { id:1, name:"Kadek", spec:"Fades & Texture", specId:"Fade & Tekstur", slots:["09:00","09:30","10:30","11:00","14:00","15:30"], rating:4.9, cuts:1240 },
  { id:2, name:"Wayan", spec:"Classic & Beard", specId:"Klasik & Jenggot", slots:["09:30","10:00","11:30","13:00","14:30","16:00"], rating:4.8, cuts:980 },
  { id:3, name:"Made", spec:"Color Specialist", specId:"Spesialis Warna", slots:["10:00","10:30","12:00","13:30","15:00"], rating:4.9, cuts:760 },
  { id:4, name:"Nyoman", spec:"Hot Towel Shave", specId:"Cukur Mewah", slots:["09:00","10:30","12:30","14:00","15:00"], rating:4.7, cuts:890 },
];

const TIPS = [10000, 20000, 50000];
const CATS = ["Semua","Haircut","Beard","Color","Package"];
const fmt = n => "Rp " + n.toLocaleString("id-ID");

const GS = () => (
  <style>{`
    ${FONT}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};min-height:100vh}
    h1,h2,h3{font-family:'Barlow Condensed',sans-serif}
    button{cursor:pointer;border:none;font-family:'DM Sans',sans-serif;outline:none}
    input{font-family:'DM Sans',sans-serif;outline:none}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
    @keyframes pop{0%{transform:scale(1)}45%{transform:scale(1.1)}100%{transform:scale(1)}}
    @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    .fu{animation:fadeUp 0.3s ease both}
    .fi{animation:fadeIn 0.22s ease both}
    .si{animation:scaleIn 0.28s ease both}
    .card{background:${C.white};border:1.5px solid ${C.border};border-radius:14px;transition:all 0.18s}
    .card:hover{border-color:#bbb;transform:translateY(-1px)}
    .card.sel{background:${C.accent};border-color:${C.accent}}
    .card.sel:hover{transform:translateY(-1px)}
    .btnP{background:${C.topBg};color:${C.white};padding:16px 28px;border-radius:12px;font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;letter-spacing:0.04em;transition:all 0.15s;width:100%;border:none}
    .btnP:hover{background:#2a2a28}
    .btnP:active{transform:scale(0.98)}
    .btnP:disabled{background:${C.surface2};color:${C.muted};transform:none;cursor:not-allowed}
    .btnG{background:transparent;color:${C.text2};padding:12px 20px;border-radius:10px;font-size:15px;font-weight:500;border:1.5px solid ${C.border};transition:all 0.15s}
    .btnG:hover{background:${C.surface}}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
  `}</style>
);

// ── Topbar ──
function Topbar({ step, cartTotal }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const steps = ["Layanan","Kapster","Waktu","Konfirmasi"];
  return (
    <div style={{ background: C.topBg }}>
      <div style={{ padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:C.accent, padding:"3px 10px", borderRadius:5 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:14, color:C.accentText, letterSpacing:"0.1em" }}>BERCUT</span>
          </div>
          <span style={{ color:"#555", fontSize:12 }}>Seminyak</span>
        </div>
        {step > 0 && step < 5 && (
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            {steps.map((s,i) => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, opacity: i+1 <= step ? 1 : 0.3, transition:"opacity 0.3s" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background: i+1 < step ? C.accent : i+1===step ? C.white : "transparent", border:`1.5px solid ${i+1<=step?C.accent:"#333"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color: i+1<step?C.accentText:i+1===step?C.topBg:"#555", transition:"all 0.3s" }}>{i+1<step?"✓":i+1}</div>
                  <span style={{ fontSize:11, color:i+1===step?C.white:"#666", fontWeight:i+1===step?600:400 }}>{s}</span>
                </div>
                {i<3 && <span style={{ color:"#333", fontSize:10 }}>›</span>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {cartTotal > 0 && step > 0 && step < 5 && (
            <div style={{ background:"#1a1a18", padding:"5px 12px", borderRadius:7 }}>
              <span style={{ color:C.accent, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15 }}>{fmt(cartTotal)}</span>
            </div>
          )}
          <span style={{ fontSize:12, color:"#555" }}>{time.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      </div>
      {step > 0 && step < 5 && (
        <div style={{ display:"flex", gap:2, padding:"0 0 0 0" }}>
          {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:3, background:i<=step?C.accent:"#222", transition:"background 0.4s" }}/>)}
        </div>
      )}
    </div>
  );
}

// ── Welcome ──
function Welcome({ onStart }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const tickerItems = ["BERCUT BARBERSHOP","SEMINYAK","CANGGU","UBUD","ULUWATU","SANUR","DEWI SRI","NO.1 BARBERSHOP IN BALI","BUKA 10:00–20:00"];

  return (
    <div style={{ minHeight:"calc(100vh - 55px)", display:"flex", flexDirection:"column", background:C.bg }}>
      <div style={{ background:C.accent, height:5 }}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 32px" }}>
        <div className="fu" style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"flex", alignItems:"center", gap:18, justifyContent:"center", marginBottom:20 }}>
            <div style={{ width:2, height:64, background:C.topBg }}/>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:80, lineHeight:0.88, letterSpacing:"-0.03em", color:C.text }}>BERCUT</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:400, fontSize:20, letterSpacing:"0.28em", color:C.muted }}>BARBERSHOP</div>
            </div>
            <div style={{ width:2, height:64, background:C.topBg }}/>
          </div>
          <div style={{ background:C.accent, display:"inline-block", padding:"4px 18px", borderRadius:4 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:"0.18em", color:C.accentText }}>SEMINYAK · BALI</span>
          </div>
        </div>

        <div className="fu" style={{ textAlign:"center", marginBottom:44, animationDelay:"0.08s" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:88, fontWeight:900, color:C.text, lineHeight:1, letterSpacing:"-0.04em" }}>
            {time.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}
          </div>
          <div style={{ fontSize:14, color:C.muted, marginTop:4 }}>
            {time.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>

        <div className="fu" style={{ width:"100%", maxWidth:520, animationDelay:"0.16s" }}>
          <button onClick={onStart} style={{ width:"100%", background:C.topBg, color:C.white, padding:"22px 28px", borderRadius:14, border:"none", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:800, letterSpacing:"0.05em", display:"flex", alignItems:"center", justifyContent:"center", gap:14, transition:"background 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#2a2a28"}
            onMouseLeave={e=>e.currentTarget.style.background=C.topBg}>
            <span style={{ fontSize:22 }}>✂</span>
            Mulai Booking / Start Booking
          </button>
          <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:C.muted }}>Sentuh layar untuk memulai · Touch screen to begin</div>
        </div>
      </div>

      <div style={{ background:C.topBg, overflow:"hidden", padding:"9px 0" }}>
        <div style={{ display:"flex", gap:40, animation:"ticker 18s linear infinite", width:"max-content" }}>
          {[...tickerItems,...tickerItems].map((t,i) => (
            <span key={i} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:"0.14em", color:i%2===0?C.accent:"#444", whiteSpace:"nowrap" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Services ──
function StepServices({ cart, setCart, onNext, onBack }) {
  const [cat, setCat] = useState("Semua");
  const filtered = cat==="Semua" ? SERVICES : SERVICES.filter(s=>s.cat===cat);
  const total = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.price||0),0);
  const dur = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.dur||0),0);
  const toggle = id => setCart(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);

  return (
    <div style={{ minHeight:"calc(100vh - 55px)", display:"flex" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
        <div className="fu" style={{ marginBottom:22 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:3 }}>Pilih layanan Anda</div>
          <h2 style={{ fontSize:40, fontWeight:900, letterSpacing:"-0.01em", lineHeight:1 }}>Choose Your Service</h2>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:"7px 18px", borderRadius:999, fontSize:13, fontWeight:600, background:cat===c?C.topBg:C.white, color:cat===c?C.white:C.text2, border:`1.5px solid ${cat===c?C.topBg:C.border}`, transition:"all 0.15s" }}>{c}</button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
          {filtered.map((s,i)=>{
            const sel=cart.includes(s.id);
            return (
              <div key={s.id} className={`fu card ${sel?"sel":""}`} style={{ animationDelay:`${i*0.04}s`, padding:18, cursor:"pointer" }} onClick={()=>toggle(s.id)}>
                {s.badge && <div style={{ display:"inline-block", background:sel?C.accentText:C.topBg, color:sel?C.accent:C.white, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, marginBottom:8, letterSpacing:"0.06em" }}>{s.badge}</div>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800, color:sel?C.accentText:C.text, lineHeight:1.1 }}>{s.name}</div>
                    <div style={{ fontSize:12, color:sel?"#1a1a1899":C.muted, marginTop:1 }}>{s.nameId}</div>
                  </div>
                  {sel && <div style={{ width:22, height:22, background:C.accentText, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:C.accent, fontWeight:800, flexShrink:0 }}>✓</div>}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
                  <span style={{ fontSize:12, color:sel?"#1a1a1888":C.muted }}>⏱ {s.dur} min</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:sel?C.accentText:C.text }}>{fmt(s.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width:280, borderLeft:`1px solid ${C.border}`, background:C.bg, display:"flex", flexDirection:"column", padding:20 }}>
        <div style={{ fontSize:11, letterSpacing:"0.14em", fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Pilihan Anda</div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {cart.length===0 ? (
            <div style={{ textAlign:"center", padding:"36px 0", color:C.muted }}>
              <div style={{ fontSize:28, opacity:0.25, marginBottom:8 }}>✂</div>
              <div style={{ fontSize:13 }}>Belum ada pilihan</div>
              <div style={{ fontSize:11, marginTop:3, opacity:0.7 }}>No services selected</div>
            </div>
          ) : cart.map(id=>{
            const s=SERVICES.find(x=>x.id===id);
            return (
              <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <div><div style={{ fontSize:13, fontWeight:600 }}>{s.name}</div><div style={{ fontSize:11, color:C.muted }}>{fmt(s.price)}</div></div>
                <button onClick={()=>toggle(id)} style={{ background:"none", color:C.muted, fontSize:16, padding:"2px 6px", borderRadius:6, transition:"color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.color=C.danger} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>×</button>
              </div>
            );
          })}
        </div>
        {cart.length>0 && (
          <div style={{ borderTop:`2px solid ${C.topBg}`, paddingTop:12, marginTop:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:12, color:C.muted }}>Durasi</span><span style={{ fontSize:12 }}>{dur} menit</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600 }}>Total</span><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900 }}>{fmt(total)}</span></div>
          </div>
        )}
        <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
          <button className="btnP" disabled={cart.length===0} onClick={onNext}>Lanjutkan →</button>
          <button className="btnG" onClick={onBack}>← Kembali</button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Barber ──
function StepBarber({ barber, setBarber, onNext, onBack }) {
  return (
    <div style={{ minHeight:"calc(100vh - 55px)", padding:"24px 28px", display:"flex", flexDirection:"column" }}>
      <div className="fu" style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:3 }}>Pilih kapster Anda</div>
        <h2 style={{ fontSize:40, fontWeight:900, letterSpacing:"-0.01em", lineHeight:1 }}>Choose Your Barber</h2>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
        {BARBERS.map((b,i)=>{
          const sel=barber?.id===b.id;
          return (
            <div key={b.id} className={`fu card ${sel?"sel":""}`} style={{ animationDelay:`${i*0.07}s`, padding:22, cursor:"pointer", textAlign:"center" }} onClick={()=>setBarber(b)}>
              {/* SVG Avatar with photo placeholder */}
              <div style={{ position:"relative", width:80, height:80, margin:"0 auto 14px" }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="40" fill={sel?C.accentText:C.surface2}/>
                  <circle cx="40" cy="28" r="14" fill={sel?C.accent+"44":"#11111022"}/>
                  <ellipse cx="40" cy="64" rx="22" ry="14" fill={sel?C.accent+"44":"#11111022"}/>
                  <text x="40" y="46" textAnchor="middle" fontSize="22" fontWeight="900" fill={sel?C.accent:C.topBg} fontFamily="Barlow Condensed,sans-serif">{b.name.slice(0,2).toUpperCase()}</text>
                </svg>
                {sel && <div style={{ position:"absolute", bottom:2, right:2, width:22, height:22, background:C.white, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:C.accentText }}>✓</div>}
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26, fontWeight:900, color:sel?C.accentText:C.text, marginBottom:3, lineHeight:1 }}>{b.name}</div>
              <div style={{ fontSize:12, color:sel?"#1a1a1888":C.muted, marginBottom:14 }}>{b.spec}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:14, marginBottom:14 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, color:sel?C.accentText:C.text }}>★ {b.rating}</div>
                  <div style={{ fontSize:10, color:sel?"#1a1a1877":C.muted }}>Rating</div>
                </div>
                <div style={{ width:1, background:sel?"#1a1a1822":C.border }}/>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, color:sel?C.accentText:C.text }}>{b.cuts.toLocaleString()}</div>
                  <div style={{ fontSize:10, color:sel?"#1a1a1877":C.muted }}>Cuts</div>
                </div>
              </div>
              <div style={{ background:sel?"#1a1a1814":C.surface, borderRadius:8, padding:"5px 10px", display:"inline-block" }}>
                <span style={{ fontSize:11, color:sel?C.accentText:C.muted }}>Next: </span>
                <span style={{ fontSize:12, fontWeight:700, color:sel?C.accentText:C.text }}>{b.slots[0]}</span>
              </div>
            </div>
          );
        })}

        {/* Any barber */}
        <div className={`fu card ${barber?.id===0?"sel":""}`} style={{ animationDelay:"0.28s", padding:22, cursor:"pointer", display:"flex", alignItems:"center", gap:16, gridColumn:"1/-1" }} onClick={()=>setBarber({id:0,name:"Kapster Tersedia",spec:"Barber tercepat tersedia",slots:["09:00","09:30","10:00","10:30","11:00"]})}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:barber?.id===0?C.accentText:C.surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>🎲</div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800, color:barber?.id===0?C.accentText:C.text }}>Kapster Mana Saja / Any Available Barber</div>
            <div style={{ fontSize:12, color:barber?.id===0?"#1a1a1888":C.muted }}>Antrian tercepat · Fastest available queue</div>
          </div>
          {barber?.id===0 && <div style={{ marginLeft:"auto", width:24, height:24, background:C.white, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:C.accentText }}>✓</div>}
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginTop:24 }}>
        <button className="btnG" onClick={onBack} style={{ width:160 }}>← Kembali</button>
        <button className="btnP" disabled={!barber} onClick={onNext}>Lanjutkan →</button>
      </div>
    </div>
  );
}

// ── Step 3: Time ──
function StepTime({ barber, slot, setSlot, onNext, onBack }) {
  const today = new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"});
  return (
    <div style={{ minHeight:"calc(100vh - 55px)", padding:"24px 28px", display:"flex", flexDirection:"column" }}>
      <div className="fu" style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:3 }}>Pilih waktu</div>
        <h2 style={{ fontSize:40, fontWeight:900, letterSpacing:"-0.01em", lineHeight:1 }}>Pick Your Time</h2>
        <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{barber?.name} · {today}</div>
      </div>

      <div className="fu" style={{ animationDelay:"0.07s", marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Slot Tersedia / Available Slots</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          {(barber?.slots||[]).map((s,i)=>(
            <button key={s} onClick={()=>setSlot(s)} style={{ padding:"13px 22px", borderRadius:12, fontSize:18, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, background:slot===s?C.topBg:C.white, color:slot===s?C.white:C.text, border:`2px solid ${slot===s?C.topBg:C.border}`, transition:"all 0.15s", minWidth:92, animation:`fadeUp 0.28s ease ${i*0.04}s both` }}>{s}</button>
          ))}
        </div>
      </div>

      {slot && (
        <div className="si" style={{ background:C.accent, borderRadius:14, padding:"16px 22px", marginBottom:24, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color:C.accentText }}>✓</div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800, color:C.accentText }}>Slot dipilih: {slot}</div>
            <div style={{ fontSize:13, color:"#1a1a1899" }}>Kapster {barber?.name} · {today}</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:12, marginTop:"auto" }}>
        <button className="btnG" onClick={onBack} style={{ width:160 }}>← Kembali</button>
        <button className="btnP" disabled={!slot} onClick={onNext}>Lanjutkan →</button>
      </div>
    </div>
  );
}

// ── Step 4: Confirm ──
function StepConfirm({ cart, barber, slot, name, setName, phone, setPhone, onConfirm, onBack }) {
  const total = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.price||0),0);
  const dur = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.dur||0),0);
  const [tip, setTip] = useState(null);
  const [customTip, setCustomTip] = useState("");
  const tipAmt = tip==="custom"?(parseInt(customTip.replace(/\D/g,""))||0):(tip||0);
  const grand = total + tipAmt;

  return (
    <div style={{ minHeight:"calc(100vh - 55px)", padding:"24px 28px", display:"flex", gap:24 }}>
      <div style={{ flex:1 }}>
        <div className="fu" style={{ marginBottom:22 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:3 }}>Konfirmasi pesanan</div>
          <h2 style={{ fontSize:40, fontWeight:900, letterSpacing:"-0.01em", lineHeight:1 }}>Review & Confirm</h2>
        </div>

        {/* Summary */}
        <div className="fu" style={{ animationDelay:"0.06s", background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Ringkasan / Summary</div>
          {cart.map(id=>{
            const s=SERVICES.find(x=>x.id===id);
            return <div key={id} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}><div><div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div><div style={{ fontSize:11, color:C.muted }}>{s.dur} menit</div></div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700 }}>{fmt(s.price)}</div></div>;
          })}
          {[["Kapster",barber?.name],["Waktu",slot],["Durasi",`${dur} menit`]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, color:C.muted }}>{k}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
            </div>
          ))}
          {tipAmt>0 && <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}><span style={{ fontSize:13, color:C.muted }}>Tip</span><span style={{ fontSize:13, fontWeight:600 }}>{fmt(tipAmt)}</span></div>}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800 }}>TOTAL</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900 }}>{fmt(grand)}</span>
          </div>
        </div>

        {/* Tip */}
        <div className="fu" style={{ animationDelay:"0.1s", background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Tambahkan Tip? / Add a Tip?</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {TIPS.map(t=>(
              <button key={t} onClick={()=>setTip(tip===t?null:t)} style={{ padding:"10px 18px", borderRadius:10, fontSize:15, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, background:tip===t?C.topBg:C.surface, color:tip===t?C.white:C.text, border:`2px solid ${tip===t?C.topBg:C.border}`, transition:"all 0.15s" }}>Rp {t/1000}k</button>
            ))}
            <button onClick={()=>setTip("custom")} style={{ padding:"10px 18px", borderRadius:10, fontSize:15, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, background:tip==="custom"?C.topBg:C.surface, color:tip==="custom"?C.white:C.text, border:`2px solid ${tip==="custom"?C.topBg:C.border}`, transition:"all 0.15s" }}>Custom</button>
            <button onClick={()=>{setTip(null);setCustomTip("");}} style={{ padding:"10px 18px", borderRadius:10, fontSize:15, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, background:C.surface, color:C.muted, border:`2px solid ${C.border}`, transition:"all 0.15s" }}>Tidak / No</button>
          </div>
          {tip==="custom" && (
            <input value={customTip} onChange={e=>setCustomTip(e.target.value)} placeholder="Jumlah tip..." style={{ marginTop:12, width:"100%", padding:"11px 14px", borderRadius:10, border:`2px solid ${C.topBg}`, fontSize:16, background:C.bg }} />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:300 }}>
        <div className="fu" style={{ animationDelay:"0.12s", background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Data Anda (Opsional)</div>
          {[{label:"Nama / Name",val:name,setter:setName,ph:"cth. Agus"},{label:"WhatsApp",val:phone,setter:setPhone,ph:"+62 812 ..."}].map(f=>(
            <div key={f.label} style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:5, color:C.text2 }}>{f.label}</label>
              <input value={f.val} onChange={e=>f.setter(e.target.value)} placeholder={f.ph} style={{ width:"100%", padding:"11px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:14, background:C.bg, transition:"border 0.15s" }} onFocus={e=>e.target.style.borderColor=C.topBg} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
          ))}
        </div>

        <div className="fu" style={{ animationDelay:"0.16s", background:C.surface, borderRadius:12, padding:"13px 16px", marginBottom:14, fontSize:12, color:C.muted, lineHeight:1.65 }}>
          ✂ <strong style={{ color:C.text }}>Bayar setelah selesai.</strong> Pembayaran di kasir via QRIS atau kartu BCA setelah layanan.<br/>
          <span style={{ fontSize:11 }}>Pay at counter after service — QRIS or BCA card.</span>
        </div>

        <button className="btnP" onClick={()=>onConfirm(tipAmt)} style={{ fontSize:18, marginBottom:8 }}>Konfirmasi Booking ✓</button>
        <button className="btnG" onClick={onBack} style={{ width:"100%" }}>← Kembali</button>
      </div>
    </div>
  );
}

// ── Done ──
function Done({ cart, barber, slot, name, total, onReset }) {
  const num = useRef("#B" + Math.floor(100+Math.random()*900)).current;
  const [printed, setPrinted] = useState(false);
  const dur = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.dur||0),0);

  return (
    <div style={{ minHeight:"calc(100vh - 55px)", display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div className="si" style={{ maxWidth:580, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:12, letterSpacing:"0.18em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>Nomor Antrian Anda / Your Queue Number</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:128, fontWeight:900, lineHeight:1, color:C.text, letterSpacing:"-0.04em", animation:"pop 0.5s ease 0.2s both" }}>{num}</div>
        <div style={{ background:C.accent, height:6, borderRadius:999, margin:"14px auto", width:100 }}/>

        <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16, padding:"18px 24px", marginBottom:18, textAlign:"left" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px" }}>
            {[
              ["Kapster",barber?.name],
              ["Waktu",slot],
              ["Layanan",cart.map(id=>SERVICES.find(x=>x.id===id)?.name).join(", ")],
              ["Durasi",`${dur} menit`],
              ["Total",fmt(total)],
              ...(name?[["Nama",name]]:[]),
            ].map(([k,v])=>(
              <div key={k}><div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>{k}</div><div style={{ fontSize:14, fontWeight:600 }}>{v}</div></div>
            ))}
          </div>
        </div>

        <div style={{ background:C.surface, borderRadius:12, padding:"13px 18px", marginBottom:22, fontSize:13, color:C.text2, lineHeight:1.7 }}>
          Silakan duduk dan tunggu kapster memanggil nomor Anda.<br/>
          <span style={{ fontSize:12, color:C.muted }}>Please sit and wait for your barber to call your number.</span>
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={()=>setPrinted(true)} style={{ padding:"13px 24px", borderRadius:12, fontSize:16, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, background:printed?C.surface2:C.white, color:printed?C.muted:C.text, border:`2px solid ${printed?C.border:C.topBg}`, transition:"all 0.2s", cursor:"pointer" }}>{printed?"✓ Tercetak":"🖨 Cetak Struk"}</button>
          <button onClick={onReset} style={{ padding:"13px 24px", borderRadius:12, fontSize:16, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, background:C.topBg, color:C.white, border:"none", cursor:"pointer", transition:"all 0.2s" }}>Selesai ✓</button>
        </div>
      </div>
    </div>
  );
}

// ── Root ──
export default function App() {
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [barber, setBarber] = useState(null);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [finalTotal, setFinalTotal] = useState(0);
  const total = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.price||0),0);
  const reset = () => { setStep(0); setCart([]); setBarber(null); setSlot(null); setName(""); setPhone(""); setFinalTotal(0); };

  return (
    <>
      <GS/>
      <Topbar step={step} cartTotal={total}/>
      {step===0 && <Welcome onStart={()=>setStep(1)}/>}
      {step===1 && <StepServices cart={cart} setCart={setCart} onNext={()=>setStep(2)} onBack={()=>setStep(0)}/>}
      {step===2 && <StepBarber barber={barber} setBarber={setBarber} onNext={()=>setStep(3)} onBack={()=>setStep(1)}/>}
      {step===3 && <StepTime barber={barber} slot={slot} setSlot={setSlot} onNext={()=>setStep(4)} onBack={()=>setStep(2)}/>}
      {step===4 && <StepConfirm cart={cart} barber={barber} slot={slot} name={name} setName={setName} phone={phone} setPhone={setPhone} onConfirm={tip=>{setFinalTotal(total+tip);setStep(5);}} onBack={()=>setStep(3)}/>}
      {step===5 && <Done cart={cart} barber={barber} slot={slot} name={name} total={finalTotal} onReset={reset}/>}
    </>
  );
}
