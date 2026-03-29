import { FileText, CheckCircle2, Clock, Eye } from 'lucide-react';

interface DocumentStatsProps {
  documents: any[];
}

const DocumentStats = ({ documents }: DocumentStatsProps) => {
  const total = documents.length;
  const neu = documents.filter(d => d.status === 'neu').length;
  const geprueft = documents.filter(d => d.status === 'geprueft').length;
  const verarbeitet = documents.filter(d => d.status === 'verarbeitet').length;

  const stats = [
    { label: 'Gesamt', value: total, icon: FileText, color: 'text-foreground' },
    { label: 'Neu', value: neu, icon: Clock, color: 'text-info' },
    { label: 'Geprüft', value: geprueft, icon: Eye, color: 'text-warning' },
    { label: 'Verarbeitet', value: verarbeitet, icon: CheckCircle2, color: 'text-success' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
          <s.icon className={`mx-auto h-5 w-5 ${s.color} mb-1`} />
          <p className="text-lg font-bold text-foreground">{s.value}</p>
          <p className="text-[11px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

export default DocumentStats;
