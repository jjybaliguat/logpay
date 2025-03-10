"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Attendance } from "@/types/attendance"
import { formatDate } from "@/utils/formatDate"
import { format } from "date-fns";
import { formatTime } from "@/utils/formatTime"

export function AttendanceLogsCollapsible({
    attendanceLogs
} : {
    attendanceLogs: Attendance[]
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="max-w-lg space-y-2"
    >
        <CollapsibleTrigger asChild>
          <div className="w-full flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              View Attendance Logs
            </h4>
            <Button variant="ghost" size="sm">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </div>
        </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 max-h-[200px] overflow-y-auto">
        {attendanceLogs.length == 0 && <h1 className="text-[14px]">No Attendance Logs</h1>}
        {attendanceLogs?.map((attendance, index)=>(
          <div key={index}>
            <p className="text-[14px]">{formatDate(new Date(attendance.timeIn))}</p>
            <p className="text-[14px">TimeIn: <span className="text-primary">{formatTime(attendance.timeIn)}</span></p>
            <p className="text-[14px">TimeOut: <span className="text-primary">{attendance.timeOut && formatTime(attendance.timeOut)}</span></p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
