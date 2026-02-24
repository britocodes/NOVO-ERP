
import React from 'react';

const SkeletonCard = () => (
  <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] flex-1 shadow-sm">
    <div className="animate-pulse flex flex-col h-full">
      <div className="flex justify-between items-start">
        <div className="h-4 bg-[var(--color-surface-tertiary)] rounded w-3/4"></div>
        <div className="h-8 w-8 bg-[var(--color-surface-tertiary)] rounded-lg"></div>
      </div>
      <div className="mt-4">
        <div className="h-8 bg-[var(--color-surface-tertiary)] rounded w-1/2"></div>
        <div className="flex items-center mt-2">
          <div className="h-3 bg-[var(--color-surface-tertiary)] rounded w-1/4"></div>
          <div className="h-3 bg-[var(--color-surface-tertiary)] rounded w-2/4 ml-2"></div>
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonCard;