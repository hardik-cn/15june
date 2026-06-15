import React from "react";

interface PaginationControlsProps {
    currentPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    itemsPerPage: number;
    setItemsPerPage: (value: number) => void;
    totalItems: number;
    totalPages: number;
}

export default function PaginationControls({
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
}: PaginationControlsProps) {
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            {/* Items per page selector */}
            <div className="flex items-center gap-3">
                <span className="text-white/50 text-sm">Showing</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/[0.08] text-white/90 text-sm focus:outline-none focus:border-white/[0.2] cursor-pointer">
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                </select>
                <span className="text-white/50 text-sm">of {totalItems}</span>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
                {/* Previous button */}
                <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, index) => (
                    <button
                        key={index}
                        onClick={() => typeof page === "number" && setCurrentPage(page)}
                        disabled={page === "..."}
                        className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                            ? "bg-gradient-to-r from-white/15 to-white/10 text-white border border-white/[0.1]"
                            : page === "..."
                                ? "text-white/30 cursor-default"
                                : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                            }`}
                    >
                        {page}
                    </button>
                ))}

                {/* Next button */}
                <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
