const AGB = () => {
  const sections = [
    { title: '1. Geltungsbereich', content: <p>Diese AGB gelten für alle Verträge zwischen Hazem Hokan (KÖFMAN) und seinen Kunden.</p> },
    { title: '2. Leistungen', content: (
      <>
        <p>KÖFMAN bietet Dienstleistungen im Bereich:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>digitales Büromanagement</li>
          <li>Analyse von Geschäftsprozessen</li>
          <li>Strukturierung von Angeboten und Abläufen</li>
          <li>Beratung und Systemoptimierung</li>
        </ul>
      </>
    )},
    { title: '3. Vertragsschluss', content: (
      <>
        <p>Ein Vertrag kommt zustande durch:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Terminbuchung</li>
          <li>Annahme eines Angebots</li>
          <li>oder individuelle Vereinbarung</li>
        </ul>
      </>
    )},
    { title: '4. Preise', content: (
      <>
        <p>Es gelten folgende Preise:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Setup-Gebühr: 799 € einmalig</li>
          <li>Monatliche Gebühr: 299 €</li>
        </ul>
        <p className="mt-3">Abweichende Preise oder Rabatte können individuell vereinbart werden.</p>
      </>
    )},
    { title: '5. Zahlungsbedingungen', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Zahlungen sind im Voraus fällig</li>
        <li>Rechnungen sind innerhalb von 14 Tagen ohne Abzug zahlbar</li>
      </ul>
    )},
    { title: '6. Vertragslaufzeit und Kündigung', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Mindestlaufzeit: 12 Monate</li>
        <li>Kündigungsfrist: 30 Tage zum Laufzeitende</li>
      </ul>
    )},
    { title: '7. Mitwirkungspflichten', content: (
      <>
        <p>Der Kunde verpflichtet sich:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>alle notwendigen Informationen bereitzustellen</li>
          <li>aktiv an der Umsetzung mitzuwirken</li>
        </ul>
      </>
    )},
    { title: '8. Haftung', content: (
      <>
        <p>Der Anbieter haftet nur für Vorsatz und grobe Fahrlässigkeit.</p>
        <p className="mt-3">Eine Garantie für wirtschaftliche Ergebnisse wird nicht gegeben.</p>
      </>
    )},
    { title: '9. Datenschutz', content: <p>Die Verarbeitung personenbezogener Daten erfolgt gemäß Datenschutzerklärung.</p> },
    { title: '10. Schlussbestimmungen', content: <p>Es gilt deutsches Recht.</p> },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 md:py-24">
      <article className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-2xl font-semibold tracking-[0.1em] uppercase">Allgemeine Geschäftsbedingungen</h1>
        {sections.map((s, i) => (
          <div key={i}>
            {i > 0 && <div className="border-t border-border mb-10" />}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">{s.title}</h2>
              <div className="text-sm leading-relaxed">{s.content}</div>
            </section>
          </div>
        ))}
      </article>
      <LegalFooter />
    </main>
  );
};

export default AGB;
