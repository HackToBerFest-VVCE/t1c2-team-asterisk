import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function PhotoEditorModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSavePhoto,
  onRemovePhoto
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageEl, setImageEl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [errorMsg, setErrorMsg] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setImageEl(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setErrorMsg(null);
      setIsUploading(false);
      setUploadProgress(null);
      setShowRemoveConfirm(false);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  // Load Image element when imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      setImageEl(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageEl(img);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    img.onerror = () => {
      setErrorMsg('Failed to load image. The file may be corrupted.');
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas whenever image, zoom, rotation, or pan updates
  useEffect(() => {
    if (!imageEl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 130;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid/checkers
    ctx.fillStyle = '#1A241F';
    ctx.fillRect(0, 0, width, height);

    // Save state for transformed image draw
    ctx.save();
    ctx.translate(cx + pan.x, cy + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate base scale to fit the crop circle
    const baseScale = Math.max((radius * 2) / imageEl.width, (radius * 2) / imageEl.height);
    const drawW = imageEl.width * baseScale * zoom;
    const drawH = imageEl.height * baseScale * zoom;

    ctx.drawImage(imageEl, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw circular mask overlay (darken outside circle)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    // Cut out inner circle (counter-clockwise)
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw crop boundary border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw subtle guide crosshair
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
    ctx.restore();

    // Draw Live Thumbnail Preview
    if (previewCanvasRef.current) {
      const pCanvas = previewCanvasRef.current;
      const pCtx = pCanvas.getContext('2d');
      const pW = pCanvas.width;
      const pH = pCanvas.height;
      const pCx = pW / 2;
      const pCy = pH / 2;
      const pRadius = pW / 2;

      pCtx.clearRect(0, 0, pW, pH);
      pCtx.save();
      // Clip to circular shape
      pCtx.beginPath();
      pCtx.arc(pCx, pCy, pRadius, 0, Math.PI * 2);
      pCtx.clip();

      // Translate proportionally
      const pRatio = pRadius / radius;
      pCtx.translate(pCx + pan.x * pRatio, pCy + pan.y * pRatio);
      pCtx.rotate((rotation * Math.PI) / 180);

      const pDrawW = drawW * pRatio;
      const pDrawH = drawH * pRatio;
      pCtx.drawImage(imageEl, -pDrawW / 2, -pDrawH / 2, pDrawW, pDrawH);
      pCtx.restore();

      // Border on preview
      pCtx.beginPath();
      pCtx.arc(pCx, pCy, pRadius - 1, 0, Math.PI * 2);
      pCtx.strokeStyle = '#059669';
      pCtx.lineWidth = 2;
      pCtx.stroke();
    }
  }, [imageEl, zoom, rotation, pan]);

  if (!isOpen) return null;

  // File validation and loader
  const processSelectedFile = (file) => {
    setErrorMsg(null);
    if (!file) return;

    // Check size <= 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`Selected image (${sizeMb} MB) exceeds maximum allowed size of 5.0 MB. Please choose a smaller photo.`);
      return;
    }

    // Check mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setErrorMsg(`Unsupported file type '${file.type || 'unknown'}'. Please select a JPEG, PNG, or WebP image.`);
      return;
    }

    // Read into Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file from your device.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Pan / Drag handlers for desktop mouse and mobile touch
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotation controls
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset zoom & pan
  const handleResetTransforms = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Generate cropped output blob and save
  const handleConfirmSave = async () => {
    if (!imageEl) return;
    setIsUploading(true);
    setUploadProgress('Preparing & rendering high-resolution crop...');
    setErrorMsg(null);

    try {
      // Offscreen canvas (512x512 square)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 512;
      exportCanvas.height = 512;
      const ctx = exportCanvas.getContext('2d');

      const cx = 256;
      const cy = 256;
      const radius = 130; // base preview radius
      const scaleRatio = 256 / radius; // ratio from preview crop to 512 target

      ctx.save();
      ctx.translate(cx + pan.x * scaleRatio, cy + pan.y * scaleRatio);
      ctx.rotate((rotation * Math.PI) / 180);

      const baseScale = Math.max((radius * 2) / imageEl.width, (radius * 2) / imageEl.height);
      const drawW = imageEl.width * baseScale * zoom * scaleRatio;
      const drawH = imageEl.height * baseScale * zoom * scaleRatio;

      ctx.drawImage(imageEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      setUploadProgress('Compressing image to WebP format...');

      // Convert to WebP blob (fallback to JPEG if WebP unsupported)
      const blob = await new Promise((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to generate image blob.'));
          },
          'image/webp',
          0.92
        );
      });

      setUploadProgress('Uploading to persistent storage...');
      const fileToUpload = new File([blob], 'profile_avatar.webp', { type: 'image/webp' });

      await onSavePhoto(fileToUpload);
      onClose();
    } catch (err) {
      console.error('Photo save error:', err);
      setErrorMsg(err.message || 'Failed to save profile photo. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle Photo Removal
  const handleConfirmRemove = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      await onRemovePhoto();
      setShowRemoveConfirm(false);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove profile photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 56, 38, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-editor-title"
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: 580,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #DDE5E0'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#E6F7F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 id="photo-editor-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#113826' }}>
                Profile Photo Management
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                Crop, rotate, reposition, or remove your farmer avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#DC2626',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Remove Confirmation Dialog Overlay */}
          {showRemoveConfirm ? (
            <div
              style={{
                padding: '24px 20px',
                backgroundColor: '#FFF1F2',
                borderRadius: 12,
                border: '1px solid #FECDD3',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#FFE4E6',
                  color: '#E11D48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}
              >
                <Trash2 size={24} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: '#9F1239' }}>
                Remove Profile Photo?
              </h4>
              <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
                Are you sure you want to remove your profile photo? Your stored photo file will be deleted permanently, and your account will revert to your name initials fallback.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  disabled={isUploading}
                  className="btn-secondary"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={isUploading}
                  style={{
                    backgroundColor: '#E11D48',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Yes, Remove Photo</span>
                </button>
              </div>
            </div>
          ) : !imageSrc ? (
            /* ============================================================== */
            /* 1. SELECTION / UPLOAD INITIAL STATE */
            /* ============================================================== */
            <div>
              {/* Drag & Drop File Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #059669',
                  backgroundColor: '#F0FDF4',
                  borderRadius: 12,
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: 16
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: '#E6F7F0',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}
                >
                  <Upload size={24} />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: '#113826' }}>
                  Choose Photo or Drag & Drop Here
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#4B5563' }}>
                  Supports JPEG, PNG, or WebP (Maximum size: 5.0 MB)
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  Browse Files
                </span>
              </div>

              {/* Action Buttons: Camera + Device */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  <Upload size={16} color="#059669" />
                  <span>Select from Device</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                  title="Take a photo directly with your device camera"
                >
                  <Camera size={16} color="#059669" />
                  <span>Take with Camera</span>
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Existing Photo Removal Option */}
              {currentPhotoUrl && (
                <div
                  style={{
                    paddingTop: 16,
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #DDE5E0'
                      }}
                    >
                      <img
                        src={currentPhotoUrl}
                        alt="Current"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A241F' }}>
                        Current Profile Photo
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        Saved on persistent server storage
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRemoveConfirm(true)}
                    style={{
                      background: 'none',
                      border: '1px solid #FECDD3',
                      backgroundColor: '#FFF1F2',
                      color: '#E11D48',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Remove Photo</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* 2. CROPPER & TRANSFORM INTERFACE */
            /* ============================================================== */
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginBottom: 16
                }}
              >
                {/* Interactive Canvas Viewport */}
                <div
                  style={{
                    position: 'relative',
                    width: 320,
                    height: 320,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={320}
                    style={{ display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.85)',
                      pointerEvents: 'none',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}
                  >
                    Drag to reposition • Scroll/Slider to zoom
                  </div>
                </div>

                {/* Live Preview Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB'
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase' }}>
                    Live Preview
                  </span>
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <canvas ref={previewCanvasRef} width={76} height={76} style={{ display: 'block' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>Circular Avatar</span>

                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={handleResetTransforms}
                    style={{
                      marginTop: 4,
                      background: 'none',
                      border: '1px solid #D1D5DB',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#4B5563',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RefreshCw size={11} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Zoom Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#F9FAFB',
                  padding: '10px 14px',
                  borderRadius: 10,
                  marginBottom: 12
                }}
              >
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                  style={{
                    background: 'none',
                    border: '1px solid #D1D5DB',
                    borderRadius: 6,
                    padding: 6,
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#113826', minWidth: 42, textAlign: 'right' }}>
                    {zoom.toFixed(2)}x
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(1))))}
                  style={{
                    background: 'none',
                    border: '1px solid #D1D5DB',
                    borderRadius: 6,
                    padding: 6,
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
              </div>

              {/* Rotation & Pick New File Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleRotateLeft}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Rotate 90 degrees counter-clockwise"
                  >
                    <RotateCcw size={14} />
                    <span>Rotate Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateRight}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Rotate 90 degrees clockwise"
                  >
                    <RotateCw size={14} />
                    <span>Rotate Right</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImageSrc(null);
                    fileInputRef.current?.click();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Choose Different Image
                </button>
              </div>

              {/* Hidden file input for re-selection */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB'
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {uploadProgress ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600 }}>
                <Loader2 size={13} className="animate-spin" />
                {uploadProgress}
              </span>
            ) : (
              <span>Square 512×512 WebP crop</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Cancel
            </button>

            {imageSrc && !showRemoveConfirm && (
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isUploading}
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
