import { Link } from 'react-router';

import { brand } from '@/config/brand';
import { paths } from '@/routes/paths';

const linkClass = 'hover:text-fg rounded transition-colors';

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line px-4 py-5 text-sm text-fg-subtle sm:px-6 lg:px-8">
      <p>
        © {new Date().getFullYear()} {brand.name}. {brand.slogan}
      </p>
      <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link to={paths.imprint} className={linkClass}>
          Imprint
        </Link>
        <Link to={paths.privacy} className={linkClass}>
          Privacy
        </Link>
        <a href={`mailto:${brand.contactEmail}`} className={linkClass}>
          Contact
        </a>
      </nav>
    </footer>
  );
}
