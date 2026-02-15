import React, { useState, useRef } from 'react';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ImageUpload({ 
  value, 
  onChange, 
  token,
  label = "Upload Image",
  className = "",
  previewSize = "medium" // small, medium, large
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    small: "w-20 h-20",
    medium: "w-32 h-32",
    large: "w-48 h-48"
  };

  // Helper to get full image URL - handles both relative and absolute URLs
  const getImageUrl = (url) => {
    if (!url) return null;
    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Otherwise, prepend the backend URL
    return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/owner/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Store only the relative URL path - this makes images portable across domains
      const imageUrl = response.data.url;
      onChange(imageUrl);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const clearImage = () => {
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-zinc-400 uppercase tracking-widest text-xs block">
          {label}
        </label>
      )}
      
      {value ? (
        // Image Preview
        <div className={`relative ${sizeClasses[previewSize]} group`}>
          <img 
            src={getImageUrl(value)} 
            alt="Uploaded" 
            className="w-full h-full object-cover border border-zinc-700"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-white hover:text-zinc-200 h-8 w-8 p-0"
              data-testid="replace-image-btn"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearImage}
              className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
              data-testid="remove-image-btn"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        // Upload Zone
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            ${sizeClasses[previewSize]}
            border-2 border-dashed cursor-pointer
            flex flex-col items-center justify-center gap-2
            transition-colors
            ${dragOver 
              ? 'border-emerald-500 bg-emerald-500/10' 
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
            }
            ${uploading ? 'pointer-events-none' : ''}
          `}
          data-testid="image-upload-zone"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          ) : (
            <>
              <Image className="w-6 h-6 text-zinc-600" />
              <span className="text-zinc-500 text-xs font-mono text-center px-2">
                {dragOver ? 'DROP' : 'UPLOAD'}
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        data-testid="image-file-input"
      />
    </div>
  );
}
