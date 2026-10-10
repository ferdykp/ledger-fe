# Ledger visual system

The interface uses teal (#08796d), warm neutral surfaces, and lime accents. Shared color tokens live in `src/style.css`; layout, navigation, authentication, responsive and accessibility rules live in `src/design.css`.

## Components and behavior

- `BrandMark` provides the shared identity; favicon and PWA icons use the same mark.
- `AuthLayout` shares the login, registration and password recovery shell.
- `Sidebar` groups navigation into Keuangan, Perencanaan, and Alat & pengaturan. Below 1024px the bottom navigation keeps recording transactions within reach and opens the full menu in a sheet.
- `v-dialog` manages keyboard focus, Escape, body scroll locking and focus restoration. Bind the page's close handler when it has saving-state guards.
- Keep money tabular, labels explicit, and all primary actions reachable on narrow screens. Preserve browser zoom and reduced-motion preferences.
- Use semantic color tokens instead of hard-coded white surfaces so both themes remain readable.

## Verification

- Frontend: 8 tests passed; production build and Prettier check passed.
- API regression suite: 49 tests passed, 319 assertions.
- Browser audit covered main routes at 320px and dashboard, transactions, report and WhatsApp at 390, 768, 1024, 1440 and 1920px.
- Fixed transaction-card crowding, bills pagination overflow, narrow date fields, WhatsApp dark surfaces and connection-header wrapping.
- Verified modal keyboard wrapping and Escape. Checked registration at 320px.
- This does not certify every browser/device or external WhatsApp/OCR/email service. No deployment was performed.

Preview screenshots are in `docs/previews/`.
