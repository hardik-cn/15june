"use client";
const DottedPattern = () => (
    <div className="absolute top-8 right-8 opacity-30 pointer-events-none">
        <div className="grid grid-cols-6 gap-2">
            {[...Array(36)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
            ))}
        </div>
    </div>
);

export default DottedPattern;