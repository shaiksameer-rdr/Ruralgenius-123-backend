const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { db, initDb } = require('./db');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Login failed' });
      }
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      if (user.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword,
        token: token
      });
    }
  );
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, phone, location, education, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, existingUser) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Registration failed' });
      }
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      const createdAt = new Date().toISOString();
      db.run(
        'INSERT INTO users (firstName, lastName, email, phone, location, education, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, email, phone, location, education, password, createdAt],
        function (err) {
          if (err) {
            return res.status(500).json({ success: false, error: 'Registration failed' });
          }
          const token = crypto.randomBytes(32).toString('hex');
          res.status(201).json({
            success: true,
            user: {
              id: this.lastID,
              firstName,
              lastName,
              email,
              phone,
              location,
              education,
              createdAt
            },
            token: token
          });
        }
      );
    }
  );
});

// Courses API
app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }
    res.json(rows);
  });
});

app.post('/api/courses', (req, res) => {
  const { title, instructor, duration, level, price, rating, students, category, image } = req.body;
  db.run(
    'INSERT INTO courses (title, instructor, duration, level, price, rating, students, category, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, instructor, duration, level, price, rating, students, category, image],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create course' });
      }
      res.status(201).json({
        id: this.lastID,
        title,
        instructor,
        duration,
        level,
        price,
        rating,
        students,
        category,
        image
      });
    }
  );
});

// Users API
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows);
  });
});

app.post('/api/users/register', (req, res) => {
  const { firstName, lastName, email, phone, location, education, password } = req.body;
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO users (firstName, lastName, email, phone, location, education, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [firstName, lastName, email, phone, location, education, password, createdAt],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to register user' });
      }
      res.status(201).json({
        message: 'User registered successfully',
        userId: this.lastID
      });
    }
  );
});

// Partnerships API
app.get('/api/partnerships', (req, res) => {
  db.all('SELECT * FROM partnerships', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch partnerships' });
    }
    res.json(rows);
  });
});

app.post('/api/partnerships', (req, res) => {
  const { name, email, organization, message } = req.body;
  const createdAt = new Date().toISOString();
  const status = 'pending';
  db.run(
    'INSERT INTO partnerships (name, email, organization, message, createdAt, status) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, organization, message, createdAt, status],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to submit partnership request' });
      }
      res.status(201).json({ message: 'Partnership request submitted successfully', partnershipId: this.lastID });
    }
  );
});

// Donations API
app.get('/api/donations', (req, res) => {
  db.all('SELECT * FROM donations', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch donations' });
    }
    res.json(rows);
  });
});

app.post('/api/donations', (req, res) => {
  const { name, email, amount, message } = req.body;
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO donations (name, email, amount, message, createdAt) VALUES (?, ?, ?, ?, ?)',
    [name, email, amount, message, createdAt],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to record donation' });
      }
      res.status(201).json({ message: 'Donation recorded successfully', donationId: this.lastID });
    }
  );
});

// Course enrollment API
app.post('/api/courses/:id/enroll', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { userId } = req.body;
    
    // You can add enrollment logic here
    // For now, just return success
    res.json({ message: 'Enrolled successfully', courseId, userId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Newsletter Subscription API
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // Configure nodemailer transporter (replace with your real Gmail credentials)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'yourgmail@gmail.com', // <-- apna Gmail yahan dalein
      pass: 'yourapppassword'      // <-- Gmail app password yahan dalein
    }
  });

  // Email content for user
  const mailOptions = {
    from: 'yourgmail@gmail.com',
    to: email,
    subject: 'Welcome to Rural Genius Newsletter!',
    text: 'Thank you for subscribing! You will now receive updates about our courses and news.'
  };

  // Email content for admin notification
  const adminMailOptions = {
    from: 'yourgmail@gmail.com',
    to: 'ruralgeniusinfo@gmail.com',
    subject: 'New Newsletter Subscription',
    text: `A new user subscribed: ${email}`
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(adminMailOptions);
    res.json({ success: true, message: 'Subscription successful! Confirmation email sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Partner With Us Form Email API
app.post('/api/send-partner-form', async (req, res) => {
  const { type, name, email, phone, organization, message } = req.body;
  if (!type || !name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ruralgeniusinfo@gmail.com', // <-- apna Gmail yahan dalein
      pass: 'sam1805117955'      // <-- Gmail app password yahan dalein
    }
  });
  // ====== END OF IMPORTANT SECTION ======

  // Email content
  const mailOptions = {
    from: 'ruralgeniusinfo@gmail.com',
    to: 'ruralgeniusinfo@gmail.com',
    subject: `New Partner With Us Form Submission: ${type}`,
    text: `Type: ${type}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nOrganization: ${organization || 'N/A'}\nMessage: ${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Form submitted successfully! Email sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// ====== AI Job Application Email API ======
app.post('/api/apply-ai-role', async (req, res) => {
  const { name, email, phone, resumeLink, message, toEmail } = req.body;
  if (!name || !email || !message || !toEmail) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ruralgeniusinfo@gmail.com', // <-- apna Gmail yahan dalein
      pass: 'sam1805117955'      // <-- Gmail app password yahan dalein
    }
  });
  // ====== END OF IMPORTANT SECTION ======

  // Email content
  const mailOptions = {
    from: 'ruralgeniusinfo@gmail.com',
    to: toEmail,
    subject: `New AI Job Application from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nResume Link: ${resumeLink || 'N/A'}\nMessage: ${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Application submitted successfully! Email sent to company.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// ====== Live Session Registration API ======
app.post('/api/live-session-register', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[\w.+-]+@gmail\.com$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid Gmail address is required' });
  }

  // Ensure table exists
  db.run(
    'CREATE TABLE IF NOT EXISTS live_session_registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, registeredAt TEXT)',
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to initialize registration table' });
      }
      // Insert registration
      const registeredAt = new Date().toISOString();
      db.run(
        'INSERT OR IGNORE INTO live_session_registrations (email, registeredAt) VALUES (?, ?)',
        [email, registeredAt],
        function (err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to register email' });
          }
          // Send admin notification
          // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'ruralgeniusinfo@gmail.com', // <-- apna Gmail yahan dalein
              pass: 'sam1805117955'      // <-- Gmail app password yahan dalein
            }
          });
          // ====== END OF IMPORTANT SECTION ======
          const mailOptions = {
            from: 'ruralgeniusinfo@gmail.com',
            to: 'ruralgeniusinfo@gmail.com',
            subject: 'New Live Session Registration',
            text: `A new user registered for live sessions: ${email}`
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              return res.status(200).json({ success: true, message: 'Registered, but failed to send admin email.' });
            }
            res.json({ success: true, message: 'Registered successfully! Admin notified.' });
          });
        }
      );
    }
  );
});

// ====== Notify All Registered Users About Live Session ======
app.post('/api/notify-live-session', async (req, res) => {
  const { title, date, time, link } = req.body;
  if (!title || !date || !time || !link) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  db.all('SELECT email FROM live_session_registrations', [], async (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch registered emails' });
    }
    if (!rows.length) {
      return res.status(200).json({ success: false, message: 'No registered users found.' });
    }

    // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ruralgeniusinfo@gmail.com', // <-- apna Gmail yahan dalein
        pass: 'sam1805117955'      // <-- Gmail app password yahan dalein
      }
    });
    // ====== END OF IMPORTANT SECTION ======

    const subject = `Upcoming Live Session - ${title}`;
    const text = `Dear Learner,\n\nYou are invited to our upcoming live session!\n\nTopic: ${title}\nDate: ${date}\nTime: ${time}\nJoin Link: ${link}\n\nSee you there!\n`;

    let sent = 0;
    let failed = 0;
    let errors = [];
    for (const row of rows) {
      const mailOptions = {
        from: 'ruralgeniusinfo@gmail.com',
        to: row.email,
        subject,
        text
      };
      try {
        await transporter.sendMail(mailOptions);
        sent++;
      } catch (error) {
        failed++;
        errors.push({ email: row.email, error: error.message });
      }
    }
    res.json({ success: true, message: `Emails sent: ${sent}, failed: ${failed}`, errors });
  });
});

// ====== Refer a Student API ======
app.post('/api/refer-student', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required' });
  }
  // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ruralgeniusinfo@gmail.com',
      pass: 'sam1805117955'
    }
  });
  // ====== END OF IMPORTANT SECTION ======
  const mailOptions = {
    from: 'ruralgeniusinfo@gmail.com',
    to: 'ruralgeniusinfo@gmail.com',
    subject: 'New Student Referral',
    text: `Student Name: ${name}\nPhone: ${phone}`
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Student referred successfully! We will contact them soon.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// ====== Volunteer With Us API ======
app.post('/api/volunteer', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required' });
  }
  // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ruralgeniusinfo@gmail.com',
      pass: 'sam1805117955'
    }
  });
  // ====== END OF IMPORTANT SECTION ======
  const mailOptions = {
    from: 'ruralgeniusinfo@gmail.com',
    to: 'ruralgeniusinfo@gmail.com',
    subject: 'New Volunteer Registration',
    text: `Volunteer Name: ${name}\nPhone: ${phone}`
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Thank you for volunteering! We will contact you soon.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// ====== Become a Partner Help API ======
app.post('/api/become-partner-help', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }
  // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ruralgeniusinfo@gmail.com',
      pass: 'sam1805117955'
    }
  });
  // ====== END OF IMPORTANT SECTION ======
  const mailOptions = {
    from: 'ruralgeniusinfo@gmail.com',
    to: 'ruralgeniusinfo@gmail.com',
    subject: 'New Partner Help Submission',
    text: `Partner Help Message:\n${message}`
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Thank you for your interest! We will contact you soon.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// ====== Contact Us Message API ======
app.post('/api/contact/send-message', upload.single('file'), async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  // file is available as req.file
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
  }
  // ====== IMPORTANT: Update your Gmail and App Password below for nodemailer ======
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ruralgeniusinfo@gmail.com',
      pass: 'sam1805117955'
    }
  });
  // ====== END OF IMPORTANT SECTION ======
  const mailOptions = {
    from: 'ruralgeniusinfo@gmail.com',
    to: 'ruralgeniusinfo@gmail.com',
    subject: `New Contact Us Message${subject ? ' - ' + subject : ''}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nSubject: ${subject || 'N/A'}\nMessage: ${message}`,
    attachments: req.file ? [
      {
        filename: req.file.originalname,
        content: req.file.buffer
      }
    ] : []
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Message sent successfully! We will contact you soon.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Start server
async function startServer() {
  initDb();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Data will be stored in SQLite database in backend/data/app.db');
  });
}

startServer().catch(console.error);
