function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value) {
  const n = Number(value) || 0;
  // Payslips are issued in Bangladeshi Taka (৳).
  return `৳${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function number(value, digits = 1) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

function date(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const THEME = '#2563eb';

export function renderPayslipHtml({ payslip, entry, employee, run, companyName }) {
  const earnings = [
    ...(entry.earningsBreakdown || []).map((item) => ({
      label: item.name,
      amount: Number(item.amount) || 0,
    })),
  ];
  if ((Number(entry.overtimeAmount) || 0) > 0) {
    earnings.push({ label: 'Overtime', amount: Number(entry.overtimeAmount) || 0 });
  }

  const deductions = [];
  if ((Number(entry.lopDeduction) || 0) > 0) {
    deductions.push({ label: 'Loss of Pay (LOP)', amount: Number(entry.lopDeduction) });
  }
  if ((Number(entry.unpaidLeaveDeduction) || 0) > 0) {
    deductions.push({
      label: 'Unpaid Leave',
      amount: Number(entry.unpaidLeaveDeduction),
    });
  }
  for (const item of entry.deductionsBreakdown || []) {
    deductions.push({ label: item.name, amount: Number(item.amount) || 0 });
  }

  const totalEarnings =
    earnings.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalDeductions =
    deductions.reduce((sum, item) => sum + item.amount, 0) || 0;
  const netPay = Number(entry.netPay) || totalEarnings - totalDeductions;

  const department =
    employee?.department_id?.name || employee?.department?.name || '—';
  const designation =
    employee?.designation_id?.name || employee?.designation?.name || '—';

  const row = (label, value, strong = false) => `
    <div class="row ${strong ? 'strong' : ''}">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>`;

  const earningsRows =
    earnings.length > 0
      ? earnings.map((item) => row(item.label, money(item.amount))).join('')
      : row('No earnings recorded', money(0));

  const deductionRows =
    deductions.length > 0
      ? deductions.map((item) => row(item.label, money(item.amount))).join('')
      : row('No deductions', money(0));

  const attendanceRows = [
    ['Working Days', number(entry.workingDays)],
    ['Present Days', number(entry.presentDays)],
    ['Paid Leave', number(entry.paidLeaveDays)],
    ['Unpaid Leave', number(entry.unpaidLeaveDays)],
    ['Holidays', number(entry.holidayDays)],
    ['Half Days', number(entry.halfDays)],
    ['Absent Days', number(entry.absentDays)],
    ['LOP Days', number(entry.lopDays)],
    ['Overtime Hours', number(entry.overtimeHours)],
  ]
    .map(
      ([label, value]) => `
      <div class="att-item">
        <span class="att-label">${escapeHtml(label)}</span>
        <span class="att-value">${escapeHtml(value)}</span>
      </div>`
    )
    .join('');

  const bankRows = [
    employee?.bank_name ? ['Bank', employee.bank_name] : null,
    employee?.account_holder_name
      ? ['Account Holder', employee.account_holder_name]
      : null,
    employee?.account_number ? ['Account Number', employee.account_number] : null,
    employee?.bank_identifier_code
      ? ['IFSC / BIC', employee.bank_identifier_code]
      : null,
  ]
    .filter(Boolean)
    .map(
      ([label, value]) => `
      <div class="info-item">
        <span class="info-label">${escapeHtml(label)}</span>
        <span class="info-value">${escapeHtml(value)}</span>
      </div>`
    )
    .join('');

  const filename = `${payslip.payslipNumber || 'payslip'}-${employee?.name || 'employee'}`
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .toLowerCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payslip - ${escapeHtml(employee?.name || 'Employee')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #1f2937;
      background: #f3f4f6;
      padding: 24px 12px 48px;
    }
    .toolbar {
      max-width: 860px;
      margin: 0 auto 12px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .toolbar button {
      border: 1px solid ${THEME};
      background: ${THEME};
      color: #fff;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .toolbar button.secondary { background: #fff; color: ${THEME}; }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #fff;
      padding: 32px 34px;
      border-radius: 10px;
      box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid ${THEME};
      margin-bottom: 20px;
    }
    .company { font-size: 22px; font-weight: 700; color: #111827; }
    .company-sub { font-size: 11px; color: #6b7280; margin-top: 4px; letter-spacing: 0.04em; text-transform: uppercase; }
    .payslip-title { text-align: right; }
    .payslip-title h1 { font-size: 20px; letter-spacing: 0.12em; color: ${THEME}; }
    .payslip-title p { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin: 0 0 10px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
    .info-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    .info-item { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
    .info-label { color: #6b7280; font-size: 12px; }
    .info-value { font-weight: 600; font-size: 12px; text-align: right; }
    .attendance {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 18px;
    }
    .att-item { padding: 10px 12px; border-bottom: 1px solid #eef2f7; border-right: 1px solid #eef2f7; }
    .att-item:nth-child(3n) { border-right: 0; }
    .att-label { display: block; color: #6b7280; font-size: 11px; margin-bottom: 3px; }
    .att-value { font-size: 14px; font-weight: 700; color: #111827; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
    .money-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .money-head { padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .money-head.earn { color: #047857; }
    .money-head.deduct { color: #b91c1c; }
    .money-body { padding: 6px 14px; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 12.5px; border-bottom: 1px dashed #eef2f7; }
    .row:last-child { border-bottom: 0; }
    .row.strong { font-weight: 700; color: #111827; }
    .money-total { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 13px; }
    .net-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: ${THEME};
      color: #fff;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 4px;
    }
    .net-box .label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9; }
    .net-box .value { font-size: 24px; font-weight: 700; }
    .footer { margin-top: 26px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 10.5px; color: #9ca3af; display: flex; justify-content: space-between; gap: 16px; }
    @media (max-width: 640px) {
      body { padding: 10px 6px 30px; }
      .container { padding: 20px 16px; }
      .grid, .columns { grid-template-columns: 1fr; }
      .attendance { grid-template-columns: 1fr 1fr; }
      .att-item:nth-child(3n) { border-right: 1px solid #eef2f7; }
      .att-item:nth-child(2n) { border-right: 0; }
      .header { flex-direction: column; }
      .payslip-title { text-align: left; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .container { box-shadow: none; border-radius: 0; max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="secondary" onclick="window.print()">Print</button>
    <button onclick="downloadPdf()">Download PDF</button>
  </div>

  <div class="container" id="payslip">
    <div class="header">
      <div>
        <div class="company">${escapeHtml(companyName)}</div>
        <div class="company-sub">Employee Payslip</div>
      </div>
      <div class="payslip-title">
        <h1>PAYSLIP</h1>
        <p>${escapeHtml(payslip.payslipNumber)}</p>
        <p>Pay date: ${escapeHtml(date(payslip.payDate || run?.payDate))}</p>
      </div>
    </div>

    <div class="grid">
      <div class="info-card">
        <div class="section-title">Employee Information</div>
        <div class="info-item"><span class="info-label">Name</span><span class="info-value">${escapeHtml(employee?.name)}</span></div>
        <div class="info-item"><span class="info-label">Employee ID</span><span class="info-value">${escapeHtml(employee?.employee_id || '—')}</span></div>
        <div class="info-item"><span class="info-label">Email</span><span class="info-value">${escapeHtml(employee?.email || '—')}</span></div>
        <div class="info-item"><span class="info-label">Department</span><span class="info-value">${escapeHtml(department)}</span></div>
        <div class="info-item"><span class="info-label">Designation</span><span class="info-value">${escapeHtml(designation)}</span></div>
      </div>
      <div class="info-card">
        <div class="section-title">Pay Period</div>
        <div class="info-item"><span class="info-label">From</span><span class="info-value">${escapeHtml(date(payslip.payPeriodStart || run?.payPeriodStart))}</span></div>
        <div class="info-item"><span class="info-label">To</span><span class="info-value">${escapeHtml(date(payslip.payPeriodEnd || run?.payPeriodEnd))}</span></div>
        <div class="info-item"><span class="info-label">Pay Date</span><span class="info-value">${escapeHtml(date(payslip.payDate || run?.payDate))}</span></div>
        <div class="info-item"><span class="info-label">Basic Salary</span><span class="info-value">${escapeHtml(money(entry.basicSalary))}</span></div>
        <div class="info-item"><span class="info-label">Per Day Salary</span><span class="info-value">${escapeHtml(money(entry.perDaySalary))}</span></div>
      </div>
    </div>

    ${
      bankRows
        ? `<div class="info-card" style="margin-bottom:18px">
            <div class="section-title">Payment Details</div>
            ${bankRows}
          </div>`
        : ''
    }

    <div class="section-title">Attendance Summary</div>
    <div class="attendance">${attendanceRows}</div>

    <div class="columns">
      <div class="money-card">
        <div class="money-head earn">Earnings</div>
        <div class="money-body">${earningsRows}</div>
        <div class="money-total"><span>Total Earnings</span><span>${escapeHtml(money(totalEarnings))}</span></div>
      </div>
      <div class="money-card">
        <div class="money-head deduct">Deductions</div>
        <div class="money-body">${deductionRows}</div>
        <div class="money-total"><span>Total Deductions</span><span>${escapeHtml(money(totalDeductions))}</span></div>
      </div>
    </div>

    <div class="net-box">
      <div>
        <div class="label">Net Pay</div>
        <div style="font-size:11px;opacity:.85;margin-top:3px">${escapeHtml(payslip.payslipNumber)}</div>
      </div>
      <div class="value">${escapeHtml(money(netPay))}</div>
    </div>

    <div class="footer">
      <span>This is a computer-generated payslip and does not require a signature.</span>
      <span>Generated ${escapeHtml(date(payslip.updatedAt || new Date()))}</span>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    function downloadPdf() {
      var element = document.getElementById('payslip');
      if (window.html2pdf) {
        html2pdf().set({
          margin: [8, 8, 8, 8],
          filename: '${filename}.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
      } else {
        window.print();
      }
    }
    window.addEventListener('load', function () {
      var params = new URLSearchParams(window.location.search);
      if (params.get('download') !== '0') {
        setTimeout(downloadPdf, 500);
      }
    });
  </script>
</body>
</html>`;
}
