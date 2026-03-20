
// ===== CONFIGURATION =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFi7wP5Xv4yjB6azaM21ZrSb4aQfHN77pqvEelwFnRFhs-AzEmd-9sCOATQQk2A-A/exec'; // Replace with your Web App URL after deploying

// ===== ANIMATED COUNTERS =====
function animateCounter(el, target, suffix = '+') {
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current + suffix;
  }, 30);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(document.getElementById('statTrips'), 500, '+');
      animateCounter(document.getElementById('statRoutes'), 15, '+');
      observer.disconnect();
    }
  });
}, { threshold: 0.5 });
observer.observe(document.querySelector('.stats-bar'));

// ===== LIVE TIMESTAMP =====
function updateTime() {
  const now = new Date();
  const str = now.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
  document.getElementById('liveTime').textContent = str;
  document.getElementById('currentTime').textContent = str;
}
setInterval(updateTime, 1000);
updateTime();

// ===== GPS =====
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('gpsLocation').textContent =
        pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
    },
    () => { document.getElementById('gpsLocation').textContent = 'Location unavailable'; }
  );
} else {
  document.getElementById('gpsLocation').textContent = 'Not supported';
}

// ===== FORM NAVIGATION =====
let currentStep = 1;

function goToStep(step) {
  if (step === 3) buildReview();
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.progress-step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sn < step) s.classList.add('done');
    if (sn === step) s.classList.add('active');
  });
  document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
  currentStep = step;
}

// ===== FILE UPLOAD =====
function handleUpload(input, previewId) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById(previewId);
  const thumb = preview.querySelector('img');
  const info = preview.querySelector('.file-info');
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { thumb.src = e.target.result; };
    reader.readAsDataURL(file);
  } else {
    thumb.src = '';
    thumb.style.display = 'none';
  }
  info.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
  preview.classList.add('show');
}

function removeFile(inputId, previewId) {
  document.getElementById(inputId).value = '';
  document.getElementById(previewId).classList.remove('show');
}

// Drag & drop
document.querySelectorAll('.upload-zone').forEach(zone => {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const input = zone.nextElementSibling;
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
});

// ===== IMAGE COMPRESSION =====
function compressImage(file, quality = 0.7, maxWidth = 1024) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      // Not an image, so we can't compress it
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            // Create a new file with the compressed data
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

// ===== REVIEW =====
function buildReview() {
  const fields = [
    ['Driver Name', document.getElementById('driverName').value || '—'],
    ['Truck Number', document.getElementById('truckNo').value || '—'],
    ['Phone', document.getElementById('phone').value || '—'],
    ['Route', document.getElementById('route').value || '—'],
    ['Cargo Type', document.getElementById('cargoType').value || '—'],
    ['GPS', document.getElementById('gpsLocation').textContent],
    ['Timestamp', document.getElementById('currentTime').textContent],
    ['Photo', document.getElementById('photoInput').files[0]?.name || 'Not uploaded'],
    ['Document 1', document.getElementById('doc1Input').files[0]?.name || 'Not uploaded'],
    ['Document 2', document.getElementById('doc2Input').files[0]?.name || 'Not uploaded'],
  ];
  const grid = document.getElementById('reviewGrid');
  grid.innerHTML = fields.map(([l, v]) =>
    `<div class="review-item"><span class="rlabel">${l}</span><span class="rvalue">${v}</span></div>`
  ).join('');
}

// ===== FILE CONVERSION =====
function toBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
      base64: reader.result,
      type: file.type,
      name: file.name
    });
    reader.onerror = error => reject(error);
  });
}

// ===== SUBMIT =====
async function submitTrip() {
  const check = document.getElementById('declarationCheck');
  if (!check.checked) {
    alert('Please accept the declaration before submitting.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const originalBtnText = submitBtn.textContent;
  
  try {
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing... ⌛';

    // Generate Trip ID
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(10000 + Math.random() * 90000);
    const tripId = `BGR-${dateStr}-${rand}`;

    // Collect and Compress Form Data
    const photoInput = document.getElementById('photoInput').files[0];
    const doc1Input = document.getElementById('doc1Input').files[0];
    const doc2Input = document.getElementById('doc2Input').files[0];

    const [compressedPhoto, compressedDoc1, compressedDoc2] = await Promise.all([
      photoInput ? compressImage(photoInput) : null,
      doc1Input ? compressImage(doc1Input) : null,
      doc2Input ? compressImage(doc2Input) : null,
    ]);

    const payload = {
      tripId: tripId,
      driverName: document.getElementById('driverName').value,
      truckNo: document.getElementById('truckNo').value,
      phone: document.getElementById('phone').value,
      route: document.getElementById('route').value,
      cargoType: document.getElementById('cargoType').value,
      gps: document.getElementById('gpsLocation').textContent,
      timestamp: document.getElementById('currentTime').textContent,
      photoFile: await toBase64(compressedPhoto),
      doc1File: await toBase64(compressedDoc1),
      doc2File: await toBase64(compressedDoc2),
    };

    if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      console.warn('Apps Script URL not set. Submission will only show success locally.');
      // Simulating network delay for local demo
      await new Promise(r => setTimeout(r, 1500));
    } else {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors for direct POST or handling redirects
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Note: with no-cors, you won't get the JSON result back, but the data is sent.
      // For a better implementation, use a redirect or a proxy if needed.
    }

    // Success UI Update
    document.getElementById('tripIdDisplay').textContent = tripId;
    document.querySelector('.form-body').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('successScreen').classList.add('show');

  } catch (error) {
    console.error('Submission failed:', error);
    alert('Something went wrong. Please try again or check your internet connection.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

function resetForm() {
  document.querySelector('.form-body').style.display = 'block';
  document.querySelector('.progress-bar').style.display = 'flex';
  document.getElementById('successScreen').classList.remove('show');
  document.getElementById('declarationCheck').checked = false;
  document.querySelectorAll('input[type="text"], input[type="tel"]').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.querySelectorAll('.upload-preview').forEach(p => p.classList.remove('show'));
  goToStep(1);
}

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.collab-card, .service-card, .route-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  revealObserver.observe(el);
});

// ===== SMOOTH SCROLL HANDLER =====
// This avoids "Unsafe attempt to load URL" errors in local file:// environments
// while also providing a smoother navigation experience.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Close mobile menu if open
      document.getElementById('navLinks').classList.remove('open');
    }
  });
});
