'use client';
import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import Reports from './Reports';
import Employee from './Employee';
import Company from './Company';
import useAuthStore from "@/store/useAuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Payroll = () => {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('create-paycheck');

  // ==================== STATE ====================
  
  // Data from API
  const [employees, setEmployees] = useState([]);
  const [earningTypes, setEarningTypes] = useState([]);
  const [deductionTypes, setDeductionTypes] = useState([]);
  
  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transfer loading state
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferProgress, setTransferProgress] = useState({
    current: 0,
    total: 0,
    employeeName: '',
    status: '', // 'fetching', 'processing', 'done'
  });

  // Track if hours data has been loaded from API
  const [hoursDataLoaded, setHoursDataLoaded] = useState(false);

  // Payroll input data per employee
  const [payrollData, setPayrollData] = useState({});

  // Date range and check number
  const [dateRange, setDateRange] = useState({
    payFrom: '',
    payTo: '',
  });
  const [checkNumber, setCheckNumber] = useState('6366');

  // Hours data from timekeeping API
  const [hoursData, setHoursData] = useState({});

  // Employee Detail Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Pay date (date of generation - when PROCESS is clicked)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Hours Breakdown Modal
  const [hoursBreakdownEmployee, setHoursBreakdownEmployee] = useState(null);
  const [isHoursBreakdownOpen, setIsHoursBreakdownOpen] = useState(false);
  const [hoursBreakdownData, setHoursBreakdownData] = useState(null);
  const [hoursBreakdownLoading, setHoursBreakdownLoading] = useState(false);

  // ==================== FETCH DATA ====================

  useEffect(() => {
    if (token && activeTab === 'create-paycheck') {
      fetchPayrollData();
    }
  }, [token, activeTab]);

  const fetchPayrollData = async () => {
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/employee-payroll-details/employees-with-details`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payroll data');
      }

      if (data.success) {
        const { employees: empData, earningTypes: etData, deductionTypes: dtData } = data.data;

        setEmployees(empData);
        setEarningTypes(etData);
        setDeductionTypes(dtData);

        // Initialize payroll data for all employees
        const initialPayrollData = {};
        const initialHoursData = {};

        empData.forEach((emp) => {
          // Initialize earnings (based on earning types)
          const earnings = {};
          etData.forEach((et) => {
            if (et.calculationType === 'flat') {
              // For salary employees, pre-fill salary earning
              if (et.code === 'salary' && emp.payrollDetails.payType === 'salary') {
                earnings[et.id] = emp.payrollDetails.payRate.toString();
              } else {
                earnings[et.id] = '';
              }
            } else {
              // Hours-based: will be filled from API
              earnings[et.id] = '';
            }
          });

          // Initialize deductions
          const deductions = {};
          dtData.forEach((dt) => {
            deductions[dt.id] = '';
          });

          initialPayrollData[emp.id] = {
            earnings,
            deductions,
          };

          // Initialize empty hours data (will be populated by Transfer)
          initialHoursData[emp.id] = {
            regularHours: 0,
            overtimeHours: 0,
            isFinalClock: false,
          };
        });

        setPayrollData(initialPayrollData);
        setHoursData(initialHoursData);
        setHoursDataLoaded(false); // Reset when data is reloaded

        // Set default date range (current pay period - biweekly example)
        const today = new Date();
        const payTo = new Date(today);
        const payFrom = new Date(today);
        payFrom.setDate(payFrom.getDate() - 13); // 2 weeks ago

        setDateRange({
          payFrom: payFrom.toISOString().split('T')[0],
          payTo: payTo.toISOString().split('T')[0],
        });

        toast.success('Payroll data loaded successfully');
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TRANSFER (IMPORT CLOCK HOURS) ====================

  const handleTransfer = async () => {
    // Validation
    if (!dateRange.payFrom || !dateRange.payTo) {
      toast.error('Please select both Pay From and Pay To dates');
      return;
    }

    const fromDate = new Date(dateRange.payFrom);
    const toDate = new Date(dateRange.payTo);

    if (fromDate > toDate) {
      toast.error('Pay From date must be before Pay To date');
      return;
    }

    try {
      setTransferLoading(true);
      setTransferProgress({
        current: 0,
        total: employees.length,
        employeeName: 'Initializing...',
        status: 'fetching',
      });

      // Simulate a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 300));

      // Call the import-clock-hours API
      setTransferProgress(prev => ({
        ...prev,
        employeeName: 'Fetching clock hours from server...',
        status: 'fetching',
      }));

      const response = await fetch(
        `${API_URL}/api/test/payroll-system/import-clock-hours?from=${dateRange.payFrom}&to=${dateRange.payTo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to import clock hours');
      }

      if (data.success) {
        const { employees: clockData, summary } = data.data;

        // Process each employee with visual feedback
        const newHoursData = { ...hoursData };
        
        for (let i = 0; i < clockData.length; i++) {
          const empClock = clockData[i];
          
          // Update progress
          setTransferProgress({
            current: i + 1,
            total: clockData.length,
            employeeName: empClock.employeeName,
            status: 'processing',
          });

          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 100));

          // Update hours data for this employee
          newHoursData[empClock.userId] = {
            regularHours: empClock.regularHours || 0,
            overtimeHours: empClock.approvedOvertimeHours || 0,
            isFinalClock: !empClock.hasActiveClockIn,
            // Additional info for display
            totalRawClockedHours: empClock.totalRawClockedHours || 0,
            totalBreakDeductions: empClock.totalBreakDeductions || 0,
            totalScheduledHours: empClock.totalScheduledHours || 0,
            daysWorked: empClock.daysWorked || 0,
            hasActiveClockIn: empClock.hasActiveClockIn || false,
            hasPendingOT: empClock.hasPendingOT || false,
            pendingOTCount: empClock.pendingOTCount || 0,
            // Attendance tracking (new)
            tardyMinutes: empClock.tardyMinutes || 0,
            tardyCount: empClock.tardyCount || 0,
            undertimeMinutes: empClock.undertimeMinutes || 0,
            undertimeCount: empClock.undertimeCount || 0,
            unapprovedExtraMinutes: empClock.unapprovedExtraMinutes || 0,
            daysWithNoSchedule: empClock.daysWithNoSchedule || 0,
          };
        }

        setHoursData(newHoursData);
        setHoursDataLoaded(true);

        // Update progress to done
        setTransferProgress(prev => ({
          ...prev,
          status: 'done',
          employeeName: 'Complete!',
        }));

        // Show success with summary
        const successMessage = `Imported ${summary.totalEmployees} employees: ${summary.totalRegularHours} regular hrs, ${summary.totalOvertimeHours} OT hrs`;
        toast.success(successMessage);

        // Show warnings if any
        if (summary.employeesWithActiveClockIn > 0) {
          toast.warning(`${summary.employeesWithActiveClockIn} employee(s) still clocked in`);
        }
        if (summary.employeesWithPendingOT > 0) {
          toast.info(`${summary.employeesWithPendingOT} employee(s) have pending OT requests`);
        }

        // Log summary to console
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                    CLOCK HOURS IMPORTED                        ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📅 Period:', dateRange.payFrom, 'to', dateRange.payTo);
        console.log('👥 Total Employees:', summary.totalEmployees);
        console.log('⏰ Total Regular Hours:', summary.totalRegularHours);
        console.log('⏱️ Total Overtime Hours:', summary.totalOvertimeHours);
        console.log('═══════════════════════════════════════════════════════════════');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to import clock hours';
      toast.error(errorMessage);
      console.error('Transfer error:', err);
    } finally {
      // Small delay before hiding the modal
      await new Promise(resolve => setTimeout(resolve, 500));
      setTransferLoading(false);
      setTransferProgress({
        current: 0,
        total: 0,
        employeeName: '',
        status: '',
      });
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const parseDecimal = (value) => {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const round2 = (num) => {
    return Math.round(num * 100) / 100;
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // ==================== CALCULATION FUNCTIONS ====================

  /**
   * Calculate earning value based on type
   */
  const calculateEarningValue = (employee, earningType, inputValue, hoursInput) => {
    const payRate = parseDecimal(employee.payrollDetails?.payRate);
    const employeeEarningRates = employee.earningRates || {};

    switch (earningType.calculationType) {
      case 'flat':
        // Direct dollar amount
        return round2(parseDecimal(inputValue));

      case 'hourly':
        // Hours × payRate
        const hours = parseDecimal(hoursInput);
        return round2(hours * payRate);

      case 'hourly_ot':
        // Hours × payRate × otMultiplier
        const otHours = parseDecimal(hoursInput);
        const otMultiplier = earningType.otMultiplier || 1.5;
        return round2(otHours * payRate * otMultiplier);

      case 'custom_rate':
        // Units × employee's specific rate
        const units = parseDecimal(hoursInput);
        const customRate = parseDecimal(employeeEarningRates[earningType.id]);
        return round2(units * customRate);

      default:
        return 0;
    }
  };

  /**
   * Calculate all values for a single employee row
   */
  const calculateRowValues = (employee) => {
    const empPayroll = payrollData[employee.id] || { earnings: {}, deductions: {} };
    const empHours = hoursData[employee.id] || { regularHours: 0, overtimeHours: 0 };

    let grossEarnings = 0;
    const earningsBreakdown = {};

    // Calculate each earning
    earningTypes.forEach((et) => {
      let value = 0;
      const inputValue = empPayroll.earnings[et.id] || '';

      // Determine what hours value to use
      let hoursValue = inputValue;
      if (et.calculationType === 'hourly' && et.code === 'regular_hours') {
        hoursValue = empHours.regularHours?.toString() || inputValue;
      } else if (et.calculationType === 'hourly_ot' && et.code === 'overtime') {
        hoursValue = empHours.overtimeHours?.toString() || inputValue;
      }

      value = calculateEarningValue(employee, et, inputValue, hoursValue);
      earningsBreakdown[et.id] = value;
      grossEarnings += value;
    });

    // Calculate deductions
    let totalDeductions = 0;
    const deductionsBreakdown = {};

    deductionTypes.forEach((dt) => {
      const value = parseDecimal(empPayroll.deductions[dt.id] || '');
      deductionsBreakdown[dt.id] = value;
      totalDeductions += value;
    });

    // Calculate net pay
    const netPay = round2(grossEarnings - totalDeductions);

    return {
      grossEarnings: round2(grossEarnings),
      totalDeductions: round2(totalDeductions),
      netPay,
      earningsBreakdown,
      deductionsBreakdown,
      isNegative: netPay < 0,
    };
  };

  // ==================== EVENT HANDLERS ====================

  const handleEarningChange = (employeeId, earningTypeId, value) => {
    setPayrollData((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        earnings: {
          ...prev[employeeId]?.earnings,
          [earningTypeId]: value,
        },
      },
    }));
  };

  const handleDeductionChange = (employeeId, deductionTypeId, value) => {
    setPayrollData((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        deductions: {
          ...prev[employeeId]?.deductions,
          [deductionTypeId]: value,
        },
      },
    }));
  };

  // Open Employee Detail Modal
  const openEmployeeDetail = (employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  // Close Employee Detail Modal
  const closeEmployeeDetail = () => {
    setSelectedEmployee(null);
    setIsDetailModalOpen(false);
  };

  // Open Hours Breakdown Modal
  const openHoursBreakdown = async (employee) => {
    setHoursBreakdownEmployee(employee);
    setIsHoursBreakdownOpen(true);
    setHoursBreakdownLoading(true);
    setHoursBreakdownData(null);

    try {
      const response = await fetch(
        `${API_URL}/api/test/payroll-system/import-clock-hours/${employee.id}?from=${dateRange.payFrom}&to=${dateRange.payTo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch hours breakdown');
      }

      if (data.success) {
        setHoursBreakdownData(data.data);
      }
    } catch (err) {
      console.error('Error fetching hours breakdown:', err);
      toast.error('Failed to load hours breakdown');
    } finally {
      setHoursBreakdownLoading(false);
    }
  };

  // Close Hours Breakdown Modal
  const closeHoursBreakdown = () => {
    setHoursBreakdownEmployee(null);
    setIsHoursBreakdownOpen(false);
    setHoursBreakdownData(null);
  };

  // Calculate taxes for an employee (placeholder - will implement full logic later)
  const calculateTaxes = (employee, grossEarnings) => {
    const payRate = parseDecimal(employee.payrollDetails?.payRate);
    const empHours = hoursData[employee.id] || {};
    
    // Taxable gross (may differ based on pre-tax deductions)
    const taxableGross = grossEarnings;
    
    // FICA (Social Security): 6.2% up to wage base ($168,600 for 2024)
    const ficaRate = 0.062;
    const ficaWageBase = 168600;
    const fica = round2(Math.min(taxableGross, ficaWageBase) * ficaRate);
    
    // Medicare: 1.45% (no wage base limit)
    const medicareRate = 0.0145;
    const medicare = round2(taxableGross * medicareRate);
    
    // SDI (CA State Disability Insurance): ~1.1%
    const sdiRate = 0.011;
    const sdi = round2(taxableGross * sdiRate);
    
    // Federal Income Tax (simplified - will use IRS 15-T tables later)
    // For now, using a simplified progressive estimate
    const federalTax = round2(taxableGross * 0.12); // Placeholder 12%
    
    // State Income Tax (CA - simplified)
    // Will implement CA withholding tables later
    const stateTax = round2(taxableGross * 0.05); // Placeholder 5%
    
    // CalSavers (if enabled for employee)
    const calSaversRate = employee.payrollDetails?.withCalSavers ? 0.05 : 0;
    const calSavers = round2(taxableGross * calSaversRate);
    
    return {
      fica,
      medicare,
      sdi,
      federalTax,
      stateTax,
      calSavers,
      totalTaxes: round2(fica + medicare + sdi + federalTax + stateTax + calSavers),
    };
  };

  const handleReset = () => {
    // Re-initialize all payroll data
    const resetPayrollData = {};
    const resetHoursData = {};

    employees.forEach((emp) => {
      const earnings = {};
      earningTypes.forEach((et) => {
        if (et.calculationType === 'flat' && et.code === 'salary' && emp.payrollDetails.payType === 'salary') {
          earnings[et.id] = emp.payrollDetails.payRate.toString();
        } else {
          earnings[et.id] = '';
        }
      });

      const deductions = {};
      deductionTypes.forEach((dt) => {
        deductions[dt.id] = '';
      });

      resetPayrollData[emp.id] = { earnings, deductions };
      resetHoursData[emp.id] = {
        regularHours: 0,
        overtimeHours: 0,
        isFinalClock: false,
      };
    });

    setPayrollData(resetPayrollData);
    setHoursData(resetHoursData);
    setHoursDataLoaded(false);
    toast.success('Payroll data reset successfully');
  };

  const handleProcess = () => {
    // Check for employees without pay rates
    const employeesWithoutPayRate = employees.filter(
      emp => !emp.payrollDetails?.payRate || parseFloat(emp.payrollDetails?.payRate) <= 0
    );

    if (employeesWithoutPayRate.length > 0) {
      const names = employeesWithoutPayRate.map(emp => emp.name).join(', ');
      toast.error(`Cannot process: ${employeesWithoutPayRate.length} employee(s) missing pay rate: ${names}`);
      console.error('❌ PROCESSING BLOCKED - Employees without pay rates:', names);
      return;
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    PAYROLL PROCESSING RESULTS                   ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📅 Pay Period:', dateRange.payFrom, 'to', dateRange.payTo);
    console.log('📝 Starting Check Number:', checkNumber);
    console.log('\n');

    let grandTotalGross = 0;
    let grandTotalDeductions = 0;
    let grandTotalNet = 0;
    const warnings = [];
    const processedEmployees = [];

    employees.forEach((emp) => {
      const calculated = calculateRowValues(emp);
      const empHours = hoursData[emp.id] || {};

      // Skip employees with no earnings
      if (calculated.grossEarnings === 0) {
        warnings.push({
          employee: emp.name,
          type: 'NO_EARNINGS',
          message: 'No earnings entered',
        });
        return;
      }

      console.log('───────────────────────────────────────────────────────────────');
      console.log(`👤 ${emp.name} (${emp.payrollDetails.payType.toUpperCase()})`);
      console.log(`   Position: ${emp.position}`);
      console.log(`   Pay Rate: ${formatCurrency(emp.payrollDetails.payRate)}`);
      console.log('');

      // Log earnings
      console.log('   📈 EARNINGS:');
      earningTypes.forEach((et) => {
        const value = calculated.earningsBreakdown[et.id];
        if (value > 0) {
          let detail = '';
          if (et.calculationType === 'hourly' && et.code === 'regular_hours') {
            detail = ` (${empHours.regularHours} hrs × ${formatCurrency(emp.payrollDetails.payRate)})`;
          } else if (et.calculationType === 'hourly_ot') {
            detail = ` (${empHours.overtimeHours} hrs × ${formatCurrency(emp.payrollDetails.payRate)} × ${et.otMultiplier})`;
          } else if (et.calculationType === 'custom_rate') {
            const rate = emp.earningRates[et.id] || 0;
            detail = ` (units × ${formatCurrency(rate)})`;
          }
          console.log(`      • ${et.label}: ${formatCurrency(value)}${detail}`);
        }
      });
      console.log(`      ────────────────────────────`);
      console.log(`      GROSS EARNINGS: ${formatCurrency(calculated.grossEarnings)}`);
      console.log('');

      // Log deductions
      if (calculated.totalDeductions > 0) {
        console.log('   📉 DEDUCTIONS:');
        deductionTypes.forEach((dt) => {
          const value = calculated.deductionsBreakdown[dt.id];
          if (value > 0) {
            console.log(`      • ${dt.label}: ${formatCurrency(value)}`);
          }
        });
        console.log(`      ────────────────────────────`);
        console.log(`      TOTAL DEDUCTIONS: ${formatCurrency(calculated.totalDeductions)}`);
        console.log('');
      }

      // Net pay
      const netPayStyle = calculated.isNegative ? '⚠️ ' : '✅ ';
      console.log(`   ${netPayStyle}NET PAY: ${formatCurrency(calculated.netPay)}`);

      if (calculated.isNegative) {
        warnings.push({
          employee: emp.name,
          type: 'NEGATIVE_NET',
          message: `Negative net pay: ${formatCurrency(calculated.netPay)}`,
        });
      }

      grandTotalGross += calculated.grossEarnings;
      grandTotalDeductions += calculated.totalDeductions;
      grandTotalNet += calculated.netPay;

      processedEmployees.push({
        id: emp.id,
        name: emp.name,
        payType: emp.payrollDetails.payType,
        ...calculated,
      });
    });

    // Summary
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         GRAND TOTALS                           ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Total Gross Earnings:  ${formatCurrency(grandTotalGross)}`);
    console.log(`   Total Deductions:      ${formatCurrency(grandTotalDeductions)}`);
    console.log(`   Total Net Pay:         ${formatCurrency(grandTotalNet)}`);
    console.log(`   Employees Processed:   ${processedEmployees.length}`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Warnings
    if (warnings.length > 0) {
      console.log('\n');
      console.log('⚠️  WARNINGS:');
      warnings.forEach((w) => {
        console.log(`   • ${w.employee}: ${w.message}`);
      });
      toast.error(`${warnings.length} warning(s) detected! Check console for details.`);
    } else {
      toast.success(`Payroll processed successfully! ${processedEmployees.length} employees.`);
    }

    // Log raw data for debugging
    console.log('\n');
    console.log('📊 RAW DATA (for API integration):');
    console.log({
      payPeriod: dateRange,
      checkNumber,
      employees: processedEmployees,
      totals: {
        grossEarnings: round2(grandTotalGross),
        totalDeductions: round2(grandTotalDeductions),
        netPay: round2(grandTotalNet),
      },
    });
  };

  // ==================== RENDER HELPERS ====================

  /**
   * Determine if a column should be disabled for an employee
   */
  const isColumnDisabled = (employee, earningType) => {
    const payType = employee.payrollDetails?.payType;

    // Salary employees: disable hours-based columns
    if (payType === 'salary') {
      if (['hourly', 'hourly_ot'].includes(earningType.calculationType)) {
        return true;
      }
    }

    // Hours from timekeeping are locked when data is loaded
    if (earningType.code === 'regular_hours' || earningType.code === 'overtime') {
      const empHours = hoursData[employee.id];
      if (hoursDataLoaded && empHours?.isFinalClock) {
        return true;
      }
    }

    return false;
  };

  /**
   * Get input value for an earning type
   */
  const getEarningInputValue = (employee, earningType) => {
    const empPayroll = payrollData[employee.id] || { earnings: {} };
    const empHours = hoursData[employee.id] || {};

    // For locked hours, show the hours data
    if (hoursDataLoaded) {
      if (earningType.code === 'regular_hours' && empHours.isFinalClock) {
        return empHours.regularHours?.toString() || '0';
      }
      if (earningType.code === 'overtime' && empHours.isFinalClock) {
        return empHours.overtimeHours?.toString() || '0';
      }
    }

    return empPayroll.earnings[earningType.id] || '';
  };

  /**
   * Get placeholder text for earning input
   */
  const getEarningPlaceholder = (earningType) => {
    switch (earningType.calculationType) {
      case 'flat':
        return '0.00';
      case 'hourly':
      case 'hourly_ot':
        return 'Hours';
      case 'custom_rate':
        return 'Units';
      default:
        return '0.00';
    }
  };

  // ==================== LOADING & ERROR STATES ====================

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-orange-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
      </div>
      <span className="ml-4 text-gray-600 font-medium">Loading payroll data...</span>
    </div>
  );

  const ErrorMessage = () => (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading payroll data</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchPayrollData}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== HOURS TOOLTIP COMPONENT ====================

  const HoursTooltip = ({ empHours, children }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!empHours || !hoursDataLoaded) return children;

    return (
      <div 
        className="relative inline-block"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg py-3 px-4 shadow-xl min-w-[220px]">
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
              
              {/* Header */}
              <div className="font-semibold text-orange-400 mb-2 pb-2 border-b border-gray-700">
                Hours Breakdown
              </div>
              
              {/* Stats Grid */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">📅 Days Worked:</span>
                  <span className="font-medium">{empHours.daysWorked || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">⏰ Scheduled:</span>
                  <span className="font-medium">{(empHours.totalScheduledHours || 0).toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🕐 Raw Clocked:</span>
                  <span className="font-medium">{(empHours.totalRawClockedHours || 0).toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">☕ Break Deductions:</span>
                  <span className="font-medium">{(empHours.totalBreakDeductions || 0).toFixed(2)} hrs</span>
                </div>
              </div>
              
              {/* Attendance Issues */}
              {(empHours.tardyCount > 0 || empHours.undertimeCount > 0 || empHours.daysWithNoSchedule > 0) && (
                <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                  {empHours.tardyCount > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>⚠️ Tardy:</span>
                      <span>{empHours.tardyCount}x ({empHours.tardyMinutes} min)</span>
                    </div>
                  )}
                  {empHours.undertimeCount > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>⚠️ Undertime:</span>
                      <span>{empHours.undertimeCount}x ({empHours.undertimeMinutes} min)</span>
                    </div>
                  )}
                  {empHours.daysWithNoSchedule > 0 && (
                    <div className="flex justify-between text-blue-400">
                      <span>📋 No Schedule:</span>
                      <span>{empHours.daysWithNoSchedule} day(s)</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Click hint */}
              <div className="mt-2 pt-2 border-t border-gray-700 text-center text-gray-500 text-[10px]">
                Click ℹ️ for daily breakdown
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== HOURS BREAKDOWN MODAL ====================

  const HoursBreakdownModal = () => {
    if (!isHoursBreakdownOpen || !hoursBreakdownEmployee) return null;

    const employee = hoursBreakdownEmployee;
    const empHours = hoursData[employee.id] || {};

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeHoursBreakdown}
        ></div>
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{employee.name} - Hours Breakdown</h3>
                  <p className="text-sm text-blue-100">
                    {dateRange.payFrom} to {dateRange.payTo}
                  </p>
                </div>
              </div>
              <button
                onClick={closeHoursBreakdown}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="bg-gray-50 px-6 py-4 border-b grid grid-cols-5 gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Regular Hours</p>
              <p className="text-lg font-bold text-green-600">{(empHours.regularHours || 0).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Overtime</p>
              <p className="text-lg font-bold text-orange-600">{(empHours.overtimeHours || 0).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Days Worked</p>
              <p className="text-lg font-bold text-blue-600">{empHours.daysWorked || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Tardy</p>
              <p className={`text-lg font-bold ${empHours.tardyCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {empHours.tardyCount || 0}x
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Undertime</p>
              <p className={`text-lg font-bold ${empHours.undertimeCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {empHours.undertimeCount || 0}x
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {hoursBreakdownLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
                  <span className="text-gray-600">Loading daily breakdown...</span>
                </div>
              </div>
            ) : hoursBreakdownData ? (
              <div className="space-y-4">
                {/* Daily Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Day</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Scheduled</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Regular</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">OT</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {hoursBreakdownData.dailyBreakdown && hoursBreakdownData.dailyBreakdown.length > 0 ? (
                        hoursBreakdownData.dailyBreakdown.map((day, index) => (
                          <tr 
                            key={day.date} 
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/50 transition-colors`}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{day.date}</td>
                            <td className="px-4 py-3 text-gray-600">{day.dayOfWeek}</td>
                            <td className="px-4 py-3 text-center">
                              {day.noSchedule ? (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">No Schedule</span>
                              ) : (
                                <span>{day.scheduledHours?.toFixed(2) || '0.00'} hrs</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-green-600">
                              {day.regularHours?.toFixed(2) || '0.00'} hrs
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-orange-600">
                              {day.approvedOTHours > 0 ? `${day.approvedOTHours.toFixed(2)} hrs` : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {day.status === 'no_log' ? (
                                  <span className="text-xs text-gray-400">No Clock</span>
                                ) : day.status === 'active' ? (
                                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Active</span>
                                ) : (
                                  <>
                                    {day.attendance?.isTardy && (
                                      <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded" title={`${day.attendance.tardyMinutes} min late`}>
                                        Tardy {day.attendance.tardyMinutes}m
                                      </span>
                                    )}
                                    {day.attendance?.isUndertime && (
                                      <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded" title={`${day.attendance.undertimeMinutes} min early`}>
                                        Under {day.attendance.undertimeMinutes}m
                                      </span>
                                    )}
                                    {!day.attendance?.isTardy && !day.attendance?.isUndertime && day.status === 'completed' && (
                                      <span className="text-xs text-green-600">✓ OK</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No clock data found for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                {hoursBreakdownData.summary && (
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="text-xs font-semibold text-green-800 uppercase mb-2">Hours Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Regular:</span>
                          <span className="font-semibold text-green-700">{hoursBreakdownData.summary.regularHours?.toFixed(2)} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Approved OT:</span>
                          <span className="font-semibold text-orange-700">{hoursBreakdownData.summary.approvedOvertimeHours?.toFixed(2)} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending OT:</span>
                          <span className="font-semibold text-yellow-700">{hoursBreakdownData.summary.pendingOvertimeHours?.toFixed(2)} hrs</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-xs font-semibold text-blue-800 uppercase mb-2">Raw Data</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Raw Clocked:</span>
                          <span className="font-semibold">{hoursBreakdownData.summary.totalRawClockedHours?.toFixed(2)} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scheduled:</span>
                          <span className="font-semibold">{hoursBreakdownData.summary.totalScheduledHours?.toFixed(2)} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Break Deductions:</span>
                          <span className="font-semibold text-red-600">-{hoursBreakdownData.summary.totalBreakDeductions?.toFixed(2)} hrs</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h4 className="text-xs font-semibold text-yellow-800 uppercase mb-2">Attendance</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Worked:</span>
                          <span className="font-semibold">{hoursBreakdownData.summary.daysWorked}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tardy:</span>
                          <span className={`font-semibold ${hoursBreakdownData.summary.tardyCount > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
                            {hoursBreakdownData.summary.tardyCount}x ({hoursBreakdownData.summary.tardyMinutes} min)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Undertime:</span>
                          <span className={`font-semibold ${hoursBreakdownData.summary.undertimeCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                            {hoursBreakdownData.summary.undertimeCount}x ({hoursBreakdownData.summary.undertimeMinutes} min)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-6 py-3 rounded-b-xl flex justify-end flex-shrink-0">
            <button
              onClick={closeHoursBreakdown}
              className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== TRANSFER LOADING MODAL ====================

  const TransferLoadingModal = () => {
    if (!transferLoading) return null;

    const progressPercent = transferProgress.total > 0 
      ? Math.round((transferProgress.current / transferProgress.total) * 100) 
      : 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 transform transition-all">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Importing Clock Hours</h3>
            <p className="text-sm text-gray-500 mt-1">
              {dateRange.payFrom} to {dateRange.payTo}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{transferProgress.current} of {transferProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Current Employee */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              {transferProgress.status === 'done' ? (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {transferProgress.status === 'fetching' && 'Fetching data...'}
                  {transferProgress.status === 'processing' && 'Processing employee'}
                  {transferProgress.status === 'done' && 'Complete!'}
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {transferProgress.employeeName}
                </p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Please wait while we fetch clock hours from the timekeeping system...
          </p>
        </div>
      </div>
    );
  };

  // ==================== EMPLOYEE DETAIL MODAL ====================

  const EmployeeDetailModal = () => {
    if (!isDetailModalOpen || !selectedEmployee) return null;

    const employee = selectedEmployee;
    const calculated = calculateRowValues(employee);
    const empHours = hoursData[employee.id] || {};
    const taxes = calculateTaxes(employee, calculated.grossEarnings);
    const isSalary = employee.payrollDetails?.payType === 'salary';

    // Get employee check number (incremented based on position)
    const employeeIndex = employees.findIndex(e => e.id === employee.id);
    const employeeCheckNumber = parseInt(checkNumber) + employeeIndex;

    // Calculate Net Pay after taxes
    const netPayAfterTaxes = round2(calculated.netPay - taxes.totalTaxes);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeEmployeeDetail}
        ></div>
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{employee.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-orange-100">{employee.position || 'No position'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isSalary ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isSalary ? 'SALARY' : 'HOURLY'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeEmployeeDetail}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Pay Period Info Bar */}
          <div className="bg-gray-50 px-6 py-3 border-b grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Pay Date</label>
              <p className="text-sm font-semibold text-gray-900">{payDate}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Pay From</label>
              <p className="text-sm font-semibold text-gray-900">{dateRange.payFrom}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Pay To</label>
              <p className="text-sm font-semibold text-gray-900">{dateRange.payTo}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Check Number</label>
              <p className="text-sm font-semibold text-gray-900">#{employeeCheckNumber}</p>
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="p-6 grid grid-cols-3 gap-6">
            {/* LEFT COLUMN: Earnings */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Earnings
              </h4>
              
              <div className="space-y-3">
                {earningTypes.filter(et => et.enabled !== false).map((et) => {
                  const value = calculated.earningsBreakdown[et.id] || 0;
                  const inputValue = getEarningInputValue(employee, et);
                  const isHoursType = ['hourly', 'hourly_ot'].includes(et.calculationType);
                  
                  return (
                    <div key={et.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">{et.label}</span>
                        {isHoursType && inputValue && parseFloat(inputValue) > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({inputValue} hrs)
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${value > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                        {formatCurrency(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Gross Pay Total */}
              <div className="mt-4 pt-4 border-t border-green-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-800">GROSS PAY</span>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(calculated.grossEarnings)}
                  </span>
                </div>
              </div>
            </div>

            {/* MIDDLE COLUMN: Taxes */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
                Taxes
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-700">Federal Income Tax</span>
                    <span className="text-xs text-gray-400 ml-1">(Est.)</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(taxes.federalTax)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-700">State Income Tax</span>
                    <span className="text-xs text-gray-400 ml-1">(CA)</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(taxes.stateTax)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-700">FICA</span>
                    <span className="text-xs text-gray-400 ml-1">(6.2%)</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(taxes.fica)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-700">Medicare</span>
                    <span className="text-xs text-gray-400 ml-1">(1.45%)</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(taxes.medicare)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-700">SDI</span>
                    <span className="text-xs text-gray-400 ml-1">(1.1%)</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(taxes.sdi)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-700">CalSavers</span>
                    {employee.payrollDetails?.withCalSavers ? (
                      <span className="text-xs text-green-500 ml-1">(Enrolled)</span>
                    ) : (
                      <span className="text-xs text-gray-400 ml-1">(Not enrolled)</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(taxes.calSavers)}
                  </span>
                </div>
              </div>
              
              {/* Total Taxes */}
              <div className="mt-4 pt-4 border-t border-blue-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-800">TOTAL TAXES</span>
                  <span className="text-lg font-bold text-blue-700">
                    {formatCurrency(taxes.totalTaxes)}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Deductions */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Deductions
              </h4>
              
              <div className="space-y-3">
                {deductionTypes.filter(dt => dt.enabled !== false).map((dt) => {
                  const value = calculated.deductionsBreakdown[dt.id] || 0;
                  
                  return (
                    <div key={dt.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-700">{dt.label}</span>
                        <span className={`text-xs ml-1 ${dt.isPreTax ? 'text-green-500' : 'text-gray-400'}`}>
                          ({dt.isPreTax ? 'Pre-Tax' : 'Post-Tax'})
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ${value > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                        {formatCurrency(value)}
                      </span>
                    </div>
                  );
                })}
                
                {deductionTypes.filter(dt => dt.enabled !== false).length === 0 && (
                  <p className="text-sm text-gray-500 italic">No deductions configured</p>
                )}
              </div>
              
              {/* Total Deductions */}
              <div className="mt-4 pt-4 border-t border-red-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-red-800">TOTAL DEDUCTIONS</span>
                  <span className="text-lg font-bold text-red-700">
                    {formatCurrency(calculated.totalDeductions)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Net Pay Summary */}
          <div className="bg-gray-900 text-white px-6 py-4 rounded-b-xl">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase">Gross Earnings</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(calculated.grossEarnings)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase">Total Taxes + Deductions</p>
                <p className="text-lg font-bold text-red-400">
                  - {formatCurrency(taxes.totalTaxes + calculated.totalDeductions)}
                </p>
              </div>
              <div className="text-center bg-white/10 rounded-lg py-2">
                <p className="text-xs text-gray-300 uppercase">Net Pay</p>
                <p className={`text-2xl font-bold ${netPayAfterTaxes < 0 ? 'text-red-400' : 'text-white'}`}>
                  {formatCurrency(netPayAfterTaxes)}
                  {netPayAfterTaxes < 0 && <span className="ml-1">⚠️</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER CREATE PAYCHECK TAB ====================

  const renderCreatePaycheckTab = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return <ErrorMessage />;
    }

    if (employees.length === 0) {
      return (
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800 font-medium">No employees found</p>
            <p className="text-sm text-yellow-600 mt-1">Please add employees to your company first.</p>
          </div>
        </div>
      );
    }

    if (earningTypes.length === 0) {
      return (
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800 font-medium">No earning types configured</p>
            <p className="text-sm text-yellow-600 mt-1">Please configure earning types in the Company tab first.</p>
          </div>
        </div>
      );
    }

    // Filter to only enabled types
    const enabledEarningTypes = earningTypes.filter((et) => et.enabled !== false);
    const enabledDeductionTypes = deductionTypes.filter((dt) => dt.enabled !== false);

    return (
      <>
        <Toaster position="top-right" richColors />
        <TransferLoadingModal />
        <EmployeeDetailModal />
        <HoursBreakdownModal />

        {/* Data Status Notice */}
        <div className="px-6 pt-4">
          <div className={`border rounded-lg p-3 flex items-start gap-2 ${
            hoursDataLoaded 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <svg className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              hoursDataLoaded ? 'text-green-500' : 'text-blue-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              {hoursDataLoaded ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              )}
            </svg>
            <div>
              <p className={`text-sm ${hoursDataLoaded ? 'text-green-800' : 'text-blue-800'}`}>
                {hoursDataLoaded ? (
                  <>
                    <span className="font-medium">✓ Clock hours imported successfully!</span>
                    {' '}Hours data has been loaded from the timekeeping system. Grayed-out fields are locked.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Note:</span> Click the <strong>Transfer</strong> button to import clock hours 
                    from the timekeeping system for the selected pay period.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Alert for Employees Without Pay Rates */}
        {(() => {
          const employeesWithoutPayRate = employees.filter(
            emp => !emp.payrollDetails?.payRate || parseFloat(emp.payrollDetails?.payRate) <= 0
          );
          
          if (employeesWithoutPayRate.length === 0) return null;
          
          return (
            <div className="px-6 pt-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <svg className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800">
                    <span className="font-medium">⚠️ {employeesWithoutPayRate.length} employee(s) missing pay rate:</span>
                    {' '}
                    <span className="text-red-600">
                      {employeesWithoutPayRate.map(emp => emp.name).join(', ')}
                    </span>
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Please configure their pay rate in the Employee tab before processing payroll.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Date and Transfer */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Date
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay From
              </label>
              <input
                type="date"
                value={dateRange.payFrom}
                onChange={(e) => setDateRange((prev) => ({ ...prev, payFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay To
              </label>
              <input
                type="date"
                value={dateRange.payTo}
                onChange={(e) => setDateRange((prev) => ({ ...prev, payTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Number
              </label>
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={handleTransfer}
              disabled={transferLoading || !dateRange.payFrom || !dateRange.payTo}
              className={`px-6 py-2.5 font-medium rounded-md transition-colors duration-200 flex items-center justify-center gap-2 ${
                transferLoading || !dateRange.payFrom || !dateRange.payTo
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {transferLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Transferring...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Transfer
                </>
              )}
            </button>
            {hoursDataLoaded && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Hours loaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Payroll Table */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    {/* Employee Name - Sticky */}
                    <th className="sticky left-0 z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[180px]">
                      Employee Name
                    </th>

                    {/* Dynamic Earning Columns */}
                    {enabledEarningTypes.map((et) => (
                      <th
                        key={`earning-${et.id}`}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]"
                      >
                        <div className="flex flex-col">
                          <span>{et.label}</span>
                          <span className="text-[10px] font-normal text-gray-400 capitalize">
                            ({et.calculationType.replace('_', ' ')})
                          </span>
                        </div>
                      </th>
                    ))}

                    {/* Dynamic Deduction Columns */}
                    {enabledDeductionTypes.map((dt) => (
                      <th
                        key={`deduction-${dt.id}`}
                        className="px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider bg-red-50 min-w-[100px]"
                      >
                        <div className="flex flex-col">
                          <span>{dt.label}</span>
                          <span className="text-[10px] font-normal text-red-400">
                            ({dt.isPreTax ? 'Pre-Tax' : 'Post-Tax'})
                          </span>
                        </div>
                      </th>
                    ))}

                    {/* Calculated Columns */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50 min-w-[110px]">
                      Gross Pay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider bg-red-50 min-w-[110px]">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-50 min-w-[110px]">
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee, index) => {
                    const calculated = calculateRowValues(employee);
                    const isSalary = employee.payrollDetails?.payType === 'salary';
                    const empHours = hoursData[employee.id] || {};
                    const hasNoPayRate = !employee.payrollDetails?.payRate || parseFloat(employee.payrollDetails?.payRate) <= 0;

                    return (
                      <tr
                        key={employee.id}
                        className={`
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} 
                          hover:bg-orange-50/30 transition-colors
                          ${hasNoPayRate ? 'bg-red-50/50 border-l-4 border-l-red-400' : ''}
                        `}
                      >
                        {/* Employee Name - Sticky */}
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-3 whitespace-nowrap border-r border-gray-200">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {employee.name}
                              </span>
                              {/* Info icon - appears after transfer */}
                              {hoursDataLoaded && (
                                <button
                                  onClick={() => openEmployeeDetail(employee)}
                                  className="group relative p-1 hover:bg-orange-100 rounded-full transition-colors"
                                  title="View payroll details"
                                >
                                  <svg 
                                    className="w-4 h-4 text-orange-500 hover:text-orange-600" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth={2} 
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                                    />
                                  </svg>
                                  {/* Tooltip */}
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    View Details
                                  </span>
                                </button>
                              )}
                              {/* Warning icon for missing pay rate */}
                              {(!employee.payrollDetails?.payRate || parseFloat(employee.payrollDetails?.payRate) <= 0) && (
                                <div className="group relative">
                                  <svg 
                                    className="w-4 h-4 text-red-500" 
                                    fill="currentColor" 
                                    viewBox="0 0 20 20"
                                  >
                                    <path 
                                      fillRule="evenodd" 
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                                      clipRule="evenodd" 
                                    />
                                  </svg>
                                  {/* Tooltip */}
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                                    No pay rate configured
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">{employee.position || 'No position'}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  isSalary
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {isSalary ? 'SALARY' : 'HOURLY'}
                              </span>
                              {/* Missing pay rate badge */}
                              {(!employee.payrollDetails?.payRate || parseFloat(employee.payrollDetails?.payRate) <= 0) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
                                  NO RATE
                                </span>
                              )}
                              {/* Warning badges */}
                              {empHours.hasActiveClockIn && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-100 text-yellow-700">
                                  ACTIVE
                                </span>
                              )}
                              {empHours.hasPendingOT && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-100 text-orange-700">
                                  OT PENDING
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Dynamic Earning Inputs */}
                        {enabledEarningTypes.map((et) => {
                          const isDisabled = isColumnDisabled(employee, et);
                          const inputValue = getEarningInputValue(employee, et);
                          const calculatedValue = calculated.earningsBreakdown[et.id] || 0;
                          const isHoursField = ['hourly', 'hourly_ot', 'custom_rate'].includes(et.calculationType);
                          
                          // Check if this is a transferred hours field
                          const isTransferredHours = hoursDataLoaded && 
                            ((et.code === 'regular_hours' && empHours.isFinalClock) ||
                             (et.code === 'overtime' && empHours.isFinalClock));

                          return (
                            <td key={`earning-${et.id}`} className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {/* Show hours display for transferred data */}
                                {isTransferredHours ? (
                                  <div className="flex items-center gap-2">
                                    <HoursTooltip empHours={empHours}>
                                      <div className="flex flex-col items-end cursor-default">
                                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                          <span className="text-sm font-semibold text-gray-700">
                                            {parseFloat(inputValue || 0).toFixed(2)}
                                          </span>
                                          <span className="text-xs text-gray-500">hrs</span>
                                        </div>
                                        {calculatedValue > 0 && (
                                          <span className="text-[10px] text-green-600 mt-1">
                                            = {formatCurrency(calculatedValue)}
                                          </span>
                                        )}
                                      </div>
                                    </HoursTooltip>
                                    {/* Info icon for hours breakdown - only on regular hours */}
                                    {et.code === 'regular_hours' && (
                                      <button
                                        onClick={() => openHoursBreakdown(employee)}
                                        className="group relative p-1 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
                                        title="View hours breakdown"
                                      >
                                        <svg 
                                          className="w-4 h-4 text-blue-500 hover:text-blue-600" 
                                          fill="none" 
                                          stroke="currentColor" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                                          />
                                        </svg>
                                        {/* Tooltip */}
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                          Daily Breakdown
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => handleEarningChange(employee.id, et.id, e.target.value)}
                                        disabled={isDisabled}
                                        placeholder={getEarningPlaceholder(et)}
                                        className={`w-20 px-2 py-1 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                                          isDisabled
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                                            : 'border-gray-300'
                                        }`}
                                      />
                                      {/* Show "hrs" suffix for hours-based inputs */}
                                      {isHoursField && inputValue && (
                                        <span className="text-xs text-gray-400">hrs</span>
                                      )}
                                    </div>
                                    {/* Show calculated value for non-flat types */}
                                    {et.calculationType !== 'flat' && calculatedValue > 0 && (
                                      <span className="text-[10px] text-green-600 text-right">
                                        = {formatCurrency(calculatedValue)}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Dynamic Deduction Inputs */}
                        {enabledDeductionTypes.map((dt) => (
                          <td key={`deduction-${dt.id}`} className="px-3 py-3 whitespace-nowrap bg-red-50/30">
                            <input
                              type="text"
                              value={payrollData[employee.id]?.deductions[dt.id] || ''}
                              onChange={(e) => handleDeductionChange(employee.id, dt.id, e.target.value)}
                              placeholder="0.00"
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                        ))}

                        {/* Gross Pay */}
                        <td className="px-4 py-3 whitespace-nowrap bg-green-50">
                          <div className="text-sm font-semibold text-green-700 text-right">
                            {formatCurrency(calculated.grossEarnings)}
                          </div>
                        </td>

                        {/* Total Deductions */}
                        <td className="px-4 py-3 whitespace-nowrap bg-red-50">
                          <div className="text-sm font-semibold text-red-700 text-right">
                            {formatCurrency(calculated.totalDeductions)}
                          </div>
                        </td>

                        {/* Net Pay */}
                        <td className="px-4 py-3 whitespace-nowrap bg-blue-50">
                          <div
                            className={`text-sm font-bold text-right ${
                              calculated.isNegative ? 'text-red-600' : 'text-blue-700'
                            }`}
                          >
                            {formatCurrency(calculated.netPay)}
                            {calculated.isNegative && <span className="ml-1">⚠️</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  {hoursDataLoaded && (
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                      {/* Employee Name - Sticky */}
                      <td className="sticky left-0 z-10 bg-gray-100 px-4 py-3 whitespace-nowrap border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-bold text-gray-700">TOTALS</span>
                          <span className="text-xs text-gray-500">({employees.length} employees)</span>
                        </div>
                      </td>

                      {/* Earning Totals */}
                      {enabledEarningTypes.map((et) => {
                        // Calculate total hours for this earning type
                        let totalValue = 0;
                        let totalHours = 0;
                        
                        employees.forEach((emp) => {
                          const empCalc = calculateRowValues(emp);
                          const empHours = hoursData[emp.id] || {};
                          totalValue += empCalc.earningsBreakdown[et.id] || 0;
                          
                          // Sum up hours for hourly types
                          if (et.code === 'regular_hours') {
                            totalHours += empHours.regularHours || 0;
                          } else if (et.code === 'overtime') {
                            totalHours += empHours.overtimeHours || 0;
                          }
                        });

                        const isHoursType = ['hourly', 'hourly_ot'].includes(et.calculationType) && 
                          (et.code === 'regular_hours' || et.code === 'overtime');

                        return (
                          <td key={`total-earning-${et.id}`} className="px-3 py-3 whitespace-nowrap bg-gray-100">
                            <div className="flex flex-col items-end">
                              {isHoursType && totalHours > 0 ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-gray-700">
                                      {totalHours.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-gray-500">hrs</span>
                                  </div>
                                  <span className="text-[10px] text-green-600 font-semibold">
                                    = {formatCurrency(totalValue)}
                                  </span>
                                </>
                              ) : totalValue > 0 ? (
                                <span className="text-sm font-bold text-gray-700">
                                  {formatCurrency(totalValue)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Deduction Totals */}
                      {enabledDeductionTypes.map((dt) => {
                        let totalDeduction = 0;
                        employees.forEach((emp) => {
                          const empCalc = calculateRowValues(emp);
                          totalDeduction += empCalc.deductionsBreakdown[dt.id] || 0;
                        });

                        return (
                          <td key={`total-deduction-${dt.id}`} className="px-3 py-3 whitespace-nowrap bg-red-100/50">
                            <div className="text-sm font-bold text-red-700 text-right">
                              {totalDeduction > 0 ? formatCurrency(totalDeduction) : '—'}
                            </div>
                          </td>
                        );
                      })}

                      {/* Grand Totals */}
                      {(() => {
                        let grandGross = 0;
                        let grandDeductions = 0;
                        let grandNet = 0;

                        employees.forEach((emp) => {
                          const empCalc = calculateRowValues(emp);
                          grandGross += empCalc.grossEarnings;
                          grandDeductions += empCalc.totalDeductions;
                          grandNet += empCalc.netPay;
                        });

                        return (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap bg-green-100">
                              <div className="text-sm font-bold text-green-700 text-right">
                                {formatCurrency(grandGross)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap bg-red-100">
                              <div className="text-sm font-bold text-red-700 text-right">
                                {formatCurrency(grandDeductions)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap bg-blue-100">
                              <div className="text-sm font-bold text-blue-700 text-right">
                                {formatCurrency(grandNet)}
                              </div>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-4">
          <button
            onClick={handleReset}
            className="px-8 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors duration-200"
          >
            RESET
          </button>
          <button
            onClick={handleProcess}
            className="px-8 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors duration-200"
          >
            PROCESS
          </button>
        </div>
      </>
    );
  };

  // ==================== TAB NAVIGATION ====================

  const tabs = [
    { id: 'create-paycheck', label: 'Create Paycheck' },
    { id: 'reports', label: 'Reports' },
    { id: 'employee', label: 'Employee' },
    { id: 'company', label: 'Company' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create-paycheck':
        return renderCreatePaycheckTab();
      case 'reports':
        return <Reports />;
      case 'employee':
        return <Employee />;
      case 'company':
        return <Company />;
      default:
        return renderCreatePaycheckTab();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header with Tabs */}
        <div className="border-b">
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Payroll Management</h1>
          </div>

          {/* Tab Navigation */}
          <div className="px-6">
            <nav className="flex space-x-8 border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Payroll;