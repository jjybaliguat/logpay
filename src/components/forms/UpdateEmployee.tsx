"use client"

import React, { useEffect, useRef, useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from "date-fns"
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, DeleteIcon, PlusIcon, Trash2Icon, TrashIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BackButton from '@/components/buttons/BackButton'
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Employees } from '@/types/employees'
import { EmployeeStatus, SelectEmployeeStatus } from '../select/SelectEmployeeStatus'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select'
import { ShiftType } from '@prisma/client'
// import { DeductionStatus, DeductionType } from '@prisma/client'
// import { SelectDeductionType } from '@/components/select/SelectDeductionType'
// import { SelectDeductionStatus } from '@/components/select/SelectDeductionStatus'

const formSchema = z.object({
  fullName: z.string().min(2, {
    message: "Name must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please provide a valid email address."
  }),
  phone: z.string()
  .regex(/^(\+63|0)9\d{9}$/, "Invalid Philippine mobile number"),
  position: z.string().min(1, "Required"),
  dailyRate: z.coerce.number(),
  hireDate: z.date(),
  tinNumber: z.string().optional(),
  sssNumber: z.string().optional(),
  pagIbigNumber: z.string().optional(),
  philHealthNumber: z.string().optional(),
  isActive: z.boolean(),
  shiftType: z.string(),
})

// interface Deductions {
//     type: DeductionType | "",
//     precentage: number | "",
//     status: DeductionStatus
// }


const UpdateEmployeeForm = ({
    employee
} : {
    employee: Employees
}) => {
        const buttonRef = useRef<HTMLButtonElement>(null)
        const [isSubmitting, setIsSubmitting] = useState(false)

        // const [deductions, setDeductions] = useState<Deductions[]>([])
        const router = useRouter()
        const session = useSession()
        const user = session.data?.user
        // 1. Define your form.
      const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          fullName: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          position: employee.position,
          dailyRate: employee.dailyRate,
          hireDate: employee.hireDate,
          tinNumber: employee.tinNumber? employee.tinNumber : "",
          sssNumber: employee.sssNumber? employee.sssNumber : "",
          pagIbigNumber: employee.pagIbigNumber? employee.pagIbigNumber : "",
          philHealthNumber: employee.philHealthNumber? employee.philHealthNumber : "",
          isActive: employee.isActive? true : false,
          shiftType: employee.shiftType
        },
      })
     
      // 2. Define a submit handler.
      async function onSubmit(values: z.infer<typeof formSchema>) {
        // console.log(values)
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        // console.log(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/employee`)
        // console.log(values)
        try {
            setIsSubmitting(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/protected/employee?id=${employee.id}`, {
                method: "PATCH",
                body: JSON.stringify({...values})
            })
            const data = await response.json()
            if(!data.error){
                if(buttonRef.current){
                    buttonRef?.current.click()
                }
                toast("Employee has been updated", {
                    description: `You successfully updated an employee`,
                    duration: 3000,
                })
                router.refresh()
                // form.reset()
                setIsSubmitting(false)
            }else{
                setIsSubmitting(false)
                toast("Error", {
                    description: data.error,
                    duration: 3000,
                })
            }
        } catch (error: any) {
            console.log(error)
            toast("Error", {
                description: error.message,
                duration: 3000,
            })
        }
      }

    //   const handleAddDeduction = () => {
    //     if(deductions){
    //         setDeductions([...deductions, {
    //             type: "",
    //             precentage: "",
    //             status: DeductionStatus.ACTIVE
    //         }])
    //     }else{
    //         setDeductions([{
    //             type: "",
    //             precentage: "",
    //             status: DeductionStatus.ACTIVE
    //         }])
    //     }
    //   }

    //   const updateItemDeduction = (index: number, updatedData: Partial<Deductions>) => {
    //     setDeductions((prevItems: any) => {
    //       const updatedItems = [...prevItems];
    //       updatedItems[index] = { ...updatedItems[index], ...updatedData };
    //         console.log(updatedItems)
    //       return updatedItems;
    //     });
    //   };
    const [fingerprints, setFingerPrints] = useState<number[]>([])

    useEffect(()=>{
        if(employee.fingerEnrolled){
            let fingerId: number[] = []
            employee.fingerPrints.map((finger)=>{
                fingerId.push(finger.fingerId)
            })
            setFingerPrints(fingerId)
        }
    }, [employee])

  return (
    <>
    <BackButton />
        <Card className='mt-4'>
            <CardHeader>
                <CardTitle>Employee Details</CardTitle>
            </CardHeader>
            <CardContent>
            <div className='flex flex-col gap-2 py-4'>
                <h1>Fingerprint Id: {employee.fingerEnrolled ? <span className='bg-primary rounded-lg px-2 py-1'>{fingerprints.join(",")}</span> : "Not Enrolled"}</h1>
                <h1>Biometric Device: {employee.deviceId? <span className='text-primary'>{employee.device.name}</span> : "Not Enrolled"}</h1>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                    <div className="space-y-2">
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2'>
                        <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="jhon doe" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="example@gmail.com" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="+63..." {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Position <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="dailyRate"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Daily Rate <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input type="number" step="any" placeholder="" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="tinNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tin Number (optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="sssNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>SSS Number (optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="pagIbigNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Pag-Ibig number (optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="philHealthNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Philhealth number (optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="" {...field} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="hireDate"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Hire Date</FormLabel><br />
                            <FormControl>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        <CalendarIcon />
                                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                                        </Button>
                                </PopoverTrigger>
                                <PopoverContent forceMount side="bottom" align="start" className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel><br />
                            <FormControl>
                                <SelectEmployeeStatus selected={field.value? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE} onSelectChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="shiftType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Shift Type</FormLabel><br />
                            <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue placeholder="Shift Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                        <SelectLabel>Shift Type</SelectLabel>
                                        {Object.values(ShiftType).map((type)=>(
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormDescription>
                                
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        {/* <div className='mt-4'>
                            <div className='mt-4 flex flex-col gap-2'>
                                <h1>Deductions:</h1>
                                {deductions?.map((deduction, index)=>(
                                    <div key={index} className='flex items-center gap-2'>
                                        <div className='flex gap-2 flex-col md:flex-row'>
                                            <SelectDeductionType selected={deductions[index].type} onSelectChange={(value: DeductionType)=>updateItemDeduction(index, {type: value})} />
                                            <div className='flex items-center gap-2'>
                                                <Input type='number' placeholder='precentage' className='w-[80px]' value={deductions[index].precentage} onChange={(e)=>updateItemDeduction(index, {precentage: Number(e.target.value)})} />
                                                <SelectDeductionStatus selected={deductions[index].status} onSelectChange={(value: DeductionStatus)=>updateItemDeduction(index, {status: value})} />
                                                <Trash2Icon className='w-5 h-5 text-red-500 cursor-pointer' onClick={()=>setDeductions((prevItems)=>prevItems.filter((_, i)=>i !== index))} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button className='mt-4' type='button' variant="outline" onClick={handleAddDeduction}><PlusIcon /> Deduction</Button>
                        </div> */}
                    </div>
                    </div>
                    <div className='flex justify-end'>
                        <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Updating..." : "Update"}</Button>
                    </div>
                </form>
            </Form>
            </CardContent>
        </Card>
    </>
  )
}

export default UpdateEmployeeForm