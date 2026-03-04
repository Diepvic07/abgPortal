"use client";

import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface AdminMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function AdminMarkdownEditor({ value, onChange, height = 300 }: AdminMarkdownEditorProps) {
  return (
    <div data-color-mode="light">
      <MDEditor value={value} onChange={(val) => onChange(val || "")} height={height} />
    </div>
  );
}
