
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
var app = express.Router();
const pool = require('./database.js');
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Utility functions
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

app.use('/qr_codes', express.static(path.join(process.cwd(), 'config/qr_codes')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Upload Excel file
app.post('/upload', upload.single('file'), async (req, res) => {
  let conn;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.filename);

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false, header: 1 });

    const headers = data[0].map(h => h.toString().trim().replace(/\s+/g, ' '));
    const records = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((key, i) => {
        obj[key] = row[i] || '';
      });
      return obj;
    });


    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Create QR codes directory
    const qrDir = path.join(__dirname, 'qr_codes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    let processedCount = 0;

    for (const [index, emp] of records.entries()) {
      try {
        // Generate unique ID if not provided
        let uniqueId = emp['Unique ID'] || emp['unique_id'] || generateUniqueId();
        uniqueId = String(uniqueId).trim();

        // Generate QR code
        const qrData = `https://a1codes.in/tvk/${uniqueId}`;
        const qrFilename = `qr_${sanitizeFilename(uniqueId)}_${Date.now()}.png`;
        const qrPath = path.join(qrDir, qrFilename);

        await QRCode.toFile(qrPath, qrData, {
          width: 256,
          margin: 2
        });

        // Insert employee data
        await conn.query(`
          INSERT INTO employees (unique_id, name, designation, constituency, district, cell_number, image_url, qr_code_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            designation = VALUES(designation),
            constituency = VALUES(constituency),
            district = VALUES(district),
            cell_number = VALUES(cell_number),
            image_url = VALUES(image_url),
            qr_code_url = VALUES(qr_code_url)
        `, [
          uniqueId,
          emp['Name'] || emp.name || '',
          emp.Designation || emp.designation || '',
          emp.Constituency || emp.constituency || '',
          emp.District || emp.district || '',
          emp['Cell Number'] || emp.cell_number || emp.phone || '',
          emp.Image || emp.image || '',
          `/qr_codes/${qrFilename}`
        ]);

        processedCount++;
        console.log(`Processed ${index + 1}/${data.length}`);

      } catch (rowError) {
        console.error(`Error processing row ${index + 1}:`, rowError);
      }
    }

    await conn.commit();
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ 
      message: 'Upload successful',
      processed: processedCount,
      total: data.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (conn) {
      await conn.rollback();
    }
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Upload failed' });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

// Get all employees
app.get('/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get employee by unique ID
app.get('/employees/unique/:unique_id', async (req, res) => {
  try {
    const { unique_id } = req.params;
    
    const [rows] = await pool.query(
      'SELECT * FROM employees WHERE unique_id = ?', 
      [unique_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Batch download QR codes
app.get('/employees/batch-download', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'No employee IDs provided' });
    }

    const idList = ids.split(',');
    const [rows] = await pool.query('SELECT * FROM employees WHERE id IN (?)', [idList]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No employees found' });
    }

    // Create a zip file containing all QR codes
    const zip = new JSZip();
    const qrDir = path.join(__dirname, 'qr_codes');

    for (const emp of rows) {
      if (emp.qr_code_url) {
        const qrPath = path.join(__dirname, emp.qr_code_url);
        if (fs.existsSync(qrPath)) {
          const qrData = fs.readFileSync(qrPath);
          const filename = `${emp.unique_id}.png`;
          zip.file(filename, qrData);
        }
      }
    }

    const zipData = await zip.generateAsync({ type: 'nodebuffer' });
    
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', 'attachment; filename="qr_codes.zip"');
    res.send(zipData);

  } catch (error) {
    console.error('Batch download error:', error);
    res.status(500).json({ error: 'Failed to prepare batch download' });
  }
});

// Delete employee
app.delete('/employees/:id', async (req, res) => {
  let conn;
  
  try {
    const { id } = req.params;
    
    conn = await pool.getConnection();
    
    // Get employee to delete QR file
    const [rows] = await conn.query('SELECT * FROM employees WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = rows[0];
    
    // Delete from database
    await conn.query('DELETE FROM employees WHERE id = ?', [id]);
    
    // Delete QR code file
    if (employee.qr_code_url) {
      const qrPath = path.join(__dirname, employee.qr_code_url);
      if (fs.existsSync(qrPath)) {
        fs.unlinkSync(qrPath);
      }
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  } finally {
    // if (conn) {
    //   conn.release();
    // }
  }
});

// Update employee by ID
app.put('/employees/:id', async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { name, designation, constituency, district, cell_number, image_url } = req.body;

    conn = await pool.getConnection();

    // Check if employee exists
    const [rows] = await conn.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await conn.query(`
      UPDATE employees SET 
        name = ?, designation = ?, constituency = ?, district = ?, cell_number = ?, image_url = ?
      WHERE id = ?
    `, [name, designation, constituency, district, cell_number, image_url, id]);

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = app;