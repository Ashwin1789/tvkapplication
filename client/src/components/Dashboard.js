import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { FiUpload, FiDownload, FiDownloadCloud, FiEdit2, FiTrash2 } from 'react-icons/fi';
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
    <div className="p-6 bg-gradient-to-b from-yellow-50 to-red-50 rounded-lg shadow-lg max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-red-800">TVK Candidates Management</h2>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-600 text-red-800 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-yellow-200">
        <h3 className="text-xl font-semibold mb-3 text-red-700">Upload Excel File</h3>
        <p className="text-gray-600 text-sm mb-4">
          Excel file should contain columns: Unique ID, Name, Designation, Constituency, District, Cell Number
        </p>
        <label className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-lg cursor-pointer hover:from-red-700 hover:to-yellow-600 transition-all shadow-md">
          <FiUpload className="mr-3" size={18} />
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
          <div className="mt-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mr-3"></div>
              <span className="text-gray-600">Processing file...</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-yellow-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-red-700">
            Candidates <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm ml-2">{employees.length}</span>
          </h3>
          
          {selectedEmployees.length > 0 && (
            <div className="flex space-x-4">
              <button
                onClick={downloadSelectedQRCodes}
                disabled={selectedEmployees.length === 0 || isLoading}
                className={`flex items-center px-5 py-2 rounded-lg ${selectedEmployees.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 shadow-md'}`}
              >
                <FiDownloadCloud className="mr-2" />
                {isLoading ? 'Preparing...' : `Download Selected (${selectedEmployees.length})`}
              </button>
              
              <button
                onClick={downloadAllQRCodes}
                disabled={employees.length === 0 || isLoading}
                className={`flex items-center px-5 py-2 rounded-lg ${employees.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md'}`}
              >
                <FiDownloadCloud className="mr-2" />
                {isLoading ? 'Preparing...' : 'Download All'}
              </button>
            </div>
          )}
        </div>
        
        {isLoading && employees.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800 text-lg">
              No candidates found. Upload an Excel file to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-yellow-200">
              <thead>
                <tr className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                  <th className="border border-yellow-300 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="mr-2 h-4 w-4 text-yellow-500 rounded focus:ring-yellow-500"
                    />
                    Select
                  </th>
                  <th className="border border-yellow-300 px-4 py-3 text-left">QR Code</th>
                  <th className="border border-yellow-300 px-4 py-3 text-left">Name</th>
                  <th className="border border-yellow-300 px-4 py-3 text-left">Designation</th>
                  <th className="border border-yellow-300 px-4 py-3 text-left">Constituency</th>
                  <th className="border border-yellow-300 px-4 py-3 text-left">District</th>
                  <th className="border border-yellow-300 px-4 py-3 text-left">Phone</th>
                  <th className="border border-yellow-300 px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-yellow-50 even:bg-yellow-50/30">
                    <td className="border border-yellow-200 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployeeSelection(emp.id)}
                        className="h-4 w-4 text-yellow-600 rounded focus:ring-yellow-500"
                      />
                    </td>
                    <td className="border border-yellow-200 px-4 py-3">
                      {emp.qr_code_url ? (
                        <img
                          src={`http://localhost:5000${emp.qr_code_url}`}
                          alt="QR Code"
                          className="w-16 h-16 object-contain mx-auto"
                          onError={(e) => {
                            e.target.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkYwMDAwIi8+CjxwYXRoIGQ9Ik0zMiAyMEMyNS4zNzI2IDIwIDIwIDI1LjM3MjYgMjAgMzJDMjAgMzguNjI3NCAyNS4zNzI2IDQ0IDMyIDQ0QzM4LjYyNzQgNDQgNDQgMzguNjI3NCA0NCAzMkM0NCAyNS4zNzI2IDM4LjYyNzQgMjAgMzIgMjBaTTMyIDQwQzI3LjU4MTcgNDAgMjQgMzYuNDE4MyAyNCAzMkMyNCAyNy41ODE3IDI3LjU4MTcgMjQgMzIgMjRDMzYuNDE4MyAyNCA0MCAyNy41ODE3IDQwIDMyQzQwIDM2LjQxODMgMzYuNDE4MyA0MCAzMiA0MFoiIGZpbGw9IiNGRkZCMDAiLz4KPC9zdmc+';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-yellow-100 flex items-center justify-center text-yellow-600 text-xs mx-auto">
                          No QR
                        </div>
                      )}
                    </td>
                    <td className="border border-yellow-200 px-4 py-3 font-medium">{emp.name || 'N/A'}</td>
                    <td className="border border-yellow-200 px-4 py-3">{emp.designation || 'N/A'}</td>
                    <td className="border border-yellow-200 px-4 py-3">{emp.constituency || 'N/A'}</td>
                    <td className="border border-yellow-200 px-4 py-3">{emp.district || 'N/A'}</td>
                    <td className="border border-yellow-200 px-4 py-3">{emp.cell_number || 'N/A'}</td>
                    <td className="border border-yellow-200 px-4 py-3 text-center space-x-2">
                      {emp.qr_code_url && (
                        <button
                          onClick={() => downloadQRCode(emp.qr_code_url, emp.unique_id)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-full transition-colors"
                          title="Download QR Code"
                        >
                          <FiDownload size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(emp)}
                        className="text-yellow-600 hover:text-yellow-800 p-2 hover:bg-yellow-50 rounded-full transition-colors"
                        title="Edit Employee"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteEmployee(emp.id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Employee"
                      >
                        <FiTrash2 size={18} />
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-2 border-yellow-400">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-red-700">Edit Candidate</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-red-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="w-full border border-yellow-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={editForm.designation}
                  onChange={handleEditChange}
                  className="w-full border border-yellow-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Constituency</label>
                <input
                  type="text"
                  name="constituency"
                  value={editForm.constituency}
                  onChange={handleEditChange}
                  className="w-full border border-yellow-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">District</label>
                <input
                  type="text"
                  name="district"
                  value={editForm.district}
                  onChange={handleEditChange}
                  className="w-full border border-yellow-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="cell_number"
                  value={editForm.cell_number}
                  onChange={handleEditChange}
                  className="w-full border border-yellow-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Image URL</label>
                <input
                  type="text"
                  name="image_url"
                  value={editForm.image_url}
                  onChange={handleEditChange}
                  className="w-full border border-yellow-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={isLoading}
                className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md disabled:opacity-70"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;