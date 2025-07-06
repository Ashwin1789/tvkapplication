import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import axios from 'axios';

const Scanner = () => {
  const [result, setResult] = useState('');
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (data) => {
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setResult(parsed.unique_id);
        const res = await axios.get(`/api/employees/unique/${parsed.unique_id}`);
        setEmployee(res.data);
        setError('');
      } catch (err) {
        setError('Invalid QR or employee not found.');
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError('Scanner error');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">QR Scanner</h1>
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        style={{ width: '100%' }}
      />
      {error && <p className="text-red-500">{error}</p>}
      {employee && (
        <div className="mt-4 p-4 bg-white shadow rounded">
          <h2 className="text-xl font-bold">{employee.name}</h2>
          <p>Designation: {employee.designation}</p>
          <p>District: {employee.district}</p>
          <p>Phone: {employee.cell_number}</p>
          {employee.image_url && (
            <img src={employee.image_url} alt="Profile" className="w-32 mt-2" />
          )}
        </div>
      )}
    </div>
  );
};

export default Scanner;
