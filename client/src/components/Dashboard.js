import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { FiUpload, FiDownload, FiDownloadCloud } from 'react-icons/fi';
import { useAuth } from './AuthContext';

const Dashboard = () => {
  const { logout } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    designation: '',
    constituency: '',
    district: '',
    cell_number: '',
    image_url: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('http://localhost:5000/api/employees');
      setEmployees(data);
      setError('');
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchEmployees();
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmployeeSelection = (id) => {
    setSelectedEmployees(prev => {
      if (prev.includes(id)) {
        return prev.filter(empId => empId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
    setSelectAll(!selectAll);
  };

  const downloadQRCode = async (qrCodeUrl, uniqueId) => {
    try {
      const response = await axios.get(`http://localhost:5000${qrCodeUrl}`, {
        responseType: 'blob',
      });
      saveAs(response.data, `${uniqueId}.png`);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setError('Failed to download QR code');
    }
  };

  const downloadSelectedQRCodes = async () => {
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get('http://localhost:5000/api/employees/batch-download', {
        params: { ids: selectedEmployees.join(',') },
        responseType: 'blob'
      });
      
      saveAs(response.data, 'qr_codes.zip');
    } catch (error) {
      console.error('Error downloading batch QR codes:', error);
      setError('Failed to download selected QR codes');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAllQRCodes = async () => {
    if (employees.length === 0) {
      setError('No employees to download');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const allIds = employees.map(emp => emp.id);
      const response = await axios.get('http://localhost:5000/api/employees/batch-download', {
        params: { ids: allIds.join(',') },
        responseType: 'blob'
      });
      
      saveAs(response.data, 'all_qr_codes.zip');
    } catch (error) {
      console.error('Error downloading all QR codes:', error);
      setError('Failed to download all QR codes');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      name: employee.name || '',
      designation: employee.designation || '',
      constituency: employee.constituency || '',
      district: employee.district || '',
      cell_number: employee.cell_number || '',
      image_url: employee.image_url || '',
    });
    setShowEditModal(true);
    setError('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitEdit = async () => {
    if (!editingEmployee) return;

    try {
      setIsLoading(true);
      setError('');

      await axios.put(
        `http://localhost:5000/api/employees/${editingEmployee.id}`,
        editForm
      );
      setShowEditModal(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      setError('Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      setIsLoading(true);
      setError('');
      await axios.delete(`http://localhost:5000/api/employees/${id}`);
      await fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      setError('Failed to delete employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">TVK Candidates Management</h2>
       <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Upload Excel File</h3>
        <p className="text-gray-600 text-sm mb-3">
          Excel file should contain columns: Unique ID, Name, Designation, Constituency, District, Cell Number
        </p>
        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors">
          <FiUpload className="mr-2" />
          {isLoading ? 'Uploading...' : 'Choose Excel File'}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
        </label>
        {isLoading && (
          <div className="mt-2">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-gray-600">Processing file...</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Candidates ({employees.length})</h3>
        
        {selectedEmployees.length > 0 && (
          <div className="mb-4 flex space-x-4">
            <button
              onClick={downloadSelectedQRCodes}
              disabled={selectedEmployees.length === 0 || isLoading}
              className={`flex items-center px-4 py-2 rounded ${selectedEmployees.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <FiDownloadCloud className="mr-2" />
              {isLoading ? 'Preparing Download...' : `Download Selected (${selectedEmployees.length})`}
            </button>
            
            <button
              onClick={downloadAllQRCodes}
              disabled={employees.length === 0 || isLoading}
              className={`flex items-center px-4 py-2 rounded ${employees.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              <FiDownloadCloud className="mr-2" />
              {isLoading ? 'Preparing Download...' : 'Download All'}
            </button>
          </div>
        )}
        
        {isLoading && employees.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : employees.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No candidates found. Upload an Excel file to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="mr-2"
                    />
                    Select
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">QR Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Designation</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Constituency</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">District</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployeeSelection(emp.id)}
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {emp.qr_code_url ? (
                        <img
                          src={`http://localhost:5000${emp.qr_code_url}`}
                          alt="QR Code"
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            e.target.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAyMEMyNS4zNzI2IDIwIDIwIDI1LjM3MjYgMjAgMzJDMjAgMzguNjI3NCAyNS4zNzI2IDQ0IDMyIDQ0QzM4LjYyNzQgNDQgNDQgMzguNjI3NCA0NCAzMkM0NCAyNS4zNzI2IDM4LjYyNzQgMjAgMzIgMjBaTTMyIDQwQzI3LjU4MTcgNDAgMjQgMzYuNDE4MyAyNCAzMkMyNCAyNy41ODE3IDI3LjU4MTcgMjQgMzIgMjRDMzYuNDE4MyAyNCA0MCAyNy41ODE3IDQwIDMyQzQwIDM2LjQxODMgMzYuNDE4MyA0MCAzMiA0MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                          No QR
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{emp.name || 'N/A'}</td>
                    <td className="border border-gray-300 px-4 py-2">{emp.designation || 'N/A'}</td>
                    <td className="border border-gray-300 px-4 py-2">{emp.constituency || 'N/A'}</td>
                    <td className="border border-gray-300 px-4 py-2">{emp.district || 'N/A'}</td>
                    <td className="border border-gray-300 px-4 py-2">{emp.cell_number || 'N/A'}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                      {emp.qr_code_url && (
                        <button
                          onClick={() => downloadQRCode(emp.qr_code_url, emp.unique_id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Download QR Code"
                        >
                          <FiDownload size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(emp)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Edit Employee"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEmployee(emp.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Employee"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Edit Candidate</h3>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={editForm.name}
                onChange={handleEditChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                name="designation"
                placeholder="Designation"
                value={editForm.designation}
                onChange={handleEditChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                name="constituency"
                placeholder="Constituency"
                value={editForm.constituency}
                onChange={handleEditChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                name="district"
                placeholder="District"
                value={editForm.district}
                onChange={handleEditChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                name="cell_number"
                placeholder="Phone Number"
                value={editForm.cell_number}
                onChange={handleEditChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                name="image_url"
                placeholder="Image URL"
                value={editForm.image_url}
                onChange={handleEditChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;