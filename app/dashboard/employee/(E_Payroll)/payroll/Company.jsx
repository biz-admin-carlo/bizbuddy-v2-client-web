'use client';
import React, { useState, useEffect } from 'react';
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const Company = () => {
  const { token } = useAuthStore();

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Company Info (Read-Only)
  const [companyInfo, setCompanyInfo] = useState({
    id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  // Payroll Config
  const [payrollConfig, setPayrollConfig] = useState({
    id: '',
    payFrequency: 'biweekly',
    ptoEnabled: true,
    ptoLabel: 'PTO',
  });

  // Earning & Deduction Types
  const [earningTypes, setEarningTypes] = useState([]);
  const [deductionTypes, setDeductionTypes] = useState([]);

  // Modal States for Add New
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [newEarning, setNewEarning] = useState({ code: '', label: '', isTaxable: true });
  const [newDeduction, setNewDeduction] = useState({ code: '', label: '', isPreTax: false });

  // ============================================
  // FETCH DATA ON MOUNT
  // ============================================
  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/company-information/company-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch company settings');
      }

      if (result.success && result.data) {
        setCompanyInfo(result.data.company);
        setPayrollConfig(result.data.payrollConfig);
        setEarningTypes(result.data.earningTypes);
        setDeductionTypes(result.data.deductionTypes);
        toast.success('Company settings loaded successfully');
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // UPDATE PAYROLL CONFIG
  // ============================================
  const handleUpdatePayrollConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/company-information/payroll-config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payFrequency: payrollConfig.payFrequency.toLowerCase(),
          ptoEnabled: payrollConfig.ptoEnabled,
          ptoLabel: payrollConfig.ptoLabel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update payroll config');
      }

      toast.success('Payroll configuration updated successfully!');
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // CREATE EARNING TYPE
  // ============================================
  const handleCreateEarning = async () => {
    if (!newEarning.code || !newEarning.label) {
      toast.error('Code and Label are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/company-information/earning-types`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEarning),
      });

      const result = await response.json();
      console.log(result);
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create earning type');
      }

      // Refresh data
      await fetchCompanySettings();
      setShowAddEarning(false);
      setNewEarning({ code: '', label: '', isTaxable: true });
      toast.success('Earning type created successfully!');
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // UPDATE EARNING TYPE
  // ============================================
  const handleUpdateEarning = async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/company-information/earning-types/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update earning type');
      }

      // Update local state
      setEarningTypes(prev => 
        prev.map(et => et.id === id ? { ...et, ...updates } : et)
      );
      
      toast.success('Earning type updated');
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
    }
  };

  // ============================================
  // TOGGLE EARNING TYPE ENABLED
  // ============================================
  const handleToggleEarning = async (id, currentEnabled) => {
    await handleUpdateEarning(id, { enabled: !currentEnabled });
  };

  // ============================================
  // CREATE DEDUCTION TYPE
  // ============================================
  const handleCreateDeduction = async () => {
    if (!newDeduction.code || !newDeduction.label) {
      toast.error('Code and Label are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/company-information/deduction-types`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDeduction),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create deduction type');
      }

      // Refresh data
      await fetchCompanySettings();
      setShowAddDeduction(false);
      setNewDeduction({ code: '', label: '', isPreTax: false });
      toast.success('Deduction type created successfully!');
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // UPDATE DEDUCTION TYPE
  // ============================================
  const handleUpdateDeduction = async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/company-information/deduction-types/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update deduction type');
      }

      // Update local state
      setDeductionTypes(prev => 
        prev.map(dt => dt.id === id ? { ...dt, ...updates } : dt)
      );
      
      toast.success('Deduction type updated');
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      console.error('Error:', err);
    }
  };

  // ============================================
  // TOGGLE DEDUCTION TYPE ENABLED
  // ============================================
  const handleToggleDeduction = async (id, currentEnabled) => {
    await handleUpdateDeduction(id, { enabled: !currentEnabled });
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company settings...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error && !companyInfo.id) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchCompanySettings}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN UI
  // ============================================
  return (
    <>
      <Toaster position="top-right" richColors />
      
      <div className="p-6 space-y-6">
        {/* Company Information Section - READ ONLY */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold text-gray-800">Company Information</h2>
            <p className="text-xs text-gray-500 mt-1">This information is set in your company profile</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Company Name and Address Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyInfo.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={companyInfo.address || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* City, State, Zip Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={companyInfo.city || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={companyInfo.state || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zip
                  </label>
                  <input
                    type="text"
                    value={companyInfo.zip || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Settings Section */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold text-gray-800">Payroll Settings</h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Pay Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Frequency
                </label>
                <select
                  value={payrollConfig.payFrequency}
                  onChange={(e) => setPayrollConfig(prev => ({ ...prev, payFrequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="semimonthly">Semi-Monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PTO Label
                </label>
                <input
                  type="text"
                  value={payrollConfig.ptoLabel}
                  onChange={(e) => setPayrollConfig(prev => ({ ...prev, ptoLabel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* PTO Enabled Toggle */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">PTO Enabled:</label>
              <button
                onClick={() => setPayrollConfig(prev => ({ ...prev, ptoEnabled: !prev.ptoEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  payrollConfig.ptoEnabled ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    payrollConfig.ptoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Update Button */}
            <div className="flex justify-end">
              <button
                onClick={handleUpdatePayrollConfig}
                disabled={saving}
                className="px-8 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors duration-200 disabled:opacity-50"
              >
                {saving ? 'UPDATING...' : 'UPDATE PAYROLL CONFIG'}
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Section */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-300 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Earnings</h2>
            <button
              onClick={() => setShowAddEarning(true)}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700"
            >
              + Add Earning Type
            </button>
          </div>

          <div className="p-6">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Enabled</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Label</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Taxable</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-300">
                {earningTypes.map((earning) => (
                  <tr key={earning.id}>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleEarning(earning.id, earning.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          earning.enabled ? 'bg-orange-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            earning.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{earning.code}</td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={earning.label}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          setEarningTypes(prev => 
                            prev.map(et => et.id === earning.id ? { ...et, label: newLabel } : et)
                          );
                        }}
                        onBlur={() => handleUpdateEarning(earning.id, { label: earning.label })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={earning.isTaxable ? 'text-green-600' : 'text-gray-400'}>
                        {earning.isTaxable ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deductions Section */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-300 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Deductions</h2>
            <button
              onClick={() => setShowAddDeduction(true)}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700"
            >
              + Add Deduction Type
            </button>
          </div>

          <div className="p-6">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Enabled</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Label</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Pre-Tax</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-300">
                {deductionTypes.map((deduction) => (
                  <tr key={deduction.id}>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleDeduction(deduction.id, deduction.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          deduction.enabled ? 'bg-orange-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            deduction.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{deduction.code}</td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={deduction.label}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          setDeductionTypes(prev => 
                            prev.map(dt => dt.id === deduction.id ? { ...dt, label: newLabel } : dt)
                          );
                        }}
                        onBlur={() => handleUpdateDeduction(deduction.id, { label: deduction.label })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={deduction.isPreTax ? 'text-green-600' : 'text-gray-400'}>
                        {deduction.isPreTax ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Earning Modal */}
        {showAddEarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Earning Type</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                  <input
                    type="text"
                    value={newEarning.code}
                    onChange={(e) => setNewEarning(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., overtime"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                  <input
                    type="text"
                    value={newEarning.label}
                    onChange={(e) => setNewEarning(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Overtime Pay"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newEarning.isTaxable}
                    onChange={(e) => setNewEarning(prev => ({ ...prev, isTaxable: e.target.checked }))}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">Taxable</label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleCreateEarning}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowAddEarning(false);
                    setNewEarning({ code: '', label: '', isTaxable: true });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Deduction Modal */}
        {showAddDeduction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Deduction Type</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                  <input
                    type="text"
                    value={newDeduction.code}
                    onChange={(e) => setNewDeduction(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., 401k"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                  <input
                    type="text"
                    value={newDeduction.label}
                    onChange={(e) => setNewDeduction(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., 401K Retirement"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newDeduction.isPreTax}
                    onChange={(e) => setNewDeduction(prev => ({ ...prev, isPreTax: e.target.checked }))}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">Pre-Tax</label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleCreateDeduction}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowAddDeduction(false);
                    setNewDeduction({ code: '', label: '', isPreTax: false });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Company;