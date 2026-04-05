import { useParams } from 'react-router-dom';
import TruthLanding from '@/components/TruthLanding';

export default function Truth() {
  const { campaignId } = useParams();
  return (
    <TruthLanding
      entryLine1="DU WOLLTEST ES WISSEN."
      entryLine2="HIER IST DIE ANTWORT."
      entryLine3="ES GEHT UM DEIN SYSTEM."
      campaignId={campaignId || 'direct'}
    />
  );
}
