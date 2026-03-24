import { useLanguage } from '@/i18n/LanguageContext';

interface ExtData {
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  repair_notes: string;
  property_size: string;
  cleaning_frequency: string;
  service_location: string;
  service_notes: string;
  business_category: string;
}

interface Props {
  category: string;
  ext: ExtData;
  setExt: React.Dispatch<React.SetStateAction<ExtData>>;
}

const inputClass = 'w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none';

const CustomerExtensionFields = ({ category, ext, setExt }: Props) => {
  const { t } = useLanguage();
  const update = (field: string, value: string) => setExt((prev) => ({ ...prev, [field]: value }));

  if (category === 'garage') {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.garage.vehiclePlate}</label>
            <input type="text" value={ext.vehicle_plate} onChange={(e) => update('vehicle_plate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.garage.vehicleBrand}</label>
            <input type="text" value={ext.vehicle_brand} onChange={(e) => update('vehicle_brand', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">{t.garage.vehicleModel}</label>
          <input type="text" value={ext.vehicle_model} onChange={(e) => update('vehicle_model', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">{t.garage.repairNotes}</label>
          <textarea value={ext.repair_notes} onChange={(e) => update('repair_notes', e.target.value)} rows={2}
            className={`${inputClass} resize-none`} />
        </div>
      </>
    );
  }

  if (category === 'cleaning') {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.propertySize}</label>
            <input type="text" value={ext.property_size} onChange={(e) => update('property_size', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.cleaningFrequency}</label>
            <input type="text" value={ext.cleaning_frequency} onChange={(e) => update('cleaning_frequency', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.serviceLocation}</label>
          <input type="text" value={ext.service_location} onChange={(e) => update('service_location', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.serviceNotes}</label>
          <textarea value={ext.service_notes} onChange={(e) => update('service_notes', e.target.value)} rows={2}
            className={`${inputClass} resize-none`} />
        </div>
      </>
    );
  }

  return null;
};

export default CustomerExtensionFields;
