/** Simple SVG icons for export buttons - Excel (CSV) and PDF formats */

export function ExcelIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="24" height="24" rx="4" fill="#217346" />
      <path d="M7 6 L17 18 M17 6 L7 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function PdfIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        fill="#E74C3C"
      />
      <path d="M14 2v6h6" fill="#C0392B" />
      <text x="7" y="16" fill="white" fontSize="6" fontWeight="bold" fontFamily="Arial">
        PDF
      </text>
    </svg>
  );
}
