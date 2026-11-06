import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import PayrollRun from '@/lib/models/PayrollRun';
import PayrollEntry from '@/lib/models/PayrollEntry';
import Employee from '@/lib/models/Employee';
import EmployeeSalary from '@/lib/models/EmployeeSalary';
import SalaryComponent from '@/lib/models/SalaryComponent';
import Attendance from '@/lib/models/Attendance';
import Leave from '@/lib/models/Leave';
// Registers the LeaveType model used when populating leave records.
import '@/lib/models/LeaveType';
import Holiday from '@/lib/models/Holiday';
import { handleApiError } from '@/lib/auth';
import { requirePayrollPermission } from '@/lib/payroll/access';
import { calculatePayrollEntry, round2 } from '@/lib/payroll/calculate';

function groupByEmployee(records) {
  const map = new Map();
  for (const record of records) {
    const key = String(record.employee);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
  return map;
}

export async function POST(request, { params }) {
  try {
    const user = await requirePayrollPermission(request, 'processRuns');
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }

    // Atomically claim the run so two concurrent requests cannot process it.
    const run = await PayrollRun.findOneAndUpdate(
      { _id: id, status: 'draft' },
      {
        $set: {
          status: 'processing',
          processedBy: user._id,
          processedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!run) {
      const existing = await PayrollRun.findById(id).select('status');
      if (!existing) {
        return Response.json({ message: 'Payroll run not found' }, { status: 404 });
      }
      return Response.json(
        { message: 'Payroll run is not in draft status.' },
        { status: 409 }
      );
    }

    try {
      const employees = await Employee.find({
        employee_status: { $in: ['active', 'probation'] },
      })
        .select('name employee_id email branch_id department_id designation_id base_salary profile_image')
        .sort({ name: 1 })
        .lean();

      const employeeIds = employees.map((employee) => employee._id);

      let salaryRecords = await EmployeeSalary.find({
        employee: { $in: employeeIds },
      }).lean();
      const salaryMap = new Map(
        salaryRecords.map((record) => [String(record.employee), record])
      );

      // Create a salary structure automatically for employees that already
      // have a basic salary configured but no salary record yet.
      const missing = employees.filter(
        (employee) =>
          !salaryMap.has(String(employee._id)) && Number(employee.base_salary) > 0
      );
      if (missing.length > 0) {
        const created = await EmployeeSalary.insertMany(
          missing.map((employee) => ({
            employee: employee._id,
            basicSalary: Number(employee.base_salary) || 0,
            components: [],
            isActive: true,
            calculationStatus: 'calculated',
            createdBy: user._id,
            updatedBy: user._id,
          })),
          { ordered: false }
        ).catch(async (error) => {
          // Ignore duplicate-key races and reload below.
          if (error?.code === 11000 || error?.writeErrors) return [];
          throw error;
        });
        for (const record of created) {
          salaryMap.set(String(record.employee), record.toObject ? record.toObject() : record);
        }
        salaryRecords = await EmployeeSalary.find({
          employee: { $in: employeeIds },
        }).lean();
        salaryMap.clear();
        for (const record of salaryRecords) {
          salaryMap.set(String(record.employee), record);
        }
      }

      const componentIds = [
        ...new Set(
          salaryRecords
            .filter((record) => record.isActive !== false)
            .flatMap((record) =>
              (record.components || []).map((component) => String(component))
            )
        ),
      ].filter((componentId) => mongoose.Types.ObjectId.isValid(componentId));

      const [attendanceRecords, leaveRecords, holidays, components] =
        await Promise.all([
          Attendance.find({
            employee: { $in: employeeIds },
            date: { $gte: run.payPeriodStart, $lte: run.payPeriodEnd },
          })
            .select('employee date status overtimeHours overtimeAmount')
            .lean(),
          Leave.find({
            employee: { $in: employeeIds },
            status: 'approved',
            startDate: { $lte: run.payPeriodEnd },
            endDate: { $gte: run.payPeriodStart },
          })
            .populate('leaveType', 'name isPaid')
            .select('employee leaveType type startDate endDate totalDays halfDay')
            .lean(),
          Holiday.find({
            start_date: { $lte: run.payPeriodEnd },
            $or: [{ end_date: null }, { end_date: { $gte: run.payPeriodStart } }],
          })
            .select('name start_date end_date is_paid branch_ids')
            .lean(),
          SalaryComponent.find({
            _id: { $in: componentIds },
            status: 'active',
          }).lean(),
        ]);

      const componentMap = new Map(
        components.map((component) => [String(component._id), component])
      );
      const attendanceMap = groupByEmployee(attendanceRecords);
      const leaveMap = groupByEmployee(leaveRecords);

      let processed = 0;
      const skipped = [];

      for (const employee of employees) {
        const salaryRecord = salaryMap.get(String(employee._id));

        if (salaryRecord && salaryRecord.isActive === false) {
          skipped.push({
            employeeId: String(employee._id),
            name: employee.name,
            reason: 'Salary structure is inactive',
          });
          continue;
        }

        const salaryBasic = salaryRecord
          ? Number(salaryRecord.basicSalary)
          : null;
        const basicSalary =
          salaryBasic !== null && Number.isFinite(salaryBasic)
            ? salaryBasic
            : Number(employee.base_salary) || 0;

        if (basicSalary <= 0) {
          skipped.push({
            employeeId: String(employee._id),
            name: employee.name,
            reason: 'No basic salary configured',
          });
          continue;
        }

        const employeeComponents = (salaryRecord?.components || [])
          .map((componentId) => componentMap.get(String(componentId)))
          .filter(Boolean);

        const calculation = calculatePayrollEntry({
          employee,
          basicSalary,
          components: employeeComponents,
          run,
          attendanceRecords: attendanceMap.get(String(employee._id)) || [],
          leaves: leaveMap.get(String(employee._id)) || [],
          holidays,
        });

        await PayrollEntry.findOneAndUpdate(
          { payrollRun: run._id, employee: employee._id },
          {
            $set: {
              ...calculation,
              createdBy: user._id,
            },
          },
          { upsert: true, runValidators: true, returnDocument: 'after' }
        );
        processed += 1;
      }

      if (processed === 0) {
        await PayrollRun.updateOne(
          { _id: run._id },
          { $set: { status: 'draft', processedAt: null, processedBy: null } }
        );
        return Response.json(
          {
            message:
              'No eligible employees were processed. Configure a basic salary for at least one active employee first.',
            processed: 0,
            skipped,
          },
          { status: 400 }
        );
      }

      const totals = await PayrollEntry.aggregate([
        { $match: { payrollRun: run._id } },
        {
          $group: {
            _id: null,
            grossPay: { $sum: '$grossPay' },
            deductions: { $sum: '$totalDeductions' },
            netPay: { $sum: '$netPay' },
            count: { $sum: 1 },
          },
        },
      ]);

      const summary = totals[0] || {
        grossPay: 0,
        deductions: 0,
        netPay: 0,
        count: 0,
      };

      const updated = await PayrollRun.findByIdAndUpdate(
        run._id,
        {
          $set: {
            totalGrossPay: round2(summary.grossPay),
            totalDeductions: round2(summary.deductions),
            totalNetPay: round2(summary.netPay),
            employeeCount: summary.count,
            status: 'completed',
            completedAt: new Date(),
            processedBy: user._id,
            processedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      ).lean();

      return Response.json({
        message: `Payroll processed successfully for ${processed} employee(s)`,
        processed,
        skipped,
        run: updated,
      });
    } catch (error) {
      // Release the run so the user can correct the issue and retry.
      await PayrollRun.updateOne(
        { _id: run._id },
        { $set: { status: 'draft', processedAt: null, processedBy: null } }
      ).catch(() => {});
      throw error;
    }
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    return handleApiError(error, 'Server error processing payroll run');
  }
}
