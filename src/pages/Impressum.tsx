const Impressum = () => {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 md:py-24">
      <article className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-2xl font-semibold tracking-[0.1em] uppercase">Impressum</h1>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Angaben gemäß § 5 TMG</h2>
          <p className="text-sm leading-relaxed">
            Hazem Hokan<br />
            KÖFMAN<br />
            Kaule 85<br />
            51429 Bergisch Gladbach<br />
            Deutschland
          </p>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Kontakt</h2>
          <p className="text-sm leading-relaxed">
            E-Mail: ceo@koefman.de<br />
            Telefon: +49 176 58867763
          </p>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Umsatzsteuer-ID</h2>
          <p className="text-sm leading-relaxed">
            Keine Angabe gemäß § 19 UStG (Kleinunternehmerregelung)
          </p>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p className="text-sm leading-relaxed">
            Hazem Hokan<br />
            Adresse wie oben
          </p>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Haftung für Inhalte</h2>
          <p className="text-sm leading-relaxed">
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
          </p>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Haftung für Links</h2>
          <p className="text-sm leading-relaxed">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
          </p>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">Urheberrecht</h2>
          <p className="text-sm leading-relaxed">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke unterliegen dem deutschen Urheberrecht.
          </p>
        </section>
      </article>
      <LegalFooter />
    </main>
  );
};

export default Impressum;
