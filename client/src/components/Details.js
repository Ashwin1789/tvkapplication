import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const convertGoogleDriveUrl = (url) => {
  const match = url.match(/\/d\/([^/]+)\//);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}`;
  }
  return url;
};

const Details = () => {
  const { unique_id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(
          `http://localhost:5000/api/employees/unique/${unique_id}`
        );
        setEmployee(response.data);
      } catch (err) {
        console.error('Error fetching employee:', err);
        if (err.response && err.response.status === 404) {
          setError('Candidate not found');
        } else {
          setError('Failed to load candidate details');
        }
      } finally {
        setLoading(false);
      }
    };

    if (unique_id) {
      fetchEmployee();
    }
  }, [unique_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-red-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-yellow-100 max-w-xl mx-auto rounded-lg shadow-lg mt-10">
        <div className="text-center">
          <p className="text-red-600 text-xl font-semibold mb-4">{error}</p>
          
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 bg-yellow-100 max-w-xl mx-auto rounded-lg shadow-lg mt-10">
        <p className="text-center text-red-500 font-medium">No candidate data available</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-yellow-50 max-w-3xl mx-auto rounded-xl shadow-2xl mt-10 border-4 border-red-400">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-red-700 mb-2 tracking-wide">
         {employee.name ? `பெயர்: ${employee.name}` : 'தெரியவில்லை'}
        </h1>
        <p className="text-yellow-700 text-lg font-semibold uppercase tracking-wider">
          வேட்பாளர் விவரங்கள் ( Candidate Details )
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {[
            { label: 'பதவி ( Designation )', value: employee.designation },
            { label: 'தொகுதி ( Constituency )', value: employee.constituency },
            { label: 'மாவட்டம் ( District )', value: employee.district },
            { label: 'Unique ID', value: employee.unique_id, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <label className="block text-red-700 font-semibold mb-2 text-lg">
                {label}
              </label>
              <p
                className={`p-4 rounded-lg ${
                  mono ? 'font-mono text-sm' : ''
                } bg-red-100 text-red-900 shadow-inner`}
              >
                {value || 'Not specified'}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {employee.qr_code_url && (
            <div>
              <label className="block text-red-700 font-semibold mb-2 text-lg">
                QR Code
              </label>
              <div className="bg-red-100 p-6 rounded-lg text-center shadow-inner">
                <img
                  src={`http://localhost:5000${employee.qr_code_url}`}
                  alt="QR Code"
                  className="w-36 h-36 mx-auto border-4 border-yellow-400 rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div
                  className="w-36 h-36 mx-auto bg-yellow-200 flex items-center justify-center text-red-500 text-sm rounded-lg"
                  style={{ display: 'none' }}
                >
                  QR Code not available
                </div>
              </div>
            </div>
          )}

          {employee.image_url && (
            <div>
              <label className="block text-red-700 font-semibold mb-2 text-lg">
                Photo
              </label>
              <div className="bg-red-100 p-6 rounded-lg text-center shadow-inner">
                <img
                  src={convertGoogleDriveUrl(employee.image_url)}
                  alt="Candidate"
                  className="w-36 h-36 mx-auto object-cover rounded-lg border-4 border-yellow-400"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div
                  className="w-36 h-36 mx-auto bg-yellow-200 flex items-center justify-center text-red-500 text-sm rounded-lg"
                  style={{ display: 'none' }}
                >
                  Photo not available
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Details;