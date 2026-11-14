import { createBrowserRouter } from 'react-router';

import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UiKitPage } from '@/pages/UiKitPage';

import { paths } from './paths';

export const router = createBrowserRouter([
  { path: paths.home, element: <HomePage /> },
  { path: paths.uiKit, element: <UiKitPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
