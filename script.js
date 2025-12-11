// Canvas dimensions based on template
const canvasWidth = 1333;
const canvasHeight = 1931;

// Template image positions as percentages (x%, y%, width%, height%)
const imagePositionsPercent = [
    { x: 10, y: 6.7, width: 79.9, height: 26.2 },
    { x: 10, y: 35.2, width: 79.9, height: 26.2 },
    { x: 10, y: 63.6, width: 79.9, height: 26.2 }
];

// Convert percentages to pixels based on canvas size
function getImagePositions() {
    return imagePositionsPercent.map(pos => ({
        x: (pos.x / 100) * canvasWidth,
        y: (pos.y / 100) * canvasHeight,
        width: (pos.width / 100) * canvasWidth,
        height: (pos.height / 100) * canvasHeight
    }));
}

const imagePositions = getImagePositions();

let uploadedImages = [null, null, null];
let stream = null;
let currentPhotoIndex = 0;
let selectedCameraId = null;

// Get DOM elements
const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');
const captureCanvas = document.getElementById('captureCanvas');
const captureCtx = captureCanvas.getContext('2d');
const retakeAllBtn = document.getElementById('retakeAllBtn');
const startCameraBtn = document.getElementById('startCamera');
const cameraFeed = document.getElementById('cameraFeed');
const countdownEl = document.getElementById('countdown');
const retakeBtns = document.querySelectorAll('.retake-btn');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const cameraSelect = document.getElementById('cameraSelect');

// Set canvas size
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Get available cameras
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        cameraSelect.innerHTML = '';
        
        if (videoDevices.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            return;
        }
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        // Set default camera
        selectedCameraId = videoDevices[0].deviceId;
        cameraSelect.value = selectedCameraId;
    } catch (err) {
        console.error('Error getting cameras:', err);
        cameraSelect.innerHTML = '<option value="">Error loading cameras</option>';
    }
}

// Handle camera selection change
cameraSelect.addEventListener('change', async (e) => {
    selectedCameraId = e.target.value;
    
    // If camera is already running, restart with new camera
    if (stream && stream.active) {
        stopCamera();
        await startCameraWithDevice(selectedCameraId);
    }
});

// Start camera with specific device
async function startCameraWithDevice(deviceId) {
    try {
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraFeed.srcObject = stream;
        cameraFeed.classList.add('active');
        startCameraBtn.style.display = 'none';
        return true;
    } catch (err) {
        alert('Could not access camera: ' + err.message);
        return false;
    }
}

// Initialize cameras on page load
getCameras();

// Start camera
startCameraBtn.addEventListener('click', async () => {
    const started = await startCameraWithDevice(selectedCameraId);
    if (started) {
        // Start taking photos automatically
        setTimeout(() => takePhotoSequence(), 1000);
    }
});

// Take photo sequence
async function takePhotoSequence() {
    if (currentPhotoIndex < 3) {
        await countdown();
        capturePhoto(currentPhotoIndex);
        currentPhotoIndex++;
        
        // Wait 2 seconds before next photo
        if (currentPhotoIndex < 3) {
            setTimeout(() => takePhotoSequence(), 2000);
        } else {
            // All photos taken
            stopCamera();
        }
    }
}

// Countdown function
function countdown() {
    return new Promise((resolve) => {
        let count = 3;
        countdownEl.textContent = count;
        countdownEl.classList.add('active');
        
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownEl.textContent = count;
            } else {
                countdownEl.classList.remove('active');
                clearInterval(interval);
                resolve();
            }
        }, 1000);
    });
}

// Capture photo
function capturePhoto(index) {
    captureCanvas.width = cameraFeed.videoWidth;
    captureCanvas.height = cameraFeed.videoHeight;
    captureCtx.drawImage(cameraFeed, 0, 0);
    
    const imageData = captureCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
        uploadedImages[index] = img;
        retakeBtns[index].classList.add('captured');
        retakeBtns[index].disabled = false;
        checkAllImagesLoaded();
        
        // Auto-generate photobooth after each capture
        generatePhotobooth();
    };
    img.src = imageData;
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraFeed.classList.remove('active');
    }
}

// Retake photo - click on button
retakeBtns.forEach((btn, index) => {
    btn.addEventListener('click', async () => {
        if (uploadedImages[index]) {
            currentPhotoIndex = index;
            
            // Restart camera if needed
            if (!stream || !stream.active) {
                const started = await startCameraWithDevice(selectedCameraId);
                if (!started) {
                    return;
                }
            }
            
            // Take new photo for this slot
            setTimeout(async () => {
                await countdown();
                capturePhoto(index);
                currentPhotoIndex = 3; // Reset to prevent auto-sequence
                setTimeout(() => stopCamera(), 1000);
            }, 500);
        }
    });
});

function checkAllImagesLoaded() {
    const allLoaded = uploadedImages.every(img => img !== null);
    submitBtn.disabled = !allLoaded;
}

// Retake all photos
retakeAllBtn.addEventListener('click', async () => {
    // Reset everything
    uploadedImages = [null, null, null];
    currentPhotoIndex = 0;
    
    retakeBtns.forEach(btn => {
        btn.classList.remove('captured');
        btn.disabled = true;
    });
    
    submitBtn.disabled = true;
    
    // Reload template
    const template = new Image();
    template.onload = () => {
        ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
    };
    template.onerror = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    template.src = 'template.png';
    
    // Restart camera
    startCameraBtn.style.display = 'block';
    startCameraBtn.click();
});

function generatePhotobooth() {
    // Load and draw template
    const template = new Image();
    template.onload = () => {
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw template first
        ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
        
        // Draw uploaded images on top
        uploadedImages.forEach((img, index) => {
            if (img) {
                const pos = imagePositions[index];
                // Draw image to fit the rectangle, maintaining aspect ratio
                drawImageScaled(img, pos.x, pos.y, pos.width, pos.height);
            }
        });
    };
    
    template.onerror = () => {
        // If template not found, clear and draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the images
        uploadedImages.forEach((img, index) => {
            if (img) {
                const pos = imagePositions[index];
                drawImageScaled(img, pos.x, pos.y, pos.width, pos.height);
            }
        });
    };
    
    // Try to load template.png if it exists
    template.src = 'template.png';
}

function drawImageScaled(img, x, y, width, height) {
    // Calculate scaling to cover the entire area while maintaining aspect ratio
    const imgAspect = img.width / img.height;
    const boxAspect = width / height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > boxAspect) {
        // Image is wider than box
        drawHeight = height;
        drawWidth = img.width * (height / img.height);
        offsetX = (drawWidth - width) / 2;
        offsetY = 0;
    } else {
        // Image is taller than box
        drawWidth = width;
        drawHeight = img.height * (width / img.width);
        offsetX = 0;
        offsetY = (drawHeight - height) / 2;
    }

    // Save context state
    ctx.save();
    
    // Create clipping region
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Draw image
    ctx.drawImage(img, x - offsetX, y - offsetY, drawWidth, drawHeight);

    // Restore context state
    ctx.restore();

    // Draw border
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
}

// Email submission
submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    
    if (!email || !emailInput.validity.valid) {
        alert('Please enter a valid email address');
        return;
    }
    
    if (!uploadedImages.every(img => img !== null)) {
        alert('Please capture all photos first');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('image', blob, 'photobooth.png');
            
            // Send to n8n webhook
            const response = await fetch('https://n8n.vscp.dev/webhook-test/0564d45c-0667-4885-a3ba-5d28115dd2e8', {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
            
            // With no-cors mode, we can't read the response, so just assume success
            successMessage.classList.add('show');
            emailInput.value = '';
            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 3000);
            
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Error sending email: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send to Email';
        }
    }, 'image/png');
});

// Initialize
submitBtn.disabled = true;

// Load and display template on page load
const templateImg = new Image();
templateImg.onload = () => {
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
};
templateImg.onerror = () => {
    // If template not found, show white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};
templateImg.src = 'template.png';
