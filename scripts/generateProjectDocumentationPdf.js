const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateHtml() {
  // High-Precision, Non-Overlapping Vector SVG ERD Diagram (19 Sequelize Tables)
  const erdSvg = `
  <svg viewBox="0 0 960 550" width="100%" height="550" xmlns="http://www.w3.org/2000/svg" style="font-family:'Segoe UI', Arial, Helvetica, sans-serif;">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1E293B"/>
      </marker>
      <marker id="arrow-primary" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000"/>
      </marker>
      <filter id="shadow" x="-2%" y="-2%" width="104%" height="104%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.06"/>
      </filter>
    </defs>

    <!-- Outer Frame Container -->
    <rect x="2" y="2" width="956" height="546" rx="4" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1"/>

    <!-- ==================== KOLOM 1: DOMAIN PENGGUNA & AKUN (X: 24, W: 160) ==================== -->
    <!-- Line Bus for Column 1 (Left Margin Bus at X=12) -->
    <path d="M 24 64 L 12 64 L 12 486" stroke="#475569" stroke-width="1.2" fill="none"/>
    <path d="M 12 242 L 24 242" stroke="#475569" stroke-width="1.2" marker-end="url(#arrow)"/>
    <path d="M 12 322 L 24 322" stroke="#475569" stroke-width="1.2" marker-end="url(#arrow)"/>
    <path d="M 12 402 L 24 402" stroke="#475569" stroke-width="1.2" marker-end="url(#arrow)"/>
    <path d="M 12 486 L 24 486" stroke="#475569" stroke-width="1.2" marker-end="url(#arrow)"/>

    <!-- 1. users (Master Table) -->
    <g transform="translate(24, 14)" filter="url(#shadow)">
      <rect width="160" height="96" rx="3" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.3"/>
      <rect width="160" height="18" rx="2" fill="#0F172A"/>
      <text x="80" y="13" font-size="8.5" font-weight="bold" text-anchor="middle" fill="#FFFFFF">users (Master)</text>
      <text x="8" y="31" font-size="7.5" font-weight="bold" fill="#0F172A">[PK] id : INT (AUTO_INCREMENT)</text>
      <text x="8" y="44" font-size="7.2" fill="#334155">name, email, password (bcrypt)</text>
      <text x="8" y="56" font-size="7.2" fill="#334155">role : student | tutor | admin</text>
      <text x="8" y="68" font-size="7.2" fill="#334155">is_verified : BOOLEAN</text>
      <text x="8" y="80" font-size="7.2" fill="#334155">otp_code (6-digit), otp_expires_at</text>
      <text x="8" y="91" font-size="6.8" fill="#64748B">created_at, updated_at</text>
    </g>

    <!-- Connector: users -> user_profiles (1:1) -->
    <path d="M 104 110 L 104 128" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="108" y="114" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="119" y="122" font-size="6.5" font-weight="bold" text-anchor="middle" fill="#0F172A">1:1</text>

    <!-- 2. user_profiles -->
    <g transform="translate(24, 128)" filter="url(#shadow)">
      <rect width="160" height="66" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">user_profiles</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id : INT (1:1)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">bio, avatar_url (WebP), phone</text>
      <text x="8" y="63" font-size="7.2" fill="#334155">career_goal, preferences (JSON)</text>
    </g>

    <!-- 3. tutor_applications -->
    <g transform="translate(24, 208)" filter="url(#shadow)">
      <rect width="160" height="66" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">tutor_applications</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">cv_url, linkedin_url, portfolio_url</text>
      <text x="8" y="63" font-size="7.2" fill="#334155">status: pending | approved | rejected</text>
    </g>

    <!-- 4. tutor_certifications -->
    <g transform="translate(24, 288)" filter="url(#shadow)">
      <rect width="160" height="66" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">tutor_certifications</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] tutor_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">title, issuer, credential_id, file_url</text>
      <text x="8" y="63" font-size="7.2" fill="#334155">is_verified: BOOL, verified_by: INT</text>
    </g>

    <!-- 5. ai_career_roadmaps -->
    <g transform="translate(24, 368)" filter="url(#shadow)">
      <rect width="160" height="64" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">ai_career_roadmaps</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id : INT (1:N)</text>
      <text x="8" y="52" font-size="7.2" fill="#334155">target_role, roadmap_data (JSON)</text>
      <text x="8" y="62" font-size="7.2" fill="#334155">status: active | completed</text>
    </g>

    <!-- 6. user_devices -->
    <g transform="translate(24, 448)" filter="url(#shadow)">
      <rect width="160" height="58" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">user_devices</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">device_name, refresh_token, ip_addr</text>
    </g>


    <!-- ==================== KOLOM 2: DOMAIN KURIKULUM & MATERI (X: 212, W: 160) ==================== -->
    <!-- 7. categories -->
    <g transform="translate(212, 14)" filter="url(#shadow)">
      <rect width="160" height="58" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">categories</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.2" fill="#334155">name, slug: UNIQUE, icon</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">description: TEXT</text>
    </g>

    <!-- Connector: categories -> courses -->
    <path d="M 292 72 L 292 90" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>

    <!-- Connector: users (tutor) -> courses -->
    <path d="M 184 45 L 198 45 L 198 126 L 212 126" stroke="#0F172A" stroke-width="1.2" fill="none" marker-end="url(#arrow)"/>
    <rect x="187" y="74" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="198" y="82" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 8. courses (Central Entity) -->
    <g transform="translate(212, 90)" filter="url(#shadow)">
      <rect width="160" height="114" rx="3" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.3"/>
      <rect width="160" height="18" rx="2" fill="#0F172A"/>
      <text x="80" y="13" font-size="8.5" font-weight="bold" text-anchor="middle" fill="#FFFFFF">courses (Kurikulum)</text>
      <text x="8" y="31" font-size="7.5" font-weight="bold" fill="#0F172A">[PK] id : INT (AUTO_INCREMENT)</text>
      <text x="8" y="43" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] tutor_id, category_id : INT</text>
      <text x="8" y="55" font-size="7.2" fill="#334155">title, slug: UNIQUE, description</text>
      <text x="8" y="67" font-size="7.2" fill="#334155">price : DECIMAL(12,2)</text>
      <text x="8" y="79" font-size="7.2" fill="#334155">thumbnail_url (Sharp WebP)</text>
      <text x="8" y="91" font-size="7.2" fill="#334155">level: beginner|intermediate|expert</text>
      <text x="8" y="103" font-size="7.2" fill="#334155">status: draft|published|archived</text>
      <text x="8" y="112" font-size="6.8" fill="#64748B">rating: DECIMAL, total_students</text>
    </g>

    <!-- Connector: courses -> course_sections -->
    <path d="M 292 204 L 292 222" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="296" y="208" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="307" y="216" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 9. course_sections (Bab) -->
    <g transform="translate(212, 222)" filter="url(#shadow)">
      <rect width="160" height="60" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">course_sections (Bab)</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] course_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">title: VARCHAR(255), order_index: INT</text>
    </g>

    <!-- Connector: course_sections -> course_materials -->
    <path d="M 292 282 L 292 300" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="296" y="286" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="307" y="294" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 10. course_materials (Materi) -->
    <g transform="translate(212, 300)" filter="url(#shadow)">
      <rect width="160" height="114" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">course_materials (Materi)</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] section_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">title: VARCHAR(255)</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">content_type: video|pdf|doc|book</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">content_text: LONGTEXT (Markdown)</text>
      <text x="8" y="89" font-size="7.2" fill="#334155">file_url (MP4/PDF), duration_mins</text>
      <text x="8" y="101" font-size="7.2" fill="#334155">is_preview: BOOL, order_index: INT</text>
      <text x="8" y="111" font-size="6.8" fill="#64748B">HTTP 206 partial streaming</text>
    </g>


    <!-- ==================== KOLOM 3: DOMAIN AKTIVITAS & GAMIFIKASI (X: 400, W: 160) ==================== -->
    <!-- Connector: courses -> enrollments -->
    <path d="M 372 136 L 400 136" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="375" y="124" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="386" y="132" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">N:M</text>

    <!-- 11. enrollments (N:M Bridge) -->
    <g transform="translate(400, 90)" filter="url(#shadow)">
      <rect width="160" height="90" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">enrollments (N:M)</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id, course_id : INT</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">status: active | completed</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">progress_percentage : INT (0-100)</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">last_accessed_at: DATETIME</text>
      <text x="8" y="87" font-size="6.8" fill="#64748B">enrolled_at, completed_at</text>
    </g>

    <!-- Connector: courses -> course_milestones -->
    <path d="M 372 165 L 386 165 L 386 242 L 400 242" stroke="#0F172A" stroke-width="1.2" fill="none" marker-end="url(#arrow)"/>
    <rect x="376" y="196" width="20" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="386" y="204" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 12. course_milestones -->
    <g transform="translate(400, 208)" filter="url(#shadow)">
      <rect width="160" height="74" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">course_milestones</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] course_id, section_id : INT</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">target_days : INT (Durasi Target)</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">discount_percentage : DECIMAL</text>
      <text x="8" y="73" font-size="6.8" fill="#64748B">reward: voucher diskon otomatis</text>
    </g>

    <!-- Connector: course_milestones -> discounts_earned -->
    <path d="M 480 282 L 480 306" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="484" y="289" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="495" y="297" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 13. discounts_earned -->
    <g transform="translate(400, 306)" filter="url(#shadow)">
      <rect width="160" height="76" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">discounts_earned</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id, milestone_id : INT</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">voucher_code : VARCHAR(30)</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">discount_amount : DECIMAL(12,2)</text>
      <text x="8" y="74" font-size="6.8" fill="#64748B">is_redeemed: BOOL, expires_at</text>
    </g>


    <!-- ==================== KOLOM 4: DOMAIN UJIAN & SERTIFIKAT (X: 588, W: 160) ==================== -->
    <!-- Connector: enrollments -> exams -->
    <path d="M 560 126 L 588 126" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="563" y="114" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="574" y="122" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 14. exams (Ujian Akhir) -->
    <g transform="translate(588, 90)" filter="url(#shadow)">
      <rect width="160" height="82" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">exams (Ujian Akhir)</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] course_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">title: VARCHAR(255), passing_grade</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">duration_minutes: INT (Timer Kuis)</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">questions : JSON (Bank Soal Pilihan)</text>
    </g>

    <!-- Connector: exams -> exam_results -->
    <path d="M 668 172 L 668 194" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="672" y="178" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="683" y="186" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 15. exam_results -->
    <g transform="translate(588, 194)" filter="url(#shadow)">
      <rect width="160" height="86" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">exam_results</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] exam_id, user_id : INT</text>
      <text x="8" y="53" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] enrollment_id : INT</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">score: DECIMAL(5,2), is_passed: BOOL</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">answers_submitted : JSON</text>
      <text x="8" y="85" font-size="6.8" fill="#64748B">attempt_number: INT, completed_at</text>
    </g>

    <!-- Connector: exam_results -> certificates -->
    <path d="M 668 280 L 668 302" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="672" y="286" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="683" y="294" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:1</text>

    <!-- 16. certificates -->
    <g transform="translate(588, 302)" filter="url(#shadow)">
      <rect width="160" height="92" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">certificates (Sertifikat)</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id, course_id : INT</text>
      <text x="8" y="53" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] exam_result_id : INT (1:1)</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">certificate_number: UNIQUE</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">qr_code_url, file_url (WebP/PDF)</text>
      <text x="8" y="89" font-size="6.8" fill="#64748B">issued_at: DATETIME</text>
    </g>


    <!-- ==================== KOLOM 5: DOMAIN TRANSAKSI & FINANSIAL (X: 776, W: 160) ==================== -->
    <!-- 17. transactions -->
    <g transform="translate(776, 14)" filter="url(#shadow)">
      <rect width="160" height="96" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">transactions (Order)</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] user_id (Buyer), course_id</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">invoice_code: VARCHAR(50) UNIQUE</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">amount : DECIMAL(12,2)</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">payment_method: QRIS | GoPay</text>
      <text x="8" y="89" font-size="7.2" fill="#334155">status: pending | settlement | expire</text>
    </g>

    <!-- Connector: transactions -> tutor_wallets (Split 80%) -->
    <path d="M 856 110 L 856 132" stroke="#000000" stroke-width="1.6" marker-end="url(#arrow-primary)"/>
    <rect x="830" y="116" width="52" height="12" rx="2" fill="#FEF3C7" stroke="#D97706" stroke-width="0.8"/>
    <text x="856" y="125" font-size="6.5" font-weight="bold" text-anchor="middle" fill="#B45309">Split 80% Tutor</text>

    <!-- 18. tutor_wallets (80% Net Revenue) -->
    <g transform="translate(776, 132)" filter="url(#shadow)">
      <rect width="160" height="98" rx="3" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.3"/>
      <rect width="160" height="18" rx="2" fill="#0F172A"/>
      <text x="80" y="13" font-size="8.5" font-weight="bold" text-anchor="middle" fill="#FFFFFF">tutor_wallets (80%)</text>
      <text x="8" y="31" font-size="7.5" font-weight="bold" fill="#0F172A">[PK] id : INT (AUTO_INCREMENT)</text>
      <text x="8" y="43" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] tutor_id : INT (1:1)</text>
      <text x="8" y="55" font-size="7.2" fill="#334155">balance : Saldo Siap Ditarik</text>
      <text x="8" y="67" font-size="7.2" fill="#334155">holding_balance : Holding 7 Hari</text>
      <text x="8" y="79" font-size="7.2" fill="#334155">total_withdrawn : Total Dicairkan</text>
      <text x="8" y="91" font-size="7.2" fill="#334155">is_active : BOOLEAN</text>
    </g>

    <!-- Connector: tutor_wallets -> wallet_transactions -->
    <path d="M 856 230 L 856 250" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="860" y="235" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="871" y="243" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 19. wallet_transactions -->
    <g transform="translate(776, 250)" filter="url(#shadow)">
      <rect width="160" height="74" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">wallet_transactions</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] wallet_id : INT (1:N)</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">type: credit | debit | holding_release</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">amount : DECIMAL(12,2)</text>
      <text x="8" y="73" font-size="6.8" fill="#64748B">description: VARCHAR(255)</text>
    </g>

    <!-- Connector: tutor_wallets -> withdrawal_requests -->
    <path d="M 856 324 L 856 344" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arrow)"/>
    <rect x="860" y="329" width="22" height="10" rx="2" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.6"/>
    <text x="871" y="337" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#0F172A">1:N</text>

    <!-- 20. withdrawal_requests -->
    <g transform="translate(776, 344)" filter="url(#shadow)">
      <rect width="160" height="84" rx="3" fill="#FFFFFF" stroke="#475569" stroke-width="1"/>
      <rect width="160" height="17" rx="2" fill="#334155"/>
      <text x="80" y="12" font-size="8" font-weight="bold" text-anchor="middle" fill="#FFFFFF">withdrawal_requests</text>
      <text x="8" y="29" font-size="7.3" font-weight="bold" fill="#0F172A">[PK] id : INT</text>
      <text x="8" y="41" font-size="7.3" font-weight="bold" fill="#0F172A">[FK] wallet_id, tutor_id : INT</text>
      <text x="8" y="53" font-size="7.2" fill="#334155">amount : Min. Rp 100.000</text>
      <text x="8" y="65" font-size="7.2" fill="#334155">bank_name, account_number</text>
      <text x="8" y="77" font-size="7.2" fill="#334155">status: pending | transferred | rejected</text>
    </g>


    <!-- ==================== LEGEND & RINGKASAN ARSITEKTUR (Bawah, Span Col 2-5) ==================== -->
    <g transform="translate(212, 436)" filter="url(#shadow)">
      <rect width="724" height="98" rx="3" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1"/>
      <rect width="724" height="18" rx="2" fill="#E2E8F0"/>
      <text x="12" y="13" font-size="8" font-weight="bold" fill="#0F172A">Keterangan Kardinalitas &amp; Arsitektur Hubungan Relasional Basis Data (19 Tabel Sequelize MySQL):</text>
      <text x="14" y="32" font-size="7.2" fill="#1E293B">&bull; <tspan font-weight="bold">Relasi 1:1 (One-to-One):</tspan> users &harr; user_profiles (biodata pelengkap), users(role=tutor) &harr; tutor_wallets (dompet pendapatan instruktur), exam_results &harr; certificates.</text>
      <text x="14" y="47" font-size="7.2" fill="#1E293B">&bull; <tspan font-weight="bold">Relasi 1:N (One-to-Many):</tspan> categories &rarr; courses, courses &rarr; course_sections &rarr; course_materials, courses &rarr; exams &rarr; exam_results, tutor_wallets &rarr; wallet_transactions &amp; withdrawal_requests.</text>
      <text x="14" y="62" font-size="7.2" fill="#1E293B">&bull; <tspan font-weight="bold">Relasi N:M (Many-to-Many):</tspan> users (siswa) &harr; courses dijembatani secara terukur oleh tabel enrollments untuk melacak progres belajar adaptif.</text>
      <text x="14" y="77" font-size="7.2" fill="#1E293B">&bull; <tspan font-weight="bold">Otomatisasi Split Finansial (20%/80%):</tspan> Transaksi sukses memicu 80% masuk ke holding_balance (7 hari) sebelum dapat dicairkan via withdrawal_requests.</text>
      <text x="14" y="90" font-size="6.8" font-style="italic" fill="#64748B">&bull; Seluruh 19 tabel di atas tersinkronisasi murni pada schema Sequelize MySQL SkillSphere AI dan lolos pengujian relasi db.test.js.</text>
    </g>
  </svg>
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Perancangan Sistem Pembelajaran Online Berbasis AI &amp; Multi-Vendor</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 13mm 10mm 13mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #000000;
      background: #FFFFFF;
      line-height: 1.32;
      font-size: 8.6pt;
    }

    .page {
      width: 100%;
      height: auto;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Formal Report Header */
    .report-header {
      text-align: center;
      border-bottom: 1.8px solid #000000;
      padding-bottom: 5px;
      margin-bottom: 7px;
    }

    .report-inst {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.2pt;
      font-weight: bold;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #333333;
      margin-bottom: 2px;
    }

    .report-title {
      font-size: 11.2pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      line-height: 1.25;
      margin-bottom: 2px;
    }

    .report-subtitle {
      font-size: 8.5pt;
      font-style: italic;
      color: #222222;
    }

    /* Section Headings */
    .section-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.6pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      margin-top: 6px;
      margin-bottom: 3px;
      border-bottom: 0.8px solid #666666;
      padding-bottom: 1.5px;
    }

    .doc-intro {
      font-size: 8.2pt;
      text-align: justify;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    /* Team Members List */
    .member-list {
      margin-bottom: 4px;
    }

    .member-item {
      margin-bottom: 3px;
      font-size: 8.1pt;
      line-height: 1.25;
      text-align: justify;
    }

    .member-name-row {
      font-weight: bold;
    }

    .member-role {
      font-style: italic;
      font-weight: normal;
    }

    .member-task {
      padding-left: 10px;
      font-size: 7.8pt;
      color: #1a1a1a;
      margin-top: 1px;
    }

    /* Database Table Text Box */
    .db-grid-text {
      font-size: 7.3pt;
      line-height: 1.3;
      text-align: justify;
      margin-bottom: 4px;
      background: #FAFAFA;
      border: 0.6px solid #999999;
      padding: 4px 6px;
    }

    .db-grid-text strong {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.2pt;
    }

    /* Numbered Lists */
    .report-list {
      margin-left: 14px;
      margin-bottom: 4px;
      font-size: 8pt;
    }

    .report-list li {
      margin-bottom: 2px;
      text-align: justify;
      line-height: 1.25;
    }

    /* Sprint Table */
    .table-caption {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.6pt;
      font-weight: bold;
      margin-top: 3px;
      margin-bottom: 3px;
    }

    .sprint-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 6.5pt;
      line-height: 1.18;
    }

    .sprint-table th, .sprint-table td {
      border: 0.6px solid #555555;
      padding: 3.5px 4px;
      vertical-align: top;
    }

    .sprint-table th {
      background: #F0F0F0;
      color: #000000;
      font-weight: bold;
      text-align: left;
      font-size: 6.8pt;
    }

    .sprint-table th.col-phase { width: 14%; }
    .sprint-table th.col-arjuna { width: 18%; }
    .sprint-table th.col-tegar { width: 17%; }
    .sprint-table th.col-ryo { width: 17%; }
    .sprint-table th.col-fadiyah { width: 17%; }
    .sprint-table th.col-bustanul { width: 17%; }

    .sprint-name {
      font-weight: bold;
      font-size: 6.9pt;
      margin-bottom: 1.5px;
    }

    .sprint-goal {
      font-size: 6.2pt;
      font-style: italic;
      color: #333333;
      line-height: 1.15;
    }

    .cell-bullet {
      position: relative;
      padding-left: 6px;
      margin-bottom: 1.5px;
    }

    .cell-bullet:last-child {
      margin-bottom: 0;
    }

    .cell-bullet:before {
      content: "-";
      position: absolute;
      left: 0;
      color: #333333;
    }

    /* Footer Note */
    .report-footer {
      border-top: 0.6px solid #888888;
      padding-top: 2px;
      margin-top: 4px;
      display: flex;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 6.5pt;
      color: #555555;
    }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1 ==================== -->
  <div class="page page-break">
    <div class="report-header">
      <div class="report-inst">Laporan Perancangan &amp; Pengembangan Perangkat Lunak</div>
      <div class="report-title">Sistem Pembelajaran Online Berbasis AI &amp; Multi-Vendor</div>
      <div class="report-subtitle">SkillSphere AI &bull; CodeCrafters Team 01 &bull; Tahun Akademik 2026</div>
    </div>

    <div class="doc-intro">
      <strong>Ringkasan Eksekutif:</strong> Sistem SkillSphere AI dirancang sebagai platform pembelajaran adaptif multi-vendor yang mempertemukan tutor ahli dengan pembelajar. Platform ini mengintegrasikan kecerdasan buatan (Orion Socratic AI Partner &amp; Gemini AI Career Roadmap), transparansi tata kelola finansial bagi hasil (20% platform / 80% tutor), modul manajemen kurikulum multi-format, serta penerbitan sertifikat digital ber-QR Code resmi.
    </div>

    <!-- 1. Susunan Tim & Pembagian Tugas -->
    <div class="section-title">1. Susunan Tim Pengembang &amp; Pembagian Tugas</div>
    <div class="member-list">
      <div class="member-item">
        <div class="member-name-row">
          1. Arjuna Lanang Adiwarsana (NRP: 3125522010) <span class="member-role">- Project Manager &amp; Lead Backend Engineer</span>
        </div>
        <div class="member-task">
          Tanggung Jawab: Memimpin manajemen proyek Agile/Scrum, perancangan arsitektur sistem MVC Express.js, pemodelan skema 19 tabel database Sequelize MySQL, implementasi otentikasi JWT Double-Token &amp; RBAC, Payment Gateway (Midtrans/Xendit QRIS/GoPay), algoritma otomatisasi split revenue 20%/80%, sistem holding saldo 7 hari &amp; mutasi dompet (TutorWallet), API penarikan dana (withdrawal), generator sertifikat digital WebP/PDF, serta akselerasi performa Redis Caching &amp; Gzip compression.
        </div>
      </div>

      <div class="member-item">
        <div class="member-name-row">
          2. Tegar Mahardika (NRP: 3125522005) <span class="member-role">- Backend &amp; AI Integration Engineer</span>
        </div>
        <div class="member-task">
          Tanggung Jawab: Integrasi Gemini AI SDK untuk AI Career Roadmap personalisasi &amp; persona bimbingan bertahap Orion AI (Socratic Learning Partner), API verifikasi berkas pendaftaran calon tutor &amp; validasi sertifikat pengajar, logika Course Milestones pelacak target durasi belajar, distribusi reward diskon otomatis, engine evaluasi ujian kelulusan &amp; passing grade, serta integrasi suara sintetis TTS Kokoro 6 ragam suara.
        </div>
      </div>

      <div class="member-item">
        <div class="member-name-row">
          3. Akhmad Satrio Cahyo Pratama / Ryo (NRP: 3125522013) <span class="member-role">- Frontend Engineer (Tutor &amp; Admin Portal) + QA Lead</span>
        </div>
        <div class="member-task">
          Tanggung Jawab: Slicing UI Studio Manajemen Kurikulum Tutor (/tutor/materials) dengan upload materi multi-format (Video MP4, PPTX, PDF, DOCX, ePUB) &amp; reordering urutan materi, UI Exam Creator &amp; Bank Soal, UI Dompet Virtual Tutor (/tutor/wallet) &amp; pencairan dana, UI Panel Admin Verifikasi Pengajar (/admin/verification), serta memimpin pengujian otomatis E2E (12 automated test suites) dan dokumentasi teknis sistem.
        </div>
      </div>

      <div class="member-item">
        <div class="member-name-row">
          4. Fadiyah Nurilwalid (NRP: 3125522011) <span class="member-role">- Frontend Engineer (Student Experience)</span>
        </div>
        <div class="member-task">
          Tanggung Jawab: Slicing UI Landing Page, halaman eksplorasi katalog kursus (/courses) dengan filter kategori rumpun ilmu &amp; live search, halaman rincian detail kelas (/courses/:slug), alur pendaftaran kelas (enrollment), antarmuka checkout pembayaran QRIS/GoPay &amp; invoice digital, portofolio sertifikat kelulusan digital, serta eksekusi User Acceptance Testing (UAT) sisi siswa.
        </div>
      </div>

      <div class="member-item">
        <div class="member-name-row">
          5. Bustanul Arifin <span class="member-role">- Frontend Engineer (Learning Components &amp; General UI)</span>
        </div>
        <div class="member-task">
          Tanggung Jawab: Slicing halaman autentikasi (Login, Register, Modal OTP Email 6-digit, Lupa Password) &amp; profil akun, komponen Ruang Belajar Classroom (/courses/:slug/learn), antarmuka chat interaktif split-screen Orion AI, antarmuka pengerjaan ujian akhir (timer mundur &amp; lembar soal kuis), serta cross-browser &amp; mobile responsiveness testing.
        </div>
      </div>
    </div>

    <!-- 2. Rancangan 19 Tabel Basis Data Relasional -->
    <div class="section-title">2. Spesifikasi 19 Tabel Basis Data Relasional (MySQL / Sequelize ORM)</div>
    <div class="db-grid-text">
      1. <strong>users:</strong> Kredensial akun (Admin, Tutor, Siswa), hashed password bcrypt, token verifikasi &bull;
      2. <strong>user_profiles:</strong> Biodata, avatar, target karir, preferensi belajar adaptif &bull;
      3. <strong>tutor_applications:</strong> Data pendaftaran calon tutor, berkas CV, portofolio &bull;
      4. <strong>tutor_certifications:</strong> Kredensial sertifikat keahlian resmi &amp; status verifikasi &bull;
      5. <strong>categories:</strong> Kategori rumpun ilmu &bull;
      6. <strong>courses:</strong> Data kursus, slug, harga, level, thumbnail WebP, status rilis &bull;
      7. <strong>course_sections:</strong> Struktur bab/modul silabus berurutan &bull;
      8. <strong>course_materials:</strong> Unit materi (Teks Markdown dinamis, Video MP4, PPTX, PDF, DOCX, ePUB) &bull;
      9. <strong>ai_career_roadmaps:</strong> Peta jalur karir hasil rekomendasi Gemini AI &bull;
      10. <strong>enrollments:</strong> Pendaftaran siswa ke kelas &amp; tracking progres belajar &bull;
      11. <strong>course_milestones:</strong> Target durasi belajar bab untuk gamifikasi &bull;
      12. <strong>exams:</strong> Bank soal ujian akhir, passing grade, durasi timer &bull;
      13. <strong>exam_results:</strong> Nilai ujian akhir, status kelulusan &bull;
      14. <strong>discounts_earned:</strong> Voucher diskon reward milestone &bull;
      15. <strong>certificates:</strong> Metadata sertifikat kelulusan ber-QR unik &bull;
      16. <strong>transactions:</strong> Log transaksi payment gateway (QRIS/GoPay) &bull;
      17. <strong>tutor_wallets:</strong> Dompet virtual tutor, saldo tersedia vs holding (80% hak tutor) &bull;
      18. <strong>wallet_transactions:</strong> Log mutasi debit/kredit saldo tutor &bull;
      19. <strong>withdrawal_requests:</strong> Status pengajuan pencairan dana ke rekening bank tutor.
    </div>

    <!-- 3. Tata Kelola Finansial & Bagi Hasil -->
    <div class="section-title">3. Tata Kelola Finansial, Bagi Hasil (20%/80%) &amp; Pencairan Dana</div>
    <ul class="report-list">
      <li><strong>Skema Bagi Hasil Transparan (20% / 80%):</strong> 20% dari total nilai transaksi dialokasikan untuk biaya operasional platform (server, pemeliharaan infrastruktur, kuota token LLM AI), sedangkan 80% menjadi hak bersih pengajar.</li>
      <li><strong>Masa Holding 7 Hari:</strong> Saldo transaksi pengajar dialokasikan ke saldo holding selama 7 hari kalender sebagai langkah mitigasi sengketa pembayaran atau permintaan refund sebelum berpindah ke saldo siap ditarik.</li>
      <li><strong>Batas Minimum Penarikan:</strong> Pengajar dapat mengajukan pencairan dana ke rekening bank terdaftar dengan batas minimum saldo siap ditarik sebesar Rp 100.000.</li>
    </ul>

    <div class="report-footer">
      <span>Laporan Perancangan Sistem &bull; SkillSphere AI</span>
      <span>Halaman 1 dari 3</span>
    </div>
  </div>

  <!-- ==================== HALAMAN 2: DIAGRAM ERD 19 TABEL ==================== -->
  <div class="page page-break">
    <div class="section-title" style="margin-top:0;">4. Diagram Arsitektur Relasi Basis Data (Entity Relationship Diagram - 19 Tabel)</div>
    <div class="table-caption">Gambar 4.1 Diagram Struktur 19 Tabel Basis Data Relasional, Kunci Utama (PK), Kunci Asing (FK), dan Alur Kardinalitas Antar-Entitas</div>

    <!-- Clean Vector SVG ERD -->
    <div style="margin: 3px 0;">
      ${erdSvg}
    </div>

    <div class="report-footer">
      <span>Laporan Perancangan Sistem &bull; SkillSphere AI</span>
      <span>Halaman 2 dari 3</span>
    </div>
  </div>

  <!-- ==================== HALAMAN 3: SPRINT MATRIX ==================== -->
  <div class="page">
    <div class="section-title" style="margin-top:0;">5. Matriks Rencana Kerja &amp; Eksekusi Sprint (Sprint Responsibility Matrix)</div>
    <div class="table-caption">Tabel 5.1 Matriks Pembagian Tugas dan Deliverable Fungsional Sprint 1 sampai Sprint 5</div>

    <table class="sprint-table">
      <thead>
        <tr>
          <th class="col-phase">Fase / Sprint</th>
          <th class="col-arjuna">Arjuna Lanang A.<br>PM &amp; Lead Backend</th>
          <th class="col-tegar">Tegar Mahardika<br>Backend &amp; AI Integration</th>
          <th class="col-ryo">Akhmad Satrio C. P.<br>Tutor/Admin FE &amp; QA</th>
          <th class="col-fadiyah">Fadiyah Nurilwalid<br>Student Frontend</th>
          <th class="col-bustanul">Bustanul Arifin<br>Learning Components FE</th>
        </tr>
      </thead>
      <tbody>
        <!-- SPRINT 1 -->
        <tr>
          <td>
            <div class="sprint-name">Sprint 1</div>
            <strong>Fondasi, Otentikasi &amp; Katalog Kursus</strong>
            <div class="sprint-goal">Goal: Skema 19 tabel DB, Backend Otentikasi JWT, Halaman Admin Verifikasi, Halaman Landing Page &amp; Course Catalog, serta Halaman Login/Register.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat skema 19 tabel database Sequelize MySQL &amp; relasi ORM.</div>
            <div class="cell-bullet">Membuat Backend Otentikasi JWT Double-Token &amp; middleware RBAC.</div>
            <div class="cell-bullet">Membuat Backend &amp; API Course Catalog (/api/courses).</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend Verifikasi Pendaftaran Pengajar &amp; validasi CV.</div>
            <div class="cell-bullet">Membuat integrasi SMTP Gmail OTP 6-digit verifikasi email.</div>
            <div class="cell-bullet">Membuat fungsi hashing password aman dengan bcryptjs.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Admin Verifikasi Pengajar (/admin/verification).</div>
            <div class="cell-bullet">Membuat filter status pengajuan (Pending, Approved, Rejected).</div>
            <div class="cell-bullet">Membuat modal review berkas &amp; aksi approve/reject tutor.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Landing Page utama platform edukasi.</div>
            <div class="cell-bullet">Membuat Halaman Course Catalog (/courses) &amp; live search.</div>
            <div class="cell-bullet">Membuat komponen filter kategori rumpun ilmu &amp; kartu kelas.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Autentikasi (Login, Register, Lupa Password).</div>
            <div class="cell-bullet">Membuat Modal Input Kode OTP Email 6-digit interaktif.</div>
            <div class="cell-bullet">Membuat Halaman Profil Pengguna &amp; preferensi akun.</div>
          </td>
        </tr>

        <!-- SPRINT 2 -->
        <tr>
          <td>
            <div class="sprint-name">Sprint 2</div>
            <strong>Studio Materi, Ruang Belajar &amp; AI Orion</strong>
            <div class="sprint-goal">Goal: Backend Media Storage multi-format, Halaman Studio Kurikulum Tutor, Halaman Rincian Kursus, Halaman Ruang Belajar (Classroom), serta Integrasi Orion AI.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend &amp; API Media Storage (Video, PPTX, PDF, DOCX, ePUB).</div>
            <div class="cell-bullet">Membuat HTTP 206 partial video streaming &amp; WebP kompresi Sharp.</div>
            <div class="cell-bullet">Membuat Backend sinkronisasi materi artikel teks Markdown dinamis.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend Integrasi Gemini AI SDK untuk AI Career Roadmap.</div>
            <div class="cell-bullet">Membuat Backend Persona Orion AI (Socratic Learning Partner).</div>
            <div class="cell-bullet">Membuat API Asistensi Belajar bertahap per topik modul aktif.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Studio Kurikulum Tutor (/tutor/materials).</div>
            <div class="cell-bullet">Membuat komponen manajemen bab (sections) &amp; uploader materi.</div>
            <div class="cell-bullet">Membuat fitur drag-and-drop reordering urutan materi.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Rincian Kursus (/courses/:slug) &amp; silabus bab.</div>
            <div class="cell-bullet">Membuat Halaman Profil Instruktur &amp; ulasan rating kursus.</div>
            <div class="cell-bullet">Membuat alur pendaftaran kelas (enrollment) siswa.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Ruang Belajar Classroom (/courses/:slug/learn).</div>
            <div class="cell-bullet">Membuat Halaman Materi Belajar (Viewer Markdown, Video, Dokumen).</div>
            <div class="cell-bullet">Membuat Panel Split-Screen Chat Interaktif Orion AI Partner.</div>
          </td>
        </tr>

        <!-- SPRINT 3 -->
        <tr>
          <td>
            <div class="sprint-name">Sprint 3</div>
            <strong>Payment Gateway, Dompet Tutor &amp; Bagi Hasil</strong>
            <div class="sprint-goal">Goal: Backend Payment Gateway (QRIS/GoPay), otomatisasi split revenue 20%/80%, Halaman Checkout Pembayaran, Halaman Dompet Tutor, &amp; Riwayat Transaksi.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend Integrasi Payment Gateway (Midtrans/Xendit).</div>
            <div class="cell-bullet">Membuat algoritma otomatisasi split revenue (20% platform / 80% tutor).</div>
            <div class="cell-bullet">Membuat sistem holding saldo 7 hari &amp; validasi withdrawal.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend Webhook Receiver callback transaksi sukses.</div>
            <div class="cell-bullet">Membuat Backend Dompet Virtual Tutor (TutorWallet) &amp; log mutasi.</div>
            <div class="cell-bullet">Membuat Backend &amp; API Pengajuan Penarikan Dana (Withdrawal).</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Dompet Virtual Tutor (/tutor/wallet).</div>
            <div class="cell-bullet">Membuat widget saldo siap ditarik vs saldo tertahan (holding 7 hari).</div>
            <div class="cell-bullet">Membuat formulir penarikan dana rekening bank &amp; tabel mutasi.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Checkout Pembayaran (/checkout) multi-metode.</div>
            <div class="cell-bullet">Membuat tampilan QRIS dinamis &amp; nota digital (invoice).</div>
            <div class="cell-bullet">Membuat Halaman Riwayat Transaksi Pembelian Siswa.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Status Pembayaran &amp; aktivasi akses instan.</div>
            <div class="cell-bullet">Membuat Halaman Wishlist Kursus tersimpan siswa.</div>
            <div class="cell-bullet">Membuat komponen notifikasi transaksi sukses di dashboard.</div>
          </td>
        </tr>

        <!-- SPRINT 4 -->
        <tr>
          <td>
            <div class="sprint-name">Sprint 4</div>
            <strong>Gamifikasi, Ujian Akhir &amp; Sertifikat Digital</strong>
            <div class="sprint-goal">Goal: Backend Ujian &amp; Bank Soal, Backend Generator Sertifikat WebP/PDF ber-QR, Halaman Exam Creator Tutor, Halaman Pengerjaan Ujian, &amp; Halaman Sertifikat.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend Generator Sertifikat Digital resmi (Sharp WebP/PDF).</div>
            <div class="cell-bullet">Membuat sistem nomor sertifikat unik &amp; QR Code validator.</div>
            <div class="cell-bullet">Membuat optimasi context prompt Orion AI Socratic Assistant.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Backend Engine Ujian Akhir &amp; kalkulasi passing grade.</div>
            <div class="cell-bullet">Membuat Backend Course Milestones pelacak target durasi belajar.</div>
            <div class="cell-bullet">Membuat logika distribusi reward voucher diskon otomatis.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Exam Creator &amp; Bank Soal Tutor (/tutor/exams).</div>
            <div class="cell-bullet">Membuat antarmuka konfigurasi passing grade &amp; kunci jawaban.</div>
            <div class="cell-bullet">Membuat Halaman Admin Validasi Sertifikat Resmi (/admin).</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Portofolio Sertifikat Siswa (/dashboard/certificates).</div>
            <div class="cell-bullet">Membuat modal preview sertifikat &amp; tombol unduh WebP/PDF.</div>
            <div class="cell-bullet">Membuat Halaman Publik Verifikasi Keaslian Sertifikat Digital.</div>
          </td>
          <td>
            <div class="cell-bullet">Membuat Halaman Pengerjaan Ujian Akhir Siswa (/courses/:id/exam).</div>
            <div class="cell-bullet">Membuat komponen countdown timer kuis &amp; navigasi butir soal.</div>
            <div class="cell-bullet">Membuat modal pengumuman skor kelulusan &amp; review hasil ujian.</div>
          </td>
        </tr>

        <!-- SPRINT 5 -->
        <tr>
          <td>
            <div class="sprint-name">Sprint 5</div>
            <strong>Crosscheck Sistem, Testing Menyeluruh &amp; Finalisasi</strong>
            <div class="sprint-goal">Goal: Testing menyeluruh (12 test suite), crosscheck integrasi seluruh modul &amp; halaman, optimasi performa (Redis &amp; Gzip), audit keamanan, &amp; deployment.</div>
          </td>
          <td>
            <div class="cell-bullet">Melakukan crosscheck &amp; integrasi menyeluruh antar-modul backend.</div>
            <div class="cell-bullet">Menerapkan Redis Caching middleware &amp; Gzip HTTP compression.</div>
            <div class="cell-bullet">Audit keamanan OWASP (Rate Limit, Helmet, Sanitasi XSS) &amp; deploy.</div>
          </td>
          <td>
            <div class="cell-bullet">Melakukan unit testing &amp; integration testing API backend (Jest).</div>
            <div class="cell-bullet">Melakukan crosscheck integrasi Gemini AI SDK &amp; responsivitas Orion.</div>
            <div class="cell-bullet">Integrasi Edge-TTS Kokoro 6 suara sintetis materi audio pembelajaran.</div>
          </td>
          <td>
            <div class="cell-bullet">Memimpin eksekusi pengujian otomatis 12 automated test suites.</div>
            <div class="cell-bullet">Melakukan crosscheck fungsionalitas seluruh halaman Tutor &amp; Admin.</div>
            <div class="cell-bullet">Menyusun dokumentasi teknis sistem &amp; panduan operasional.</div>
          </td>
          <td>
            <div class="cell-bullet">Melakukan User Acceptance Testing (UAT) seluruh alur belajar siswa.</div>
            <div class="cell-bullet">Melakukan crosscheck fungsionalitas halaman katalog, detail &amp; sertifikat.</div>
            <div class="cell-bullet">Optimasi Core Web Vitals (LCP &le; 2.5s, INP &le; 200ms).</div>
          </td>
          <td>
            <div class="cell-bullet">Melakukan cross-browser testing (Chrome, Safari, Edge, Firefox).</div>
            <div class="cell-bullet">Melakukan audit aksesibilitas WCAG 2.2 AA &amp; navigasi keyboard.</div>
            <div class="cell-bullet">Melakukan perbaikan responsivitas mobile tablet &amp; smartphone.</div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="report-footer">
      <span>Laporan Perancangan Sistem &bull; SkillSphere AI</span>
      <span>Halaman 3 dari 3 &bull; 100% Tests Passed (12 Test Suites)</span>
    </div>
  </div>

</body>
</html>`;
}

async function main() {
  const htmlContent = generateHtml();
  const htmlPath = path.join(__dirname, '../docs/Dokumentasi_Perancangan_SkillSphere_AI.html');
  const pdfPath = path.join(__dirname, '../docs/Dokumentasi_Perancangan_SkillSphere_AI.pdf');
  const rootPdfPath = path.join(__dirname, '../Dokumentasi_Perancangan_SkillSphere_AI.pdf');

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✅ HTML generated at:', htmlPath);

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const cmd = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  
  console.log('⏳ Generating pristine formal report PDF with clean ERD via Headless Chrome...');
  execSync(cmd, { stdio: 'inherit' });
  
  // Copy to root as well for easy access
  fs.copyFileSync(pdfPath, rootPdfPath);
  console.log('🎉 Formal Report PDF successfully created at:');
  console.log('   - ' + pdfPath);
  console.log('   - ' + rootPdfPath);
}

main().catch(err => {
  console.error('❌ Error generating PDF:', err);
  process.exit(1);
});
