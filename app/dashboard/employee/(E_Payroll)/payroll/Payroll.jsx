'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Reports from './Reports';
import Employee from './Employee';
import Company from './Company';
import useAuthStore from "@/store/useAuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Payroll = () => {
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('create-paycheck');

  // Employee data from API
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [payrollData, setPayrollData] = useState({});

  const [dateRange, setDateRange] = useState({
    payFrom: '10/15/2025',
    payTo: '10/28/2025',
  });

  const [checkNumber, setCheckNumber] = useState('6366');

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const fetchEmployees = async () => {
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/test/payroll-system/get-employees-list`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch employees');
      }

      if (data.success) {
        setEmployees(data.data.employees);
        
        // Initialize payroll data for all employees
        const initialPayrollData = data.data.employees.reduce((acc, emp) => {
          acc[emp.id] = {
            salary: '0.00',
            hours: '0.00',
            otHours: '0.00',
            driversAidesWages: '0.00',
            trainingSeminar: '0.00',
            pto: '0.00',
            employeeBenefits: '0.00',
            employeeAdvances: '0.00',
            officerAdvances: '0.00',
            garnishment: '0.00',
          };
          return acc;
        }, {});
        
        setPayrollData(initialPayrollData);
      } else {
        throw new Error(data.message || 'Failed to fetch employees');
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // ==================== COMPUTATION FUNCTIONS ====================
  
  /**
   * Parse input value to float, handling empty strings and invalid numbers
   */
  const parseDecimal = (value) => {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Round to 2 decimal places
   */
  const round2 = (num) => {
    return Math.round(num * 100) / 100;
  };

  /**
   * Format number as currency
   */
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  /**
   * Calculate real-time values for a single employee row
   */
  const calculateRowValues = (employee, payrollInput) => {
    const hourlyRate = parseDecimal(employee.hourlyRate);
    
    // Parse all inputs
    const salary = parseDecimal(payrollInput.salary);
    const hours = parseDecimal(payrollInput.hours);
    const otHours = parseDecimal(payrollInput.otHours);
    const driversAidesWages = parseDecimal(payrollInput.driversAidesWages);
    const trainingSeminar = parseDecimal(payrollInput.trainingSeminar);
    const pto = parseDecimal(payrollInput.pto);
    const employeeBenefits = parseDecimal(payrollInput.employeeBenefits);
    const employeeAdvances = parseDecimal(payrollInput.employeeAdvances);
    const officerAdvances = parseDecimal(payrollInput.officerAdvances);
    const garnishment = parseDecimal(payrollInput.garnishment);

    // Calculate earnings
    const regularPay = round2(hours * hourlyRate);
    const overtimePay = round2(otHours * hourlyRate * 1.5); // California OT rate

    const grossEarnings = round2(
      salary +
      regularPay +
      overtimePay +
      driversAidesWages +
      trainingSeminar +
      pto +
      employeeBenefits
    );

    // Calculate deductions
    const totalDeductions = round2(
      employeeAdvances +
      officerAdvances +
      garnishment
    );

    // Calculate net pay
    const netPay = round2(grossEarnings - totalDeductions);

    return {
      grossEarnings,
      totalDeductions,
      netPay,
      isNegative: netPay < 0,
    };
  };

  /**
   * Calculate payroll for a single employee
   */
  const calculateEmployeePayroll = (employee, payrollInput) => {
    const hourlyRate = parseDecimal(employee.hourlyRate);
    
    // Parse all inputs
    const salary = parseDecimal(payrollInput.salary);
    const hours = parseDecimal(payrollInput.hours);
    const otHours = parseDecimal(payrollInput.otHours);
    const driversAidesWages = parseDecimal(payrollInput.driversAidesWages);
    const trainingSeminar = parseDecimal(payrollInput.trainingSeminar);
    const pto = parseDecimal(payrollInput.pto);
    const employeeBenefits = parseDecimal(payrollInput.employeeBenefits);
    const employeeAdvances = parseDecimal(payrollInput.employeeAdvances);
    const officerAdvances = parseDecimal(payrollInput.officerAdvances);
    const garnishment = parseDecimal(payrollInput.garnishment);

    // Calculate earnings
    const regularPay = round2(hours * hourlyRate);
    const overtimePay = round2(otHours * hourlyRate * 1.5); // California OT rate

    const grossEarnings = round2(
      salary +
      regularPay +
      overtimePay +
      driversAidesWages +
      trainingSeminar +
      pto +
      employeeBenefits
    );

    // Calculate deductions
    const totalDeductions = round2(
      employeeAdvances +
      officerAdvances +
      garnishment
    );

    // Calculate net pay
    const netPay = round2(grossEarnings - totalDeductions);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      hourlyRate,
      
      // Breakdown
      salary,
      regularPay,
      overtimePay,
      driversAidesWages,
      trainingSeminar,
      pto,
      employeeBenefits,
      
      // Deductions
      employeeAdvances,
      officerAdvances,
      garnishment,
      
      // Totals
      grossEarnings,
      totalDeductions,
      netPay,
      
      // Warnings
      isNegative: netPay < 0,
      hasNoEarnings: grossEarnings === 0,
    };
  };

  /**
   * Calculate payroll for all employees
   */
  const calculateAllPayroll = () => {
    const results = [];
    let grandTotalGross = 0;
    let grandTotalDeductions = 0;
    let grandTotalNet = 0;

    employees.forEach((employee) => {
      // Only calculate for active employees with data
      if (employee.status === 'Active') {
        const payrollInput = payrollData[employee.id];
        if (payrollInput) {
          const calculation = calculateEmployeePayroll(employee, payrollInput);
          results.push(calculation);
          
          grandTotalGross += calculation.grossEarnings;
          grandTotalDeductions += calculation.totalDeductions;
          grandTotalNet += calculation.netPay;
        }
      }
    });

    return {
      employees: results,
      totals: {
        grossEarnings: round2(grandTotalGross),
        totalDeductions: round2(grandTotalDeductions),
        netPay: round2(grandTotalNet),
      },
      warnings: results.filter(r => r.isNegative || r.hasNoEarnings),
    };
  };

  // ==================== EVENT HANDLERS ====================

  const handleInputChange = (employeeId, field, value) => {
    setPayrollData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      },
    }));
  };

  const handleReset = () => {
    const resetData = employees.reduce((acc, emp) => {
      acc[emp.id] = {
        salary: '0.00',
        hours: '0.00',
        otHours: '0.00',
        driversAidesWages: '0.00',
        trainingSeminar: '0.00',
        pto: '0.00',
        employeeBenefits: '0.00',
        employeeAdvances: '0.00',
        officerAdvances: '0.00',
        garnishment: '0.00',
      };
      return acc;
    }, {});
    setPayrollData(resetData);
    toast.success('Payroll data reset successfully');
  };

  const handleProcess = () => {
    // Calculate all payroll
    const payrollResults = calculateAllPayroll();
    
    console.log('=== PAYROLL CALCULATION RESULTS ===');
    console.log('Date Range:', dateRange);
    console.log('Check Number:', checkNumber);
    console.log('\n--- Employee Details ---');
    
    payrollResults.employees.forEach((emp) => {
      console.log(`\n${emp.employeeName} (ID: ${emp.employeeId})`);
      console.log(`  Hourly Rate: ${formatCurrency(emp.hourlyRate)}`);
      console.log(`  Salary: ${formatCurrency(emp.salary)}`);
      console.log(`  Regular Pay: ${formatCurrency(emp.regularPay)}`);
      console.log(`  Overtime Pay: ${formatCurrency(emp.overtimePay)}`);
      console.log(`  Drivers/Aides Wages: ${formatCurrency(emp.driversAidesWages)}`);
      console.log(`  Training/Seminar: ${formatCurrency(emp.trainingSeminar)}`);
      console.log(`  PTO: ${formatCurrency(emp.pto)}`);
      console.log(`  Employee Benefits: ${formatCurrency(emp.employeeBenefits)}`);
      console.log(`  --- GROSS EARNINGS: ${formatCurrency(emp.grossEarnings)} ---`);
      console.log(`  Employee Advances: ${formatCurrency(emp.employeeAdvances)}`);
      console.log(`  Officer Advances: ${formatCurrency(emp.officerAdvances)}`);
      console.log(`  Garnishment: ${formatCurrency(emp.garnishment)}`);
      console.log(`  --- TOTAL DEDUCTIONS: ${formatCurrency(emp.totalDeductions)} ---`);
      console.log(`  *** NET PAY: ${formatCurrency(emp.netPay)} ***`);
      
      if (emp.isNegative) {
        console.log(`  ⚠️  WARNING: NEGATIVE NET PAY!`);
      }
      if (emp.hasNoEarnings) {
        console.log(`  ⚠️  WARNING: NO EARNINGS!`);
      }
    });

    console.log('\n=== GRAND TOTALS ===');
    console.log(`Total Gross Earnings: ${formatCurrency(payrollResults.totals.grossEarnings)}`);
    console.log(`Total Deductions: ${formatCurrency(payrollResults.totals.totalDeductions)}`);
    console.log(`Total Net Pay: ${formatCurrency(payrollResults.totals.netPay)}`);

    // Check for warnings
    if (payrollResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS DETECTED:');
      payrollResults.warnings.forEach((emp) => {
        if (emp.isNegative) {
          console.log(`  - ${emp.employeeName}: Negative net pay (${formatCurrency(emp.netPay)})`);
        }
        if (emp.hasNoEarnings) {
          console.log(`  - ${emp.employeeName}: No earnings entered`);
        }
      });

      // Show warning toast
      toast.error(
        `⚠️ ${payrollResults.warnings.length} warning(s) detected! Check console for details.`,
        { duration: 5000 }
      );
    } else {
      toast.success('✓ Payroll calculated successfully! Check console for details.');
    }

    // In the future, this would:
    // 1. Show a confirmation modal
    // 2. Send data to backend to save
    // 3. Generate payslips
  };

  // Tab configurations
  const tabs = [
    { id: 'create-paycheck', label: 'Create Paycheck' },
    { id: 'reports', label: 'Reports' },
    { id: 'employee', label: 'Employee' },
    { id: 'company', label: 'Company' },
  ];

  // Loading Spinner Component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-orange-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
      </div>
      <span className="ml-4 text-gray-600 font-medium">Loading employees...</span>
    </div>
  );

  // Error Message Component
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
            <h3 className="text-sm font-medium text-red-800">Error loading employees</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchEmployees}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Create Paycheck Tab Content
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

    return (
      <>
        {/* Date and Check Number Filters */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay From
              </label>
              <input
                type="date"
                value={dateRange.payFrom.split('/').reverse().join('-')}
                onChange={(e) => setDateRange(prev => ({ 
                  ...prev, 
                  payFrom: e.target.value.split('-').reverse().join('/') 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay To
              </label>
              <input
                type="date"
                value={dateRange.payTo.split('/').reverse().join('-')}
                onChange={(e) => setDateRange(prev => ({ 
                  ...prev, 
                  payTo: e.target.value.split('-').reverse().join('/') 
                }))}
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
          </div>
        </div>

        {/* Payroll Table */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Employee Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      OT Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Drivers/Aides Wages
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Training/Seminar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      PTO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Employee Benefits
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Employee Advances
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Officer's Advances
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Garnishment
                    </th>
                    {/* CALCULATED COLUMNS */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">
                      Gross Pay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider bg-red-50">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-50">
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee, index) => {
                    // Calculate real-time values
                    const payrollInput = payrollData[employee.id] || {};
                    const calculated = calculateRowValues(employee, payrollInput);

                    return (
                      <tr 
                        key={employee.id} 
                        className={`
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          ${employee.status !== 'Active' ? 'opacity-60' : ''}
                        `}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-3 whitespace-nowrap border-r border-gray-200">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {employee.name}
                              {employee.status !== 'Active' && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({employee.status})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500">{employee.position}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.salary || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'salary', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.hours || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'hours', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.otHours || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'otHours', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.driversAidesWages || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'driversAidesWages', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.trainingSeminar || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'trainingSeminar', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.pto || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'pto', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.employeeBenefits || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'employeeBenefits', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.employeeAdvances || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'employeeAdvances', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.officerAdvances || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'officerAdvances', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={payrollData[employee.id]?.garnishment || '0.00'}
                            onChange={(e) => handleInputChange(employee.id, 'garnishment', e.target.value)}
                            disabled={employee.status !== 'Active'}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* CALCULATED COLUMNS - READ ONLY */}
                        <td className="px-4 py-3 whitespace-nowrap bg-green-50">
                          <div className="w-28 px-3 py-2 text-sm font-semibold text-green-700 text-right">
                            {formatCurrency(calculated.grossEarnings)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap bg-red-50">
                          <div className="w-28 px-3 py-2 text-sm font-semibold text-red-700 text-right">
                            {formatCurrency(calculated.totalDeductions)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap bg-blue-50">
                          <div className={`w-28 px-3 py-2 text-sm font-bold text-right ${
                            calculated.isNegative ? 'text-red-600' : 'text-blue-700'
                          }`}>
                            {formatCurrency(calculated.netPay)}
                            {calculated.isNegative && (
                              <span className="ml-1 text-xs">⚠️</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

  // Render Reports Tab Content
  const renderReportsTab = () => <Reports />;

  // Render Employee Tab Content
  const renderEmployeeTab = () => <Employee />;

  // Render Company Tab Content
  const renderCompanyTab = () => <Company />;

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'create-paycheck':
        return renderCreatePaycheckTab();
      case 'reports':
        return renderReportsTab();
      case 'employee':
        return renderEmployeeTab();
      case 'company':
        return renderCompanyTab();
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
                  className={`
                    pb-4 px-1 text-sm font-medium transition-colors relative
                    ${activeTab === tab.id
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
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