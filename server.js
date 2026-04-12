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

// Endpoint to handle email sending
app.post('/send-email', upload.single('image'), async (req, res) => {
    const { email } = req.body;
    const imagePath = req.file.path;

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

        // Delete the uploaded file after sending
        fs.unlinkSync(imagePath);

        res.status(200).send('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Failed to send email.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});