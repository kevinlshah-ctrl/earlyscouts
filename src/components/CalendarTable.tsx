'use client'

import { useRef } from 'react'
import type { ComparisonTableBlock } from '@/lib/types'

/**
 * CalendarTable — specialized renderer for comparison_tables inside Calendar sections.
 * 
 * Usage in SchoolReport.tsx:
 *   Instead of the normal comparison_table renderer, check if the section tag is "Calendar"
 *   and render <CalendarTable /> instead.
 * 
 *   {block.type === 'comparison_table' && isCalendarSection && (
 *     <CalendarTable block={block} />
 *   )}
 */

interface CalendarTableProps {
  block: ComparisonTableBlock
}

export default function CalendarTable({ block }: CalendarTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!tableRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Planning Calendar</title>
        <style>
          body { font-family: 'DM Sans', -apple-system, sans-serif; padding: 24px; color: #2D3436; }
          h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 22px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 10px 12px; background: #F5F0EB; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #636E72; border-bottom: 2px solid #E8E2DA; }
          td { padding: 10px 12px; border-bottom: 1px solid #F0ECE6; vertical-align: top; }
          tr.deadline td { background: #FDF0EF; border-left: 3px solid #E74C3C; }
          tr.normal td { border-left: 3px solid #E8E2DA; }
          td:first-child { font-weight: 700; color: #5B9A6F; white-space: nowrap; }
          td:last-child { font-size: 12px; color: #636E72; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📅 Planning Calendar</h1>
        ${tableRef.current.querySelector('table')?.outerHTML || ''}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="my-4">
      {/* Print button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handlePrint}
          className="text-xs font-medium text-gray-400 hover:text-scout-green transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-scout-green/30"
        >
          <span>📅</span> Print Calendar
        </button>
      </div>

      {/* Table */}
      <div ref={tableRef} className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm" style={{ minWidth: 500 }}>
          {/* Header */}
          <thead>
            <tr className="bg-cream">
              {block.columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-gray-400 border-b-2 border-gray-200 ${
                    i === 0 ? 'sticky left-0 bg-cream z-10 min-w-[140px]' : ''
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {block.rows.map((row, rowIdx) => {
              const isDeadline = row.highlight === true
              return (
                <tr
                  key={rowIdx}
                  className={`
                    ${isDeadline ? 'bg-red-50/50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-cream/30'}
                    transition-colors hover:bg-gray-50
                  `}
                >
                  {row.cells.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className={`px-4 py-3 border-b border-gray-100 align-top ${
                        cellIdx === 0
                          ? `font-bold text-scout-green whitespace-nowrap sticky left-0 z-10 ${
                              isDeadline ? 'bg-red-50/50 border-l-[3px] border-l-red-400' : rowIdx % 2 === 0 ? 'bg-white border-l-[3px] border-l-gray-200' : 'bg-cream/30 border-l-[3px] border-l-gray-200'
                            }`
                          : cellIdx === row.cells.length - 1
                          ? 'text-xs text-gray-400'
                          : 'text-charcoal'
                      }`}
                    >
                      {cellIdx === 0 && isDeadline && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-2 relative top-[-1px]" />
                      )}
                      {cell}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
