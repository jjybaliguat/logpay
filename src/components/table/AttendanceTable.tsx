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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

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

  const [limit, setLimit] = React.useState(50);
  const debouncedLimit = useDebounce(limit, 500); // debounce delay of 500ms

  const { data, isLoading, mutate } = useSWR(
    userId ? ["getAttendance", debouncedLimit] : null,
    () => getAttendance(userId, debouncedLimit)
  );

  async function getAttendance(userId: string | undefined, limit: number) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/attendance?id=${userId}&limit=${limit}`
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
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter Name..."
          value={(table?.getColumn("employee")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table?.getColumn("employee")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="ml-4 flex gap-4 items-center">
          <Label htmlFor="limit">Result Limit</Label>
          <Input id="limit" value={limit} type="number" onChange={(e)=>setLimit(Number(e.target.value))} placeholder="result limit"/>
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
