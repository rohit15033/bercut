import { useEffect, useRef, useState } from "react";

import { useSSE } from '../../hooks/useSSE.js';
import Welcome from './screens/Welcome.jsx';
import StepServices from './screens/StepServices.jsx';
import StepBarber from './screens/StepBarber.jsx';
import StepTime from './screens/StepTime.jsx';
import StepConfirm from './screens/StepConfirm.jsx';
import Done from './screens/Done.jsx';
import PaymentTakeover from './payment/PaymentTakeover.jsx';
import StaffPanel from './payment/StaffPanel.jsx';
import Topbar from './components/Topbar.jsx';

export default function KioskApp() {
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [barber, setBarber] = useState(null);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState([]);
  const [groupId, setGroupId] = useState(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Fetch active branch
  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['branch', 'active'],
    queryFn: () => fetch('/api/branches/active').then(r => r.json()),
  });

  // Fetch services for the branch
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', branch?.id],
    queryFn: () => fetch(`/api/services?branch_id=${branch.id}`).then(r => r.json()),
    enabled: !!branch?.id,
  });

  // Mutation for creating booking group
  const groupMutation = useMutation({
    mutationFn: (branchId) => fetch('/api/booking-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_id: branchId }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      setGroupId(data.id);
      continueAddAnother(data.id);
    }
  });

  const loading = branchLoading || (branch && servicesLoading);

  useSSE(branch?.id, (event) => {
    if (event.type === 'payment_trigger') {
      // event usually contains ID or the full object
      setActiveBooking(event);
      setPaymentPending(true);
    }
    if (event.type === 'announcement' && branch?.speaker_enabled) {
      const u = new SpeechSynthesisUtterance(event.text);
      u.lang = 'id-ID';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  });

  const total = cart.reduce((s, id) => s + (services.find(x => x.id === id)?.base_price || 0), 0);

  // Triple-tap detection
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleCornerTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      setStaffPanelOpen(true);
    }
  };

  const reset = () => {
    setStep(0); setCart([]); setBarber(null); setSlot(null);
    setName(""); setPhone(""); setGroup([]); setGroupId(null);
    setPaymentPending(false); setActiveBooking(null); setBookingResult(null);
  };

  const continueAddAnother = (id) => {
    setGroup(g => [...g, {
      number: bookingResult?.booking_number || ("#B" + Math.floor(100 + Math.random() * 900)),
      barber: barber?.name || "—",
      services: cart.map(serviceId => services.find(x => x.id === serviceId)?.name).join(", "),
      total,
    }]);

    setStep(1); setCart([]); setBarber(null); setSlot(null); setName(""); setPhone("");
    setBookingResult(null);
  };

  const addAnother = () => {
    if (!groupId) {
      groupMutation.mutate(branch.id);
    } else {
      continueAddAnother(groupId);
    }
  };

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
      <div style={{ color: "#F5E200", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24 }}>Memuat Data...</div>
    </div>
  );

  return (
    <>
      <div onClick={handleCornerTap} style={{ position: "fixed", top: 0, right: 0, width: 60, height: 60, zIndex: 500, WebkitTapHighlightColor: "transparent" }} />

      {staffPanelOpen && (
        <StaffPanel branch={branch} onSelect={(b) => { setActiveBooking(b); setPaymentPending(true); setStaffPanelOpen(false); }} onClose={() => setStaffPanelOpen(false)} />
      )}

      {paymentPending && activeBooking && (
        <PaymentTakeover
          booking={activeBooking}
          onDone={() => { setPaymentPending(false); setActiveBooking(null); }}
        />
      )}

      <Topbar step={step} cartTotal={total} groupCount={group.length} onSecretClick={() => setStaffPanelOpen(true)} />

      {step === 0 && <Welcome onStart={() => setStep(1)} branch={branch} />}
      {step === 1 && <StepServices cart={cart} setCart={setCart} branch={branch} onNext={() => setStep(2)} onBack={() => { group.length > 0 ? setStep(5) : setStep(0); }} />}
      {step === 2 && <StepBarber barber={barber} setBarber={setBarber} branch={branch} cart={cart} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <StepTime barber={barber} cart={cart} branch={branch} slot={slot} setSlot={setSlot} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <StepConfirm cart={cart} barber={barber} slot={slot} name={name} setName={setName} phone={phone} setPhone={setPhone} branch={branch} groupId={groupId} services={services} onConfirm={(res) => { setBookingResult(res); setStep(5); }} onBack={() => setStep(3)} />}
      {step === 5 && <Done bookingResult={bookingResult} cart={cart} barber={barber} slot={slot} name={name} group={group} branch={branch} services={services} onAddAnother={addAnother} onReset={reset} />}
    </>
  );
}
