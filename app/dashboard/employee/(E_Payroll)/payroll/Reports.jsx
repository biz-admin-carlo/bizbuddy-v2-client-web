'use client';
import React, { useState } from 'react';

const Reports = () => {
  const [activeReportTab, setActiveReportTab] = useState('payroll-detail');
  const [filters, setFilters] = useState({
    from: '01/01',
    to: '11/15',
    year: '2025',
    sortBy: 'Pay Date',
    quarter: '1st Quarter'
  });

  // Mock data for reports with redacted information
  const mockPayrollData = [
    { id: 1, employeeName: 'Employee A', payDate: '10/15/2025', grossPay: 0.00, netPay: 0.00 },
    { id: 2, employeeName: 'Employee B', payDate: '10/15/2025', grossPay: 0.00, netPay: 0.00 },
    { id: 3, employeeName: 'Employee C', payDate: '10/15/2025', grossPay: 0.00, netPay: 0.00 },
  ];

  const mockDE9CData = [
    { ssn: 'XXX-XX-XXXX', firstName: 'John', mi: 'D.', lastName: 'Doe', totalSubject: 0.00, totalPIT: 0.00, withheld: 0.00, code: 'S' },
    { ssn: 'XXX-XX-XXXX', firstName: 'Jane', mi: 'M.', lastName: 'Smith', totalSubject: 0.00, totalPIT: 0.00, withheld: 0.00, code: 'S' },
    { ssn: 'XXX-XX-XXXX', firstName: 'Michael', mi: 'A.', lastName: 'Johnson', totalSubject: 0.00, totalPIT: 0.00, withheld: 0.00, code: 'S' },
    { ssn: 'XXX-XX-XXXX', firstName: 'Emily', mi: 'R.', lastName: 'Williams', totalSubject: 0.00, totalPIT: 0.00, withheld: 0.00, code: 'S' },
    { ssn: 'XXX-XX-XXXX', firstName: 'David', mi: 'L.', lastName: 'Brown', totalSubject: 0.00, totalPIT: 0.00, withheld: 0.00, code: 'S' },
  ];

  const reportTabs = [
    { id: 'payroll-detail', label: 'Payroll Detail' },
    { id: '941-tax', label: '941 Tax Liability' },
    { id: 'de-9c', label: 'DE-9C' },
  ];

  // Render Payroll Detail Tab
  const renderPayrollDetailTab = () => (
    <div>
      {/* Filters Section */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="text"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="01/01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="text"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="11/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="text"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option>Pay Date</option>
              <option>Employee Name</option>
              <option>Amount</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              VIEW
            </button>
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              PRINT PREVIEW
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-orange-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Payroll Detail Report</h3>
          <p className="text-gray-600">Detailed payroll reports will be displayed here once data is available.</p>
        </div>
      </div>
    </div>
  );

  // Render 941 Tax Liability Tab
  const render941TaxTab = () => (
    <div>
      {/* Filters Section */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="text"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="01/01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="text"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="11/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="text"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="2025"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              VIEW
            </button>
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              PRINT PREVIEW
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-orange-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">941 Tax Liability Report</h3>
          <p className="text-gray-600">941 tax liability reports will be displayed here once data is available.</p>
        </div>
      </div>
    </div>
  );

  // Render DE-9C Tab
  const renderDE9CTab = () => (
    <div>
      {/* Filters Section */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="text"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
            <select
              value={filters.quarter}
              onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option>1st Quarter</option>
              <option>2nd Quarter</option>
              <option>3rd Quarter</option>
              <option>4th Quarter</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-2">
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              VIEW
            </button>
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              PRINT PREVIEW
            </button>
            <button className="flex-1 px-6 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors">
              EXPORT TO CSV
            </button>
          </div>
        </div>
      </div>

      {/* DE-9C Report Content */}
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800">DE-9C Report</h3>
          <p className="text-sm text-gray-600">COMPANY NAME LLC</p>
          <p className="text-sm text-gray-600">2025-Q1</p>
        </div>

        {/* Employee Count Table */}
        <div className="mb-8">
          <table className="min-w-full border border-gray-300 mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">Month</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">No. Of Employees</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">January</td>
                <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">0</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">February</td>
                <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">0</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">March</td>
                <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">0</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Employee Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border border-gray-300">SSN</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border border-gray-300">First Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border border-gray-300">MI</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border border-gray-300">Last Name</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 border border-gray-300">Total Subject Wages</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 border border-gray-300">Total PIT Wages</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 border border-gray-300">Total PIT Withheld</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border border-gray-300">Wage Code</th>
              </tr>
            </thead>
            <tbody>
              {mockDE9CData.map((employee, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">{employee.ssn}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">{employee.firstName}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">{employee.mi}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">{employee.lastName}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right border border-gray-300">{employee.totalSubject.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right border border-gray-300">{employee.totalPIT.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right border border-gray-300">{employee.withheld.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">{employee.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render active report tab content
  const renderReportTabContent = () => {
    switch (activeReportTab) {
      case 'payroll-detail':
        return renderPayrollDetailTab();
      case '941-tax':
        return render941TaxTab();
      case 'de-9c':
        return renderDE9CTab();
      default:
        return renderPayrollDetailTab();
    }
  };

  return (
    <div>
      {/* Sub-tabs for Reports */}
      <div className="bg-gray-50 border-b">
        <div className="px-6 pt-4">
          <nav className="flex space-x-2">
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id)}
                className={`
                  px-6 py-2 text-sm font-medium rounded-t-lg transition-colors
                  ${activeReportTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Report Content */}
      {renderReportTabContent()}
    </div>
  );
};

export default Reports;