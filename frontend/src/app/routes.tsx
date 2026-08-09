import { Navigate, createBrowserRouter } from 'react-router';
import { NotFoundPage } from '../shared/components/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <NotFoundPage />,
    children: [
      {
        path: '',
        lazy: async () => ({
          Component: (await import('../features/auth/AuthHomeGate')).AuthHomeGate,
        }),
      },
      {
        path: 'about',
        lazy: async () => ({
          Component: (await import('./components/AboutPage')).AboutPage,
        }),
      },
      {
        path: 'contact',
        lazy: async () => ({
          Component: (await import('./components/ContactPage')).ContactPage,
        }),
      },
      {
        path: 'privacy',
        lazy: async () => ({
          Component: (await import('./components/PrivacyPolicyPage')).PrivacyPolicyPage,
        }),
      },
      {
        path: 'terms',
        lazy: async () => ({
          Component: (await import('./components/TermsPage')).TermsPage,
        }),
      },
      {
        path: 'boneyard-capture',
        lazy: async () => ({
          Component: (await import('./components/BoneyardCapturePage')).BoneyardCapturePage,
        }),
      },
      {
        path: 'login',
        lazy: async () => ({
          Component: (await import('../features/auth/LoginPage')).LoginPage,
        }),
      },
      {
        path: 'register',
        lazy: async () => ({
          Component: (await import('../features/auth/RegisterPage')).RegisterPage,
        }),
      },
      {
        path: 'register/professor',
        lazy: async () => ({
          Component: (await import('../features/auth/ProfessorRegisterPage')).ProfessorRegisterPage,
        }),
      },
      {
        path: 'reset-password',
        lazy: async () => ({
          Component: (await import('../features/auth/ResetPasswordPage')).ResetPasswordPage,
        }),
      },
      {
        path: 'account-restricted',
        lazy: async () => ({
          Component: (await import('../features/auth/AccountRestrictedPage')).AccountRestrictedPage,
        }),
      },
      {
        path: 'auth/callback',
        lazy: async () => ({
          Component: (await import('../features/auth/AuthCallbackPage')).AuthCallbackPage,
        }),
      },
      {
        path: 'diary/create',
        lazy: async () => ({
          Component: (await import('../features/diary/CreateDiaryFlow')).CreateDiaryFlow,
        }),
      },
      {
        path: 'community/:postId',
        lazy: async () => ({
          Component: (await import('../features/community/PostDetailPage')).PostDetailPage,
        }),
      },
      {
        path: 'search',
        lazy: async () => ({
          Component: (await import('./components/SearchPage')).SearchPage,
        }),
      },
      {
        path: 'search-people',
        lazy: async () => ({
          Component: (await import('./components/SearchPeoplePage')).SearchPeoplePage,
        }),
      },
      {
        path: 'profile',
        Component: () => <Navigate to="/student/profile" replace />,
      },
      {
        path: 'professor/pending',
        lazy: async () => ({
          Component: (await import('./components/ProfessorPendingPage')).ProfessorPendingPage,
        }),
      },
      {
        path: 'professor/rejected',
        lazy: async () => ({
          Component: (await import('./components/ProfessorRejectedPage')).ProfessorRejectedPage,
        }),
      },
      {
        path: 'student',
        lazy: async () => ({
          Component: (await import('../features/auth/StudentProtectedLayout')).StudentProtectedLayout,
        }),
        errorElement: <NotFoundPage />,
        children: [
          {
            index: true,
            element: <Navigate to="/student/home" replace />,
          },
          {
            path: 'home',
            lazy: async () => ({
              Component: (await import('./components/StudentDashboard')).StudentDashboard,
            }),
          },

          {
            path: 'campus-exchange',
            lazy: async () => ({
              Component: (await import('../features/marketplace/CampusExchangePage')).CampusExchangePage,
            }),
          },

          {
            path: 'marketplace',
            lazy: async () => ({
              Component: (await import('../features/marketplace/CampusExchangePage')).CampusExchangePage,
            }),
          },
          {
            path: 'buy-sell',
            lazy: async () => ({
              Component: (await import('../features/marketplace/BuySellPage')).BuySellPage,
            }),
          },
          {
            path: 'buy-and-sell',
            lazy: async () => ({
              Component: (await import('../features/marketplace/BuySellPage')).BuySellPage,
            }),
          },
          {
            path: 'campus-exchange/buy-sell',
            lazy: async () => ({
              Component: (await import('../features/marketplace/BuySellPage')).BuySellPage,
            }),
          },

          {
            path: 'buy-sell/manage',
            lazy: async () => ({
              Component: (await import('../features/marketplace/MarketplaceManagePage')).MarketplaceManagePage,
            }),
          },
          {
            path: 'buy-sell/:listingId',
            lazy: async () => ({
              Component: (await import('../features/marketplace/MarketplaceListingDetailPage')).MarketplaceListingDetailPage,
            }),
          },
          {
            path: 'roommate',
            lazy: async () => ({
              Component: (await import('../features/marketplace/RoommatePage')).RoommatePage,
            }),
          },
          {
            path: 'campus-exchange/messages',
            lazy: async () => ({
              Component: (await import('../features/marketplace/MarketplaceMessagesPage')).MarketplaceMessagesPage,
            }),
          },
          {
            path: 'wishlist',
            lazy: async () => ({
              Component: (await import('../features/marketplace/MarketplaceWishlistPage')).MarketplaceWishlistPage,
            }),
          },
          {
            path: 'canteen',
            lazy: async () => ({
              Component: (await import('../features/canteen/CanteenMenuPage')).CanteenMenuPage,
            }),
          },

          {
            path: 'canteen/reorder/:orderId',
            lazy: async () => ({
              Component: (await import('../features/canteen/CanteenReorderPage')).CanteenReorderPage,
            }),
          },
          {
            path: 'orders',
            lazy: async () => ({
              Component: (await import('../shared/components/OrderHistory/MyOrdersPage')).MyOrdersPage,
            }),
          },
          {
            path: 'print',
            lazy: async () => ({
              Component: (await import('../features/print/PrintPage')).PrintPage,
            }),
          },
          {
            path: 'print/reorder/:orderId',
            lazy: async () => ({
              Component: (await import('../features/print/PrintReorderPage')).PrintReorderPage,
            }),
          },
          {
            path: 'community',
            lazy: async () => ({
              Component: (await import('../features/community/CommunityFeed')).CommunityFeed,
            }),
          },
          {
            path: 'community/create',
            lazy: async () => ({
              Component: (await import('../features/community/DiaryCreatorPage')).DiaryCreatorPage,
            }),
          },

          {
            path: 'notifications',
            lazy: async () => ({
              Component: (await import('./components/StudentNotificationsPage')).StudentNotificationsPage,
            }),
          },
          {
            path: 'notifications/:id',
            lazy: async () => ({
              Component: (await import('./components/NotificationDetailPage')).NotificationDetailPage,
            }),
          },
          {
            path: 'profile',
            lazy: async () => ({
              Component: (await import('../features/profile/ProfilePage')).ProfilePage,
            }),
          },
          {
            path: 'profile/edit',
            lazy: async () => ({
              Component: (await import('../features/profile/ProfilePage')).ProfilePage,
            }),
          },
          {
            path: 'me',
            Component: () => <Navigate to="/student/profile" replace />,
          },
          {
            path: 'more',
            lazy: async () => ({
              Component: (await import('./components/MorePage')).MorePage,
            }),
          },
          {
            path: 'profile/:userId',
            lazy: async () => ({
              Component: (await import('./components/UserProfilePage')).UserProfilePage,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('./components/StudentSettingsPage')).StudentSettingsPage,
            }),
          },
          {
            path: 'settings/notifications',
            lazy: async () => ({
              Component: (await import('./components/NotificationPreferencesPage')).NotificationPreferencesPage,
            }),
          },
          {
            path: 'settings/password',
            lazy: async () => ({
              Component: (await import('./components/StudentChangePasswordPage')).StudentChangePasswordPage,
            }),
          },
          {
            path: 'settings/feedback',
            lazy: async () => ({
              Component: (await import('./components/StudentFeedbackPage')).StudentFeedbackPage,
            }),
          },
          {
            path: 'bookmarks',
            lazy: async () => ({
              Component: (await import('./components/SavedBookmarks')).SavedBookmarks,
            }),
          },

          {
            path: 'notices',
            lazy: async () => ({
              Component: (await import('./components/NoticesPage')).NoticesPage,
            }),
          },
          {
            path: 'notices/admin',
            lazy: async () => ({
              Component: (await import('./components/NoticeAdminPage')).NoticeAdminPage,
            }),
          },
          {
            path: 'notices/admin/published',
            lazy: async () => ({
              Component: (await import('./components/PublishedNoticesAdminPage')).PublishedNoticesAdminPage,
            }),
          },
          {
            path: 'search',
            lazy: async () => ({
              Component: (await import('./components/SearchPage')).SearchPage,
            }),
          },
          {
            path: 'search-people',
            lazy: async () => ({
              Component: (await import('./components/SearchPeoplePage')).SearchPeoplePage,
            }),
          },
          {
            path: 'admin/*',
            Component: () => <Navigate to="/admin" replace />,
          },
          {
            path: 'admin',
            Component: () => <Navigate to="/admin" replace />,
          },
        ],
      },
      {
        path: 'canteen-dashboard',
        lazy: async () => ({
          Component: (await import('../features/auth/DashboardProtectedRoute')).CanteenDashboardProtectedRoute,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../features/canteen/CanteenDashboardPage')).CanteenDashboardPage,
            }),
          },
        ],
      },
      {
        path: 'print-dashboard',
        lazy: async () => ({
          Component: (await import('../features/auth/DashboardProtectedRoute')).PrintDashboardProtectedRoute,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../features/print/PrintDashboardPage')).PrintDashboardPage,
            }),
          },
        ],
      },
      {
        path: 'professor',
        lazy: async () => ({
          Component: (await import('../features/auth/ProfessorProtectedLayout')).ProfessorProtectedLayout,
        }),
        errorElement: <NotFoundPage />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('./components/ProfessorDashboard')).ProfessorDashboard,
            }),
          },
          {
            path: 'home',
            lazy: async () => ({
              Component: (await import('./components/ProfessorDashboard')).ProfessorDashboard,
            }),
          },

          {
            path: 'canteen',
            lazy: async () => ({
              Component: (await import('./components/ProfessorCanteenPage')).ProfessorCanteenPage,
            }),
          },
          {
            path: 'print',
            lazy: async () => ({
              Component: (await import('./components/ProfessorPrintPage')).ProfessorPrintPage,
            }),
          },
          {
            path: 'orders',
            lazy: async () => ({
              Component: (await import('../shared/components/OrderHistory/MyOrdersPage')).MyOrdersPage,
            }),
          },

          {
            path: 'payments',
            lazy: async () => ({
              Component: (await import('./components/ProfessorPaymentsPage')).ProfessorPaymentsPage,
            }),
          },
          {
            path: 'profile',
            lazy: async () => ({
              Component: (await import('../features/profile/ProfilePage')).ProfilePage,
            }),
          },

          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('./components/ProfessorSettingsPage')).ProfessorSettingsPage,
            }),
          },
          {
            path: 'settings/notice-admin',
            lazy: async () => ({
              Component: (await import('./components/ProfessorNoticeAdminPage')).ProfessorNoticeAdminPage,
            }),
          },
          {
            path: 'notices',
            lazy: async () => ({
              Component: (await import('./components/ProfessorCampusNoticesPage')).ProfessorCampusNoticesPage,
            }),
          },
          {
            path: 'notices/faculty',
            lazy: async () => ({
              Component: (await import('./components/ProfessorFacultyNoticesPage')).ProfessorFacultyNoticesPage,
            }),
          },
          {
            path: 'alerts',
            lazy: async () => ({
              Component: (await import('./components/ProfessorAlertsPage')).ProfessorAlertsPage,
            }),
          },
          {
            path: 'alerts/:id',
            lazy: async () => ({
              Component: (await import('./components/NotificationDetailPage')).NotificationDetailPage,
            }),
          },

          {
            path: '*',
            Component: NotFoundPage,
          },
        ],
      },
      {
        path: 'admin',
        lazy: async () => ({
          Component: (await import('../features/auth/AdminProtectedRoute')).AdminProtectedRoute,
        }),
        errorElement: <NotFoundPage />,
        children: [
          {
            path: '',
            lazy: async () => ({
              Component: (await import('./components/AdminLayout')).AdminLayout,
            }),
            errorElement: <NotFoundPage />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('./components/AdminDashboard')).AdminDashboard,
                }),
              },
              {
                path: 'alerts',
                lazy: async () => ({
                  Component: (await import('./components/AdminSmartAlertsPage')).AdminSmartAlertsPage,
                }),
              },
              {
                path: 'accounts',
                lazy: async () => ({
                  Component: (await import('./components/AdminAccountsHub')).AdminAccountsHub,
                }),
              },

              {
                path: 'orders',
                lazy: async () => ({
                  Component: (await import('./components/AdminOrdersHub')).AdminOrdersHub,
                }),
              },


              {
                path: 'community-hub',
                lazy: async () => ({
                  Component: (await import('./components/AdminCommunityHub')).AdminCommunityHub,
                }),
              },
              {
                path: 'flagged-diaries',
                lazy: async () => ({
                  Component: (await import('./components/AdminFlaggedDiariesPage')).AdminFlaggedDiariesPage,
                }),
              },
              {
                path: 'notices',
                lazy: async () => ({
                  Component: (await import('./components/AdminNoticesPage')).AdminNoticesPage,
                }),
              },
              {
                path: 'notice-admins',
                lazy: async () => ({
                  Component: (await import('./components/AdminNoticeManagementPage')).AdminNoticeManagementPage,
                }),
              },
              {
                path: 'users',
                lazy: async () => ({
                  Component: (await import('./components/AdminUsersPage')).AdminUsersPage,
                }),
              },
              {
                path: 'users/banned',
                lazy: async () => ({
                  Component: (await import('./components/AdminBannedUsersPage')).AdminBannedUsersPage,
                }),
              },
              {
                path: 'users/roles',
                lazy: async () => ({
                  Component: (await import('./components/AdminRolesPage')).AdminRolesPage,
                }),
              },
              {
                path: 'invites',
                lazy: async () => ({
                  Component: (await import('./components/AdminInvitesPage')).AdminInvitesPage,
                }),
              },
              {
                path: 'invites/waitlist',
                lazy: async () => ({
                  Component: (await import('./components/AdminInviteWaitlistPage')).AdminInviteWaitlistPage,
                }),
              },
              {
                path: 'professors',
                lazy: async () => ({
                  Component: (await import('./components/AdminProfessorsPage')).AdminProfessorsPage,
                }),
              },
              {
                path: 'professors/pending',
                lazy: async () => ({
                  Component: (await import('./components/AdminProfessorsPendingPage')).AdminProfessorsPendingPage,
                }),
              },
              {
                path: 'users/:userId',
                lazy: async () => ({
                  Component: (await import('./components/AdminUserDetailPage')).AdminUserDetailPage,
                }),
              },
              /*
               * NOTE: In React Router v7, static route paths must be defined BEFORE
               * dynamic parameter routes (e.g. :shopId) sharing the same prefix.
               * Otherwise, dynamic routes shadow static segments, causing requests
               * like "/admin/canteen/orders" to match "canteen/:shopId" with shopId="orders".
               */
              {
                path: 'canteen',
                lazy: async () => ({
                  Component: (await import('./components/AdminCanteensPage')).AdminCanteensPage,
                }),
              },
              {
                path: 'canteen/orders',
                lazy: async () => ({
                  Component: (await import('./components/AdminCanteenOrdersPage')).AdminCanteenOrdersPage,
                }),
              },
              {
                path: 'canteen/menu',
                lazy: async () => ({
                  Component: (await import('./components/AdminCanteenMenuPage')).AdminCanteenMenuPage,
                }),
              },
              {
                path: 'canteen/:shopId',
                lazy: async () => ({
                  Component: (await import('./components/AdminCanteenSchedulePage')).AdminCanteenSchedulePage,
                }),
              },
              {
                path: 'print',
                lazy: async () => ({
                  Component: (await import('./components/AdminPrintShopsPage')).AdminPrintShopsPage,
                }),
              },
              {
                path: 'print/orders',
                lazy: async () => ({
                  Component: (await import('./components/AdminPrintOrdersPage')).AdminPrintOrdersPage,
                }),
              },
              {
                path: 'print/:shopId',
                lazy: async () => ({
                  Component: (await import('./components/AdminPrintSchedulePage')).AdminPrintSchedulePage,
                }),
              },
              {
                path: 'marketplace',
                lazy: async () => ({
                  Component: (await import('./components/AdminMarketplacePage')).AdminMarketplacePage,
                }),
              },
              {
                path: 'marketplace/reported',
                lazy: async () => ({
                  Component: (await import('./components/AdminMarketplaceReportedPage')).AdminMarketplaceReportedPage,
                }),
              },
              {
                path: 'community',
                lazy: async () => ({
                  Component: (await import('./components/AdminCommunityPage')).AdminCommunityPage,
                }),
              },
              {
                path: 'community/reported',
                lazy: async () => ({
                  Component: (await import('./components/AdminCommunityReportedPage')).AdminCommunityReportedPage,
                }),
              },
              {
                path: 'community/notice',
                lazy: async () => ({
                  Component: (await import('./components/AdminCommunityNoticePage')).AdminCommunityNoticePage,
                }),
              },
              {
                path: 'email',
                lazy: async () => ({
                  Component: (await import('./components/AdminEmailPage')).AdminEmailPage,
                }),
              },
              {
                path: 'email/compose',
                lazy: async () => ({
                  Component: (await import('./components/AdminEmailComposePage')).AdminEmailComposePage,
                }),
              },
              {
                path: 'email/history',
                lazy: async () => ({
                  Component: (await import('./components/AdminEmailHistoryPage')).AdminEmailHistoryPage,
                }),
              },
              {
                path: 'email/templates',
                lazy: async () => ({
                  Component: (await import('./components/AdminEmailTemplatesPage')).AdminEmailTemplatesPage,
                }),
              },
              {
                path: 'finance',
                lazy: async () => ({
                  Component: (await import('./components/AdminFinancePage')).AdminFinancePage,
                }),
              },
              {
                path: 'finance/credits',
                lazy: async () => ({
                  Component: (await import('./components/AdminFinanceCreditsPage')).AdminFinanceCreditsPage,
                }),
              },
              {
                path: 'finance/revenue',
                lazy: async () => ({
                  Component: (await import('./components/AdminFinanceRevenuePage')).AdminFinanceRevenuePage,
                }),
              },
              {
                path: 'settings',
                lazy: async () => ({
                  Component: (await import('./components/AdminSettingsPage')).AdminSettingsPage,
                }),
              },
              {
                path: 'feedback',
                lazy: async () => ({ Component: (await import('./components/AdminFeedbackPage')).AdminFeedbackPage }),
              },
              {
                path: 'announcements',
                lazy: async () => ({
                  Component: (await import('./components/AdminAnnouncementsPage')).AdminAnnouncementsPage,
                }),
              },
              {
                path: 'contact-issues',
                lazy: async () => ({
                  Component: (await import('./components/AdminContactIssuesPage')).AdminContactIssuesPage,
                }),
              },
              {
                path: 'legal',
                lazy: async () => ({
                  Component: (await import('./components/AdminLegalPage')).AdminLegalPage,
                }),
              },
              {
                path: 'legal/export',
                lazy: async () => ({
                  Component: (await import('./components/AdminLegalExportPage')).AdminLegalExportPage,
                }),
              },
              {
                path: 'audit',
                lazy: async () => ({
                  Component: (await import('./components/AdminAuditPage')).AdminAuditPage,
                }),
              },
              {
                path: '*',
                Component: NotFoundPage,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
]);
