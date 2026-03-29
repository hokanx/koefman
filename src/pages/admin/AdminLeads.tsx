import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, UserPlus, Clock, Search, ChevronRight, Brain, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const INDUSTRY_LABELS: Record<string, string> = {
  cleaning: 'Gebäudereinigung', garage: 'Kfz / Werkstatt', service: 'Dienstleistung',
  trade: 'Handwerk', general: 'Sonstiges', dienstleistung: 'Dienstleistung',
  lokal: 'Lokales Geschäft', online: 'Online Business', andere: 'Andere', unknown: 'Unbekannt',
};
const SITUATION_LABELS: Record<string, string> = {
  'keine-struktur': 'Keine Struktur', 'chaotisch': 'Alles selbst, chaotisch', 'kompliziert': 'System vorhanden, zu kompliziert',
};
const NEED_LABELS: Record<string, string> = {
  rechnungen: 'Rechnungen & Angebote', belege: 'Belege', vertraege: 'Verträge',
  steuerberater: 'Steuerberater', website: 'Website',
  wenig_anfragen: 'Zu wenig Anfragen', unklare_ablaeufe: 'Unklare Abläufe',
  keine_conversion: 'Keine Conversion', unsicher: 'Unsicher',
};
const STATUS_COLORS: Record<string, string> = {
  neu: 'bg-blue-500/10 text-blue-600', kontaktiert: 'bg-yellow-500/10 text-yellow-600', abgeschlossen: 'bg-green-500/10 text-green-600',
};

interface Lead {
  id: string; name: string; company: string; industry: string;
  situation: string; needs: string[]; contact_method: string;
  email: string; phone: string | null; status: string;
  admin_notes: string | null; converted_customer_id: string | null; created_at: string;
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
  created_at: string;
  lead_analyses?: LeadAnalysis[];
}

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [submissions, setSubmissions] = useState<DiagnosticSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('alle');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<DiagnosticSubmission | null>(null);
  const [notes, setNotes] = useState('');
  const [viewMode, setViewMode] = useState<'leads' | 'analyses'>('leads');
  const navigate = useNavigate();

  const fetchLeads = async () => {
    const { data } = await (supabase as any).from('landing_leads').select('*').order('created_at', { ascending: false });
    setLeads((data || []) as Lead[]);
  };

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
    Promise.all([fetchLeads(), fetchSubmissions()]).then(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await (supabase as any).from('landing_leads').update({ status }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const saveNotes = async (id: string) => {
    await (supabase as any).from('landing_leads').update({ admin_notes: notes }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, admin_notes: notes } : l));
  };

  const openEmail = (lead: Lead) => {
    const subject = encodeURIComponent('KÖFMAN – Deine Anfrage');
    const body = encodeURIComponent(`Hallo ${lead.name},\n\nvielen Dank für dein Interesse an KÖFMAN!\n\nWir würden gerne ein kurzes Gespräch mit dir führen, um deine Anforderungen besser zu verstehen.\n\nWann passt es dir am besten?\n\nViele Grüße\nDein KÖFMAN Team`);
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_self');
  };

  const convertToCustomer = async (lead: Lead) => {
    const { data: customer, error } = await supabase.from('customers').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id!,
      name: lead.company || lead.name,
      contact_person: lead.name,
      email: lead.email,
      phone: lead.phone || '',
    }).select().single();
    if (error || !customer) { alert('Fehler beim Erstellen'); return; }
    await (supabase as any).from('landing_leads').update({
      status: 'abgeschlossen',
      converted_customer_id: customer.id,
    }).eq('id', lead.id);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'abgeschlossen', converted_customer_id: customer.id } : l));
    setSelected(prev => prev?.id === lead.id ? { ...prev, status: 'abgeschlossen', converted_customer_id: customer.id } : prev);
  };

  const filtered = leads.filter(l => {
    if (filter !== 'alle' && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredSubmissions = submissions.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = { alle: leads.length, neu: leads.filter(l => l.status === 'neu').length, kontaktiert: leads.filter(l => l.status === 'kontaktiert').length, abgeschlossen: leads.filter(l => l.status === 'abgeschlossen').length };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Anfragen</h2>
        <Badge variant="secondary">{leads.length + submissions.length} Gesamt</Badge>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setViewMode('leads')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'leads' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
          Leads ({leads.length})
        </button>
        <button onClick={() => setViewMode('analyses')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'analyses' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
          <Brain className="w-3.5 h-3.5" /> Analysen ({submissions.length})
        </button>
      </div>

      {/* Status filters (only for leads view) */}
      {viewMode === 'leads' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['alle', 'neu', 'kontaktiert', 'abgeschlossen'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : viewMode === 'leads' ? (
        /* Leads list */
        filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Keine Anfragen gefunden.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(lead => (
              <Card key={lead.id} className="cursor-pointer card-hover" onClick={() => { setSelected(lead); setNotes(lead.admin_notes || ''); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{lead.company || lead.name}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[lead.status] || ''}`}>{lead.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{lead.name} · {INDUSTRY_LABELS[lead.industry] || lead.industry}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(lead.created_at), 'dd.MM.yy', { locale: de })}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Analyses list */
        filteredSubmissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Keine Analysen gefunden.</p>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map(sub => {
              const analysis = sub.lead_analyses?.[0];
              return (
                <Card key={sub.id} className="cursor-pointer card-hover" onClick={() => setSelectedAnalysis(sub)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{sub.company || sub.name}</span>
                          {sub.variant && <Badge variant="outline" className="text-xs">V: {sub.variant}</Badge>}
                          {analysis && (
                            analysis.analysis_status === 'completed'
                              ? <Badge className="text-xs bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Analyse</Badge>
                              : <Badge className="text-xs bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Fehler</Badge>
                          )}
                          {analysis?.email_sent && <Badge variant="outline" className="text-xs">✉ gesendet</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{sub.name} · {sub.email}</p>
                        {analysis?.main_issue && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{analysis.main_issue}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(sub.created_at), 'dd.MM.yy HH:mm', { locale: de })}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Lead detail modal */}
      <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.company || selected.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Name</span>{selected.name}</div>
                  <div><span className="text-muted-foreground block text-xs">Firma</span>{selected.company}</div>
                  <div><span className="text-muted-foreground block text-xs">Branche</span>{INDUSTRY_LABELS[selected.industry] || selected.industry}</div>
                  <div><span className="text-muted-foreground block text-xs">Situation</span>{SITUATION_LABELS[selected.situation] || selected.situation}</div>
                  <div><span className="text-muted-foreground block text-xs">E-Mail</span>{selected.email}</div>
                  <div><span className="text-muted-foreground block text-xs">Kontakt</span>{selected.contact_method}{selected.phone ? ` · ${selected.phone}` : ''}</div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Bedarf</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.needs || []).map((n: string) => (
                      <Badge key={n} variant="secondary" className="text-xs">{NEED_LABELS[n] || n}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Status</span>
                  <Select value={selected.status} onValueChange={v => updateStatus(selected.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neu">Neu</SelectItem>
                      <SelectItem value="kontaktiert">Kontaktiert</SelectItem>
                      <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Interne Notizen</span>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notizen..." />
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => saveNotes(selected.id)}>Speichern</Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEmail(selected)}>
                    <Mail className="w-4 h-4 mr-1" /> E-Mail
                  </Button>
                  {!selected.converted_customer_id && (
                    <Button size="sm" onClick={() => convertToCustomer(selected)}>
                      <UserPlus className="w-4 h-4 mr-1" /> Kunde erstellen
                    </Button>
                  )}
                  {selected.converted_customer_id && (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/customers/${selected.converted_customer_id}`)}>
                      Zum Kunden <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis detail modal */}
      <Dialog open={!!selectedAnalysis} onOpenChange={v => { if (!v) setSelectedAnalysis(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedAnalysis && (() => {
            const analysis = selectedAnalysis.lead_analyses?.[0];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {selectedAnalysis.company || selectedAnalysis.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground block text-xs">Name</span>{selectedAnalysis.name}</div>
                    <div><span className="text-muted-foreground block text-xs">E-Mail</span>{selectedAnalysis.email}</div>
                    <div><span className="text-muted-foreground block text-xs">Firma</span>{selectedAnalysis.company || '–'}</div>
                    <div><span className="text-muted-foreground block text-xs">Variante</span>{selectedAnalysis.variant || 'direct'}</div>
                    <div><span className="text-muted-foreground block text-xs">Unternehmenstyp</span>{INDUSTRY_LABELS[selectedAnalysis.business_type] || selectedAnalysis.business_type}</div>
                    <div><span className="text-muted-foreground block text-xs">Datum</span>{format(new Date(selectedAnalysis.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="text-muted-foreground block text-xs">Anfragen</span>{selectedAnalysis.lead_flow || '–'}</div>
                    <div><span className="text-muted-foreground block text-xs">Umsatzklarheit</span>{selectedAnalysis.revenue_clarity || '–'}</div>
                    <div><span className="text-muted-foreground block text-xs">Hauptproblem</span>{NEED_LABELS[selectedAnalysis.main_problem] || selectedAnalysis.main_problem || '–'}</div>
                  </div>

                  {analysis && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">KI-Analyse</h3>
                        {analysis.analysis_status === 'completed'
                          ? <Badge className="text-xs bg-green-500/10 text-green-600">Erstellt</Badge>
                          : <Badge className="text-xs bg-red-500/10 text-red-600">Fehler</Badge>
                        }
                        {analysis.email_sent && <Badge variant="outline" className="text-xs">✉ E-Mail gesendet</Badge>}
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Größte Schwachstelle</span>
                        <p className="text-sm">{analysis.main_issue}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Praktische Bedeutung</span>
                        <p className="text-sm">{analysis.practical_meaning}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">3 Prioritäten</span>
                        <ol className="text-sm space-y-1 list-decimal list-inside">
                          {[analysis.priority_1, analysis.priority_2, analysis.priority_3].filter(Boolean).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Nächster Schritt</span>
                        <p className="text-sm">{analysis.next_step}</p>
                      </div>
                    </div>
                  )}

                  {!analysis && (
                    <p className="text-sm text-muted-foreground text-center py-4">Keine Analyse vorhanden.</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
