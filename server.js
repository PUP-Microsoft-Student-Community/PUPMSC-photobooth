// Revert to using the installed dotenv package
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

// Endpoint to handle email sending
app.post('/send-email', upload.single('image'), async (req, res) => {
    const { email } = req.body;
    const imagePath = req.file?.path;

    if (!email) {
        return res.status(400).send('Email is required.');
    }

    if (!imagePath) {
        return res.status(400).send('Image is required.');
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Photobooth Photo Strip',
            text: 'Here is your photo strip from the PUPMSC Photobooth!',
            attachments: [
                {
                    filename: 'photobooth.png',
                    path: imagePath,
                },
            ],
        };

        await transporter.sendMail(mailOptions);

        res.status(200).send('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Failed to send email.');
    } finally {
        if (imagePath) {
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting uploaded image:', unlinkErr);
                }
            });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});