import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Search, ChevronRight, RefreshCw, Eye, Phone, FileText, CheckSquare, Clock, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INDUSTRY_LABELS: Record<string, string> = {
  cleaning: 'Gebäudereinigung', garage: 'Kfz / Werkstatt', service: 'Dienstleistung',
  trade: 'Handwerk', general: 'Sonstiges', dienstleistung: 'Dienstleistung',
  lokal: 'Lokales Geschäft', online: 'Online Business', andere: 'Andere', handwerk: 'Handwerk', unknown: 'Unbekannt',
};
const NEED_LABELS: Record<string, string> = {
  wenig_anfragen: 'Zu wenig Anfragen', unklare_ablaeufe: 'Unklare Abläufe',
  keine_conversion: 'Keine Conversion', unsicher: 'Unsicher',
  schlechte_umwandlung: 'Schlechte Umwandlung', zeitverlust: 'Zeitverlust',
  keine_struktur: 'Keine Struktur',
};
const LEAD_FLOW_LABELS: Record<string, string> = {
  ja: 'Ja', unregelmaessig: 'Unregelmäßig', nein: 'Nein',
  kaum: 'Kaum', stabil: 'Stabil', stark: 'Stark',
};
const REVENUE_LABELS: Record<string, string> = {
  ja: 'Ja', teilweise: 'Teilweise', nein: 'Nein',
  unklar: 'Unklar', klar: 'Klar',
};
const INTENT_BADGES: Record<string, { label: string; className: string }> = {
  high: { label: 'HIGH', className: 'bg-green-900/50 text-green-400 border-green-800' },
  medium: { label: 'MEDIUM', className: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
  low: { label: 'LOW', className: 'bg-red-900/50 text-red-400 border-red-800' },
};

const PIPELINE_STATUSES: { key: string; label: string; color: string }[] = [
  { key: 'neu', label: 'Neu', color: 'bg-blue-900/50 text-blue-400 border-blue-800' },
  { key: 'kontaktiert', label: 'Kontaktiert', color: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
  { key: 'gespraech_geplant', label: 'Gespräch geplant', color: 'bg-purple-900/50 text-purple-400 border-purple-800' },
  { key: 'angebot', label: 'Angebot', color: 'bg-orange-900/50 text-orange-400 border-orange-800' },
  { key: 'abgeschlossen', label: 'Abgeschlossen', color: 'bg-green-900/50 text-green-400 border-green-800' },
];
const PIPELINE_MAP = Object.fromEntries(PIPELINE_STATUSES.map(s => [s.key, s]));

interface LeadBooking {
  id: string;
  submission_id: string;
  phone: string;
  selected_slot: string;
  booking_status: string;
  created_at: string;
}

interface LeadAnalysis {
  id: string;
  submission_id: string;
  analysis_status: string;
  headline: string;
  main_issue: string;
  practical_meaning: string;
  priority_1: string;
  priority_2: string;
  priority_3: string;
  next_step: string;
  email_sent: boolean;
  email_sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface DiagnosticSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  business_type: string;
  lead_flow: string;
  revenue_clarity: string;
  main_problem: string;
  variant: string | null;
  qr_session_id: string | null;
  created_at: string;
  company_size?: string;
  problems?: string[];
  free_text?: string;
  importance?: string;
  commitment?: string;
  urgency?: string;
  intent_score?: string;
  lead_status?: string;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
  follow_up_notes?: string | null;
  call_completed?: boolean;
  call_date?: string | null;
  call_result?: string | null;
  internal_notes?: string | null;
  lead_analyses?: LeadAnalysis[];
  booking?: LeadBooking | null;
}

const AdminLeads = () => {
  const [submissions, setSubmissions] = useState<DiagnosticSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('alle');
  const [selected, setSelected] = useState<DiagnosticSubmission | null>(null);
  const [resending, setResending] = useState(false);
  const [emailPreview, setEmailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();

  const fetchSubmissions = async () => {
    const [subsRes, analysesRes, bookingsRes] = await Promise.all([
      supabase.from('diagnostic_submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('lead_analyses').select('*'),
      supabase.from('lead_bookings').select('*'),
    ]);
    const subs = subsRes.data || [];
    const analyses = analysesRes.data || [];
    const bookings = bookingsRes.data || [];

    const submissionsWithData = subs.map((sub: DiagnosticSubmission) => ({
      ...sub,
      lead_analyses: analyses.filter((a: LeadAnalysis) => a.submission_id === sub.id),
      booking: bookings.find((b: LeadBooking) => b.submission_id === sub.id) || null,
    }));
    setSubmissions(submissionsWithData);
  };

  useEffect(() => {
    fetchSubmissions().then(() => setLoading(false));
  }, []);

  const INTENT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const filtered = submissions.filter(s => {
    if (statusFilter !== 'alle' && statusFilter !== 'follow_up_today') {
      if (PIPELINE_MAP[statusFilter]) {
        if ((s.lead_status || 'neu') !== statusFilter) return false;
      }
    }
    if (statusFilter === 'follow_up_today') {
      if (!s.next_follow_up_at) return false;
      const today = new Date().toISOString().split('T')[0];
      const followUp = s.next_follow_up_at.split('T')[0];
      if (followUp > today) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    const aOrder = INTENT_ORDER[a.intent_score || 'low'] ?? 2;
    const bOrder = INTENT_ORDER[b.intent_score || 'low'] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aFollowUp = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Infinity;
    const bFollowUp = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Infinity;
    const now = Date.now();
    const aDue = aFollowUp <= now ? 0 : 1;
    const bDue = bFollowUp <= now ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const followUpTodayCount = submissions.filter(s => {
    if (!s.next_follow_up_at) return false;
    const today = new Date().toISOString().split('T')[0];
    return s.next_follow_up_at.split('T')[0] <= today;
  }).length;

  const pipelineCounts = PIPELINE_STATUSES.reduce((acc, s) => {
    acc[s.key] = submissions.filter(sub => (sub.lead_status || 'neu') === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  const updateField = async (id: string, fields: Record<string, any>) => {
    setSaving(true);
    const { error } = await supabase.from('diagnostic_submissions').update(fields).eq('id', id);
    if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return; }
    await fetchSubmissions();
    setSelected(prev => prev ? { ...prev, ...fields } : null);
    setSaving(false);
    toast.success('Gespeichert');
  };

  const openEmail = (sub: DiagnosticSubmission) => {
    const subject = encodeURIComponent('KÖFMAN – Deine Anfrage');
    const body = encodeURIComponent(`Hallo ${sub.name},\n\nvielen Dank für dein Interesse an KÖFMAN!\n\nWir würden gerne ein kurzes Gespräch mit dir führen.\n\nWann passt es dir am besten?\n\nViele Grüße\nDein KÖFMAN Team`);
    window.open(`mailto:${sub.email}?subject=${subject}&body=${body}`, '_self');
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success('Telefonnummer kopiert');
  };

  const createOfferFromLead = async (sub: DiagnosticSubmission) => {
    if (converting) return;
    setConverting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('Nicht eingeloggt'); return; }

      let customerId: string | undefined;

      // Check for existing customer by email first
      if (sub.email) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .eq('email', sub.email)
          .maybeSingle();
        if (existing) customerId = existing.id;
      }

      // Create new customer only if none found
      if (!customerId) {
        const { data: customer, error } = await supabase.from('customers').insert({
          user_id: userId,
          name: sub.company || sub.name,
          contact_person: sub.name,
          email: sub.email,
        }).select().single();
        if (error || !customer) { toast.error('Fehler beim Erstellen'); return; }
        customerId = customer.id;
      }

      // Update lead status to 'angebot'
      await (supabase as any).from('diagnostic_submissions').update({ lead_status: 'angebot' }).eq('id', sub.id);

      navigate(`/offers/new?customer=${customerId}`);
    } catch (err) {
      console.error('Conversion error:', err);
      toast.error('Fehler bei der Konvertierung');
    } finally {
      setConverting(false);
    }
  };

  const resendAnalysisEmail = async (sub: DiagnosticSubmission) => {
    setResending(true);
    try {
      const response = await supabase.functions.invoke('generate-lead-analysis', {
        body: { resend_submission_id: sub.id },
      });
      if (response.error) throw response.error;
      if (response.data?.email_sent) {
        toast.success('Analyse-E-Mail erneut gesendet');
        await fetchSubmissions();
      } else {
        toast.error('E-Mail konnte nicht gesendet werden');
      }
    } catch (err) {
      console.error('Resend error:', err);
      toast.error('Fehler beim erneuten Senden');
    } finally {
      setResending(false);
    }
  };

  const showEmailPreview = (sub: DiagnosticSubmission) => {
    const analysis = sub.lead_analyses?.[0];
    if (!analysis || analysis.analysis_status !== 'completed') return;
    const priorities = [analysis.priority_1, analysis.priority_2, analysis.priority_3].filter(Boolean);
    const prioritiesHtml = priorities.map((p, i) =>
      `<tr><td style="padding:8px 12px 8px 0;color:#9A9A9A;vertical-align:top;font-size:14px;width:28px;font-family:Arial,Helvetica,sans-serif;">${i + 1}.</td><td style="padding:8px 0;color:#FFFFFF;font-size:15px;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">${p}</td></tr>`
    ).join('');
    const html = `<div style="background:#000;padding:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;width:100%;background-color:#000000;border:1px solid #1A1A1A;margin:0 auto;"><tr><td style="padding:48px 32px 36px 32px;text-align:center;background-color:#000000;"><img src="https://ppijwrrzjcbtokoxpctf.supabase.co/storage/v1/object/public/brand-assets/logo-icon-white.png" alt="KÖFMAN" width="112" height="112" style="display:block;margin:0 auto 16px auto;width:112px;height:112px;" /><span style="color:#FFFFFF;font-size:18px;letter-spacing:0.22em;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;">KÖFMAN</span></td></tr><tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr><tr><td style="padding:28px 32px 28px 32px;background-color:#000000;"><p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">GRÖSSTE SCHWACHSTELLE</p><p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.main_issue}</p></td></tr><tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr><tr><td style="padding:28px 32px 24px 32px;background-color:#000000;"><p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">DEINE NÄCHSTEN 3 HEBEL</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${prioritiesHtml}</table></td></tr><tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr><tr><td style="padding:32px 32px 0 32px;background-color:#000000;" align="center"><a href="#" style="color:#FFFFFF !important;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:28px;font-weight:700;letter-spacing:0.04em;text-decoration:underline;text-transform:uppercase;">→ STRATEGIE-SESSION BUCHEN</a></td></tr><tr><td style="padding:24px 32px 40px 32px;background-color:#000000;text-align:center;"><span style="color:#9A9A9A;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:600;">KÖFMAN</span></td></tr></table></div>`;
    setEmailPreview(html);
  };

  const getStatusBadge = (status: string) => {
    const s = PIPELINE_MAP[status] || PIPELINE_MAP['neu'];
    return <span className={`inline-block text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded border ${s.color}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-wide">PIPELINE</h2>
        <Badge variant="secondary">{submissions.length}</Badge>
      </div>

      {/* Pipeline status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setStatusFilter('alle')}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'alle' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
          Alle ({submissions.length})
        </button>
        {followUpTodayCount > 0 && (
          <button onClick={() => setStatusFilter('follow_up_today')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${statusFilter === 'follow_up_today' ? 'bg-foreground text-background' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800'}`}>
            <Clock className="w-3 h-3" /> Follow-up ({followUpTodayCount})
          </button>
        )}
        {PIPELINE_STATUSES.map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {s.label} ({pipelineCounts[s.key] || 0})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Name, E-Mail oder Firma suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border border-foreground border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm tracking-wide">KEINE ANFRAGEN GEFUNDEN.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(sub => {
            const analysis = sub.lead_analyses?.[0];
            const isOverdue = sub.next_follow_up_at && new Date(sub.next_follow_up_at).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0];
            return (
              <Card key={sub.id} className={cn("cursor-pointer hover:border-foreground/20 transition-colors border-border", isOverdue && "border-red-800/50")} onClick={() => setSelected(sub)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{sub.name || '(kein Name)'}</span>
                        {sub.intent_score && INTENT_BADGES[sub.intent_score] && (
                          <span className={`text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded border ${INTENT_BADGES[sub.intent_score].className}`}>
                            {INTENT_BADGES[sub.intent_score].label}
                          </span>
                        )}
                        {getStatusBadge(sub.lead_status || 'neu')}
                        {sub.booking && (
                          <span className="text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded border bg-purple-900/50 text-purple-400 border-purple-800">
                            TERMIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground/60">
                          {INDUSTRY_LABELS[sub.business_type] || sub.business_type}
                          {' · '}
                          {format(new Date(sub.created_at), 'dd.MM.yy', { locale: de })}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-red-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Follow-up fällig
                          </span>
                        )}
                      </div>
                      {analysis?.main_issue && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-1">{analysis.main_issue}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lead Detail Modal */}
      <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selected && (() => {
            const analysis = selected.lead_analyses?.[0];
            const hasCompletedAnalysis = analysis?.analysis_status === 'completed';
            const booking = selected.booking;

            return (
              <div>
                {/* 1. Lead Overview */}
                <div className="p-6 pb-4">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold tracking-[0.08em] uppercase">{selected.name}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">E-Mail</span>
                      <span>{selected.email}</span>
                    </div>
                    {selected.company && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Firma</span>
                        <span>{selected.company}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Branche</span>
                      <span>{INDUSTRY_LABELS[selected.business_type] || selected.business_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Eingang</span>
                      <span>{format(new Date(selected.created_at), 'dd.MM.yyyy · HH:mm', { locale: de })}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {selected.intent_score && INTENT_BADGES[selected.intent_score] && (
                        <span className={`text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded border ${INTENT_BADGES[selected.intent_score].className}`}>
                          {INTENT_BADGES[selected.intent_score].label}
                        </span>
                      )}
                      {getStatusBadge(selected.lead_status || 'neu')}
                    </div>
                  </div>
                </div>

                {/* 2. Booking Information */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">TERMIN</p>
                  {booking ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Zeitfenster</span>
                        <span className="font-medium">{booking.selected_slot}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Telefon</span>
                        <div className="flex items-center gap-2">
                          <span>{booking.phone}</span>
                          <button onClick={() => copyPhone(booking.phone)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded border bg-green-900/50 text-green-400 border-green-800">
                          {booking.booking_status === 'booked' ? 'GEBUCHT' : booking.booking_status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Gebucht am</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(booking.created_at), 'dd.MM.yyyy · HH:mm', { locale: de })}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Kein Termin gebucht</p>
                  )}
                </div>

                {/* 3. Analysis Summary */}
                {hasCompletedAnalysis && analysis && (
                  <div className="border-t border-border px-6 py-4">
                    <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">ANALYSE</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-1">Größte Schwachstelle</p>
                        <p className="text-sm leading-relaxed">{analysis.main_issue}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-2">3 Prioritäten</p>
                        <div className="space-y-1.5">
                          {[analysis.priority_1, analysis.priority_2, analysis.priority_3].filter(Boolean).map((p, i) => (
                            <div key={i} className="flex gap-3 items-baseline">
                              <span className="text-muted-foreground text-xs shrink-0 w-4 text-right">{i + 1}.</span>
                              <p className="text-sm leading-relaxed">{p}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {(selected.problems && selected.problems.length > 0) && (
                        <div>
                          <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-1">Genannte Probleme</p>
                          <p className="text-sm">{selected.problems.map(p => NEED_LABELS[p] || p).join(', ')}</p>
                        </div>
                      )}
                      {selected.free_text && (
                        <div>
                          <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-1">Eigene Beschreibung</p>
                          <p className="text-sm leading-relaxed">{selected.free_text}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Actions */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">AKTIONEN</p>
                  
                  {/* Primary action */}
                  <div className="mb-4">
                    <Button className="w-full justify-start text-xs" disabled={converting} onClick={() => createOfferFromLead(selected)}>
                      <FileText className="w-4 h-4 mr-2" /> {converting ? 'Wird erstellt…' : 'Angebot erstellen'}
                    </Button>
                  </div>

                  {/* Secondary actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEmail(selected)}>
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> E-Mail schreiben
                    </Button>
                    {booking?.phone && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => copyPhone(booking.phone)}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Telefonnummer kopieren
                      </Button>
                    )}
                    {(selected.lead_status || 'neu') !== 'kontaktiert' && (selected.lead_status || 'neu') !== 'abgeschlossen' && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => updateField(selected.id, { lead_status: 'kontaktiert', last_contacted_at: new Date().toISOString() })}>
                        <Phone className="w-3.5 h-3.5 mr-1.5" /> Als kontaktiert markieren
                      </Button>
                    )}
                    {(selected.lead_status || 'neu') !== 'abgeschlossen' && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => updateField(selected.id, { lead_status: 'abgeschlossen' })}>
                        <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Als abgeschlossen markieren
                      </Button>
                    )}
                  </div>
                </div>

                {/* 5. Status pipeline */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">STATUS</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {PIPELINE_STATUSES.map(s => (
                      <button key={s.key} onClick={() => updateField(selected.id, { lead_status: s.key })}
                        className={cn(
                          "text-[10px] font-medium px-2.5 py-1 rounded border transition-colors",
                          (selected.lead_status || 'neu') === s.key ? s.color : "border-border text-muted-foreground hover:bg-accent"
                        )}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Internal Notes */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">INTERNE NOTIZEN</p>
                  <Textarea
                    value={selected.internal_notes || ''}
                    onChange={e => setSelected(prev => prev ? { ...prev, internal_notes: e.target.value } : null)}
                    onBlur={e => updateField(selected.id, { internal_notes: e.target.value })}
                    placeholder="Interne Notizen zum Lead..."
                    className="text-xs min-h-[80px]"
                  />
                </div>

                {/* Email actions (collapsed) */}
                {hasCompletedAnalysis && (
                  <div className="border-t border-border px-6 py-4">
                    <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">ANALYSE-E-MAIL</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="text-xs" disabled={resending} onClick={() => resendAnalysisEmail(selected)}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resending ? 'animate-spin' : ''}`} />
                        {resending ? 'Wird gesendet…' : 'Erneut senden'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => showEmailPreview(selected)}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Vorschau
                      </Button>
                    </div>
                    {analysis?.email_sent && analysis.email_sent_at && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Gesendet: {format(new Date(analysis.email_sent_at), 'dd.MM.yyyy · HH:mm', { locale: de })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <Dialog open={!!emailPreview} onOpenChange={v => { if (!v) setEmailPreview(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm font-semibold tracking-wide">E-MAIL VORSCHAU</DialogTitle>
          </DialogHeader>
          <div className="border-t border-border">
            {emailPreview && <div dangerouslySetInnerHTML={{ __html: emailPreview }} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
