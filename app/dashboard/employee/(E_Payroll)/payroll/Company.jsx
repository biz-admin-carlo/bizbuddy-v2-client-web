'use client';
import React, { useState } from 'react';

const Company = () => {
  const [companyInfo, setCompanyInfo] = useState({
    companyName: 'Sample Company LLC',
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    payFrequency: 'Bi-Weekly',
  });

  const [settings, setSettings] = useState({
    otHours: true,
    earnings1: true,
    earnings2: true,
    pto: true,
    retirement401k: false,
    deduction2: true,
    deduction3: true,
    deduction4: true,
    deduction5: true,
    deduction6: false,
  });

  const [descriptions, setDescriptions] = useState({
    earnings1: 'Drivers/Aides Wages',
    earnings2: 'Training/Seminar',
    pto: 'PTO',
    deduction2: 'Employee Benefits',
    deduction3: 'Employee Advances',
    deduction4: "Officer's Advances",
    deduction5: 'Garnishment',
    deduction6: 'Ded 5',
  });

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleDescriptionChange = (field, value) => {
    setDescriptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdate = () => {
    console.log('Updating company information...', companyInfo);
    alert('Company information updated successfully!');
  };

  const handleSaveSettings = () => {
    console.log('Saving settings...', { settings, descriptions });
    alert('Settings saved successfully!');
  };

  const settingsConfig = [
    { id: 'otHours', label: 'OT Hours', hasDescription: false },
    { id: 'earnings1', label: 'Earnings 1', hasDescription: true, descriptionKey: 'earnings1' },
    { id: 'earnings2', label: 'Earnings 2', hasDescription: true, descriptionKey: 'earnings2' },
    { id: 'pto', label: 'PTO', hasDescription: true, descriptionKey: 'pto' },
    { id: 'retirement401k', label: '401K', hasDescription: false },
    { id: 'deduction2', label: 'Deduction 2', hasDescription: true, descriptionKey: 'deduction2' },
    { id: 'deduction3', label: 'Deduction 3', hasDescription: true, descriptionKey: 'deduction3' },
    { id: 'deduction4', label: 'Deduction 4', hasDescription: true, descriptionKey: 'deduction4' },
    { id: 'deduction5', label: 'Deduction 5', hasDescription: true, descriptionKey: 'deduction5' },
    { id: 'deduction6', label: 'Deduction 6', hasDescription: true, descriptionKey: 'deduction6' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Company Information Section */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-gray-800">Company Information</h2>
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
                  value={companyInfo.companyName}
                  onChange={(e) => handleCompanyInfoChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={companyInfo.address}
                  onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  value={companyInfo.city}
                  onChange={(e) => handleCompanyInfoChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={companyInfo.state}
                  onChange={(e) => handleCompanyInfoChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip
                </label>
                <input
                  type="text"
                  value={companyInfo.zip}
                  onChange={(e) => handleCompanyInfoChange('zip', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Pay Frequency Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Frequency
                </label>
                <input
                  type="text"
                  value={companyInfo.payFrequency}
                  onChange={(e) => handleCompanyInfoChange('payFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleUpdate}
                  className="w-full px-8 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors duration-200"
                >
                  UPDATE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        </div>

        <div className="p-6">
          <div className="overflow-hidden border border-gray-300 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-300">
                    Show/Hide
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-300">
                    P/R Items
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Default description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-300">
                {settingsConfig.map((setting) => (
                  <tr key={setting.id}>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-300">
                      <button
                        onClick={() => handleSettingToggle(setting.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          settings[setting.id] ? 'bg-orange-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[setting.id] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                      {setting.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {setting.hasDescription ? (
                        <input
                          type="text"
                          value={descriptions[setting.descriptionKey] || ''}
                          onChange={(e) => handleDescriptionChange(setting.descriptionKey, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Settings Button */}
          <div className="mt-6">
            <button
              onClick={handleSaveSettings}
              className="w-full max-w-xs px-8 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors duration-200"
            >
              SAVE SETTING
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Company;