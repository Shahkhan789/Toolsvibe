/**
 * OCR Tool JavaScript - Tools Vibe
 * Advanced Image to Text converter with OCR capabilities
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const previewSection = document.getElementById('preview-section');
    const previewImage = document.getElementById('preview-image');
    const imageContainer = document.querySelector('.image-container');
    const resultText = document.getElementById('result-text');
    const progressSection = document.getElementById('progress-section');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('status-text');
    const actionButtons = document.getElementById('action-buttons');
    const extractBtn = document.getElementById('extract-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const retryBtn = document.getElementById('retry-btn');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const languageSelect = document.getElementById('language-select');
    const preserveFormatting = document.getElementById('preserve-formatting');
    
    // Zoom functionality elements
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    
    // State variables
    let currentFile = null;
    let extractedText = '';
    let currentZoom = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    // Initialize
    init();

    function init() {
        hideError();
        setupEventListeners();
        setupKeyboardNavigation();
    }

    function setupEventListeners() {
        // Upload area events
        browseBtn.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('click', handleUploadAreaClick);
        uploadArea.addEventListener('keydown', handleUploadAreaKeydown);
        
        // File input
        fileInput.addEventListener('change', handleFileSelect);
        
        // Drag and drop
        setupDragAndDrop();
        
        // Action buttons
        extractBtn.addEventListener('click', extractText);
        clearBtn.addEventListener('click', clearAll);
        copyBtn.addEventListener('click', copyText);
        downloadBtn.addEventListener('click', downloadText);
        retryBtn.addEventListener('click', retryExtraction);
        
        // Zoom controls
        zoomInBtn.addEventListener('click', () => zoomImage(1.2));
        zoomOutBtn.addEventListener('click', () => zoomImage(0.8));
        zoomResetBtn.addEventListener('click', resetZoom);
        
        // Image pan functionality
        previewImage.addEventListener('mousedown', startPan);
        previewImage.addEventListener('mousemove', handlePan);
        previewImage.addEventListener('mouseup', endPan);
        previewImage.addEventListener('mouseleave', endPan);
        
        // Touch events for mobile
        previewImage.addEventListener('touchstart', handleTouchStart, { passive: false });
        previewImage.addEventListener('touchmove', handleTouchMove, { passive: false });
        previewImage.addEventListener('touchend', endPan);
        
        // Language change
        languageSelect.addEventListener('change', handleLanguageChange);
        
        // Formatting toggle
        preserveFormatting.addEventListener('change', updateTextDisplay);
    }

    function setupKeyboardNavigation() {
        // Allow Enter/Space to trigger upload area
        uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
    }

    function setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlightDropArea, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlightDropArea, false);
        });

        uploadArea.addEventListener('drop', handleDrop, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlightDropArea() {
        uploadArea.classList.add('dragover');
    }

    function unhighlightDropArea() {
        uploadArea.classList.remove('dragover');
    }

    function handleUploadAreaClick(e) {
        if (e.target === uploadArea || e.target.closest('.upload-text')) {
            fileInput.click();
        }
    }

    function handleUploadAreaKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    }

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        hideError();
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            showError('Please select a valid image file (JPG, PNG, GIF, BMP, WEBP)');
            return;
        }
        
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showError('Image size exceeds 10MB limit. Please choose a smaller file.');
            return;
        }
        
        currentFile = file;
        loadImagePreview(file);
    }

    function loadImagePreview(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.onload = function() {
                previewSection.style.display = 'block';
                actionButtons.style.display = 'flex';
                resetZoom();
                
                // Auto-extract if enabled
                if (shouldAutoExtract()) {
                    setTimeout(extractText, 500);
                }
            };
        };
        
        reader.onerror = function() {
            showError('Error loading image. Please try another file.');
        };
        
        reader.readAsDataURL(file);
    }

    function shouldAutoExtract() {
        // Auto-extract for small images or if user preference is set
        return currentFile && currentFile.size < 1024 * 1024; // Auto-extract for files < 1MB
    }

    function extractText() {
        if (!currentFile || !previewImage.src) {
            showError('Please upload an image first');
            return;
        }

        hideError();
        showProgress();
        
        const selectedLanguage = languageSelect.value;
        
        // Update progress
        updateProgress(0, 'Initializing OCR engine...');
        
        // Use Tesseract.js for OCR
        Tesseract.recognize(
            previewImage.src,
            selectedLanguage,
            {
                logger: handleOCRProgress
            }
        ).then(({ data: { text, confidence } }) => {
            extractedText = text;
            displayExtractedText(text, confidence);
            hideProgress();
            showSuccessMessage();
            
        }).catch(error => {
            console.error('OCR Error:', error);
            handleOCRError(error);
            hideProgress();
        });
    }

    function handleOCRProgress(progress) {
        if (progress.status === 'recognizing text') {
            const percentage = Math.floor(progress.progress * 100);
            updateProgress(percentage, `Processing: ${percentage}% complete`);
        } else {
            updateProgress(10, progress.status);
        }
    }

    function updateProgress(percentage, status) {
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);
        statusText.textContent = status;
    }

    function displayExtractedText(text, confidence = null) {
        if (!text || text.trim() === '') {
            resultText.innerHTML = '<p class="placeholder-text">No text found in the image</p>';
            return;
        }

        const preserveFormat = preserveFormatting.checked;
        const displayText = preserveFormat ? text : text.replace(/\n+/g, ' ').trim();
        
        if (preserveFormat) {
            resultText.innerHTML = `<pre>${escapeHtml(displayText)}</pre>`;
        } else {
            resultText.innerHTML = `<p>${escapeHtml(displayText)}</p>`;
        }

        // Add confidence indicator if available
        if (confidence !== null) {
            const confidenceBar = document.createElement('div');
            confidenceBar.className = 'confidence-indicator';
            confidenceBar.innerHTML = `
                <small>Confidence: ${Math.round(confidence)}%</small>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            `;
            resultText.appendChild(confidenceBar);
        }
    }

    function updateTextDisplay() {
        if (extractedText) {
            displayExtractedText(extractedText);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function copyText() {
        if (!extractedText || extractedText.trim() === '') {
            showError('No text to copy!');
            return;
        }

        navigator.clipboard.writeText(extractedText).then(() => {
            showTemporaryButtonText(copyBtn, '<i class="fas fa-check" aria-hidden="true"></i> Copied!', 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
            // Fallback for older browsers
            fallbackCopyText(extractedText);
        });
    }

    function fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showTemporaryButtonText(copyBtn, '<i class="fas fa-check" aria-hidden="true"></i> Copied!', 2000);
            } else {
                showError('Unable to copy text. Please select and copy manually.');
            }
        } catch (err) {
            showError('Copy not supported. Please select and copy manually.');
        }
        
        document.body.removeChild(textArea);
    }

    function downloadText() {
        if (!extractedText || extractedText.trim() === '') {
            showError('No text to download!');
            return;
        }

        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = generateFileName();
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
        
        showTemporaryButtonText(downloadBtn, '<i class="fas fa-check" aria-hidden="true"></i> Downloaded!', 2000);
    }

    function generateFileName() {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
        const originalName = currentFile ? currentFile.name.split('.')[0] : 'extracted_text';
        return `${originalName}_${timestamp}.txt`;
    }

    function clearAll() {
        // Reset all states
        currentFile = null;
        extractedText = '';
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        
        // Reset UI
        fileInput.value = '';
        previewImage.src = '';
        previewSection.style.display = 'none';
        actionButtons.style.display = 'none';
        progressSection.style.display = 'none';
        hideError();
        
        // Reset language to English
        languageSelect.value = 'eng';
        
        // Reset formatting option
        preserveFormatting.checked = true;
        
        // Focus back to upload area
        uploadArea.focus();
    }

    function retryExtraction() {
        if (currentFile && previewImage.src) {
            extractText();
        } else {
            showError('Please upload an image first');
        }
    }

    function handleLanguageChange() {
        // If text has already been extracted, offer to re-extract with new language
        if (extractedText && extractedText.trim() !== '') {
            if (confirm('Re-extract text with the new language?')) {
                extractText();
            }
        }
    }

    // Zoom functionality
    function zoomImage(factor) {
        currentZoom *= factor;
        currentZoom = Math.max(0.5, Math.min(currentZoom, 3)); // Limit zoom between 0.5x and 3x
        updateImageTransform();
    }

    function resetZoom() {
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        updateImageTransform();
    }

    function updateImageTransform() {
        previewImage.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
    }

    // Pan functionality
    function startPan(e) {
        if (currentZoom > 1) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            previewImage.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    function handlePan(e) {
        if (isDragging && currentZoom > 1) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateImageTransform();
            e.preventDefault();
        }
    }

    function endPan() {
        isDragging = false;
        previewImage.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    }

    // Touch events for mobile pan
    function handleTouchStart(e) {
        if (currentZoom > 1 && e.touches.length === 1) {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - translateX;
            startY = touch.clientY - translateY;
            e.preventDefault();
        }
    }

    function handleTouchMove(e) {
        if (isDragging && currentZoom > 1 && e.touches.length === 1) {
            const touch = e.touches[0];
            translateX = touch.clientX - startX;
            translateY = touch.clientY - startY;
            updateImageTransform();
            e.preventDefault();
        }
    }

    // Utility functions
    function showProgress() {
        progressSection.style.display = 'block';
        retryBtn.style.display = 'none';
        updateProgress(0, 'Initializing...');
    }

    function hideProgress() {
        progressSection.style.display = 'none';
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        retryBtn.style.display = 'inline-flex';
        
        // Announce error to screen readers
        errorMessage.setAttribute('aria-live', 'assertive');
        setTimeout(() => {
            errorMessage.setAttribute('aria-live', 'polite');
        }, 1000);
    }

    function hideError() {
        errorMessage.style.display = 'none';
        retryBtn.style.display = 'none';
    }

    function showSuccessMessage() {
        showTemporaryButtonText(extractBtn, '<i class="fas fa-check" aria-hidden="true"></i> Text Extracted!', 2000);
    }

    function showTemporaryButtonText(button, newText, duration) {
        const originalText = button.innerHTML;
        button.innerHTML = newText;
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, duration);
    }

    function handleOCRError(error) {
        let errorMsg = 'Error processing image. Please try another image.';
        
        if (error.message.includes('Failed to fetch')) {
            errorMsg = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Invalid image')) {
            errorMsg = 'Invalid image format. Please use JPG, PNG, GIF, BMP, or WEBP.';
        } else if (error.message.includes('Out of memory')) {
            errorMsg = 'Image too large. Please use a smaller image.';
        }
        
        showError(errorMsg);
        console.error('OCR processing failed:', error);
    }

    // Performance optimization
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Enhanced error handling for network issues
    window.addEventListener('online', () => {
        if (document.querySelector('.network-error')) {
            hideError();
        }
    });

    window.addEventListener('offline', () => {
        showError('You are offline. OCR processing requires an internet connection.');
        errorMessage.classList.add('network-error');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + V to paste image (if supported)
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            handlePasteImage(e);
        }
        
        // Ctrl/Cmd + C to copy text
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && extractedText) {
            e.preventDefault();
            copyText();
        }
        
        // Escape to clear
        if (e.key === 'Escape') {
            clearAll();
        }
    });

    function handlePasteImage(e) {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            return; // Clipboard API not supported
        }
        
        e.preventDefault();
        
        navigator.clipboard.read().then(items => {
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        item.getType(type).then(blob => {
                            const file = new File([blob], 'pasted-image.' + type.split('/')[1], { type });
                            handleFile(file);
                        });
                        return;
                    }
                }
            }
        }).catch(err => {
            console.log('Paste not available:', err);
        });
    }

    // Initialize intersection observer for performance
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, observerOptions);

    // Observe elements for animations
    document.querySelectorAll('.feature, .info-section').forEach(el => {
        observer.observe(el);
    });

    // Add confidence indicator styles
    const confidenceStyles = `
        .confidence-indicator {
            margin-top: 15px;
            padding: 10px;
            background: #f0f8ff;
            border-radius: 8px;
            border-left: 3px solid #2196f3;
        }
        .confidence-bar {
            width: 100%;
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 5px;
        }
        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #f44336, #ff9800, #4caf50);
            transition: width 0.3s ease;
        }
    `;

    // Inject additional styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = confidenceStyles;
    document.head.appendChild(styleSheet);

    console.log('OCR Tool initialized successfully');
});