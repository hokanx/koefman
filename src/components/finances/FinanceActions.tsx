import { FileArchive, FileText, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FinanceActionsProps {
  onTaxExport: () => void;
  onCsvExport: () => void;
  exporting: boolean;
  exportProgress: string;
}

const FinanceActions = ({ onTaxExport, onCsvExport, exporting, exportProgress }: FinanceActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-semibold text-foreground">Aktionen</h2>
      <div className="space-y-2">
        <Button className="w-full justify-start gap-2" onClick={onTaxExport} disabled={exporting}>
          <FileArchive className="h-4 w-4" />
          <div className="flex flex-col items-start text-left">
            <span>{exporting ? exportProgress : 'Unterlagen für Steuerberater exportieren'}</span>
            <span className="text-xs font-normal opacity-75">Rechnungen, Angebote, CSV & Zusammenfassung als ZIP</span>
          </div>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onCsvExport}>
          <FileText className="h-4 w-4" />
          Nur CSV exportieren
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/invoices/new')}>
          <Plus className="h-4 w-4" />
          Rechnung erstellen
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/documents')}>
          <Upload className="h-4 w-4" />
          Beleg hochladen
        </Button>
      </div>
    </div>
  );
};

export default FinanceActions;
