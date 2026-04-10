const Datenschutz = () => {
  const sections = [
    {
      title: '1. Allgemeine Hinweise',
      content: (
        <>
          <p>Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen.</p>
          <p className="mt-3 font-semibold text-muted-foreground text-xs tracking-[0.1em] uppercase">Verantwortlicher</p>
          <p>
            Hazem Hokan<br />
            KÖFMAN<br />
            Kaule 85<br />
            51429 Bergisch Gladbach<br />
            Deutschland<br />
            E-Mail: ceo@koefman.de
          </p>
          <p className="mt-3">Die Verarbeitung erfolgt gemäß der DSGVO.</p>
        </>
      ),
    },
    {
      title: '2. Erhebung und Verarbeitung von Daten',
      content: (
        <>
          <p>Wir verarbeiten personenbezogene Daten, wenn Sie:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>unsere Analyse nutzen</li>
            <li>einen Termin buchen</li>
            <li>uns kontaktieren</li>
          </ul>
          <p className="mt-3">Dabei können folgende Daten verarbeitet werden:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Name</li>
            <li>E-Mail-Adresse</li>
            <li>Telefonnummer</li>
            <li>Unternehmensdaten</li>
            <li>Angaben zu geschäftlichen Abläufen</li>
          </ul>
        </>
      ),
    },
    {
      title: '3. Zweck der Verarbeitung',
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Durchführung der Analyse</li>
          <li>Kontaktaufnahme</li>
          <li>Terminvereinbarung</li>
          <li>Verbesserung unserer Dienstleistungen</li>
          <li>interne Systemauswertung</li>
        </ul>
      ),
    },
    {
      title: '4. Automatisierte Verarbeitung',
      content: (
        <>
          <p>Ihre Angaben können automatisiert verarbeitet werden, um eine Analyse Ihrer geschäftlichen Situation zu erstellen.</p>
          <p className="mt-3">Dies dient ausschließlich der Bereitstellung individueller Ergebnisse und der Vorbereitung eines möglichen Beratungsgesprächs.</p>
        </>
      ),
    },
    {
      title: '5. Speicherung der Daten',
      content: <p>Die Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke erforderlich ist.</p>,
    },
    {
      title: '6. Hosting und technische Infrastruktur',
      content: (
        <>
          <p>Unsere Anwendung nutzt externe Dienstleister zur Bereitstellung der technischen Infrastruktur.</p>
          <p className="mt-3">Dazu gehört insbesondere:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Supabase (Datenbank und Authentifizierung)</li>
          </ul>
        </>
      ),
    },
    {
      title: '7. E-Mail-Kommunikation',
      content: (
        <>
          <p>Im Rahmen der Nutzung können automatisierte E-Mails versendet werden, insbesondere:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Analyseergebnisse</li>
            <li>Terminbestätigungen</li>
          </ul>
        </>
      ),
    },
    {
      title: '8. Terminbuchung',
      content: (
        <>
          <p>Bei der Buchung eines Termins werden folgende Daten verarbeitet:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Name</li>
            <li>Telefonnummer</li>
            <li>gewählter Termin</li>
          </ul>
          <p className="mt-3">Diese Daten dienen ausschließlich der Durchführung des Termins.</p>
        </>
      ),
    },
    {
      title: '9. Ihre Rechte',
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Auskunft</li>
          <li>Berichtigung</li>
          <li>Löschung</li>
          <li>Einschränkung der Verarbeitung</li>
          <li>Datenübertragbarkeit</li>
          <li>Widerspruch</li>
        </ul>
      ),
    },
    {
      title: '10. Widerrufsrecht',
      content: <p>Sie können eine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.</p>,
    },
    {
      title: '11. Kontakt',
      content: (
        <>
          <p>Bei Fragen zum Datenschutz:</p>
          <p className="mt-2">E-Mail: ceo@koefman.de</p>
        </>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 md:py-24">
      <article className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-2xl font-semibold tracking-[0.1em] uppercase">Datenschutzerklärung</h1>
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
    </main>
  );
};

export default Datenschutz;
