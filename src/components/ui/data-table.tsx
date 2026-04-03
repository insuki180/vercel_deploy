"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, EmptyState } from "@/components/ui/portal-kit";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  cardLabel?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  emptyTitle,
  emptyDescription,
  pageSize = 8,
  filterText = "",
  filterPredicate,
  onRowClick,
  activeRowId,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  emptyTitle: string;
  emptyDescription: string;
  pageSize?: number;
  filterText?: string;
  filterPredicate?: (row: T, query: string) => boolean;
  onRowClick?: (row: T) => void;
  activeRowId?: string | null;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(String(columns[0]?.key ?? "id"));
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const normalizedQuery = filterText.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => {
      if (filterPredicate) {
        return filterPredicate(row, normalizedQuery);
      }

      return Object.values(row as Record<string, unknown>).some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedQuery),
      );
    });
  }, [filterPredicate, normalizedQuery, rows]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((left, right) => {
      const leftValue = String((left as Record<string, unknown>)[sortKey] ?? "");
      const rightValue = String((right as Record<string, unknown>)[sortKey] ?? "");
      const result = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredRows, sortDirection, sortKey]);

  if (!sortedRows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-100 md:block">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {column.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() => {
                        if (sortKey === String(column.key)) {
                          setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
                          return;
                        }
                        setSortKey(String(column.key));
                        setSortDirection("asc");
                      }}
                    >
                      {column.header}
                      <ArrowDownUp size={14} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pageRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  onRowClick ? "cursor-pointer transition hover:bg-slate-50" : "",
                  activeRowId === row.id && "bg-sky-50/70",
                )}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className={cn("px-4 py-4 align-top text-sm text-slate-700", column.className)}>
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[String(column.key)] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {pageRows.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                onRowClick?.(row);
              }
            }}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : -1}
            className={cn(
              "rounded-[1.5rem] border border-slate-100 bg-white p-4 text-left shadow-sm",
              activeRowId === row.id && "border-sky-200 bg-sky-50/60",
            )}
          >
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={String(column.key)} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-slate-400">{column.cardLabel ?? column.header}</span>
                  <div className="text-right text-slate-900">
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[String(column.key)] ?? "-")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={16} />
              Prev
            </Button>
            <Button variant="secondary" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
