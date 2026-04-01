import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Mail, UserPlus, Search, ChevronRight, RefreshCw, Eye, Phone, CalendarIcon, FileText, CheckSquare, Clock } from 'lucide-react';
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

const CALL_RESULTS = [
  { key: 'interesse', label: 'Interesse' },
  { key: 'kein_interesse', label: 'Kein Interesse' },
  { key: 'unklar', label: 'Unklar' },
];


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
  recommended_package?: string;
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
  const navigate = useNavigate();

  const fetchSubmissions = async () => {
    const { data: subs } = await (supabase as any).from('diagnostic_submissions').select('*').order('created_at', { ascending: false });
    const { data: analyses } = await (supabase as any).from('lead_analyses').select('*');
    const submissionsWithAnalyses = (subs || []).map((sub: DiagnosticSubmission) => ({
      ...sub,
      lead_analyses: (analyses || []).filter((a: LeadAnalysis) => a.submission_id === sub.id),
    }));
    setSubmissions(submissionsWithAnalyses);
  };

  useEffect(() => {
    fetchSubmissions().then(() => setLoading(false));
  }, []);

  const INTENT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const filtered = submissions.filter(s => {
    if (statusFilter !== 'alle' && statusFilter !== 'follow_up_today') {
      if (PIPELINE_MAP[statusFilter]) {
        if ((s.lead_status || 'neu') !== statusFilter) return false;
      } else {
        const analysis = s.lead_analyses?.[0];
        if (statusFilter === 'completed' && analysis?.analysis_status !== 'completed') return false;
        if (statusFilter === 'failed' && analysis?.analysis_status !== 'failed') return false;
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
    // Follow-ups due first
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
    const { error } = await (supabase as any).from('diagnostic_submissions').update(fields).eq('id', id);
    if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return; }
    await fetchSubmissions();
    // Update selected
    setSelected(prev => prev ? { ...prev, ...fields } : null);
    setSaving(false);
    toast.success('Gespeichert');
  };

  const quickAction = async (sub: DiagnosticSubmission, newStatus: string) => {
    const fields: Record<string, any> = { lead_status: newStatus };
    if (newStatus === 'kontaktiert') fields.last_contacted_at = new Date().toISOString();
    await updateField(sub.id, fields);
  };

  const openEmail = (sub: DiagnosticSubmission) => {
    const subject = encodeURIComponent('KÖFMAN – Deine Anfrage');
    const body = encodeURIComponent(`Hallo ${sub.name},\n\nvielen Dank für dein Interesse an KÖFMAN!\n\nWir würden gerne ein kurzes Gespräch mit dir führen.\n\nWann passt es dir am besten?\n\nViele Grüße\nDein KÖFMAN Team`);
    window.open(`mailto:${sub.email}?subject=${subject}&body=${body}`, '_self');
  };

  const convertToCustomer = async (sub: DiagnosticSubmission) => {
    const { data: customer, error } = await supabase.from('customers').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id!,
      name: sub.company || sub.name,
      contact_person: sub.name,
      email: sub.email,
    }).select().single();
    if (error || !customer) { alert('Fehler beim Erstellen'); return; }
    navigate(`/customers/${customer.id}`);
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
        const updated = submissions.find(s => s.id === sub.id);
        if (updated) setSelected({ ...updated });
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

  const getSuggestedAction = (sub: DiagnosticSubmission) => {
    if (sub.call_result === 'interesse') return { label: 'Angebot erstellen', action: () => quickAction(sub, 'angebot') };
    if (sub.call_result === 'kein_interesse') return { label: 'Abschließen', action: () => quickAction(sub, 'abgeschlossen') };
    if (sub.call_result === 'unklar') return { label: 'Follow-up setzen', action: () => {} };
    return null;
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
                        {analysis?.recommended_package && (
                          <span className="text-[9px] font-medium tracking-[0.06em] px-2 py-0.5 rounded border border-border text-muted-foreground">
                            {PACKAGE_LABELS[analysis.recommended_package] || analysis.recommended_package}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground/60">
                          {INDUSTRY_LABELS[sub.business_type] || sub.business_type}
                          {sub.variant && <> · V{sub.variant.toUpperCase()}</>}
                          {' · '}
                          {format(new Date(sub.created_at), 'dd.MM.yy', { locale: de })}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-red-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Follow-up fällig
                          </span>
                        )}
                        {sub.next_follow_up_at && !isOverdue && (
                          <span className="text-[10px] text-muted-foreground/60">
                            Follow-up: {format(new Date(sub.next_follow_up_at), 'dd.MM.', { locale: de })}
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
            const suggested = getSuggestedAction(selected);
            return (
              <div>
                {/* Header */}
                <div className="p-6 pb-4">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold tracking-[0.08em] uppercase">{selected.name}</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selected.intent_score && INTENT_BADGES[selected.intent_score] && (
                      <span className={`text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded border ${INTENT_BADGES[selected.intent_score].className}`}>
                        {INTENT_BADGES[selected.intent_score].label}
                      </span>
                    )}
                    {getStatusBadge(selected.lead_status || 'neu')}
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(selected.created_at), 'dd.MM.yyyy · HH:mm', { locale: de })}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">SCHNELLAKTIONEN</p>
                  <div className="flex flex-wrap gap-2">
                    {(selected.lead_status || 'neu') === 'neu' && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => { quickAction(selected, 'kontaktiert'); openEmail(selected); }}>
                        <Mail className="w-3.5 h-3.5 mr-1.5" /> Kontaktieren
                      </Button>
                    )}
                    {['neu', 'kontaktiert'].includes(selected.lead_status || 'neu') && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => quickAction(selected, 'gespraech_geplant')}>
                        <Phone className="w-3.5 h-3.5 mr-1.5" /> Gespräch planen
                      </Button>
                    )}
                    {(selected.lead_status || 'neu') !== 'angebot' && (selected.lead_status || 'neu') !== 'abgeschlossen' && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => quickAction(selected, 'angebot')}>
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> Angebot
                      </Button>
                    )}
                    {(selected.lead_status || 'neu') !== 'abgeschlossen' && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => quickAction(selected, 'abgeschlossen')}>
                        <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Abschließen
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => convertToCustomer(selected)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Kunde erstellen
                    </Button>
                  </div>
                  {suggested && (
                    <div className="mt-3 p-2 rounded-lg bg-accent/50 border border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">Empfohlene Aktion:</p>
                      <Button variant="outline" size="sm" className="text-xs" onClick={suggested.action}>
                        {suggested.label}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Pipeline Status */}
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

                {/* Follow-Up Section */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">FOLLOW-UP</p>
                  <div className="space-y-3">
                    {selected.last_contacted_at && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Letzter Kontakt: </span>
                        <span>{format(new Date(selected.last_contacted_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Nächster Follow-up</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("text-xs justify-start w-full", !selected.next_follow_up_at && "text-muted-foreground")}>
                            <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                            {selected.next_follow_up_at ? format(new Date(selected.next_follow_up_at), 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selected.next_follow_up_at ? new Date(selected.next_follow_up_at) : undefined}
                            onSelect={(date) => {
                              if (date) updateField(selected.id, { next_follow_up_at: date.toISOString() });
                            }}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Follow-up Notizen</label>
                      <Textarea
                        value={selected.follow_up_notes || ''}
                        onChange={e => setSelected(prev => prev ? { ...prev, follow_up_notes: e.target.value } : null)}
                        onBlur={e => updateField(selected.id, { follow_up_notes: e.target.value })}
                        placeholder="z.B. Anruf am Montag..."
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Call Tracking */}
                <div className="border-t border-border px-6 py-4">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">GESPRÄCH</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-[11px] text-muted-foreground">Gespräch geführt?</label>
                      <button
                        onClick={() => updateField(selected.id, { call_completed: !selected.call_completed, call_date: !selected.call_completed ? new Date().toISOString() : null })}
                        className={cn("text-xs px-3 py-1 rounded border transition-colors", selected.call_completed ? "bg-green-900/50 text-green-400 border-green-800" : "border-border text-muted-foreground hover:bg-accent")}
                      >
                        {selected.call_completed ? 'Ja ✓' : 'Nein'}
                      </button>
                    </div>
                    {selected.call_completed && selected.call_date && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Gesprächsdatum: </span>
                        <span>{format(new Date(selected.call_date), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                      </div>
                    )}
                    {selected.call_completed && (
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1.5">Ergebnis</label>
                        <div className="flex gap-1.5">
                          {CALL_RESULTS.map(r => (
                            <button key={r.key} onClick={() => updateField(selected.id, { call_result: r.key })}
                              className={cn(
                                "text-[10px] font-medium px-2.5 py-1 rounded border transition-colors",
                                selected.call_result === r.key
                                  ? r.key === 'interesse' ? 'bg-green-900/50 text-green-400 border-green-800'
                                    : r.key === 'kein_interesse' ? 'bg-red-900/50 text-red-400 border-red-800'
                                    : 'bg-yellow-900/50 text-yellow-400 border-yellow-800'
                                  : "border-border text-muted-foreground hover:bg-accent"
                              )}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Data */}
                <div className="border-t border-border px-6 py-5">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">LEAD-DATEN</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><span className="text-[11px] text-muted-foreground block">Name</span>{selected.name}</div>
                    <div><span className="text-[11px] text-muted-foreground block">E-Mail</span>{selected.email}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Firma</span>{selected.company || '–'}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Unternehmenstyp</span>{INDUSTRY_LABELS[selected.business_type] || selected.business_type}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Größe</span>{selected.company_size || '–'}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Anfrageverhalten</span>{LEAD_FLOW_LABELS[selected.lead_flow] || selected.lead_flow || '–'}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Umsatzklarheit</span>{REVENUE_LABELS[selected.revenue_clarity] || selected.revenue_clarity || '–'}</div>
                    <div className="col-span-2"><span className="text-[11px] text-muted-foreground block">Hauptprobleme</span>
                      {(selected.problems && selected.problems.length > 0)
                        ? selected.problems.map(p => NEED_LABELS[p] || p).join(', ')
                        : (NEED_LABELS[selected.main_problem] || selected.main_problem || '–')}
                    </div>
                    {selected.free_text && (
                      <div className="col-span-2"><span className="text-[11px] text-muted-foreground block">Eigene Beschreibung</span>{selected.free_text}</div>
                    )}
                  </div>
                </div>

                {/* Qualification */}
                {(selected.importance || selected.commitment || selected.urgency) && (
                  <div className="border-t border-border px-6 py-5">
                    <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">QUALIFIKATION</p>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div><span className="text-[11px] text-muted-foreground block">Wichtigkeit</span>{selected.importance || '–'}</div>
                      <div><span className="text-[11px] text-muted-foreground block">Commitment</span>{selected.commitment || '–'}</div>
                      <div><span className="text-[11px] text-muted-foreground block">Dringlichkeit</span>{selected.urgency || '–'}</div>
                    </div>
                  </div>
                )}

                {/* Internal Notes */}
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

                {/* KI-Analyse */}
                <div className="border-t border-border px-6 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase">KI-ANALYSE</p>
                    {analysis && (
                      analysis.analysis_status === 'completed'
                        ? <span className="text-[10px] text-muted-foreground">✓ Erstellt</span>
                        : <span className="text-[10px] text-muted-foreground">✕ Fehler</span>
                    )}
                  </div>
                  {analysis && analysis.analysis_status === 'completed' ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-1">Größte Schwachstelle</p>
                        <p className="text-sm leading-relaxed">{analysis.main_issue}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-1">Praktische Bedeutung</p>
                        <p className="text-sm leading-relaxed">{analysis.practical_meaning}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-2">3 Prioritäten</p>
                        <div className="space-y-2">
                          {[analysis.priority_1, analysis.priority_2, analysis.priority_3].filter(Boolean).map((p, i) => (
                            <div key={i} className="flex gap-3 items-baseline">
                              <span className="text-muted-foreground text-xs shrink-0 w-4 text-right">{i + 1}.</span>
                              <p className="text-sm leading-relaxed">{p}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[0.08em] uppercase mb-1">Nächster Schritt</p>
                        <p className="text-sm leading-relaxed">{analysis.next_step}</p>
                      </div>
                    </div>
                  ) : analysis?.error_message ? (
                    <p className="text-xs text-muted-foreground">{analysis.error_message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Keine Analyse vorhanden.</p>
                  )}
                </div>

                {/* Attribution */}
                <div className="border-t border-border px-6 py-5">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">ATTRIBUTION</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <div>QR-Variante: <span className="text-foreground">{selected.variant || 'direct'}</span></div>
                    <div>QR-Session: <span className="text-foreground font-mono text-[10px]">{selected.qr_session_id ? selected.qr_session_id.slice(0, 8) + '…' : '–'}</span></div>
                    <div>Submission-ID: <span className="text-foreground font-mono text-[10px]">{selected.id.slice(0, 8)}…</span></div>
                  </div>
                </div>

                {/* Email Actions */}
                <div className="border-t border-border px-6 py-5">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">E-MAIL</p>
                  <div className="flex flex-wrap gap-2">
                    {hasCompletedAnalysis && (
                      <>
                        <Button variant="outline" size="sm" className="text-xs" disabled={resending} onClick={() => resendAnalysisEmail(selected)}>
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resending ? 'animate-spin' : ''}`} />
                          {resending ? 'Wird gesendet…' : 'Analyse erneut senden'}
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => showEmailPreview(selected)}>
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> E-Mail Vorschau
                        </Button>
                      </>
                    )}
                  </div>
                  {analysis?.email_sent && analysis.email_sent_at && (
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Letzte E-Mail: {format(new Date(analysis.email_sent_at), 'dd.MM.yyyy · HH:mm', { locale: de })}
                    </p>
                  )}
                </div>
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
