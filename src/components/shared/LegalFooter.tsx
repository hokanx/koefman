import { Link } from 'react-router-dom';

const LegalFooter = () => (
  <footer className="border-t border-border bg-background px-4 py-6">
    <div className="mx-auto flex max-w-4xl items-center justify-center gap-4 text-xs text-muted-foreground">
      <Link to="/impressum" className="transition-colors hover:text-foreground">Impressum</Link>
      <span>|</span>
      <Link to="/datenschutz" className="transition-colors hover:text-foreground">Datenschutz</Link>
      <span>|</span>
      <Link to="/agb" className="transition-colors hover:text-foreground">AGB</Link>
    </div>
  </footer>
);

export default LegalFooter;
