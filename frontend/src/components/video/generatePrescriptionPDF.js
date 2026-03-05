/**
 * generatePrescriptionPDF.js
 * Generates a stunning, medically-professional prescription PDF
 * Uses jsPDF + html2canvas for pixel-perfect output
 * Colors aligned with Dashboard.css Apollo design system
 */

/**
 * Generates and downloads a prescription PDF
 * @param {Object} prescription - EnhancedPrescription data from backend
 */
export const generatePrescriptionPDF = async (prescription) => {
  // Dynamically import to avoid bundle bloat
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  // Create a hidden container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: white;
    z-index: -9999;
  `;
  document.body.appendChild(container);

  // Build the prescription HTML
  container.innerHTML = buildPrescriptionHTML(prescription);

  try {
    // Render to canvas at 2x for retina quality
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Handle multi-page
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    // Filename: Rx_PatientName_Date_UniqueID
    const dateStr = new Date(prescription.date || Date.now())
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const patientSlug = (prescription.patient_name || 'Patient')
      .replace(/\s+/g, '_')
      .toUpperCase();
    const shortId = (prescription.id || 'RX000').toString().slice(-6).toUpperCase();
    const filename = `Rx_${patientSlug}_${dateStr}_${shortId}.pdf`;

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Builds the complete HTML string for the prescription
 * Color palette matches Dashboard.css Apollo design system:
 *   Primary green : #16a34a  (--apollo-green-primary / --apollo-green-dark)
 *   Accent green  : #22c55e
 *   Light green   : #dcfce7  (--apollo-green-light)
 *   Dark bg       : #111827  (--apollo-gray-900)
 *   Text primary  : #1f2937  (--apollo-text-primary)
 *   Text secondary: #6b7280  (--apollo-text-secondary)
 *   Border        : #e5e7eb  (--apollo-gray-200)
 *   Surface       : #f9fafb  (--apollo-gray-50)
 *   Red           : #dc2626  (--apollo-red)
 */
const buildPrescriptionHTML = (rx) => {
  const medications = Array.isArray(rx.medications) ? rx.medications : [];
  const vitalSigns = rx.vital_signs && typeof rx.vital_signs === 'object' ? rx.vital_signs : {};
  const issueDate = rx.date
    ? new Date(rx.date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const followUpDate = rx.follow_up_date
    ? new Date(rx.follow_up_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  // Generate unique prescription number
  const rxNumber = rx.id
    ? `RX-${rx.id.toString().slice(-8).toUpperCase()}`
    : `RX-${Date.now().toString().slice(-8)}`;

  const vitalsRows = Object.entries(vitalSigns)
    .filter(([, v]) => v)
    .map(([k, v]) => `
      <div class="vital-item">
        <span class="vital-label">${formatVitalKey(k)}</span>
        <span class="vital-value">${v}</span>
      </div>
    `)
    .join('');

  const medicationRows = medications.map((med, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="med-num">${i + 1}</td>
      <td class="med-name">
        <strong>${med.name || '—'}</strong>
        ${med.dosage ? `<br/><span class="med-strength">${med.dosage}</span>` : ''}
      </td>
      <td>${med.frequency || '—'}</td>
      <td>${med.duration || '—'}</td>
      <td class="med-instructions">${med.instructions || 'As directed'}</td>
    </tr>
  `).join('');

  const patientAge = rx.patient_age ? `, ${rx.patient_age} yrs` : '';
  const patientGender = rx.patient_gender ? ` | ${rx.patient_gender}` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

        /*
         * ── Apollo Design Tokens (mirrors Dashboard.css) ──────────────────
         * --apollo-green-primary : #16a34a
         * --apollo-green-dark    : #16a34a
         * --apollo-green-light   : #dcfce7
         * --apollo-gray-50       : #f9fafb
         * --apollo-gray-200      : #e5e7eb
         * --apollo-gray-400      : #9ca3af
         * --apollo-gray-500      : #6b7280
         * --apollo-gray-700      : #374151
         * --apollo-gray-900      : #111827
         * --apollo-text-primary  : #1f2937
         * --apollo-text-secondary: #6b7280
         * --apollo-red           : #dc2626
         * --apollo-white         : #ffffff
         * ─────────────────────────────────────────────────────────────────
         */

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Source Sans 3', 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          color: #1f2937;           /* --apollo-text-primary */
          background: #ffffff;
          width: 794px;
        }

        /* ═══ HEADER ═══ */
        .header {
          background: linear-gradient(135deg, #111827 0%, #16a34a 100%);
          /* --apollo-gray-900 → --apollo-green-primary */
          color: #ffffff;
          padding: 28px 36px 22px;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 120px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }

        .clinic-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .logo-icon {
          width: 48px; height: 48px;
          background: rgba(255,255,255,0.15);
          border-radius: 8px;         /* --apollo-radius */
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          border: 2px solid rgba(255,255,255,0.3);
          flex-shrink: 0;
        }
        .clinic-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.3px;
          line-height: 1.1;
        }
        .clinic-tagline {
          font-size: 11px;
          opacity: 0.75;
          font-weight: 300;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .doctor-card { text-align: right; }
        .doctor-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .doctor-qual { font-size: 12px; opacity: 0.85; margin-bottom: 3px; }
        .doctor-spec {
          display: inline-block;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 3px 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .doctor-reg { font-size: 11px; opacity: 0.7; }

        .header-divider {
          height: 1px;
          background: rgba(255,255,255,0.2);
          margin: 14px 0 12px;
          position: relative;
          z-index: 1;
        }

        .header-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .rx-badge { display: flex; align-items: center; gap: 8px; }
        .rx-symbol {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 36px;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          line-height: 1;
        }
        .rx-label {
          font-size: 10px;
          opacity: 0.65;
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1.3;
        }
        .rx-number { font-size: 14px; font-weight: 600; opacity: 0.9; }

        .header-meta {
          text-align: right;
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.8;
        }

        /* ═══ PATIENT INFO BAR ═══ */
        .patient-bar {
          background: #dcfce7;        /* --apollo-green-light */
          border-left: 5px solid #16a34a; /* --apollo-green-primary */
          padding: 14px 36px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #bbf7d0; /* lighter green border */
        }

        .patient-left { flex: 1; }
        .patient-name-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 4px;
        }
        .patient-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 600;
          color: #111827;             /* --apollo-gray-900 */
        }
        .patient-meta {
          font-size: 12px;
          color: #6b7280;             /* --apollo-text-secondary */
          font-weight: 400;
        }
        .patient-contact {
          font-size: 12px;
          color: #374151;             /* --apollo-gray-700 */
          font-weight: 500;
        }

        .patient-right {
          text-align: right;
          font-size: 12px;
          color: #374151;             /* --apollo-gray-700 */
          line-height: 1.8;
        }

        /* ═══ BODY ═══ */
        .body-section { padding: 0 36px; }

        /* Diagnosis */
        .diagnosis-block {
          margin: 18px 0 14px;
          background: #fff7ed;        /* warm amber tint – keeps contrast with green theme */
          border: 1px solid #fed7aa;
          border-left: 5px solid #f97316;
          border-radius: 4px;
          padding: 12px 16px;
        }
        .diagnosis-title {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #c2410c;
          margin-bottom: 5px;
        }
        .diagnosis-text {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;             /* --apollo-text-primary */
          line-height: 1.4;
        }

        /* Vitals */
        .vitals-block { margin-bottom: 16px; }
        .section-heading {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          color: #111827;             /* --apollo-gray-900 */
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #dcfce7; /* --apollo-green-light */
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .section-heading::before {
          content: '';
          width: 20px; height: 2px;
          background: #16a34a;        /* --apollo-green-primary */
          display: inline-block;
        }
        .vitals-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .vital-item {
          background: #f9fafb;        /* --apollo-gray-50 */
          border: 1px solid #e5e7eb; /* --apollo-gray-200 */
          border-radius: 6px;
          padding: 6px 14px;
          min-width: 120px;
          text-align: center;
        }
        .vital-label {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #6b7280;             /* --apollo-text-secondary */
          margin-bottom: 2px;
          font-weight: 600;
        }
        .vital-value {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #111827;             /* --apollo-gray-900 */
        }

        /* Medications Table */
        .medications-block { margin-bottom: 18px; }
        .med-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .med-table thead tr {
          background: #16a34a;        /* --apollo-green-primary */
          color: #ffffff;
        }
        .med-table thead th {
          padding: 10px 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          text-align: left;
        }
        .med-table thead th:first-child { text-align: center; width: 36px; }
        .med-table tbody tr.row-even { background: #ffffff; }
        .med-table tbody tr.row-odd  { background: #f9fafb; } /* --apollo-gray-50 */
        .med-table tbody td {
          padding: 10px 12px;
          font-size: 12.5px;
          border-bottom: 1px solid #e5e7eb; /* --apollo-gray-200 */
          vertical-align: top;
          color: #1f2937;             /* --apollo-text-primary */
          line-height: 1.5;
        }
        .med-num {
          text-align: center;
          font-weight: 700;
          color: #16a34a;             /* --apollo-green-primary */
          width: 36px;
        }
        .med-name strong { font-size: 13px; color: #111827; } /* --apollo-gray-900 */
        .med-strength { font-size: 11px; color: #6b7280; font-weight: 500; } /* --apollo-text-secondary */
        .med-instructions { font-size: 11.5px; color: #374151; font-style: italic; } /* --apollo-gray-700 */

        /* Notes & Lab Tests */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }
        .info-box {
          background: #f9fafb;        /* --apollo-gray-50 */
          border: 1px solid #e5e7eb; /* --apollo-gray-200 */
          border-radius: 6px;
          padding: 12px 14px;
        }
        .info-box-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #16a34a;             /* --apollo-green-primary */
          margin-bottom: 7px;
        }
        .info-box-text {
          font-size: 12.5px;
          color: #1f2937;             /* --apollo-text-primary */
          line-height: 1.6;
        }

        /* Follow-up */
        .followup-block {
          background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%);
          /* --apollo-green-light gradient */
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .followup-icon {
          width: 36px; height: 36px;
          background: #16a34a;        /* --apollo-green-primary */
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          color: #ffffff;
          flex-shrink: 0;
        }
        .followup-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #111827;             /* --apollo-gray-900 */
          margin-bottom: 3px;
        }
        .followup-date {
          font-size: 14px;
          font-weight: 700;
          color: #16a34a;             /* --apollo-green-primary */
        }

        /* ═══ FOOTER ═══ */
        .footer {
          margin-top: 8px;
          border-top: 1px solid #e5e7eb; /* --apollo-gray-200 */
          padding: 16px 36px 20px;
        }
        .footer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 14px;
        }
        .signature-block { min-width: 180px; }
        .signature-line {
          width: 180px;
          border-bottom: 2px solid #1f2937; /* --apollo-text-primary */
          margin-bottom: 6px;
          height: 36px;
        }
        .signature-name {
          font-size: 12.5px;
          font-weight: 700;
          color: #16a34a;             /* --apollo-green-primary */
        }
        .signature-reg {
          font-size: 11px;
          color: #6b7280;             /* --apollo-text-secondary */
        }

        .seal-area {
          width: 80px; height: 80px;
          border: 2px dashed #9ca3af; /* --apollo-gray-400 */
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #9ca3af;
          font-size: 10px;
          text-align: center;
          line-height: 1.3;
          font-style: italic;
        }

        .disclaimer {
          background: #f9fafb;        /* --apollo-gray-50 */
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 9.5px;
          color: #6b7280;             /* --apollo-text-secondary */
          line-height: 1.5;
          text-align: center;
          border: 1px solid #e5e7eb; /* --apollo-gray-200 */
        }
        .disclaimer strong { color: #374151; } /* --apollo-gray-700 */

        /* ═══ WATERMARK ═══ */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 72px;
          font-weight: 700;
          color: rgba(22, 163, 74, 0.05); /* --apollo-green-primary at 5% opacity */
          pointer-events: none;
          white-space: nowrap;
          z-index: 0;
        }

        .page-wrapper {
          position: relative;
          min-height: 1123px;
        }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="watermark">MEDICAL PRESCRIPTION</div>

        <!-- HEADER -->
        <div class="header">
          <div class="header-top">
            <div class="clinic-section">
              <div class="clinic-logo">
                <div class="logo-icon">⚕</div>
                <div>
                  <div class="clinic-name">${escapeHtml(rx.hospital_name || 'Rural HealthCare Clinic')}</div>
                  <div class="clinic-tagline">Digital Health Platform · Telemedicine</div>
                </div>
              </div>
            </div>
            <div class="doctor-card">
              <div class="doctor-name">Dr. ${escapeHtml(rx.doctor_name || 'Physician')}</div>
              ${rx.doctor_registration ? `<div class="doctor-qual">Reg. No: ${escapeHtml(rx.doctor_registration)}</div>` : ''}
              ${rx.doctor_specialization ? `<div class="doctor-spec">${escapeHtml(rx.doctor_specialization)}</div>` : ''}
            </div>
          </div>

          <div class="header-divider"></div>

          <div class="header-bottom">
            <div class="rx-badge">
              <div class="rx-symbol">℞</div>
              <div>
                <div class="rx-label">Prescription</div>
                <div class="rx-number">${rxNumber}</div>
              </div>
            </div>
            <div class="header-meta">
              <div>Date of Issue: <strong>${issueDate}</strong></div>
              <div>Mode: Telemedicine / Video Consultation</div>
            </div>
          </div>
        </div>

        <!-- PATIENT INFO BAR -->
        <div class="patient-bar">
          <div class="patient-left">
            <div class="patient-name-row">
              <div class="patient-name">${escapeHtml(rx.patient_name || 'Patient')}</div>
              <div class="patient-meta">${escapeHtml(patientAge + patientGender)}</div>
            </div>
            ${rx.patient_phone ? `<div class="patient-contact">📞 ${escapeHtml(rx.patient_phone)}</div>` : ''}
          </div>
          <div class="patient-right">
            <div><strong>Consultation:</strong> Video Call</div>
            <div><strong>Status:</strong> Active Prescription</div>
          </div>
        </div>

        <!-- BODY -->
        <div class="body-section">
          <!-- DIAGNOSIS -->
          ${rx.diagnosis ? `
          <div class="diagnosis-block">
            <div class="diagnosis-title">🩺 Clinical Diagnosis</div>
            <div class="diagnosis-text">${escapeHtml(rx.diagnosis)}</div>
          </div>` : ''}

          <!-- VITALS -->
          ${vitalsRows ? `
          <div class="vitals-block">
            <div class="section-heading">Vital Signs</div>
            <div class="vitals-grid">${vitalsRows}</div>
          </div>` : ''}

          <!-- MEDICATIONS -->
          ${medications.length > 0 ? `
          <div class="medications-block">
            <div class="section-heading">Prescribed Medications</div>
            <table class="med-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine Name &amp; Strength</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>
                ${medicationRows}
              </tbody>
            </table>
          </div>` : ''}

          <!-- NOTES + LAB TESTS -->
          ${(rx.notes || rx.lab_tests) ? `
          <div class="info-grid">
            ${rx.notes ? `
            <div class="info-box">
              <div class="info-box-title">📋 Doctor's Notes</div>
              <div class="info-box-text">${escapeHtml(rx.notes)}</div>
            </div>` : ''}
            ${rx.lab_tests ? `
            <div class="info-box">
              <div class="info-box-title">🔬 Lab Tests Advised</div>
              <div class="info-box-text">${escapeHtml(rx.lab_tests)}</div>
            </div>` : ''}
          </div>` : ''}

          <!-- FOLLOW-UP -->
          ${followUpDate ? `
          <div class="followup-block">
            <div class="followup-icon">📅</div>
            <div>
              <div class="followup-title">Follow-up Appointment</div>
              <div class="followup-date">${followUpDate}</div>
            </div>
          </div>` : ''}
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <div class="footer-top">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">Dr. ${escapeHtml(rx.doctor_name || 'Physician')}</div>
              ${rx.doctor_specialization ? `<div class="signature-reg">${escapeHtml(rx.doctor_specialization)}</div>` : ''}
              ${rx.doctor_registration ? `<div class="signature-reg">Reg. ${escapeHtml(rx.doctor_registration)}</div>` : ''}
            </div>
            <div class="seal-area">Doctor's<br/>Stamp<br/>&amp; Seal</div>
          </div>
          <div class="disclaimer">
            <strong>Important:</strong> This is a digitally issued telemedicine prescription. Valid as per Telemedicine Practice Guidelines, Ministry of Health &amp; Family Welfare, Govt. of India.
            This prescription is intended solely for the named patient. Medications should be taken only as directed by the prescribing physician.
            Keep all medicines out of reach of children. Store as per storage instructions. In case of adverse reactions, consult your physician immediately or call emergency services (108/102).
            <br/><strong>Prescription ID: ${rxNumber}</strong> | Generated: ${new Date().toLocaleString('en-IN')} | Rural HealthCare Digital Platform
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatVitalKey = (key) => {
  const map = {
    blood_pressure: 'Blood Pressure',
    heart_rate: 'Heart Rate',
    temperature: 'Temperature',
    spo2: 'SpO₂',
    oxygen_saturation: 'SpO₂',
    respiratory_rate: 'Resp. Rate',
    weight: 'Weight',
    height: 'Height',
    bmi: 'BMI',
    blood_sugar: 'Blood Sugar',
    pulse: 'Pulse',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default generatePrescriptionPDF;