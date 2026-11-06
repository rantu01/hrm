import Payslip from '@/lib/models/Payslip';

function payslipPeriodCode(date) {
  const value = date ? new Date(date) : new Date();
  return `${value.getUTCFullYear()}${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

function employeeCode(employee) {
  const raw = employee?.employee_id || employee?._id || 'EMP';
  return String(raw)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(-12);
}

export async function generatePayslipNumber({ employee, run }) {
  const period = payslipPeriodCode(run?.payDate || run?.payPeriodEnd);
  const base = `PS-${period}-${employeeCode(employee)}`;
  let candidate = base;
  let suffix = 1;
  // Payslip numbers are unique across all runs, so two runs for the same
  // employee in the same month never collide.
  while (await Payslip.exists({ payslipNumber: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function createPayslipForEntry({ entry, run, employee, userId }) {
  const existing = await Payslip.findOne({ payrollEntry: entry._id });
  if (existing) return { payslip: existing, created: false };

  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const payslipNumber = await generatePayslipNumber({ employee, run });
      const payslip = await Payslip.create({
        payrollEntry: entry._id,
        employee: entry.employee?._id || entry.employee,
        payslipNumber,
        payPeriodStart: run.payPeriodStart,
        payPeriodEnd: run.payPeriodEnd,
        payDate: run.payDate,
        status: 'generated',
        createdBy: userId || null,
      });
      return { payslip, created: true };
    } catch (error) {
      lastError = error;
      if (error?.code !== 11000) throw error;
      const raced = await Payslip.findOne({ payrollEntry: entry._id });
      if (raced) return { payslip: raced, created: false };
    }
  }
  throw lastError || new Error('Unable to generate payslip number');
}
