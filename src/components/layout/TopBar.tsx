import { Link } from 'react-router';

import { LogoMark } from '@/components/brand/LogoMark';
import { brand } from '@/config/brand';
import { paths } from '@/routes/paths';

import { GlobalSearch } from './GlobalSearch';
import { ProfileMenu } from './ProfileMenu';

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* The sidebar carries the logo on large screens. */}
      <Link to={paths.store} className="rounded-lg lg:hidden" aria-label={`${brand.name} home`}>
        <LogoMark />
      </Link>
      <GlobalSearch />
      <div className="ml-auto">
        <ProfileMenu />
      </div>
    </header>
  );
}
