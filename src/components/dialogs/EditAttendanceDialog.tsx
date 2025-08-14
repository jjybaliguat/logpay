"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { mutate } from "swr"
import { useRouter } from "next/navigation"
import { Attendance } from "@/types/attendance"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select"
import { AttendanceStatus } from "@prisma/client"
import { useRef, useState } from "react"

export function EditAttendanceDialog({
    attendance
} : {
    attendance: Attendance
}) {
    // Helper function to parse date and time separately
    const parseDate = (isoString: string | null) => isoString ? new Date(isoString).toISOString().split("T")[0] : "";
    const parseTime = (isoString: string | null) => {
      if (!isoString) return ""; // Handle null timeOut
      const timePart = new Date(isoString).toISOString().split("T")[1];
      return timePart.substring(0, 8); // Extract HH:mm:ss
    };

  // Function to combine date & time and return UTC format
  const formatToUTC = (dateString: string, timeString: string) => {
    const date = new Date(dateString + "T" + timeString + "Z");
    return date.toISOString(); // Ensure UTC format
  };

    const [dateIn, setDateIn] = useState(parseDate(attendance.timeIn))
    const [dateOut, setDateOut] = useState(parseDate(attendance.timeOut? attendance.timeOut : null))
    const [timeIn, setTimeIn] = useState(parseTime(attendance.timeIn))
    const [timeOut, setTimeOut] = useState(parseTime(attendance.timeOut))
    const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(attendance.status)
    const [submitting, setSubmitting] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const router = useRouter()
    
    async function onSubmit(e: React.FormEvent) {
      e.preventDefault()
      // setSubmitting(true)
      const newTimeInUTC = formatToUTC(dateIn, timeIn);
      let newTimeOutUTC = null;

      if (dateOut && timeOut) {
        newTimeOutUTC = formatToUTC(dateOut, timeOut);
      }
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    try {
        setSubmitting(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/attendance?id=${attendance.id}`, {
            method: "PATCH",
            body: JSON.stringify({timeIn: newTimeInUTC,  timeOut: newTimeOutUTC, status: attendanceStatus})
        })
        const data = await response.json()

        if(data.error){
          toast("ERROR!", {
            description: data.error,
            duration: 3000,
          })
        }else{
        setSubmitting(false)
        if(buttonRef.current){
            buttonRef?.current.click()
        }
        toast("Success", {
            description: `Attendance has been updated`,
            duration: 3000,
          })
         // Revalidate all attendance queries
         mutate((key) => Array.isArray(key) && key[0] === "getAttendance")
        }
    } catch (error: any) {
        console.log(error)
        setSubmitting(false)
        toast("ERROR!", {
          description: error.error,
          duration: 3000,
        })
    }
  }
     
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Attendance ({attendance.employee.fullName.split(" ")[0]})</DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-2">
                <div className="space-y-2">
                    <div className="flex flex-col gap-2">
                        {/* Time In Section */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Time In</label>
                            <Input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} />
                            <Input type="time" step="1" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} />
                        </div>

                        {/* Time Out Section */}
                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-sm font-medium">Time Out</label>
                            <Input type="date" value={dateOut} onChange={(e) => setDateOut(e.target.value)} />
                            <Input type="time" step="1" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
                        </div>
                        <Select value={attendanceStatus} onValueChange={(status: AttendanceStatus) => setAttendanceStatus(status)}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Status</SelectLabel>
                              {Object.values(AttendanceStatus).map((status)=>(
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4 mt-8">
                    <DialogClose ref={buttonRef}>
                    Cancel
                    </DialogClose>
                    <Button type="submit" disabled={submitting}>{submitting? "Updating..." : "Update"}</Button>
                </div>
            </form>
      </DialogContent>
    </Dialog>
  )
}
