import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, Upload, Users, Shield, Clock, ArrowRight,
  CheckCircle2, Star, Zap, HeartHandshake, ChevronRight,
  Receipt, FileSignature, FolderOpen, UserPlus
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary">KÖF</span>MAN
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Anmelden
            </Button>
            <Button size="sm" onClick={() => navigate('/login')}>
              Jetzt starten
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative py-20 md:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Büroarbeit abgeben. Geschäft aufbauen.
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
            Wir übernehmen dein{' '}
            <span className="text-primary">Büromanagement.</span>
            <br className="hidden sm:block" />
            {' '}Du kümmerst dich nur noch um dein Geschäft.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Rechnungen, Angebote, Verträge und Belege – alles digital organisiert und persönlich betreut.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 h-13 shadow-lg gold-glow" onClick={() => navigate('/login')}>
              Kostenloses Erstgespräch buchen
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-13" onClick={() => navigate('/login')}>
              Jetzt starten
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Keine Kreditkarte nötig · Persönliche Einrichtung · Sofort einsatzbereit
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-20 md:py-28 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Kommt dir das bekannt vor?
            </h2>
            <p className="text-muted-foreground text-lg">Die gleichen Probleme bei fast jedem Unternehmer.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Clock, text: 'Rechnungen dauern viel zu lange' },
              { icon: FolderOpen, text: 'Belege liegen unsortiert in Schubladen' },
              { icon: FileText, text: 'Keine klare Struktur im Büro' },
              { icon: Receipt, text: 'Steuerberater braucht ständig Unterlagen' },
              { icon: Users, text: 'Zeitverlust durch administrative Arbeit' },
              { icon: Shield, text: 'Angst, Fristen oder Pflichten zu verpassen' },
            ].map((item, i) => (
              <Card key={i} className="bg-card border-destructive/20 card-hover">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-sm">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Wir kümmern uns darum – einfach und strukturiert
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              KÖFMAN ist System und persönlicher Service in einem. Keine komplizierte Software, sondern echte Unterstützung.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Upload,
                title: 'Dokumente hochladen',
                desc: 'Belege, Quittungen und Unterlagen einfach per Foto oder Datei hochladen. Wir kümmern uns um die Sortierung.',
              },
              {
                icon: FileText,
                title: 'Rechnungen & Angebote',
                desc: 'Professionelle Dokumente in Sekunden erstellen. Fertige Vorlagen für deine Branche sind schon da.',
              },
              {
                icon: HeartHandshake,
                title: 'Persönliche Betreuung',
                desc: 'Kein Support-Ticket, kein Chatbot. Wir betreuen dich persönlich und richten alles für dich ein.',
              },
            ].map((item, i) => (
              <Card key={i} className="bg-card border-primary/10 card-hover group">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 md:py-28 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">So einfach funktioniert es</h2>
            <p className="text-muted-foreground text-lg">In 3 Schritten zum stressfreien Büro.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Wir richten alles ein', desc: 'Persönliche Einrichtung deines Kontos mit Vorlagen, die zu deiner Branche passen.' },
              { step: '2', title: 'Du lädst Belege hoch', desc: 'Einfach Fotos oder Dateien hochladen – vom Handy oder Computer.' },
              { step: '3', title: 'Wir übernehmen den Rest', desc: 'Sortierung, Vorbereitung für den Steuerberater und laufende Betreuung.' },
            ].map((item, i) => (
              <div key={i} className="text-center relative">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  {item.step}
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-5 -right-4 w-8 h-8 text-muted-foreground/30" />
                )}
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Alles, was dein Büro braucht</h2>
            <p className="text-muted-foreground text-lg">Einfach. Übersichtlich. Immer dabei.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: UserPlus, title: 'Kunden verwalten', desc: 'Alle Kontakte an einem Ort' },
              { icon: Receipt, title: 'Rechnungen erstellen', desc: 'Professionell in Sekunden' },
              { icon: FileSignature, title: 'Verträge unterschreiben', desc: 'Digital und rechtssicher' },
              { icon: Upload, title: 'Belege hochladen', desc: 'Vom Handy direkt ins System' },
            ].map((item, i) => (
              <Card key={i} className="bg-card card-hover">
                <CardContent className="p-6">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 md:py-28 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Einfache Preise, volle Leistung</h2>
            <p className="text-muted-foreground text-lg">Wähle das Paket, das zu dir passt.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {[
              {
                name: 'Basic',
                price: '49',
                desc: 'Für Einzelunternehmer mit wenig Belegaufkommen.',
                features: ['Bis 20 Belege / Monat', 'Rechnungen & Angebote', 'E-Mail-Support', 'Grundlegende Vorlagen'],
                highlighted: false,
              },
              {
                name: 'Standard',
                price: '99',
                desc: 'Für wachsende Unternehmen mit regelmäßigem Bedarf.',
                features: ['Bis 80 Belege / Monat', 'Verträge & Unterschriften', 'Persönliche Betreuung', 'Steuerberater-Export', 'Branchenvorlagen'],
                highlighted: true,
              },
              {
                name: 'Premium',
                price: '199',
                desc: 'Für Unternehmen mit vollem Büroservice-Bedarf.',
                features: ['Unbegrenzte Belege', 'Alles aus Standard', 'Prioritäts-Support', 'Individuelle Einrichtung', 'Monatlicher Check-in'],
                highlighted: false,
              },
            ].map((plan, i) => (
              <Card
                key={i}
                className={`relative overflow-hidden ${
                  plan.highlighted
                    ? 'border-primary shadow-lg gold-glow ring-2 ring-primary/20'
                    : 'bg-card'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-semibold py-1.5">
                    Beliebteste Wahl
                  </div>
                )}
                <CardContent className={`p-8 flex flex-col h-full ${plan.highlighted ? 'pt-12' : ''}`}>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price} €</span>
                    <span className="text-muted-foreground text-sm"> / Monat</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => navigate('/login')}
                  >
                    Jetzt starten
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-14">Warum Unternehmer KÖFMAN vertrauen</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: HeartHandshake, label: 'Persönlich', desc: 'Echte Menschen, kein Chatbot' },
              { icon: Zap, label: 'Einfach', desc: 'Keine Einarbeitung nötig' },
              { icon: Shield, label: 'Strukturiert', desc: 'Alles an einem Ort' },
              { icon: Clock, label: 'Zeitsparend', desc: 'Mehr Zeit für dein Geschäft' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 md:py-28 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <Star className="w-10 h-10 text-primary mx-auto mb-6" />
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Bereit, dein Büromanagement abzugeben?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Starte jetzt und lass uns dein Büro organisieren – persönlich, digital und stressfrei.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 h-13 shadow-lg gold-glow" onClick={() => navigate('/login')}>
              Kostenloses Erstgespräch
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-13" onClick={() => navigate('/login')}>
              Jetzt starten
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            <span className="text-primary">KÖF</span>MAN
          </span>
          <p>© {new Date().getFullYear()} KÖFMAN. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
