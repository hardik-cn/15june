"use client";

import React from 'react';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function Editor({ content, onChange, placeholder = "Write template body here..." }: EditorProps) {
  return (
    <div className="w-full flex flex-col bg-[#050505] rounded-xl overflow-hidden transition-all duration-300 border border-white/10">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[400px] p-6 bg-transparent text-white/90 focus:outline-none resize-y font-mono text-sm leading-relaxed"
        />
        <div className="absolute bottom-4 right-4 text-[10px] text-white/10 font-mono select-none pointer-events-none uppercase tracking-widest">
          Raw HTML Editor
        </div>
      </div>
    </div>
  );
}
