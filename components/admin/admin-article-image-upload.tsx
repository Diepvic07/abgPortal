"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface AdminImageUploadProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  uploadEndpoint?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export function AdminImageUpload({ imageUrl, onImageChange, uploadEndpoint = "/api/admin/news/upload-image", onUploadingChange }: AdminImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      // Compress client-side if browser-image-compression is available
      let fileToUpload = file;
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1400,
          useWebWorker: true,
          fileType: "image/webp",
        });
      } catch {
        // Compression failed, use original file
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { data } = await res.json();
      onImageChange(data.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>

      {imageUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <div className="aspect-[2/1]">
            <Image
              src={imageUrl}
              alt="Cover"
              width={1200}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => onImageChange("")}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-700"
          >
            x
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF (max 5MB)</p>
              <p className="text-xs text-amber-600 mt-1 font-medium">Recommended ratio 2:1 (e.g. 1200 x 600px) for best social media preview</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="hidden"
      />
    </div>
  );
}
