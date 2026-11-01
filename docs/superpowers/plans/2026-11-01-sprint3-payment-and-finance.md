# Sprint 3: Payment Gateway, Split Revenue 20/80 & Financial System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Sprint 3 features: Midtrans Payment Gateway (Sandbox Mode), 20%/80% Automated Split Revenue Engine, Tutor Wallet & Payout System, Wishlist & Review System, Tutor Wallet UI, Student Checkout & Invoice UI, Student Transactions & Wishlist UI, and Admin Financial Monitoring.

**Architecture & Constraints:**
- MVC Pattern (Express.js, Sequelize ORM, EJS, Vanilla CSS/JS)
- Database: 19 core relational tables preserved cleanly
- Payment Gateway: Midtrans Snap (Sandbox Mode) with webhook signature verification and resilient mock mode for testing
- Antislop Design Standard: Anthropic Claude Warm Paper (`#FAF9F5` light, `#141413` obsidian dark), no em dashes (`—`), WCAG AA contrast compliance, zero dead buttons, full mobile responsiveness, empty/loading/error states.
- Git Branching & Authors:
  - Branch 1: `feat/sprint3-payment-midtrans-arjuna` (Author: `Lanvry <wardilanang46@gmail.com>`)
  - Branch 2: `feat/sprint3-reviews-wishlist-tegar` (Author: `Gaarrr33 <tegarmahardika780@gmail.com>`)
  - Branch 3: `feat/sprint3-tutor-wallet-satrio` (Author: `Akhmad Satrio <akhmadsatrio037@gmail.com>`)
  - Branch 4: `feat/sprint3-checkout-invoice-fadiyah` (Author: `Fadiyah Nurilwalid <fdhnuril3@gmail.com>`)
  - Branch 5: `feat/sprint3-student-transactions-wishlist-bustanul` (Author: `Lanvry <wardilanang46@gmail.com>`)

---

### Task 1: Environment Setup & Midtrans Service Scaffolding
- [ ] Configure Midtrans Sandbox credentials in `.env` and `.env.example`
- [ ] Create `services/midtransService.js` (Snap client initialization, createTransactionToken, verifyNotificationSignature)
- [ ] Verify connection and test runner readiness

### Task 2: Arjuna (AA) - Payment Gateway, Split Fee 20/80, API Mutasi & Payout
- [ ] Create branch `feat/sprint3-payment-midtrans-arjuna`
- [ ] Implement `controllers/paymentController.js` (`createSnapToken`, `handleNotification`, `requestWithdrawal`, `getTutorWallet`)
- [ ] Implement `routes/api/payments.js` and register in `routes/api/index.js`
- [ ] Write integration test `tests/paymentFinance.test.js`
- [ ] Run test suite `npm test` and verify PASS
- [ ] Commit with author `Lanvry <wardilanang46@gmail.com>`
- [ ] Push to `origin feat/sprint3-payment-midtrans-arjuna`

### Task 3: Tegar (TM) - Ratings, Reviews & Wishlist API
- [ ] Create branch `feat/sprint3-reviews-wishlist-tegar`
- [ ] Implement wishlist endpoints in `controllers/courseController.js` / `routes/api/courses.js`
- [ ] Implement rating & review endpoints with auto-recalculation of `Course.rating_avg` and `Course.rating_count`
- [ ] Write integration test `tests/reviewsWishlist.test.js`
- [ ] Run test suite `npm test` and verify PASS
- [ ] Commit with author `Gaarrr33 <tegarmahardika780@gmail.com>`
- [ ] Push to `origin feat/sprint3-reviews-wishlist-tegar`

### Task 4: Satrio (AS) - UI Dompet Tutor, Riwayat Mutasi, Penarikan Dana & Admin Finance
- [ ] Create branch `feat/sprint3-tutor-wallet-satrio`
- [ ] Create `views/tutor/wallet.ejs` (Anthropic Claude Warm Paper design, balance widgets, withdrawal modal, mutation history)
- [ ] Enhance `views/admin/verification.ejs` with Admin Financial & Payout Monitoring tab
- [ ] Add admin withdrawal approval/rejection endpoints in `controllers/adminController.js`
- [ ] Register `/tutor/wallet` route in `routes/index.js`
- [ ] Verify UI rendering in tests
- [ ] Commit with author `Akhmad Satrio <akhmadsatrio037@gmail.com>`
- [ ] Push to `origin feat/sprint3-tutor-wallet-satrio`

### Task 5: Fadiyah (F) - UI Checkout Kursus, Midtrans Snap & Invoice
- [ ] Create branch `feat/sprint3-checkout-invoice-fadiyah`
- [ ] Create `views/courses/checkout.ejs` (Clean order summary, GoPay/QRIS selector, Midtrans Snap trigger, invoice view)
- [ ] Register `/courses/:id/checkout` route in `routes/index.js`
- [ ] Verify UI rendering in tests
- [ ] Commit with author `Fadiyah Nurilwalid <fdhnuril3@gmail.com>`
- [ ] Push to `origin feat/sprint3-checkout-invoice-fadiyah`

### Task 6: Bustanul (BA) - UI Riwayat Transaksi & Wishlist Siswa
- [ ] Create branch `feat/sprint3-student-transactions-wishlist-bustanul`
- [ ] Create `views/student/transactions.ejs` & `views/student/wishlist.ejs` (or integrated dashboard views)
- [ ] Connect dashboard tabs and standalone student routes (`/dashboard/transactions`, `/dashboard/wishlist`)
- [ ] Verify all EJS templates compile cleanly
- [ ] Run full test suite `npm test`
- [ ] Commit with author `Lanvry <wardilanang46@gmail.com>`
- [ ] Push to `origin feat/sprint3-student-transactions-wishlist-bustanul`

### Task 7: Final Verification & PR Link Generation
- [ ] Run complete test suite `npm test`
- [ ] Check Delivery Gate for Antislop compliance
- [ ] Generate direct Pull Request links for each branch
