import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, UserPlus, Search, ChevronRight, CheckCircle2, XCircle, RefreshCw, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

  const filtered = submissions.filter(s => {
    if (statusFilter !== 'alle') {
      const analysis = s.lead_analyses?.[0];
      if (statusFilter === 'completed' && analysis?.analysis_status !== 'completed') return false;
      if (statusFilter === 'failed' && analysis?.analysis_status !== 'failed') return false;
      if (statusFilter === 'pending' && analysis?.analysis_status !== 'pending') return false;
      if (statusFilter === 'no_analysis' && analysis) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    alle: submissions.length,
    completed: submissions.filter(s => s.lead_analyses?.[0]?.analysis_status === 'completed').length,
    failed: submissions.filter(s => s.lead_analyses?.[0]?.analysis_status === 'failed').length,
  };

  const openEmail = (sub: DiagnosticSubmission) => {
    const subject = encodeURIComponent('KÖFMAN – Deine Anfrage');
    const body = encodeURIComponent(`Hallo ${sub.name},\n\nvielen Dank für dein Interesse an KÖFMAN!\n\nWir würden gerne ein kurzes Gespräch mit dir führen, um deine Anforderungen besser zu verstehen.\n\nWann passt es dir am besten?\n\nViele Grüße\nDein KÖFMAN Team`);
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
        // Update selected with fresh data
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

    const html = `
      <div style="background:#000;padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;width:100%;background-color:#000000;border:1px solid #1A1A1A;margin:0 auto;">

      <!-- Logo -->
      <tr><td style="padding:48px 32px 36px 32px;text-align:center;background-color:#000000;">
        <img src="https://ppijwrrzjcbtokoxpctf.supabase.co/storage/v1/object/public/brand-assets/logo-icon-white.png" alt="KÖFMAN" width="112" height="112" style="display:block;margin:0 auto 16px auto;width:112px;height:112px;" />
        <span style="color:#FFFFFF;font-size:18px;letter-spacing:0.22em;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;">KÖFMAN</span>
      </td></tr>

      <tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <!-- Greeting -->
      <tr><td style="padding:28px 32px 8px 32px;background-color:#000000;">
        <p style="color:#FFFFFF;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">HALLO ${sub.name.toUpperCase()},</p>
      </td></tr>
      <tr><td style="padding:12px 32px 28px 32px;background-color:#000000;">
        <p style="color:#B3B3B3;font-size:14px;line-height:1.7;margin:0;font-family:Arial,Helvetica,sans-serif;">Hier ist deine Kurzanalyse basierend auf deinen Angaben.</p>
      </td></tr>

      <tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <!-- Main Issue -->
      <tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
        <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">WAHRSCHEINLICH GRÖSSTE SCHWACHSTELLE</p>
        <p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.main_issue}</p>
      </td></tr>

      <tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <!-- Practical Meaning -->
      <tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
        <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">WAS DAS PRAKTISCH BEDEUTET</p>
        <p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.practical_meaning}</p>
      </td></tr>

      <tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <!-- Priorities -->
      <tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
        <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">DEINE NÄCHSTEN 3 HEBEL</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${prioritiesHtml}</table>
      </td></tr>

      <tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <!-- Next Step -->
      <tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
        <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">NÄCHSTER SINNVOLLER SCHRITT</p>
        <p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.next_step}</p>
      </td></tr>

      <tr><td style="padding:0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <!-- Decision + CTA -->
      <tr><td style="padding:32px 32px 12px 32px;background-color:#000000;text-align:center;">
        <p style="color:#B3B3B3;font-size:13px;line-height:1.7;margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;">Du hast zwei Optionen:</p>
        <p style="color:#9A9A9A;font-size:13px;margin:8px 0;font-family:Arial,Helvetica,sans-serif;">1. Die Analyse für dich nutzen und selbst umsetzen.</p>
        <p style="color:#FFFFFF;font-size:13px;margin:4px 0 16px 0;font-weight:600;font-family:Arial,Helvetica,sans-serif;">2. Mit uns herausfinden, was sich konkret ändern lässt.</p>
      </td></tr>

      <tr><td style="padding:32px 32px 0 32px;background-color:#000000;" align="center">
        <a href="#" style="color:#FFFFFF !important;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:28px;font-weight:700;letter-spacing:0.04em;text-decoration:underline;text-transform:uppercase;">→ STRATEGIE-SESSION BUCHEN</a>
      </td></tr>

      <tr><td style="padding:16px 32px 0 32px;background-color:#000000;">
        <p style="color:#9A9A9A;font-size:11px;line-height:1.5;margin:0 0 6px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">Falls der Link nicht direkt funktioniert, kopiere ihn in deinen Browser:</p>
        <p style="color:#A0A0A0;font-size:11px;line-height:1.5;margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">https://koefman.lovable.app/landing?source=email</p>
      </td></tr>

      <tr><td style="padding:20px 32px 0 32px;background-color:#000000;">
        <p style="color:#A0A0A0;font-size:11px;line-height:1.6;margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;">Wir zeigen dir konkret, wo du Geld verlierst – und wie du es behebst.</p>
      </td></tr>

      <tr><td style="padding:32px 32px 0 32px;background-color:#000000;"><div style="border-top:1px solid #2A2A2A;"></div></td></tr>

      <tr><td style="padding:24px 32px 40px 32px;background-color:#000000;text-align:center;">
        <span style="color:#9A9A9A;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:600;">KÖFMAN</span>
      </td></tr>

      </table>
      </div>
    `;
    setEmailPreview(html);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-wide">ANFRAGEN</h2>
        <Badge variant="secondary">{submissions.length}</Badge>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'alle', label: `Alle (${counts.alle})` },
          { key: 'completed', label: `Analyse ✓ (${counts.completed})` },
          { key: 'failed', label: `Fehler (${counts.failed})` },
        ].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}>
            {f.label}
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
            return (
              <Card key={sub.id} className="cursor-pointer hover:border-foreground/20 transition-colors border-border" onClick={() => setSelected(sub)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{sub.name}</span>
                        {analysis && (
                          analysis.analysis_status === 'completed'
                            ? <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="w-3 h-3" />Analyse</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><XCircle className="w-3 h-3" />Fehler</span>
                        )}
                        {analysis?.email_sent && <span className="text-[10px] text-muted-foreground">✉</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {INDUSTRY_LABELS[sub.business_type] || sub.business_type}
                        {sub.variant && <> · V{sub.variant.toUpperCase()}</>}
                        {' · '}
                        {format(new Date(sub.created_at), 'dd.MM.yy', { locale: de })}
                      </p>
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

      {/* Unified Lead Detail Modal */}
      <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selected && (() => {
            const analysis = selected.lead_analyses?.[0];
            const hasCompletedAnalysis = analysis?.analysis_status === 'completed';
            return (
              <div>
                {/* Header */}
                <div className="p-6 pb-4">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold tracking-[0.08em] uppercase">
                      {selected.name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selected.variant && <Badge variant="outline" className="text-[10px]">V{selected.variant.toUpperCase()}</Badge>}
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(selected.created_at), 'dd.MM.yyyy · HH:mm', { locale: de })}
                    </span>
                    {analysis && (
                      analysis.analysis_status === 'completed'
                        ? <Badge variant="outline" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Analyse erstellt</Badge>
                        : <Badge variant="outline" className="text-[10px]"><XCircle className="w-3 h-3 mr-1" />Analyse fehlgeschlagen</Badge>
                    )}
                    {analysis?.email_sent && <Badge variant="outline" className="text-[10px]">✉ gesendet</Badge>}
                  </div>
                </div>

                {/* Section A: Lead-Daten */}
                <div className="border-t border-border px-6 py-5">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">LEAD-DATEN</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><span className="text-[11px] text-muted-foreground block">Name</span>{selected.name}</div>
                    <div><span className="text-[11px] text-muted-foreground block">E-Mail</span>{selected.email}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Firma</span>{selected.company || '–'}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Unternehmenstyp</span>{INDUSTRY_LABELS[selected.business_type] || selected.business_type}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Anfrageverhalten</span>{LEAD_FLOW_LABELS[selected.lead_flow] || selected.lead_flow || '–'}</div>
                    <div><span className="text-[11px] text-muted-foreground block">Umsatzklarheit</span>{REVENUE_LABELS[selected.revenue_clarity] || selected.revenue_clarity || '–'}</div>
                    <div className="col-span-2"><span className="text-[11px] text-muted-foreground block">Hauptproblem</span>{NEED_LABELS[selected.main_problem] || selected.main_problem || '–'}</div>
                  </div>
                </div>

                {/* Section B: Attribution */}
                <div className="border-t border-border px-6 py-5">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">ATTRIBUTION</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <div>QR-Variante: <span className="text-foreground">{selected.variant || 'direct'}</span></div>
                    <div>QR-Session: <span className="text-foreground font-mono text-[10px]">{selected.qr_session_id ? selected.qr_session_id.slice(0, 8) + '…' : '–'}</span></div>
                    <div>Submission-ID: <span className="text-foreground font-mono text-[10px]">{selected.id.slice(0, 8)}…</span></div>
                    <div>Erstellt: <span className="text-foreground">{format(new Date(selected.created_at), 'dd.MM.yy HH:mm', { locale: de })}</span></div>
                  </div>
                </div>

                {/* Section C: KI-Analyse */}
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

                {/* Section D+E: Actions */}
                <div className="border-t border-border px-6 py-5">
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">AKTIONEN</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEmail(selected)}>
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> E-Mail senden
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => convertToCustomer(selected)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Kunde erstellen
                    </Button>
                    {hasCompletedAnalysis && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={resending}
                          onClick={() => resendAnalysisEmail(selected)}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resending ? 'animate-spin' : ''}`} />
                          {resending ? 'Wird gesendet…' : 'Analyse erneut senden'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => showEmailPreview(selected)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> E-Mail Vorschau
                        </Button>
                      </>
                    )}
                  </div>
                  {analysis?.email_sent && analysis.email_sent_at && (
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Letzte E-Mail gesendet: {format(new Date(analysis.email_sent_at), 'dd.MM.yyyy · HH:mm', { locale: de })}
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
            {emailPreview && (
              <div dangerouslySetInnerHTML={{ __html: emailPreview }} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
