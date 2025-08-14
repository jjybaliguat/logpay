"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, CalendarIcon, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Employees } from "@/types/employees"
import useSWR, { mutate } from "swr"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Payroll } from "@/types/payroll"
import { formatDate } from "@/utils/formatDate"
import { cn } from "@/lib/utils"
import { PayslipStatus } from "../select/SelectPayslipStatus"
import { formatCurrency } from "@/utils/formatCurrency"
import { DeletePayrollDialog } from "../dialogs/DeletePayrollDialog"
import { Attendance, AttendanceStatus } from "@/types/attendance"
import { formatDateTime } from "@/utils/formatDateTime"
import { EditAttendanceDialog } from "../dialogs/EditAttendanceDialog"
import { DeleteAttendanceDialog } from "../dialogs/DeleteAttendanceDialog"
import { Label } from "../ui/label"
import { DataTablePagination } from "../DataTablePagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { format } from "date-fns"

export const columns: ColumnDef<Attendance>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fingerprintId",
    header: "FingerId",
    cell: ({ row }) => <div>{row.getValue("fingerprintId")}</div>,
  },
  {
    accessorKey: "employee",
    accessorFn: (row) => row.employee.fullName,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Employee Name
          <ArrowUpDown />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("employee")}</div>,
  },
  {
    accessorKey: "timeIn",
    header: "Time-In",
    cell: ({ row }) => <div>{formatDateTime(row.getValue("timeIn"))}</div>,
  },
  {
    accessorKey: "timeOut",
    header: "Time-Out",
    cell: ({ row }) => <div>{row.original.timeOut && formatDateTime(row.getValue("timeOut"))}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div>
        <h1
        className={`font-semibold ${row.getValue('status') === AttendanceStatus.ONTIME? "text-green-500" : row.getValue('status') === AttendanceStatus.LATE? "text-yellow-500" : "text-red-500"}`}
        >{row.getValue("status")}</h1>
      </div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const attendance = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem><Link href={`/dashboard/employees/bio-enroll/${employee.id}/${employee.fingerprintId && employee.fingerprintId}`}>{!employee.fingerEnrolled? "Enroll" : "Re-Enroll"} Biometric</Link></DropdownMenuItem> */}
            <EditAttendanceDialog attendance={attendance} />
            <DropdownMenuSeparator />
            <DeleteAttendanceDialog id={attendance.id}/>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}


export function AttendanceTable() {
  const { data: session } = useSession();

  const userId = session?.user.parentId ?? session?.user.id;

  // Date range state for filtering
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [month, setMonth] = React.useState<string>("");
  const [year, setYear] = React.useState<string>("");

  // Set initial month and year and calculate initial date range
  React.useEffect(() => {
    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString();
    const currentYear = now.getFullYear().toString();
    
    setMonth(currentMonth);
    setYear(currentYear);

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(firstDay.toISOString().slice(0, 10));
    setToDate(lastDay.toISOString().slice(0, 10));
  }, []);

  // Handle date range updates from both month/year and direct date selection
  const updateDateRange = React.useCallback((newFrom?: string, newTo?: string) => {
    if (newFrom) setFromDate(newFrom);
    if (newTo) setToDate(newTo);
  }, []);

  // Update date range when month/year changes
  React.useEffect(() => {
    if (month && year && month !== "all" && year !== "all" && (!fromDate || !toDate)) {
      // Only update date range if no custom range is set
      const firstDay = new Date(Number(year), Number(month) - 1, 1);
      const lastDay = new Date(Number(year), Number(month), 0);
      const fromStr = firstDay.toISOString().slice(0, 10);
      const toStr = lastDay.toISOString().slice(0, 10);
      
      updateDateRange(fromStr, toStr);
    }
  }, [month, year, fromDate, toDate, updateDateRange]);

  // Handle direct date selection
  const handleDateChange = React.useCallback((type: 'from' | 'to', date: Date | undefined) => {
    if (date) {
      // Create a new date at midnight in the local timezone
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateStr = localDate.toISOString().slice(0, 10);
      
      if (type === 'from') {
        setFromDate(dateStr);
        // Only set toDate if it's empty or if it's before the new fromDate
        if (!toDate || new Date(toDate) < localDate) {
          setToDate(dateStr);
        }
      } else {
        setToDate(dateStr);
        // Only set fromDate if it's empty or if it's after the new toDate
        if (!fromDate || new Date(fromDate) > localDate) {
          setFromDate(dateStr);
        }
      }
    } else {
      // If date is undefined (cleared), only clear the respective date
      if (type === 'from') {
        setFromDate("");
      } else {
        setToDate("");
      }
    }
  }, [fromDate, toDate, updateDateRange]);

  const { data, isLoading, mutate } = useSWR(
    userId ? ["getAttendance", userId, fromDate || "all", toDate || "all", month === "all"] : null,
    () => {
      if (month === "all") {
        // When filters are cleared, fetch with limit
        return getAttendance(userId, "", "", 50);
      }
      // Normal fetch with date range
      return getAttendance(userId, fromDate, toDate);
    }
  );

  async function getAttendance(userId: string | undefined, from: string, to: string, limit?: number) {
    try {
      const params = new URLSearchParams({
        id: userId || "",
        ...(from && { from }),
        ...(to && { to }),
        ...(limit && { limit: limit.toString() })
      });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/attendance?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return await response.json();
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if(isLoading || !data) return <p>Loading...</p>

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Filter Name..."
          value={(table?.getColumn("employee")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table?.getColumn("employee")?.setFilterValue(event.target.value)
          }
          className="max-w-[200px]"
        />
        
        {/* Combined Month/Year and Date Range Picker */}
        <div className="flex items-center gap-4">
          {/* Month/Year Picker */}
          <div className="flex items-end gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {(() => {
                  const currentYear = new Date().getFullYear();
                  return Array.from({length: 6}, (_, i) => currentYear - i).map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Date Range Pickers */}
          <div className="flex items-end gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(new Date(fromDate), "MMM dd, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate ? new Date(fromDate) : undefined}
                  onSelect={(date) => handleDateChange('from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(new Date(toDate), "MMM dd, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate ? new Date(toDate) : undefined}
                  onSelect={(date) => handleDateChange('to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear Filters Button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              setMonth("all");
              setYear("all");
              setFromDate("");
              setToDate("");
              // Clear the name filter
              table.getColumn("employee")?.setFilterValue("");
              // Trigger a new fetch with limit=50
              mutate();
            }}
            title="Clear all filters"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
      <div className='my-4'>
          <DataTablePagination table={table} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table?.getRowModel().rows?.length ? (
              table?.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table?.getFilteredSelectedRowModel().rows.length} of{" "}
          {table?.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div> */}
    </div>
  )
}
