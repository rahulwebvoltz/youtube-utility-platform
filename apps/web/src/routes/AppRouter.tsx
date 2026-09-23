import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell.js';
import { AuthLayout } from '@/components/layout/AuthLayout.js';
import { RequireAuth } from '@/components/auth/RequireAuth.js';
import { AnalyzerPage } from '@/features/analyzer/AnalyzerPage.js';
import { DashboardPage } from '@/features/dashboard/DashboardPage.js';
import { HistoryPage } from '@/features/history/HistoryPage.js';
import { CollectionsPage } from '@/features/collections/CollectionsPage.js';
import { SettingsPage } from '@/features/settings/SettingsPage.js';
import { LoginPage } from '@/features/auth/LoginPage.js';
import { RegisterPage } from '@/features/auth/RegisterPage.js';
import { TranscriptPage } from '@/features/transcript/TranscriptPage.js';
import { TranscriptViewPage } from '@/features/transcript/TranscriptViewPage.js';
import { MediaJobPage } from '@/features/media/MediaJobPage.js';
import { MediaViewPage } from '@/features/media/MediaViewPage.js';
import { DownloadsPage } from '@/features/media/DownloadsPage.js';
import { PlaylistPage } from '@/features/playlist/PlaylistPage.js';
import { PlaylistBatchPage } from '@/features/playlist/PlaylistBatchPage.js';
import { CollectionDetailPage } from '@/features/collections/CollectionDetailPage.js';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <AnalyzerPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'collections', element: <CollectionsPage /> },
          { path: 'collections/:id', element: <CollectionDetailPage /> },
          { path: 'downloads', element: <DownloadsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'transcript/video/:youtubeId', element: <TranscriptViewPage /> },
          { path: 'transcript/:jobId', element: <TranscriptPage /> },
          { path: 'media/file/:mediaFileId', element: <MediaViewPage /> },
          { path: 'media/:jobId', element: <MediaJobPage /> },
          { path: 'playlist/:youtubeId', element: <PlaylistPage /> },
          { path: 'playlist-job/:jobId', element: <PlaylistBatchPage /> },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
