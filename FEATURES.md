# Tezeon Courier (vizcome-courier) — Feature Reference

Complete inventory of what the courier/rider app does, where each feature lives, and which backend it talks to.

**Verified against the codebase and the live API on 2026-08-20.** All 27 endpoints were probed against `https://api.tezeon.com/api`; anything marked broken returned HTTP 404 (route not registered), not merely an auth failure.

- **Package:** `vizcome-courier` · React Native / Expo
- **API base:** `https://api.tezeon.com/api` (`src/constants/api.js`, also exports `API_SERVER_URL` for media)
- **Screens:** 23 · **Tabs:** 5 · **API service:** `src/services/courierApi.js` (723 lines, 40 methods)

> Not to be confused with `vizcome-delivery` ("Tezeon Go"), a separate app in this monorepo.

---

## 1. Navigation model

| Layer | File | Contents |
|---|---|---|
| Root stack | `src/navigation/AppNavigator.js` | All 23 screens + `MainTabs` |
| Bottom tabs | `src/navigation/MainTabNavigator.js` | Home · Deliveries · Map · Earnings · Profile |

There is no home-grid/tile system here — unlike the seller app, navigation is purely tabs plus stack pushes.

---

## 2. Feature areas

### Onboarding and account

| Feature | Screen | Backend |
|---|---|---|
| Register | `RegisterScreen` | `/courier/register/` |
| Login | `LoginScreen` | `/auth/login/` |
| Forgot password (OTP) | `ForgotPasswordScreen` | `/auth/password/reset/otp/request/`, `/auth/password/reset/otp/verify/` |
| Onboarding walkthrough | `OnboardingScreen` | — |
| Terms | `TermsScreen` | — |
| Vehicle setup | `VehicleSetupScreen` | `/courier/vehicles` |
| Verification / documents | `VerificationScreen` | `/courier/profile/` (multipart) |
| Profile | `ProfileScreen` | `/courier/profile/me/` |
| Edit profile | `EditProfileScreen` | `/courier/profile/` |

### Availability and location

| Feature | Screen | Backend |
|---|---|---|
| Go online / offline | `ProfileScreen`, `DashboardScreen` | `/courier/profile/go_online/`, `/courier/profile/go_offline/` |
| Live location ping | background task | `/courier/profile/update_location/` |
| Map view | `MapScreen` | `/courier/deliveries/…` |
| Location settings | `LocationSettingsScreen` | device permissions |
| Route planning | `RoutePlanningScreen` | `/courier/deliveries/…` |

Background location uses `expo-task-manager` with a task named `background-location-task`, defined in `src/services/backgroundService.js`. The task must be registered in global scope — do not move it inside a component.

### Deliveries — the core loop

| Feature | Screen | Backend |
|---|---|---|
| Dashboard / today | `DashboardScreen` | `/courier/dashboard/` |
| Job list (available / active / done) | `DeliveriesScreen` | `/courier/deliveries/available/`, `/courier/deliveries/` |
| Job detail | `DeliveryDetailsScreen` | `/courier/deliveries/{id}/` |
| Delivery history | `DeliveriesScreen` | `/courier/history/` |
| Failed delivery SOP | `FailedDeliveryScreen` | `/courier/deliveries/{id}/fail/`, `/courier/deliveries/my_failures/` |

The delivery state machine, in the order the API methods are called:

```
accept → pickup → start_transit → arrive → complete
                                        └→ fail  (failed-delivery SOP)
```

Each step maps to `POST /courier/deliveries/{id}/{action}/`.

### Money

| Feature | Screen | Backend |
|---|---|---|
| Earnings | `EarningsScreen` | `/courier/earnings/`, `/courier/earnings/summary/` |
| Earnings chart | `EarningsScreen` | `/courier/earnings/chart/` |
| Payout request | `PayoutScreen` | `/courier/earnings/payout/` |
| Ratings | `RatingsScreen` | `/courier/ratings/` |

Courier payouts use `/courier/earnings/payout/` — a **different** route from the seller app's `/auth/financial/payouts/request/`.

### Notifications and support

| Feature | Screen | Backend |
|---|---|---|
| Notification list | `NotificationsScreen` | `/notifications/` |
| Mark read | `NotificationsScreen` | `/notifications/mark-read/` |
| Notification settings | `NotificationSettingsScreen` | local prefs |
| Push token registration | startup | `/courier/profile/push_token/` |
| Help & support | `HelpSupportScreen` | `/support/tickets/` |
| Raise a ticket | `SupportTicketScreen` | `/support/tickets/` |

Push payloads route to `Deliveries`, `DeliveryDetails`, `Earnings` or `Home` (see `src/services/notificationService.js`). The default tab target is **`Home`**, not `Dashboard` — that tab name does not exist and navigating to it throws.

---

## 3. API integration status

27 endpoints probed (17 static + 10 with an id substituted):

| Result | Count | Meaning |
|---|---|---|
| 401 | 23 | Exists, auth required — OK |
| 405 | 2 | Exists, POST-only — OK |
| **404** | **2** | **Route not registered — both fixed, see below** |

**No duplicate method names** in `courierApi.js` — a problem the seller app does have.

### Fixed 2026-08-20

- **Support tickets never sent.** `reportIssue()` posted to `/courier/support/report/` (404) — the courier app has no `support` route at all (its routes are dashboard, deliveries, dispatch, earnings, failed-deliveries, history, marketplace, profile, ratings, register, seller, vehicles). Both `HelpSupportScreen` and `SupportTicketScreen` call it, so issue reporting was dead. Now posts to the shared `/support/tickets/`, mapping `issue_type` into the required `subject` field.
- **Notifications could never be marked read.** `markNotificationRead()` called `/notifications/{id}/mark_read/` — detail-level with an underscore. The real route is collection-level with a hyphen: `/notifications/mark-read/`, taking `{ notification_ids: [...] }`. Fixed, and it now accepts either a single id or an array.

### Open item for the backend

`TicketCreateSerializer` sets **both** `seller` and `customer` to `request.user`, so courier-raised tickets land in seller ticket queues. The client cannot control this; it needs resolving server-side if courier tickets should be separated.

---

## 4. Theme & Dark Mode Status

### Fully Implemented across all 23 screens + navigators (Updated 2026-09-15)

All 23 screens and navigators (`MainTabNavigator`, `AppNavigator`) now dynamically consume `useTheme()` and define their styles via `useMemo(() => createStyles(colors), [colors])`:
- Container backgrounds use `colors.background`
- Card and surface backgrounds use `colors.card`
- Borders, dividers, and text use dynamic theme tokens (`colors.text`, `colors.muted`, `colors.border`)
- Zero static `StyleSheet.create` instances remain with hardcoded light mode colors

---

## 5. Conventions

- **Auth:** JWT in AsyncStorage; `courierApi.request()` retries once after refreshing via `/auth/token/refresh/`.
- **Errors:** `USER_FRIENDLY_ERRORS` in `courierApi.js` maps raw errors to readable copy — extend that map rather than surfacing raw messages.
- **Return shape:** most methods return `{ success, data }` or `{ success: false, error }` rather than throwing. Check `response.success` at call sites.
- **Availability gate:** the backend applies online-status and cash-limit checks **only to freelance couriers** (`profile.is_freelance` / `employer is None`). Employer-linked staff couriers always see their assigned jobs.
- **Notification type:** delivery pushes use `notification_type='shipping'`. There is no `'delivery'` type — using it raises server-side.
- **New Architecture is disabled** because of `react-native-maps`.
