'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useAuthStore from "@/store/useAuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Employee = () => {
  const { token } = useAuthStore();
  
  // Employee data from API
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    mi: '',
    lastName: '',
    ssn: '',
    address: '',
    city: '',
    state: 'CA',
    zip: '',
    active: true,
    maritalStatus: 'Single',
    payType: 'Hourly',
    hourlyPayRate: '',
    driversAidesRate: '',
    trainingSeminarRate: '',
    additionalFedIncomeTax: '',
    additionalStateIncomeTax: '',
    ptoHours: '',
    doNotCalculateFICA: false,
    withCalSavers: false,
  });

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      mi: '',
      lastName: '',
      ssn: '',
      address: '',
      city: '',
      state: 'CA',
      zip: '',
      active: true,
      maritalStatus: 'Single',
      payType: 'Hourly',
      hourlyPayRate: '',
      driversAidesRate: '',
      trainingSeminarRate: '',
      additionalFedIncomeTax: '',
      additionalStateIncomeTax: '',
      ptoHours: '',
      doNotCalculateFICA: false,
      withCalSavers: false,
    });
    setSelectedEmployee(null);
  };

  const handleCreate = () => {
    console.log('Creating employee...', formData);
    alert('Employee created successfully!');
    handleReset();
  };

  // Loading Spinner Component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-12">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-orange-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Left Sidebar - Employee List */}
      <div className="col-span-3">
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700">
              {loading ? 'Loading...' : `${employees.length} Employees`}
            </h3>
          </div>
          
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                onClick={fetchEmployees}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
              >
                Retry
              </button>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
              <ul className="divide-y divide-gray-200">
                {employees.map((employee) => (
                  <li
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee.id)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      selectedEmployee === employee.id
                        ? 'bg-orange-50 text-orange-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm ${selectedEmployee === employee.id ? 'font-semibold' : 'font-medium'}`}>
                        {employee.name}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {employee.position || 'No position'}
                      </span>
                      {employee.status !== 'Active' && (
                        <span className="text-xs text-gray-400 mt-1">
                          ({employee.status})
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Employee Form */}
      <div className="col-span-9">
        <div className="bg-white border border-gray-300 rounded-lg">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold text-gray-800">Create Employee</h2>
          </div>

          <div className="p-6">
            {/* Name Section */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name & MI
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="John M."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SS Number (format: ###-##-####)
                </label>
                <input
                  type="text"
                  value={formData.ssn}
                  onChange={(e) => handleInputChange('ssn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="XXX-XX-XXXX"
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="CA"
                />
              </div>
            </div>

            {/* Additional Row for Zip */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip
                </label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="94102"
                />
              </div>
            </div>

            {/* Status and Pay Info Section */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active
                </label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marital Status
                </label>
                <input
                  type="text"
                  value={formData.maritalStatus}
                  onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Single"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Type:
                </label>
                <input
                  type="text"
                  value={formData.payType}
                  onChange={(e) => handleInputChange('payType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Hourly"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Pay Rate
                </label>
                <input
                  type="text"
                  value={formData.hourlyPayRate}
                  onChange={(e) => handleInputChange('hourlyPayRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Rates Section */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drivers/Aides Wages Rate
                </label>
                <input
                  type="text"
                  value={formData.driversAidesRate}
                  onChange={(e) => handleInputChange('driversAidesRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training/Seminar Rate
                </label>
                <input
                  type="text"
                  value={formData.trainingSeminarRate}
                  onChange={(e) => handleInputChange('trainingSeminarRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Fed Income Tax
                </label>
                <input
                  type="text"
                  value={formData.additionalFedIncomeTax}
                  onChange={(e) => handleInputChange('additionalFedIncomeTax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional State Income Tax
                </label>
                <input
                  type="text"
                  value={formData.additionalStateIncomeTax}
                  onChange={(e) => handleInputChange('additionalStateIncomeTax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* PTO and Options Section */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PTO Hours
                </label>
                <input
                  type="text"
                  value={formData.ptoHours}
                  onChange={(e) => handleInputChange('ptoHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.doNotCalculateFICA}
                    onChange={(e) => handleInputChange('doNotCalculateFICA', e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Do not calculate FICA and medicare taxes</span>
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.withCalSavers}
                    onChange={(e) => handleInputChange('withCalSavers', e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">With CalSavers</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors duration-200"
              >
                RESET
              </button>
              <button
                onClick={handleCreate}
                className="px-8 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors duration-200"
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Employee;