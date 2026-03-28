import { FileText, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateDE } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DocumentStatusProps {
  count: number;
  lastUploadDate?: string;
  hasBankDocs?: boolean;
  hasExpenseDocs?: boolean;
}

const DocumentStatus = ({ count, lastUploadDate, hasBankDocs, hasExpenseDocs }: DocumentStatusProps) => {
  const navigate = useNavigate();
  const isComplete = count >= 3 && hasBankDocs !== false;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-semibold text-foreground">Belege & Dokumente</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Hochgeladene Belege</span>
          </div>
          <span className="font-medium text-foreground">{count}</span>
        </div>

        {lastUploadDate && (
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Letzter Upload</span>
            <span className="text-sm font-medium text-foreground">{formatDateDE(lastUploadDate)}</span>
          </div>
        )}

        {isComplete ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Alles vollständig für diesen Zeitraum
          </div>
        ) : (
          <div className="space-y-2">
            {count < 3 && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Es fehlen noch Belege für diesen Zeitraum
              </div>
            )}
            {hasBankDocs === false && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Kontoauszüge fehlen noch
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate('/documents')}
        >
          <Upload className="h-4 w-4" />
          Belege hochladen
        </Button>
      </div>
    </div>
  );
};

export default DocumentStatus;
