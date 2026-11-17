# Graph Report - SkillSphare  (2026-11-17)

## Corpus Check
- 193 files · ~613,157 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 8, .example 1, (none) 1)

## Summary
- 3098 nodes · 5989 edges · 177 communities (148 shown, 29 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 258 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d964a8c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- assets.mjs
- verification.ejs
- materials.ejs
- learn.ejs
- models/index.js
- login.ejs
- register.ejs
- app.js
- draw.mjs
- accessibility.js
- sprint4CertificateAiReadiness.test.js
- course-edit.ejs
- dashboard.ejs
- landing.ejs
- package.json
- HTML mode
- 6. Recipes
- inspect.mjs
- whatsappService.js
- charts.js
- authController.js
- imageHelper.js
- midtransService.js
- adminController.js
- geminiService.js
- Imagery
- detail.ejs
- profile.ejs
- redisCompression.test.js
- exam.ejs
- admin/analytics.ejs
- courseController.js
- examController.js
- 404.ejs
- courses/index.ejs
- The run
- exams.ejs
- Panduan Kerja AI Agent • SkillSphere AI
- Workflow: Audit Mode
- onboarding.ejs
- The study
- transactions.ejs
- dependencies
- AI-Slop Motion Patterns
- Page
- manifest.json
- Sprint 3: Payment Gateway, Split Revenue 20/80 & Financial System Implementation Plan
- lint.mjs
- showCustomConfirm
- roadmap.ejs
- Emil Kowalski's Animation Principles
- Layout
- scenes.mjs
- chart.umd.min.js
- Particle
- Claude.ai Design System & UI Skill
- Audit Checklist
- Colour
- Scroll scenes
- Dokumentasi Teknis Pengembangan — Sprint 1 & Sprint 2
- layout-modular.js
- Jhey Tompkins' Animation Principles
- Design Motion Principles
- Workflow: Create Mode
- App screens
- Tells — the dated registry
- Type
- mediaStorage.test.js
- checkout.ejs
- student/certificates.ejs
- Stage
- 7. Tables and lists
- Words
- Ns
- BossSkillSphereStar3D
- design-motion-principles/SKILL.md
- 2. The run for an app screen
- Critique — judging the render
- rules.mjs
- api/index.js
- Js
- privacy.ejs
- terms.ejs
- cdp.mjs
- Review Focus
- mysql2
- generateProjectDocumentationPdf.js
- SkillSphereStar3D
- fireLaser
- wishlist.ejs
- tutor/verify.ejs
- Star
- Creation Gotchas
- Jakub Krehel's Animation Principles
- Motion Cookbook
- 2. Easing & Timing
- 9. Clip-Path Animations (Emil)
- Performance
- tasteskill v2 (`design-taste-frontend`)
- scripts
- app.json
- 9. Type and colour
- compression
- va
- Star
- 10. Button & Interactive Feedback (Emil)
- Zt
- kinds
- 3. The shell
- 4. The canvas and the page title
- 6. Charts
- media.js
- s
- 12. Spring Physics (Emil)
- sequelize
- no
- 3. Visual Effects
- a
- l
- builder
- commerce
- community
- creator
- devtools
- finance
- markets
- report
- smb-admin
- support
- wallet
- workspace
- 8. Forms and settings
- pwa-installer.js
- certificates/verify.ejs
- An
- GEMINI.md
- sw.js
- api/auth.js
- n
- requestWhatsAppOtp
- triggerAutoVerify
- switchLegalDocTab
- Eo
- morgan
- cookie-parser
- http-errors
- ioredis
- tn
- bn
- ws
- bt
- tts.js
- Cs
- sprint4E2EQA.test.js
- completeAndNextModule
- playOrionSpeechText
- update
- .notifyPlugins
- rs
- En
- u
- generateIcons.js
- whatsappOtp.test.js
- Bt
- ca
- Hs
- playPipelinedSegments
- .buildOrUpdateControllers
- scheduleNextOrionBlink
- midtrans-client
- pdfkit
- qrcode
- sqlite3@^6.0.1

## God Nodes (most connected - your core abstractions)
1. `Js` - 72 edges
2. `An` - 63 edges
3. `Ns` - 58 edges
4. `s()` - 44 edges
5. `no` - 36 edges
6. `User` - 33 edges
7. `va` - 31 edges
8. `getOne()` - 31 edges
9. `n()` - 31 edges
10. `sequelize` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Arjuna (AA) - Payment Gateway, Split Fee 20/80, API Mutasi & Payout` --references--> `createSnapToken()`  [INFERRED]
  docs/superpowers/plans/2026-11-01-sprint3-payment-and-finance.md → controllers/paymentController.js
- `Task 2: Arjuna (AA) - Payment Gateway, Split Fee 20/80, API Mutasi & Payout` --references--> `getTutorWallet()`  [INFERRED]
  docs/superpowers/plans/2026-11-01-sprint3-payment-and-finance.md → controllers/paymentController.js
- `Task 2: Arjuna (AA) - Payment Gateway, Split Fee 20/80, API Mutasi & Payout` --references--> `handleNotification()`  [INFERRED]
  docs/superpowers/plans/2026-11-01-sprint3-payment-and-finance.md → controllers/paymentController.js
- `Task 2: Arjuna (AA) - Payment Gateway, Split Fee 20/80, API Mutasi & Payout` --references--> `requestWithdrawal()`  [INFERRED]
  docs/superpowers/plans/2026-11-01-sprint3-payment-and-finance.md → controllers/paymentController.js
- `optionalAuth()` --calls--> `authenticateJWT()`  [EXTRACTED]
  routes/api/materials.js → middleware/auth.js

## Import Cycles
- None detected.

## Communities (177 total, 29 thin omitted)

### Community 0 - "assets.mjs"
Cohesion: 0.07
Nodes (85): AIC_FIELDS, AIC_HEADERS, applyThumb(), ARCHIVE_LICENCE, args, argv, base(), clock() (+77 more)

### Community 1 - "verification.ejs"
Cohesion: 0.07
Nodes (73): allApplications, allCertifications, allUsers, approveApplication(), approveCoursePrompt(), cachedCategories, cachedTutors, changeUsersPage() (+65 more)

### Community 2 - "materials.ejs"
Cohesion: 0.06
Nodes (64): addPortalQuestion(), changeActiveCourse(), closeExamEditor(), closeModal(), closePreviewModal(), createEmptyQuestion(), currentCourses, currentMaterialsFlat (+56 more)

### Community 3 - "learn.ejs"
Cohesion: 0.10
Nodes (22): aiConversationHistory, completedMaterialIds, courseExams, escapeHtml(), flatMaterials, formatAIChatMarkdown(), handleAIChatActionClick(), handleAIChatInputSubmit() (+14 more)

### Community 4 - "models/index.js"
Cohesion: 0.08
Nodes (38): getAdaptiveCourseRecommendations(), triggerInactivityReminders(), { Op }, PLATFORM_FEE_PERCENTAGE, TUTOR_SHARE_PERCENTAGE, WITHDRAWAL_MIN_AMOUNT, AICareerRoadmap, { DataTypes } (+30 more)

### Community 5 - "login.ejs"
Cohesion: 0.05
Nodes (55): alertBanner, alertMessage, btnSpinner, btnText, clearSavedAccountsBtn, decodeSecret(), emailInput, encodeSecret() (+47 more)

### Community 6 - "register.ejs"
Cohesion: 0.05
Nodes (33): btnChangeRole, btnSubmitWaPrompt, btnSwitchWaOtp, cardChooseStudent, cardChooseTutor, eyeIconReg, eyeOffIconReg, hasReadDoc (+25 more)

### Community 7 - "app.js"
Cohesion: 0.05
Nodes (52): app, cookieParser, cors, createError, express, helmet, logger, path (+44 more)

### Community 8 - "draw.mjs"
Cohesion: 0.05
Nodes (63): adjustments(), argv, assetQueries(), ASSETS_PATH, briefStop(), briefWords(), deal(), dealHero() (+55 more)

### Community 9 - "accessibility.js"
Cohesion: 0.13
Nodes (39): applyPrefs(), calibrateHeadNeutral(), cancel9PointCalibration(), checkAndAdjustLightingForHeadTracking(), closePanel(), draw3DFaceMeshMask(), drawFallback3DMask(), extractCleanText() (+31 more)

### Community 10 - "sprint4CertificateAiReadiness.test.js"
Cohesion: 0.11
Nodes (18): downloadCertificatePdf(), fs, path, CERT_STORAGE_DIR, ensureCertificatePdf(), fs, generateCertificatePdf(), path (+10 more)

### Community 11 - "course-edit.ejs"
Cohesion: 0.07
Nodes (28): btnPreviewPublic, btnSave, btnSaveIcon, btnSaveSpinner, btnSaveText, calculateRevenueSplit(), cardPrivate, cardPublished (+20 more)

### Community 12 - "dashboard.ejs"
Cohesion: 0.10
Nodes (33): closeCourseOptionsModal(), closeCreateCourseModal(), copyReferralCode(), currentEnrolledCourseIds, enrollInCourse(), escapeHtml(), handleCreateCourseSubmit(), handleDailyCheckin() (+25 more)

### Community 13 - "landing.ejs"
Cohesion: 0.09
Nodes (16): coursesData, displaySocraticInsight(), drawerBackdrop, drawerCloseBtn, goalInput, handleGoalSubmit(), mainNav, mobileDrawer (+8 more)

### Community 14 - "package.json"
Cohesion: 0.17
Nodes (11): cors@^2.8.6, dotenv@^18.0.1, helmet@^8.3.0, multer@^2.4.0, name, private, version, cors (+3 more)

### Community 15 - "HTML mode"
Cohesion: 0.06
Nodes (33): 01 · Lens summary, 02 · Where the timings land — duration-budget diagram, 03–05 · Per-lens sections, 06 · Combined recommendations, 07 · Lens Reference Summary, Absolute bans, Canonical references, Combined Recommendations (+25 more)

### Community 16 - "6. Recipes"
Cohesion: 0.06
Nodes (31): 10. Rules for motion, 1. The budget, 2. What strong pages do with motion, 3. Four questions before any animation, 4. Tokens, 5. Scroll behaviours, ranked, 6. Recipes, 7. Signature moves (+23 more)

### Community 17 - "inspect.mjs"
Cohesion: 0.09
Nodes (21): allow, appMode, args, asJson, dealtFonts, fails, film, HEIGHT (+13 more)

### Community 18 - "whatsappService.js"
Cohesion: 0.34
Nodes (16): createMaterial(), applyTutor(), checkAndRemindInactiveStudents(), generateStudyEncouragement(), formatRupiah(), sendWhatsAppCourseSaleToTutor(), sendWhatsAppInactivityReminder(), sendWhatsAppMessage() (+8 more)

### Community 19 - "charts.js"
Cohesion: 0.21
Nodes (24): axes(), bars(), dayHeads(), diverging(), frame(), hits(), kindStyle(), lane() (+16 more)

### Community 20 - "authController.js"
Cohesion: 0.12
Nodes (17): createTransporter(), nodemailer, sendOTPEmail(), bcrypt, checkOtpCooldown(), generateTokens(), jwt, login() (+9 more)

### Community 21 - "imageHelper.js"
Cohesion: 0.12
Nodes (18): personalize(), uploadAvatar(), uploadCertificate(), assert, fs, path, runImageHelperTests(), sharp (+10 more)

### Community 22 - "midtransService.js"
Cohesion: 0.15
Nodes (16): createSnapToken(), getStudentTransactions(), getTransactionStatus(), getTutorWallet(), handleNotification(), requestWithdrawal(), Task 2: Arjuna (AA) - Payment Gateway, Split Fee 20/80, API Mutasi & Payout, checkTransactionStatus() (+8 more)

### Community 23 - "adminController.js"
Cohesion: 0.05
Nodes (4): bcrypt, { Op }, express, router

### Community 24 - "geminiService.js"
Cohesion: 0.13
Nodes (24): chatStudyAssistant(), explainMaterial(), generateCareerRoadmap(), generateMaterialNarrative(), generateQuiz(), getExamReadiness(), getMyCareerRoadmap(), assessExamReadiness() (+16 more)

### Community 25 - "Imagery"
Cohesion: 0.09
Nodes (22): 10. Markup and credits, 11. Video, 12. Where pictures and footage go, 1. What the study measured, 2. Decide what imagery exists, 3. Real pictures from the open collections, 4. The dealt photographs, 5. Cropping and placing (+14 more)

### Community 26 - "detail.ejs"
Cohesion: 0.12
Nodes (19): authBtn, closePreviewModalDirect(), escapeHtml(), formatRupiah(), getAuthToken(), handleClosePreviewModal(), handleEnrollCourse(), handleOpenPreviewModal() (+11 more)

### Community 27 - "profile.ejs"
Cohesion: 0.19
Nodes (20): escapeHtml(), getAuthToken(), getCurrentDeviceId(), handleAvatarFileSelect(), handleRevokeAllOtherDevices(), handleRevokeDevice(), handleTwoFactorToggle(), handleUpdateBio() (+12 more)

### Community 28 - "redisCompression.test.js"
Cohesion: 0.16
Nodes (14): deleteCache(), getCache(), memoryFallbackStore, Redis, setCache(), cacheMiddleware(), invalidateCacheMiddleware(), compression (+6 more)

### Community 29 - "exam.ejs"
Cohesion: 0.17
Nodes (19): confirmSubmitExam(), doubts, escapeHtml(), initExam(), nextQuestion(), prevQuestion(), questions, renderNavGrid() (+11 more)

### Community 30 - "admin/analytics.ejs"
Cohesion: 0.16
Nodes (24): ensureChartJsReady(), escapeHtml(), formatDate(), formatRupiah(), getChartThemeColors(), loadAdminAnalytics(), observer, populateTables() (+16 more)

### Community 31 - "courseController.js"
Cohesion: 0.12
Nodes (6): getCourseReviews(), getWishlist(), { Op }, submitReview(), toggleWishlist(), runReviewsWishlistTests()

### Community 32 - "examController.js"
Cohesion: 0.17
Nodes (11): createOrUpdateExam(), getCourseExam(), getCourseExams(), getExamHistory(), submitExam(), createOrUpdateMilestone(), evaluateAndClaimMilestone(), getStudentDiscounts() (+3 more)

### Community 33 - "404.ejs"
Cohesion: 0.11
Nodes (16): audioIcon, audioToggleBtn, boostBtn, bossAlertEl, bossHPFill, bossHPText, bossHPWrap, canvas (+8 more)

### Community 34 - "courses/index.ejs"
Cohesion: 0.18
Nodes (17): allCoursesData, authBtn, escapeHtml(), fetchAndRenderCourses(), formatRupiah(), handleCategorySelectDropdown(), handleFilterChange(), initStudentAIRecommendations() (+9 more)

### Community 35 - "The run"
Cohesion: 0.11
Nodes (17): 10. Report, 1. Read the brief and the project, 2. Write the argument, 3. Draw the direction, 4. Find the idea, 5. Write the words, 6. Build it, still, 7. Gate (+9 more)

### Community 36 - "exams.ejs"
Cohesion: 0.05
Nodes (57): formatRupiah(), loadTutorAnalytics(), sendStudentNudge(), showToast(), toggleTheme(), updateThemeIcon(), allIssuedCertificates, downloadSamplePdf() (+49 more)

### Community 37 - "Panduan Kerja AI Agent • SkillSphere AI"
Cohesion: 0.12
Nodes (16): 1. Ikhtisar Proyek & Arsitektur Sistem, 2. Aturan Bisnis & Logika Peran Akun (Role Rules), 3. Standar Desain UI / UX & Responsivitas Mobile, 4. Standar Kode & Konvensi Teknis, 5. Pengujian (*Testing*) & Verifikasi Mutu, A. Backend & API, A. Palet Warna & Tipografi, A. Pembagian Peran (RBAC) (+8 more)

### Community 38 - "Workflow: Audit Mode"
Cohesion: 0.12
Nodes (16): 2a. Read the Audit Checklist First, 2b. Read Designer Files for Your Weighted Perspectives, 2c. Read Topical References as Needed, Agent Gotchas (Self-Check Before Writing the Report), Default behavior — write and open the HTML report, Gather Context, Motion Gap Analysis (CRITICAL - Don't Skip), Required Reading (+8 more)

### Community 39 - "onboarding.ejs"
Cohesion: 0.14
Nodes (15): activeToken, finishPersonalization(), getStepElementId(), goToStep(), personalizationData, progressFill, progressPercentLabel, progressWrapper (+7 more)

### Community 40 - "The study"
Cohesion: 0.12
Nodes (15): 10. The 25 highest-scored sites and their ideas, 11. How the skill was tested, 12. The October 2026 study: 100 Sites of the Day, 13. The app-screen study, 1. Method and its limits, 2. Scores, 3. Where the idea comes from, 4. Headlines (+7 more)

### Community 41 - "transactions.ejs"
Cohesion: 0.24
Nodes (15): cachedTransactions, closeInvoiceModal(), escapeHtml(), formatRupiah(), getAuthToken(), initTheme(), loadTransactions(), loadUserProfile() (+7 more)

### Community 42 - "dependencies"
Cohesion: 0.18
Nodes (10): dependencies, bcryptjs@^3.0.3, debug@~2.6.9, ejs@~2.6.1, jsonwebtoken@^9.0.3, nodemailer@^10.0.10, sequelize@^6.37.8, bcryptjs (+2 more)

### Community 43 - "AI-Slop Motion Patterns"
Cohesion: 0.13
Nodes (14): AI-Slop Motion Patterns, Anti-Checklist, Blur-everywhere entrances, Bouncy-springs-on-utility-actions, From Emil's Perspective (Purposeful Restraint), From Jakub's Perspective (Production Polish), From Jhey's Perspective (Creative Learning), General Motion Design Mistakes (+6 more)

### Community 45 - "manifest.json"
Cohesion: 0.13
Nodes (14): background_color, categories, description, dir, display, icons, lang, name (+6 more)

### Community 46 - "Sprint 3: Payment Gateway, Split Revenue 20/80 & Financial System Implementation Plan"
Cohesion: 0.25
Nodes (7): Sprint 3: Payment Gateway, Split Revenue 20/80 & Financial System Implementation Plan, Task 1: Environment Setup & Midtrans Service Scaffolding, Task 3: Tegar (TM) - Ratings, Reviews & Wishlist API, Task 4: Satrio (AS) - UI Dompet Tutor, Riwayat Mutasi, Penarikan Dana & Admin Finance, Task 5: Fadiyah (F) - UI Checkout Kursus, Midtrans Snap & Invoice, Task 6: Bustanul (BA) - UI Riwayat Transaksi & Wishlist Siswa, Task 7: Final Verification & PR Link Generation

### Community 47 - "lint.mjs"
Cohesion: 0.14
Nodes (13): APP_LEVEL, appMode, args, asJson, byId, EXT, files, findings (+5 more)

### Community 48 - "showCustomConfirm"
Cohesion: 0.26
Nodes (12): ensureStyles(), getModalElements(), showCustomAlert(), cleanup(), handleConfirm(), handleKey(), showCustomConfirm(), cleanup() (+4 more)

### Community 49 - "roadmap.ejs"
Cohesion: 0.22
Nodes (11): escapeHtml(), handleRegenerateRoadmap(), loadRoadmap(), logoutBtn, moonIcon, renderRoadmap(), showToast(), sunIcon (+3 more)

### Community 50 - "Emil Kowalski's Animation Principles"
Cohesion: 0.15
Nodes (12): Core Philosophy: Restraint & Purpose, Emil Kowalski's Animation Principles, Emil vs. Jakub vs. Jhey, Interruptibility, Invisible Quality: Lessons from Sonner & Vaul, Signature Techniques (decision context — code in cookbook), Sonner Defaults, Speed is Non-Negotiable (+4 more)

### Community 51 - "Layout"
Cohesion: 0.15
Nodes (12): 10. How pages fail, 1. What strong pages do, 2. Margins and the grid, 3. Where text sits, 4. Empty space, 5. The frame: margins, balance and titles, 6. Sections: carry the idea, vary the arrangement, 7. Navigation (+4 more)

### Community 52 - "scenes.mjs"
Cohesion: 0.21
Nodes (10): sleep(), args, go(), only, outDir, problems, rel(), run() (+2 more)

### Community 53 - "chart.umd.min.js"
Cohesion: 0.03
Nodes (73): ai(), an(), ao(), at(), beforeDatasetDraw(), beforeDatasetsDraw(), beforeDraw(), beforeLayout() (+65 more)

### Community 54 - "Particle"
Cohesion: 0.18
Nodes (7): despawnBoss(), Particle, playExplosionSound(), render(), ScorePopup, triggerBossExplosion(), triggerExplosion()

### Community 55 - "Claude.ai Design System & UI Skill"
Cohesion: 0.17
Nodes (11): 1. Claude Greeting & Hero, 2. Claude Floating Chat Input Bar, 3. Starter Prompt Pills (Cards), 4. Claude Collapsible "Thinking" Block, 📋 Checklist for Claude.ai Aesthetic, Claude.ai Design System & UI Skill, 🎨 Core Design Philosophy, 📐 Design Tokens (CSS Variables) (+3 more)

### Community 56 - "Audit Checklist"
Cohesion: 0.17
Nodes (12): Accessibility, Audit Checklist, Easing & Timing, Enter/Exit States, Interaction Patterns (Emil's Rules), Motion Gap Analysis (Check BEFORE Reviewing Existing Animations), Optical Alignment, Performance (+4 more)

### Community 57 - "Colour"
Cohesion: 0.17
Nodes (11): 1. What the study measured, 2. The roles, 3. Proportion, 4. Surfaces without lines or shadows, 5. Colour fields, 6. Dark pages, 7. Colour and photographs, 8. Contrast (+3 more)

### Community 58 - "Scroll scenes"
Cohesion: 0.17
Nodes (11): 1. What a scene is, 2. Putting a scene on a page, 3. Filling it, 4. Fitting it to the page, 5. The phone, reduced motion, no script, 6. Checking it, 7. Rules for scenes, 8. When no scene in the library fits (+3 more)

### Community 59 - "Dokumentasi Teknis Pengembangan — Sprint 1 & Sprint 2"
Cohesion: 0.17
Nodes (11): 1. Ringkasan Tugas & Tanggung Jawab, 2. Implementasi Sprint 1: Admin Verification UI, 3. Implementasi Sprint 2: Material Upload Portal, 4. Hasil Pengujian Unit & End-to-End (QA Test Suite), 5. Rangkuman URL & Halaman, A. Fitur & Antarmuka (`views/admin/verification.ejs`), A. Fitur & Antarmuka (`views/tutor/materials.ejs`), B. Arsitektur Backend API Admin (+3 more)

### Community 60 - "layout-modular.js"
Cohesion: 0.43
Nodes (5): applyTheme(), getPreferredTheme(), renderUserData(), syncUserProfile(), toggleThemeMode()

### Community 61 - "Jhey Tompkins' Animation Principles"
Cohesion: 0.18
Nodes (11): Common Mistakes (Jhey's Perspective), Core Beliefs, Core Philosophy: Learn Through Play, Easing Has Personality (Decision Framework), Jhey Tompkins' Animation Principles, Jhey vs. Emil vs. Jakub, Signature Techniques (decision context — code in cookbook), The Golden Rule (Even in Play) (+3 more)

### Community 62 - "Design Motion Principles"
Cohesion: 0.18
Nodes (11): Accessibility is NOT Optional, Context-to-Perspective Mapping, Core Principles (Both Modes), Design Motion Principles, Duration Guidelines (Context-Dependent), Reference Index, STEP 0: Detect Mode (DO THIS FIRST), The Frequency Gate (+3 more)

### Community 63 - "Workflow: Create Mode"
Cohesion: 0.18
Nodes (10): Infer First, Ask Second, Propose Context + Weighting, Required Reading, STEP 1: Light Discovery, STEP 2: Load Weighted Knowledge, STEP 3: Generate, STEP 4: Self-Check, Success Criteria (+2 more)

### Community 64 - "App screens"
Cohesion: 0.18
Nodes (10): 10. Density, 11. Empty, zero, loading and error states, 12. The phone, 13. House rules for app screens, 14. Tells of generated dashboards, 1. When this applies, 5. KPIs, App screens (+2 more)

### Community 65 - "Tells — the dated registry"
Cohesion: 0.18
Nodes (10): 1. First wave (2023–2024), 2. Second wave (2025), 3. Third wave (2025–2026): the "fix" that became the look, 4. Gallery fashion, banned as house style, 5. Structural tells, 6. Copy tells, 7. Motion tells, 8. Why removal is not enough (+2 more)

### Community 66 - "Type"
Cohesion: 0.18
Nodes (10): 1. What the study measured, 2. The scale: few sizes, far apart, 3. Setting display type, 4. Setting text, 5. Loading the fonts properly, 6. One family or two, 7. Details that separate set type from typed text, 8. Mistakes the inspector cannot see (+2 more)

### Community 67 - "mediaStorage.test.js"
Cohesion: 0.08
Nodes (36): deleteMaterial(), updateMaterial(), deleteMedia(), fs, getCategorySubfolder(), getMediaInfo(), mapCategoryToContentType(), path (+28 more)

### Community 68 - "checkout.ejs"
Cohesion: 0.33
Nodes (10): formatRupiah(), getAuthToken(), goToLearningRoom(), handlePayWithMidtrans(), initTheme(), loadCourse(), loadUserProfile(), showSuccessModal() (+2 more)

### Community 69 - "student/certificates.ejs"
Cohesion: 0.24
Nodes (8): copyCode(), copyVerifyUrl(), escapeHtml(), loadCertificates(), notifyUser(), openPreview(), toggleTheme(), updateThemeIcon()

### Community 71 - "7. Tables and lists"
Cohesion: 0.20
Nodes (10): 7.1 Rows, 7.2 Header, 7.3 Dividers, 7.4 Figures and alignment, 7.5 Ink inside rows, 7.6 Status pills, 7.7 Media, 7.8 Actions and paging (+2 more)

### Community 72 - "Words"
Cohesion: 0.20
Nodes (9): 1. Write the argument first, 2. The two-line headline, 3. Headline shapes that work, 4. Supporting line, body, buttons, 5. Proof without inventing it, 6. Things that read as generated, 7. Micro-typography, Contents (+1 more)

### Community 73 - "Ns"
Cohesion: 0.05
Nodes (12): As(), Bn(), _calculateBarValuePixels(), initialize(), jn, Ls(), Ns, g() (+4 more)

### Community 74 - "BossSkillSphereStar3D"
Cohesion: 0.22
Nodes (4): BossSkillSphereStar3D, showBossAlert(), spawnBoss(), updateBossHPBar()

### Community 75 - "design-motion-principles/SKILL.md"
Cohesion: 0.20
Nodes (5): Accessibility, Functional vs. Decorative Motion, Implementation Checklist, Motion Sensitivity Considerations, Respect User Preferences

### Community 76 - "2. The run for an app screen"
Cohesion: 0.22
Nodes (9): 2.1 Inventory the data and the jobs, 2.2 Name the screen's one question, 2.3 Choose a style, 2.4 Build the shell, 2.5 Put in the data, 2.6 Build the states, 2.7 The check, 2.8 Report (+1 more)

### Community 77 - "Critique — judging the render"
Cohesion: 0.22
Nodes (8): 1. How to look, 2. The score, 3. Caps, 4. Writing the critique, 5. What to fix first, 6. When to stop, Contents, Critique — judging the render

### Community 78 - "rules.mjs"
Cohesion: 0.31
Nodes (8): APP_SKIP, colourFamily(), hexToHsl(), inRange(), judge(), judgeApp(), judgeLayout(), RULE_IDS

### Community 79 - "api/index.js"
Cohesion: 0.11
Nodes (26): authenticateJWT(), authorizeRoles(), jwt, optionalAuth(), express@~4.16.1, express, express, router (+18 more)

### Community 80 - "Js"
Cohesion: 0.06
Nodes (7): Ae(), d(), getValueForPixel(), Js, xo, Xs(), ze()

### Community 81 - "privacy.ejs"
Cohesion: 0.20
Nodes (7): filterInput, sections, themeBtn, themeIconMoon, themeIconSun, themeText, tocLinks

### Community 82 - "terms.ejs"
Cohesion: 0.22
Nodes (7): filterInput, sections, themeBtn, themeIconMoon, themeIconSun, themeText, tocLinks

### Community 83 - "cdp.mjs"
Cohesion: 0.21
Nodes (4): alive(), Browser, findChrome(), sweepProfiles()

### Community 84 - "Review Focus"
Cohesion: 0.22
Nodes (8): Global Constraints, Review Focus, SkillSphere AI Landing Page Implementation Plan, Task 1: Route Setup & Controller Integration, Task 2: Landing Page Template Architecture (`views/landing.ejs`), Task 3: Motion & Visual Styling (Claude Warm Paper + Motion Principles), Task 4: Interactive Client Script (Living Orion AI Orb & Category Filters), Task 5: Testing, Linting & E2E Verification

### Community 85 - "mysql2"
Cohesion: 0.40
Nodes (3): mysql2@^3.24.4, mysql2, mysql

### Community 86 - "generateProjectDocumentationPdf.js"
Cohesion: 0.33
Nodes (5): { execSync }, fs, generateHtml(), main(), path

### Community 88 - "fireLaser"
Cohesion: 0.25
Nodes (5): fireLaser(), initAudio(), PerspectiveLaser, playLaserSound(), startShooting()

### Community 89 - "wishlist.ejs"
Cohesion: 0.43
Nodes (6): formatRupiah(), getAuthToken(), loadWishlistPage(), removeWishlistItem(), toggleThemeMode(), updateThemeDisplay()

### Community 90 - "tutor/verify.ejs"
Cohesion: 0.32
Nodes (6): escapeHtml(), loadCurrentApplication(), showToast(), themeBtn, themeIconMoon, themeIconSun

### Community 91 - "Star"
Cohesion: 0.36
Nodes (3): easeOutQuart(), render(), Star

### Community 92 - "Creation Gotchas"
Cohesion: 0.29
Nodes (6): Accessibility omissions, Context blindness, Creation Gotchas, Motion that shouldn't exist, Performance failures, Wrong defaults

### Community 93 - "Jakub Krehel's Animation Principles"
Cohesion: 0.29
Nodes (6): Common Mistakes (Jakub's Perspective), Core Philosophy: Invisible Enhancement, Jakub Krehel's Animation Principles, Jakub vs. Emil vs. Jhey, Signature Techniques (decision context — code in cookbook), When to Apply Jakub's Mindset

### Community 94 - "Motion Cookbook"
Cohesion: 0.07
Nodes (30): 11. CSS Transitions vs Keyframes (Emil), 13. Origin-Aware Animations (Emil), 14. Scroll-Driven Animations (Jhey), 1. Enter & Exit Animations, 4. Optical Alignment, 5. Icon & State Animations (Jakub), 6. Shared Layout Animations (Jakub), 7. CSS Custom Properties & @property (Jhey) (+22 more)

### Community 95 - "2. Easing & Timing"
Cohesion: 0.29
Nodes (7): 2. Easing & Timing, Custom Easing is Essential (Emil), Duration Impacts Naturalness, Easing Selection Guidelines (Jhey), Spring Animations (Jakub), Stagger Techniques (Jhey), The linear() Function (Jhey)

### Community 96 - "9. Clip-Path Animations (Emil)"
Cohesion: 0.29
Nodes (7): 9. Clip-Path Animations (Emil), Basic Syntax, Image Reveal Effect, Scroll-Driven with clip-path, Tab Transitions, Text Mask Effect, Why clip-path?

### Community 97 - "Performance"
Cohesion: 0.29
Nodes (6): Animation Performance Budget, Gradient Animation Performance (Jakub), Performance, Performance Checklist, Properties to Avoid Animating, will-change Explained (Jakub)

### Community 98 - "tasteskill v2 (`design-taste-frontend`)"
Cohesion: 0.29
Nodes (6): Contents, How it works, Install, Notes, Requirements, tasteskill v2 (`design-taste-frontend`)

### Community 99 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, seed, start, test

### Community 100 - "app.json"
Cohesion: 0.33
Nodes (5): about, patterns, shells, styles, version

### Community 101 - "9. Type and colour"
Cohesion: 0.33
Nodes (6): 9.1 Type, 9.2 Colour on light screens, 9.3 Colour on dark screens, 9.4 Surfaces, radius, icons, spacing, 9.5 Default tokens, 9. Type and colour

### Community 103 - "va"
Cohesion: 0.09
Nodes (12): Ee(), f(), generateLabels(), Ie(), ki(), Le(), Oi(), Si() (+4 more)

### Community 105 - "10. Button & Interactive Feedback (Emil)"
Cohesion: 0.40
Nodes (5): 10. Button & Interactive Feedback (Emil), Blur as a Bridge, Don't Animate from scale(0), Scale on Press, Tooltip Delay Pattern

### Community 106 - "Zt"
Cohesion: 0.07
Nodes (13): ce(), de, he(), It(), kt(), mt(), Qs, qt() (+5 more)

### Community 107 - "kinds"
Cohesion: 0.40
Nodes (5): note, screens, styles, kinds, analytics

### Community 108 - "3. The shell"
Cohesion: 0.40
Nodes (5): 3.1 Five archetypes, 3.2 Sidebar, 3.3 Top bar, 3.4 Right rail and pinned columns, 3. The shell

### Community 109 - "4. The canvas and the page title"
Cohesion: 0.40
Nodes (5): 4.1 Width and gutters, 4.2 One left edge, one right edge, 4.3 The title, 4.4 Tabs, filters and the date range, 4. The canvas and the page title

### Community 110 - "6. Charts"
Cohesion: 0.40
Nodes (5): 6.1 Which chart for which question, 6.2 One question, one series, 6.3 Axes and gridlines, 6.4 Marks, 6. Charts

### Community 111 - "media.js"
Cohesion: 0.20
Nodes (8): express, optionalAuth(), router, express, generalUploader, router, thumbnailUploader, materialUploader

### Community 112 - "s"
Cohesion: 0.07
Nodes (18): bo, Bo(), De(), et(), H(), ii(), j(), js() (+10 more)

### Community 113 - "12. Spring Physics (Emil)"
Cohesion: 0.50
Nodes (4): 12. Spring Physics (Emil), Interruptibility, Key Parameters, Spring for Mouse Position

### Community 114 - "sequelize"
Cohesion: 0.08
Nodes (20): path, { Sequelize }, getAllCourses(), { DataTypes }, { DataTypes }, { DataTypes }, { DataTypes }, { DataTypes } (+12 more)

### Community 115 - "no"
Cohesion: 0.09
Nodes (9): buildLookupTable(), eo(), Fo(), _generate(), _getTimestampsForTable(), initOffsets(), no, nt() (+1 more)

### Community 116 - "3. Visual Effects"
Cohesion: 0.50
Nodes (4): 3. Visual Effects, Blur as a Signal (Jakub), Gradients & Color Spaces (Jakub), Shadows Instead of Borders (Jakub)

### Community 117 - "a"
Cohesion: 0.10
Nodes (12): a(), aa(), afterDatasetsUpdate(), buildTicks(), configure(), determineDataLimits(), Di(), init() (+4 more)

### Community 118 - "l"
Cohesion: 0.11
Nodes (19): _calculateBarIndexPixels(), Fn(), getLabelAndValue(), getMaxOverflow(), _getRuler(), _getStackCount(), _getStackIndex(), _getStacks() (+11 more)

### Community 119 - "builder"
Cohesion: 0.50
Nodes (4): note, screens, styles, builder

### Community 120 - "commerce"
Cohesion: 0.50
Nodes (4): note, screens, styles, commerce

### Community 121 - "community"
Cohesion: 0.50
Nodes (4): note, screens, styles, community

### Community 122 - "creator"
Cohesion: 0.50
Nodes (4): note, screens, styles, creator

### Community 123 - "devtools"
Cohesion: 0.50
Nodes (4): note, screens, styles, devtools

### Community 124 - "finance"
Cohesion: 0.50
Nodes (4): note, screens, styles, finance

### Community 125 - "markets"
Cohesion: 0.50
Nodes (4): markets, note, screens, styles

### Community 126 - "report"
Cohesion: 0.50
Nodes (4): report, note, screens, styles

### Community 127 - "smb-admin"
Cohesion: 0.50
Nodes (4): smb-admin, note, screens, styles

### Community 128 - "support"
Cohesion: 0.50
Nodes (4): support, note, screens, styles

### Community 129 - "wallet"
Cohesion: 0.50
Nodes (4): wallet, note, screens, styles

### Community 130 - "workspace"
Cohesion: 0.50
Nodes (4): workspace, note, screens, styles

### Community 131 - "8. Forms and settings"
Cohesion: 0.50
Nodes (4): 8.1 Fields, 8.2 Settings layout, 8.3 Buttons, 8. Forms and settings

### Community 132 - "pwa-installer.js"
Cohesion: 1.00
Nodes (3): hideAllInstallUI(), renderInstallBanner(), startHalfScreenInstallFlow()

### Community 140 - "api/auth.js"
Cohesion: 0.39
Nodes (6): validateChangePassword(), validateLogin(), validateProfileUpdate(), validateRegister(), express, router

### Community 141 - "n"
Cohesion: 0.13
Nodes (21): b(), Do(), e(), ei(), g(), gi(), _i(), je() (+13 more)

### Community 142 - "requestWhatsAppOtp"
Cohesion: 0.25
Nodes (8): acceptLegalTerms(), closeLegalModal(), hideAlert(), requestWhatsAppOtp(), resetOtpDeck(), showAlert(), startResendCountdown(), updateOtpScreenToWhatsApp()

### Community 143 - "triggerAutoVerify"
Cohesion: 0.50
Nodes (5): encodeSecret(), fanOutCardsBackToPosition(), saveAccountLocally(), stackCardsIntoDeck(), triggerAutoVerify()

### Community 144 - "switchLegalDocTab"
Cohesion: 0.67
Nodes (3): openLegalModal(), switchLegalDocTab(), updateScrollProgress()

### Community 145 - "Eo"
Cohesion: 0.13
Nodes (5): Bi(), Ci(), Eo, Fi(), zi()

### Community 151 - "bn"
Cohesion: 0.15
Nodes (4): bn, dn(), pn(), un()

### Community 152 - "ws"
Cohesion: 0.14
Nodes (11): be(), ct(), ge(), gs(), ms(), pe(), ps(), vs() (+3 more)

### Community 154 - "tts.js"
Cohesion: 0.22
Nodes (8): express, fetchEdgeTtsAudio(), generateLocalEdgeTts(), https, router, { spawn }, SUPPORTED_VOICES, synthesizeSpeech()

### Community 156 - "sprint4E2EQA.test.js"
Cohesion: 0.09
Nodes (23): ejs, assert, ejs, fs, generateToken(), http, jwt, path (+15 more)

### Community 157 - "completeAndNextModule"
Cohesion: 0.29
Nodes (14): fetchAdminProfile(), showCustomAlert(), completeAndNextModule(), dismissNextChoiceCard(), dockAuroraToCorner(), goToPrevModule(), handleChoiceYes(), loadClassroom() (+6 more)

### Community 158 - "playOrionSpeechText"
Cohesion: 0.35
Nodes (11): detectLanguage(), dismissAuroraOverlay(), fallbackSpeechSynthesis(), getA11ySelectedVoice(), playOrionSpeechText(), playOrionWelcomeSpeech(), runSimulatedSpeechVisualizer(), startAudioVisualizerLoop() (+3 more)

### Community 159 - "update"
Cohesion: 0.18
Nodes (10): addElements(), es(), is(), ns(), os(), pt(), Qi(), ss() (+2 more)

### Community 165 - "generateIcons.js"
Cohesion: 0.29
Nodes (7): sharp@^0.35.4, sharp, fs, generateAllIcons(), iconsDir, path, sharp

### Community 166 - "whatsappOtp.test.js"
Cohesion: 0.46
Nodes (7): buildOtpMessage(), maskPhoneNumber(), normalizePhoneNumber(), assert, http, request(), runWhatsAppOtpTestSuite()

### Community 167 - "Bt"
Cohesion: 0.38
Nodes (6): Bt(), Ft(), Gt(), jt(), vt(), zt()

### Community 168 - "ca"
Cohesion: 0.29
Nodes (4): ca(), ha, la(), ra()

### Community 169 - "Hs"
Cohesion: 0.40
Nodes (3): getCenterPoint(), Hs, tooltipPosition()

### Community 170 - "playPipelinedSegments"
Cohesion: 0.47
Nodes (6): clearAIFocusHighlight(), ensureAudioContext(), fetchAndDecodeTTS(), highlightAndScrollToSection(), playDecodedBuffer(), playPipelinedSegments()

### Community 172 - "scheduleNextOrionBlink"
Cohesion: 0.40
Nodes (5): scheduleNextOrionBlink(), scheduleNextOrionGaze(), shiftOrionGaze(), startOrionLifeMotions(), triggerOrionBlink()

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ns` connect `Ns` to `n`, `a`, `l`, `chart.umd.min.js`, `update`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `s()` (e.g. with `ho()` and `ii()`) actually correct?**
  _`s()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `assets.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06648426812585499 - nodes in this community are weakly interconnected._
- **Why does `Zt` connect `Zt` to `chart.umd.min.js`, `Bt`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `verification.ejs` be split into smaller, more focused modules?**
  _Cohesion score 0.0712280701754386 - nodes in this community are weakly interconnected._
- **Why does `no` connect `no` to `ca`, `Hs`, `n`, `Js`, `Eo`, `a`, `chart.umd.min.js`, `l`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `materials.ejs` be split into smaller, more focused modules?**
  _Cohesion score 0.05765765765765766 - nodes in this community are weakly interconnected._