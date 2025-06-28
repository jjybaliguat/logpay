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
import { Label } from "@/components/ui/label"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useEffect, useRef, useState } from "react"
import { generateDeviceId } from "@/utils/generateDeviceId"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import useSWR, { mutate } from "swr"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Attendance } from "@/types/attendance"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Employees } from "@/types/employees"
import { Device } from "@/types/device"

export function CreateAttendanceDialog() {
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

    const [dateIn, setDateIn] = useState<any>(null)
    const [dateOut, setDateOut] = useState<any>(null)
    const [timeIn, setTimeIn] = useState<any>(null)
    const [timeOut, setTimeOut] = useState<any>(null)
    const [submitting, setSubmitting] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [selectedEmployee, setSelectedEmployee] = useState<Employees | null>(null)
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
    const session = useSession()
    const {data: employees, isLoading: employeeLoading} = useSWR(session?.data?.user.id? "getEmployee" : null, getEmployees)
    const {data: devices, isLoading: devicesLoading} = useSWR(session?.data?.user.id? "getDevices" : null, getDevices)

    async function getEmployees(){
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/employee?id=${session?.data?.user.parentId? session.data.user.parentId : session?.data?.user.id}`)
          
          const data = await response.json()
          // console.log(data)
          return data
        } catch (error) {
          console.log(error)
          return null
        }
      }

    async function getDevices() {
      try {
        const response = await fetch(`/api/protected/devices?id=${session?.data?.user.parentId? session.data.user.parentId : session?.data?.user.id}`)
        const data = await response.json()

        return data
      } catch (error) {
        console.log(error)
        return null
      }
    }
    
    async function onSubmit(e: React.FormEvent) {
      e.preventDefault()
      // setSubmitting(true)
      let newTimeInUTC;
      if(dateIn && timeIn){
          newTimeInUTC = formatToUTC(parseDate(dateIn), timeIn);
      }
      let newTimeOutUTC = null;

      if (dateOut && timeOut) {
        newTimeOutUTC = formatToUTC(dateOut, timeOut);
      }
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    try {
        setSubmitting(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/create-attendance?deviceToken=${selectedDevice?.deviceId}`, {
            method: "POST",
            body: JSON.stringify({employeeId: selectedEmployee?.id, timeIn: newTimeInUTC,  timeOut: newTimeOutUTC})
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
         mutate("getAttendance")
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
        <Button>Create</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Attendance</DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h1>Select Employee: </h1>
                      {employees && <Select value={selectedEmployee?.id} onValueChange={(value)=>setSelectedEmployee(employees.find((employee: Employees)=>employee.id === value) || null)}>
                      <SelectTrigger
                          className="w-[160px] rounded-lg"
                          aria-label="Select employee"
                      >
                          <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                          {!employeeLoading && employees && employees?.map((employee: Employees)=>(
                          <SelectItem key={employee.id} value={employee.id} className="rounded-lg">
                              {employee.fullName.split(" ")[0]}
                          </SelectItem>
                          ))}
                      </SelectContent>
                      </Select>}
                    </div>
                    <div className="flex items-center gap-2">
                      <h1>Select Device: </h1>
                      {devices && <Select value={selectedDevice?.deviceId} onValueChange={(value)=>setSelectedDevice(devices.find((device: Device)=>device.deviceId === value) || null)}>
                      <SelectTrigger
                          className="w-[160px] rounded-lg"
                          aria-label="Select employee"
                      >
                          <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                          {!devicesLoading && devices && devices?.map((device: Device)=>(
                          <SelectItem key={device.id} value={device.deviceId} className="rounded-lg">
                              {device.name}
                          </SelectItem>
                          ))}
                      </SelectContent>
                      </Select>}
                    </div>
                    <div className="flex flex-col gap-2">
                        {/* Time In Section */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Time In</label>
                            <Input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} />
                            <Input type="time" step="1" value={timeIn!} onChange={(e) => setTimeIn(e.target.value)} />
                        </div>

                        {/* Time Out Section */}
                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-sm font-medium">Time Out</label>
                            <Input type="date" value={dateOut} onChange={(e) => setDateOut(e.target.value)} />
                            <Input type="time" step="1" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4 mt-8">
                    <DialogClose ref={buttonRef}>
                    Cancel
                    </DialogClose>
                    <Button type="submit" disabled={submitting || !selectedEmployee || !selectedDevice || !timeIn}>{submitting? "Creating..." : "Create"}</Button>
                </div>
            </form>
      </DialogContent>
    </Dialog>
  )
}
