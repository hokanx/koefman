import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BrandMark from '@/components/shared/BrandMark';
import LegalFooter from '@/components/shared/LegalFooter';

function getSlots() {
  const now = new Date();
  const h = now.getHours();
  const today = now.toLocaleDateString('de-DE', { weekday: 'long' });
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  const tomorrow = tom.toLocaleDateString('de-DE', { weekday: 'long' });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const slots: { label: string; value: string }[] = [];

  if (h < 9) {
    slots.push({ label: `${cap(today)}, 10:00 Uhr`, value: `${now.toISOString().slice(0, 10)} 10:00` });
    slots.push({ label: `${cap(today)}, 14:00 Uhr`, value: `${now.toISOString().slice(0, 10)} 14:00` });
    slots.push({ label: `${cap(tomorrow)}, 18:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 18:00` });
  } else if (h < 13) {
    slots.push({ label: `${cap(today)}, 14:00 Uhr`, value: `${now.toISOString().slice(0, 10)} 14:00` });
    slots.push({ label: `${cap(today)}, 18:00 Uhr`, value: `${now.toISOString().slice(0, 10)} 18:00` });
    slots.push({ label: `${cap(tomorrow)}, 10:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 10:00` });
  } else if (h < 17) {
    slots.push({ label: `${cap(today)}, 18:00 Uhr`, value: `${now.toISOString().slice(0, 10)} 18:00` });
    slots.push({ label: `${cap(tomorrow)}, 10:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 10:00` });
    slots.push({ label: `${cap(tomorrow)}, 14:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 14:00` });
  } else {
    slots.push({ label: `${cap(tomorrow)}, 10:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 10:00` });
    slots.push({ label: `${cap(tomorrow)}, 14:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 14:00` });
    slots.push({ label: `${cap(tomorrow)}, 18:00 Uhr`, value: `${tom.toISOString().slice(0, 10)} 18:00` });
  }
  return slots;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const rawSid = searchParams.get('sid');
  const submissionId = rawSid && rawSid !== 'null' && rawSid !== 'undefined' ? rawSid : '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [slots] = useState(getSlots);
  const [prefilled, setPrefilled] = useState(false);
  const [existingBooking, setExistingBooking] = useState<{
    selected_slot: string;
    phone: string;
    booking_status: string;
    created_at: string;
  } | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(!!submissionId);

  // Check existing booking + prefill name
  useEffect(() => {
    if (!submissionId) return;

    const fetchData = async () => {
      // Check for existing booking
      const { data: booking } = await supabase
        .from('lead_bookings')
        .select('selected_slot, phone, booking_status, created_at')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (booking) {
        setExistingBooking(booking);
        setCheckingBooking(false);
        return;
      }

      // Prefill name from submission
      const { data } = await supabase
        .from('diagnostic_submissions')
        .select('name')
        .eq('id', submissionId)
        .maybeSingle();

      if (data?.name) {
        setName(data.name);
        setPrefilled(true);
      }
      setCheckingBooking(false);
    };

    fetchData();
  }, [submissionId]);

  const step = selectedSlot ? 2 : 1;
  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 5 && selectedSlot;

  const handleBook = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await supabase.from('lead_bookings').insert({
        submission_id: submissionId || null,
        phone: phone.trim(),
        selected_slot: selectedSlot,
        booking_status: 'booked',
      });

      if (submissionId) {
        await supabase
          .from('diagnostic_submissions')
          .update({ lead_status: 'gespraech_geplant' })
          .eq('id', submissionId);
      }

      setBooked(true);
    } catch (err) {
      console.error('Booking error:', err);
      setBooked(true);
    } finally {
      setSubmitting(false);
    }
  };

  const optionBtn = (selected: boolean) =>
    `w-full border px-6 py-5 text-base tracking-[0.08em] font-semibold transition-all duration-200 ${
      selected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border text-foreground bg-transparent hover:bg-foreground hover:text-background'
    }`;

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <BrandMark variant="wordmark" size="md" />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-[480px]">
          {checkingBooking ? (
            <div className="text-center animate-fade-in">
              <p className="text-sm text-foreground/50 tracking-[0.08em] uppercase">Wird geladen...</p>
            </div>
          ) : existingBooking ? (
            <div className="text-center space-y-8 animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.08em] uppercase">
                Termin bereits gebucht.
              </h1>
              <div className="border border-foreground bg-foreground text-background px-6 py-5 text-base font-semibold tracking-[0.08em] text-center">
                {existingBooking.selected_slot}
              </div>
              {existingBooking.phone && (
                <p className="text-sm text-foreground/60 tracking-[0.04em]">
                  Telefon: {existingBooking.phone}
                </p>
              )}
              <p className="text-base text-foreground/80 tracking-[0.04em] leading-[1.7] max-w-[380px] mx-auto">
                Wir haben deine Buchung erhalten und melden uns zum gewählten Termin.
              </p>
              <p className="text-xs text-foreground/40 tracking-[0.06em] uppercase">
                Kostenlos. Keine Verpflichtung.
              </p>
            </div>
          ) : booked ? (
            <div className="text-center space-y-8 animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.08em] uppercase">
                Termin bestätigt.
              </h1>
              <p className="text-base text-foreground/80 tracking-[0.04em] leading-[1.7] max-w-[380px] mx-auto">
                Wir melden uns zum gewählten Zeitpunkt bei dir.
              </p>
              <p className="text-xs text-foreground/40 tracking-[0.06em] uppercase">
                Kostenlos. Keine Verpflichtung.
              </p>
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              {/* Header */}
              <div className="text-center space-y-5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-[0.06em] leading-relaxed uppercase">
                  Strategiegespräch zur Optimierung deiner Abläufe
                </h1>
                <p className="text-sm text-foreground/70 tracking-[0.04em] leading-[1.7] max-w-[400px] mx-auto">
                  Wir analysieren gemeinsam deine aktuelle Situation und zeigen dir konkrete nächste Schritte.
                </p>
              </div>

              {/* Step 1: Slot selection */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-[11px] text-foreground/50 tracking-[0.12em] uppercase mb-1">
                    Wähle einen Zeitpunkt
                  </p>
                  <div className="space-y-3">
                    {slots.map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => setSelectedSlot(slot.value)}
                        className={optionBtn(false)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Name + Phone */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-foreground/50 tracking-[0.12em] uppercase">
                      Dein gewählter Termin
                    </p>
                    <button
                      onClick={() => setSelectedSlot('')}
                      className="text-[11px] text-foreground/40 tracking-[0.08em] uppercase hover:text-foreground/70 transition-colors"
                    >
                      Ändern
                    </button>
                  </div>
                  <div className="border border-foreground bg-foreground text-background px-6 py-4 text-base font-semibold tracking-[0.08em] text-center">
                    {slots.find(s => s.value === selectedSlot)?.label}
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Name — show as read-only greeting if prefilled, editable otherwise */}
                    {prefilled ? (
                      <div className="border border-border/50 px-4 py-3.5">
                        <p className="text-[11px] text-foreground/50 tracking-[0.1em] uppercase mb-1">Name</p>
                        <p className="text-sm text-foreground tracking-wide">{name}</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-foreground/50 tracking-[0.1em] mb-2 uppercase">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Dein Name"
                          className="w-full border border-border bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none tracking-wide"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] text-foreground/50 tracking-[0.1em] mb-2 uppercase">
                        Telefonnummer *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+49 ..."
                        autoFocus={prefilled}
                        className="w-full border border-border bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none tracking-wide"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={!canSubmit || submitting}
                    className="w-full border-2 border-foreground px-10 py-5 text-sm tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed mt-4"
                  >
                    {submitting ? '...' : '→ TERMIN BESTÄTIGEN'}
                  </button>

                  <p className="text-[10px] text-foreground/30 tracking-[0.08em] text-center uppercase">
                    30 Minuten. Kostenlos. Keine Verpflichtung.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="py-10 text-center space-y-4">
        <BrandMark variant="wordmark" size="sm" align="center" />
        <LegalFooter />
      </footer>
    </div>
  );
}
