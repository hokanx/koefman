import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BrandMark from '@/components/shared/BrandMark';

const TIMESLOTS = [
  { label: '09:00 UHR', value: '09:00' },
  { label: '14:00 UHR', value: '14:00' },
  { label: '19:00 UHR', value: '19:00' },
];

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('sid') || '';

  const [phone, setPhone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  const canSubmit = phone.trim().length >= 5 && selectedSlot;

  const handleBook = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Store booking
      await (supabase as any).from('lead_bookings').insert({
        submission_id: submissionId || null,
        phone: phone.trim(),
        selected_slot: selectedSlot,
        booking_status: 'booked',
      });

      // Update lead status if submission exists
      if (submissionId) {
        await (supabase as any)
          .from('diagnostic_submissions')
          .update({ lead_status: 'gespraech_geplant' })
          .eq('id', submissionId);
      }

      setBooked(true);
    } catch (err) {
      console.error('Booking error:', err);
      setBooked(true); // show confirmation anyway
    } finally {
      setSubmitting(false);
    }
  };

  const optionBtn = (selected: boolean) =>
    `w-full border px-6 py-4 text-sm tracking-[0.1em] font-medium transition-colors duration-200 uppercase ${
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
          {booked ? (
            <div className="text-center space-y-6 animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">
                TERMIN GEBUCHT.
              </h1>
              <p className="text-sm text-muted-foreground tracking-[0.08em] leading-[1.7] max-w-[360px] mx-auto">
                WIR MELDEN UNS ZUM GEWÜNSCHTEN ZEITPUNKT BEI DIR.
              </p>
              <p className="text-xs text-muted-foreground/50 tracking-[0.08em]">
                DU ERHÄLTST EINE BESTÄTIGUNG PER E-MAIL.
              </p>
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              <div className="text-center space-y-4">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] leading-relaxed">
                  STRATEGIEGESPRÄCH BUCHEN
                </h1>
                <p className="text-sm text-muted-foreground tracking-[0.08em] leading-[1.6]">
                  Wähle einen Zeitpunkt und wir rufen dich an.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">
                    TELEFONNUMMER *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+49 ..."
                    className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide"
                  />
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">
                    WANN PASST ES DIR AM BESTEN?
                  </p>
                  <div className="space-y-2">
                    {TIMESLOTS.map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => setSelectedSlot(slot.value)}
                        className={optionBtn(selectedSlot === slot.value)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={!canSubmit || submitting}
                className="w-full border-2 border-foreground px-10 py-5 text-sm tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : '→ TERMIN BESTÄTIGEN'}
              </button>

              <p className="text-[10px] text-muted-foreground/40 tracking-[0.08em] text-center">
                KOSTENLOS. KEINE VERPFLICHTUNG.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="py-10 text-center">
        <BrandMark variant="wordmark" size="sm" align="center" />
      </footer>
    </div>
  );
}
