import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, UserPlus, Phone, Clock, Building2, Search, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '@/contexts/ImpersonationContext';

const INDUSTRY_LABELS: Record<string, string> = {
  cleaning: 'Gebäudereinigung', garage: 'Kfz / Werkstatt', service: 'Dienstleistung',
  trade: 'Handwerk', general: 'Sonstiges',
};
const SITUATION_LABELS: Record<string, string> = {
  'keine-struktur': 'Keine Struktur', 'chaotisch': 'Alles selbst, chaotisch', 'kompliziert': 'System vorhanden, zu kompliziert',
};
const NEED_LABELS: Record<string, string> = {
  rechnungen: 'Rechnungen & Angebote', belege: 'Belege', vertraege: 'Verträge',
  steuerberater: 'Steuerberater', website: 'Website',
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

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('alle');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  const fetchLeads = async () => {
    const { data } = await (supabase as any).from('landing_leads').select('*').order('created_at', { ascending: false });
    setLeads((data || []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

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
    // Create customer directly then mark lead as converted
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

  const counts = { alle: leads.length, neu: leads.filter(l => l.status === 'neu').length, kontaktiert: leads.filter(l => l.status === 'kontaktiert').length, abgeschlossen: leads.filter(l => l.status === 'abgeschlossen').length };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Anfragen</h2>
        <Badge variant="secondary">{leads.length} Gesamt</Badge>
      </div>

      {/* Filters */}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
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
      )}

      {/* Detail modal */}
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
    </div>
  );
};

export default AdminLeads;
