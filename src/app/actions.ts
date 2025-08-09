"use server"

import { PayslipStatus } from "@/components/select/SelectPayslipStatus";
import { Employees } from "@/types/employees";
import { getUTCDateWithTime } from "@/utils/getUTCDateWithTime";
import { hashPassword } from "@/utils/hashPassword";
import { PrismaClient, ShiftType, User } from "@prisma/client";

import bcrypt from 'bcryptjs'
import { startOfWeek, endOfWeek, subWeeks, addDays } from "date-fns";
import { NextResponse } from "next/server";


const prisma = new PrismaClient()

export async function getNextFingerPrintId(employerId: string | undefined, deviceId: string): Promise<number | null> {
    const lastFingerPrint = await prisma.fingerPrintID.findFirst({
        where: { employee: {
            employerId,
            deviceId
        } }, // Filter by employer
        orderBy: { fingerId: "desc" }, // Get the highest fingerprintId
        select: { fingerId: true }, // Only retrieve fingerprintId
      });
    // const lastEmployee = await prisma.employee.findFirst({
    //     where: { employerId, deviceId }, // Filter by employer
    //     orderBy: { fingerprintId: "desc" }, // Get the highest fingerprintId
    //     select: { fingerprintId: true }, // Only retrieve fingerprintId
    //   });
      prisma.$disconnect()

      return (lastFingerPrint?.fingerId ?? 0) + 1;
    //   return (lastEmployee?.fingerprintId ?? 0) + 1;
}

export async function getSingleEmployee(id: string){
    // console.log(id)
    try {
        const employee = await prisma.employee.findUnique({
            where: {
                id
            },
            include: {
                device: true,
                fingerPrints: true,
                attendance: {
                    orderBy: {
                        timeIn: "desc"
                    },
                    take: 14
                }
            }
        })

        // console.log(employee)

        return employee
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function enrollEmployeeFinger(employeeId: string, fingerId: string, deviceId: string){
    try {
        const isFingerIdExist = await prisma.fingerPrintID.findFirst({
            where: {
                fingerId: Number(fingerId),
                employeeId: employeeId
            }
        })
        if(!isFingerIdExist){
            await prisma.employee.update({
                where: {
                    id: employeeId
                },
                data: {
                    fingerPrints: {
                        create: {
                            fingerId: Number(fingerId),
                        }
                    },
                    deviceId: deviceId,
                    fingerEnrolled: true
                }
            })
        }
    } catch (error) {
        console.log(error)
    }
}
// export async function enrollEmployeeFinger(employeeId: string, fingerId: string, deviceId: string){
//     try {
//         await prisma.employee.update({
//             where: {
//                 id: employeeId
//             },
//             data: {
//                 fingerprintId: Number(fingerId),
//                 deviceId: deviceId,
//                 fingerEnrolled: true
//             }
//         })
//     } catch (error) {
//         console.log(error)
//     }
// }

export async function changePassword(data: {user: any | undefined, oldPassword: string, password: string}) {
    try {
        if(data.user.parentId){
            const user: any = await prisma.subUser.findUnique({
                where: {
                    id: data.user.id
                },
                select: {
                    password: true
                }
            })
    
            if(!user){
                return {error: `User with id ${data.user.id}  not found.`}
            }
            
            const isPasswordMatched = await bcrypt.compare(data.oldPassword, user.password)
    
            if(!isPasswordMatched){
                return {error: "Old Password not matched."}
            }
    
            const hashedPass: any = await hashPassword(data.password)
            await prisma.subUser.update({
                where: {
                    id: data.user.id
                },
                data: {
                    password: hashedPass
                }
            })
        }else{
            const user: any = await prisma.user.findUnique({
                where: {
                    id: data.user.id
                },
                select: {
                    password: true
                }
            })
    
            if(!user){
                return {error: `User with id ${data.user.id}  not found.`}
            }
            
            const isPasswordMatched = await bcrypt.compare(data.oldPassword, user.password)
    
            if(!isPasswordMatched){
                return {error: "Old Password not matched."}
            }
    
            const hashedPass: any = await hashPassword(data.password)
            await prisma.user.update({
                where: {
                    id: data.user.id
                },
                data: {
                    password: hashedPass
                }
            })
        }

        return {message: "Password Updated Successfully."}
    } catch (error) {
        console.log(error)
        return {error: "Internal Server Error"}
    }
}

export async function getEmployeeAttendancePerWeek(employeerId: string | null | undefined, employeeId: string | null | undefined, week: number){
    const today = new Date();
    const startOfRequestedWeek = startOfWeek(subWeeks(today, week), { weekStartsOn: 1 });
    const endOfRequestedWeek = endOfWeek(subWeeks(today, week), { weekStartsOn: 1 });
    // console.log(startOfRequestedWeek)
    // console.log(startOfRequestedWeek)

    if(!employeeId || !employeerId) return null

    try {
        const employer = await prisma.user.findUnique({
            where: {
                id: employeerId
            },
            select: {
                workStartTime: true,
                workEndTime: true,
                gracePeriodInMinutes: true,
                lateDeducInMinutes: true,
                minutesThresholdAfterLate: true,
                overtimeThresholdInMinutes: true
            }
        })
        // console.log(employer)
        if(!employer) return null
        const timeParts: number[] | undefined = employer?.workStartTime?.split(":").map(Number);
        const timeEndParts: number[] | undefined = employer?.workEndTime?.split(":").map(Number);
        if(!timeParts) return null
        if(!timeEndParts) return null
        // Create a new Date object with the correct time, forcing UTC
        const workStartTime: Date = today;
        workStartTime.setUTCHours(timeParts[0], timeParts[1], 0, 0); // Ensure it's in UTC
        workStartTime.setUTCSeconds(0)
        const workEndTime: Date = new Date(today);
        workEndTime.setUTCHours(timeEndParts[0], timeEndParts[1], 0, 0); // Ensure it's in UTC
        workEndTime.setUTCSeconds(0)

        const workGracePeriodTime = new Date(workStartTime)
        const workGracePeriodThresholdTime = new Date(workStartTime)
        workGracePeriodTime.setUTCMinutes(workGracePeriodTime.getMinutes() + employer?.gracePeriodInMinutes!)
        workGracePeriodTime.setUTCSeconds(0)
        workGracePeriodThresholdTime.setUTCMinutes(employer?.minutesThresholdAfterLate!)
        workGracePeriodThresholdTime.setUTCSeconds(0)
        const overTimeThresholdTime = new Date(workEndTime)
        overTimeThresholdTime.setUTCMinutes(overTimeThresholdTime.getMinutes() + employer?.overtimeThresholdInMinutes!)
        overTimeThresholdTime.setUTCSeconds(0)

        const attendance = await prisma.attendance.findMany({
            where: {
                employeeId,
                timeIn: {gte: startOfRequestedWeek},
                timeOut: {lte: endOfRequestedWeek}
            },
            select: {
                timeIn: true,
                timeOut: true
            }
        })

        // console.log(attendance)

        const weeklyHours = Array(7).fill(0);
        let regularHours = 0
        let overtimeHours = 0;
        let rdotHours = 0;

                // Process attendance data
        attendance.forEach((record) => {
            if (!record.timeIn || !record.timeOut) return null; // Skip if incomplete data

            let timeIn = new Date(record.timeIn);
            timeIn.setUTCSeconds(0);
            // console.log(timeIn)
            const timeOut = new Date(record.timeOut);
            let dayIndex = timeIn.getDay() - 1; // Convert Monday(1) → 0, Sunday(0) → -1

            if (dayIndex === -1) dayIndex = 6; // Convert Sunday from -1 to 6
            let deductionHours = 0;
            if (dayIndex >= 0) {
                let timeInHours = timeIn.getUTCHours() + (timeIn.getUTCMinutes() / 60)
                // console.log(timeInHours)
                let timeOutHours = timeOut.getUTCHours() + (timeOut.getUTCMinutes() / 60)
                let workStartHours = workStartTime.getUTCHours() + (workStartTime.getUTCMinutes() / 60)
                let workEndHours = workEndTime.getUTCHours() + (workEndTime.getUTCMinutes() / 60)
                const overtimeThresholdHours = workEndHours + (employer?.overtimeThresholdInMinutes! / 60)
                let thresholdAfterLateTime = workGracePeriodThresholdTime.getUTCHours() + (workGracePeriodThresholdTime.getUTCMinutes() / 60)
                let gracePeriodInMinutesTime = workGracePeriodTime.getUTCHours() + (workGracePeriodTime.getUTCMinutes() / 60)
                let overtimeThresholdInHours = overTimeThresholdTime.getUTCHours() + (overTimeThresholdTime.getUTCMinutes() / 60)

                
                // console.log(overtimeThreshold)
                if (timeInHours <= gracePeriodInMinutesTime) {
                    deductionHours = 0
                }else if(timeInHours > gracePeriodInMinutesTime && timeInHours <= thresholdAfterLateTime){
                    deductionHours = Math.max(employer?.lateDeducInMinutes! / 60, 0);
                }else if(thresholdAfterLateTime && timeInHours > thresholdAfterLateTime && timeInHours <= (workStartHours + 1)){
                    deductionHours = 1;
                }else{
                    deductionHours = (timeInHours - workStartHours)
                }

                let hoursWorked = 0; // Convert ms → hours
                let regularHoursWorked = 0; // Convert ms → hours
                
                // Define lunch break time (12:00 PM - 1:00 PM)
                const lunchStart = new Date(timeIn);
                lunchStart.setUTCHours(12, 0, 0, 0);
                const lunchStartHours = lunchStart.getUTCHours() + (lunchStart.getUTCMinutes() / 60)
                const lunchEnd = new Date(timeIn);
                lunchEnd.setUTCHours(13, 0, 0, 0);
                const lunchEndHours = lunchEnd.getUTCHours() + (lunchEnd.getUTCMinutes() / 60)
          
                // Deduct 1 hour if lunch is included in the work period
                // console.log(timeOutHours)
                // console.log(timeOutHours)
                // console.log(overtimeThresholdHours)
                if(timeOutHours >= overtimeThresholdHours){
                    overtimeHours += (timeOutHours - workEndHours);
                    hoursWorked = (timeOutHours - timeInHours)
                    regularHoursWorked = (workEndHours - workStartHours) - deductionHours
                }else if (timeOutHours < workEndHours){
                    regularHoursWorked = (timeOutHours - workStartHours) - deductionHours
                    hoursWorked = (timeOutHours - timeInHours)
                }else if(timeOutHours >= workEndHours){
                    regularHoursWorked = (workEndHours - workStartHours) - deductionHours
                    hoursWorked = (workEndHours - timeInHours)
                }
                
                if (timeInHours < lunchStartHours && timeOutHours > lunchEndHours) {
                  hoursWorked -= 1;
                  regularHoursWorked -= 1;
                }
                // console.log(deductionHours)
                // console.log(hoursWorked)
                if(dayIndex == 6){
                    rdotHours += (timeOutHours - timeInHours)
                    if (timeInHours < lunchStartHours && timeOutHours > lunchEndHours) {
                        rdotHours -= 1
                    }
                }else{
                    regularHours += Math.max(regularHoursWorked, 0)
                }
                weeklyHours[dayIndex] += Math.max(hoursWorked, 0); // Prevent negative values
              }
            });

                prisma.$disconnect()
                return {
                    weeklyHours: weeklyHours.map((hours) => parseFloat(hours.toFixed(1))),
                    regularHours: parseFloat(regularHours.toFixed(1)),
                    overtimeHours: parseFloat(overtimeHours.toFixed(1)),
                    rdotHours: parseFloat(rdotHours.toFixed(1))
                }
    } catch (error) {
        console.log(error)
        return null
    }
}


export async function getEmployeeAttendanceTotalHours(employerId: string | undefined, employeeId: string, startDate: string, endDate: string){
    if(!employeeId || !startDate || !endDate || !employerId) return null
    const today = new Date()

    try {

        const employer = await prisma.user.findUnique({
            where: {
                id: employerId
            },
            select: {
                workStartTime: true,
                workEndTime: true,
                gracePeriodInMinutes: true,
                lateDeducInMinutes: true,
                minutesThresholdAfterLate: true,
                overtimeThresholdInMinutes: true
            }
        })

        const employee = await prisma.employee.findUnique({
            where: {
                id: employeeId
            }
        })

        // console.log(employer)
        if(!employer) return null
        const timeParts: number[] | undefined = employee?.shiftType == ShiftType.NORMAL? employee.customStartTime? employee.customStartTime.split(":").map(Number) : employer?.workStartTime?.split(":").map(Number) : employee?.customStartTime?.split(":").map(Number);
        const timeEndParts: number[] | undefined = employee?.shiftType == ShiftType.NORMAL? employee.customStartTime? employee.customEndTime?.split(":").map(Number) : employer?.workEndTime?.split(":").map(Number) : employee?.customEndTime?.split(":").map(Number);
        // console.log(timeParts)
        // console.log(timeEndParts)
        if(!timeParts) return null
        if(!timeEndParts) return null
        // Create a new Date object with the correct time, forcing UTC
        const workStartTime: Date = today;
        workStartTime.setUTCHours(timeParts[0], timeParts[1], 0, 0); // Ensure it's in UTC
        workStartTime.setUTCSeconds(0)
        const workEndTime: Date = new Date(today);
        workEndTime.setUTCHours(timeEndParts[0], timeEndParts[1], 0, 0); // Ensure it's in UTC
        workEndTime.setUTCSeconds(0)

        const workGracePeriodTime = new Date(workStartTime)
        const workGracePeriodThresholdTime = new Date(workStartTime)
        workGracePeriodTime.setUTCMinutes(workGracePeriodTime.getMinutes() + employer?.gracePeriodInMinutes!)
        workGracePeriodTime.setUTCSeconds(0)
        workGracePeriodThresholdTime.setUTCMinutes(employer?.minutesThresholdAfterLate!)
        workGracePeriodThresholdTime.setUTCSeconds(0)
        const overTimeThresholdTime = new Date(workEndTime)
        overTimeThresholdTime.setUTCMinutes(overTimeThresholdTime.getMinutes() + employer?.overtimeThresholdInMinutes!)
        overTimeThresholdTime.setUTCSeconds(0)

        const startofDayUTC = new Date(startDate)
        let startHours = 0, startMinutes = 0;
        let endHours = 0, endMinutes = 0;

        const startTime = employee?.customStartTime ?? employer?.workStartTime;
        // const endTime = employee?.customEndTime ?? employer?.workEndTime;

        if (startTime) {
        [startHours, startMinutes] = startTime.split(":").map(Number);
        }

        // Always set endOfDayUTC to the end of the day to include late timeouts
        startofDayUTC.setUTCHours(Math.max(0, startHours - 2), startMinutes, 0, 0);
        const endOfDayUTC = new Date(endDate);
        // Set endOfDayUTC to the employee's custom end time if available, otherwise default to 23:59:59
        const endTime = employee?.customEndTime ?? employer?.workEndTime;
        if (endTime) {
            [endHours, endMinutes] = endTime.split(":").map(Number);
            // Add 8 hours to the end time for safety
            endOfDayUTC.setUTCHours(endHours + 8, endMinutes, 59, 999);
        } else {
            endOfDayUTC.setUTCHours(23, 59, 59, 999);
        }

        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                employeeId,
                timeIn: {gte: startofDayUTC},
                timeOut: {lte: endOfDayUTC}
            },
            select: {
                timeIn: true,
                timeOut: true,
            }
        })

        console.log(attendanceRecords)

        let regularHours = 0;
        let totalHours = 0;
        let overtimeHours = 0;
        let rdotHours = 0;

        
        attendanceRecords.forEach((record) => {
            if(!record.timeIn || !record.timeOut) return null
            
            let deductionHours = 0;
            let timeIn = new Date(record.timeIn);
            timeIn.setUTCSeconds(0);
            const timeOut = new Date(record.timeOut);
            let dayIndex = timeIn.getDay() - 1; // Convert Monday(1) → 0, Sunday(0) → -1

            if (dayIndex === -1) dayIndex = 6; // Convert Sunday from -1 to 6

            let timeInHours = timeIn.getUTCHours() + (timeIn.getUTCMinutes() / 60)
                // console.log(timeInHours)
                let timeOutHours = timeOut.getUTCHours() + (timeOut.getUTCMinutes() / 60)
                let workEndHours = workEndTime.getUTCHours() + (workEndTime.getUTCMinutes() / 60)
                if(timeOutHours < timeInHours){
                    timeOutHours += 24
                    workEndHours += 24
                }
                // console.log(timeOutHours)
                let workStartHours = workStartTime.getUTCHours() + (workStartTime.getUTCMinutes() / 60)
                const overtimeThresholdHours = workEndHours + (employer?.overtimeThresholdInMinutes! / 60)
                let thresholdAfterLateTime = workGracePeriodThresholdTime.getUTCHours() + (workGracePeriodThresholdTime.getUTCMinutes() / 60)
                let gracePeriodInMinutesTime = workGracePeriodTime.getUTCHours() + (workGracePeriodTime.getUTCMinutes() / 60)

                
                // console.log(overtimeThreshold)
                if (timeInHours <= gracePeriodInMinutesTime) {
                    deductionHours = 0
                }else if(timeInHours > gracePeriodInMinutesTime && timeInHours <= thresholdAfterLateTime){
                    deductionHours = Math.max(employer?.lateDeducInMinutes! / 60, 0);
                }else if(timeInHours > thresholdAfterLateTime && timeInHours <= (workStartHours + 1)){
                    deductionHours = 1;
                }else{
                    deductionHours = (timeInHours - workStartHours)
                }

                let hoursWorked = 0; // Convert ms → hours
                let regularHoursWorked = 0; // Convert ms → hours
                
                // Define lunch break time (12:00 PM - 1:00 PM)
                
                const lunchStart = new Date(timeIn);
                lunchStart.setUTCHours(12, 0, 0, 0);
                const lunchStartHours = lunchStart.getUTCHours() + (lunchStart.getUTCMinutes() / 60)
                const lunchEnd = new Date(timeIn);
                lunchEnd.setUTCHours(13, 0, 0, 0);
                const lunchEndHours = lunchEnd.getUTCHours() + (lunchEnd.getUTCMinutes() / 60)
          
                // Deduct 1 hour if lunch is included in the work period
                // console.log(timeOutHours)
                
                if(timeOutHours >= overtimeThresholdHours){
                    console.log("a")
                    overtimeHours += (timeOutHours - workEndHours);
                    hoursWorked = (timeOutHours - timeInHours)
                    regularHoursWorked = (workEndHours - workStartHours) - deductionHours
                }else if (timeOutHours < workEndHours){
                    regularHoursWorked = (timeOutHours - workStartHours) - deductionHours
                    hoursWorked = (timeOutHours - timeInHours)
                }else if(timeOutHours >= workEndHours){
                    console.log(timeInHours)
                    console.log(timeOutHours)
                    console.log(workEndHours)
                    regularHoursWorked = (workEndHours - workStartHours) - deductionHours
                    hoursWorked = (workEndHours - timeInHours)
                }

                if (timeInHours < lunchStartHours && timeOutHours > lunchEndHours) {
                  hoursWorked -= 1;
                  regularHoursWorked -= 1;
                }

                if(employee?.shiftType == ShiftType.NIGHT){
                    const nightShiftBreak = new Date(timeIn);
                    nightShiftBreak.setUTCHours(0, 0, 0, 0)
                    // const nightShiftStartHours = nightShiftBreak.getHours() + (nightShiftBreak.getUTCMinutes() / 60)
                    const nightShiftBreakEnd = new Date(timeIn)
                    const startHour = employee.customStartTime?.split(":")[0]
                    const startMin = employee.customStartTime?.split(":")[1]
                    nightShiftBreakEnd.setUTCHours(Number(startHour) + 1, Number(startMin), 0, 0)
                    const nightShiftBreakEndHours = nightShiftBreakEnd.getUTCHours() + (nightShiftBreakEnd.getUTCMinutes() / 60)
                    console.log(timeInHours)
                    console.log(nightShiftBreakEndHours)
                    if (timeInHours < nightShiftBreakEndHours) {
                        hoursWorked -= (nightShiftBreakEndHours - timeInHours);
                        regularHoursWorked -= (nightShiftBreakEndHours - timeInHours);
                    }
                }
                // if(dayIndex == 6){
                //     rdotHours += (timeOutHours - timeInHours)
                //     if (timeInHours < lunchStartHours && timeOutHours > lunchEndHours) {
                //         rdotHours -= 1
                //     }
                // }else{
                    // }
                console.log(regularHoursWorked)
                console.log(hoursWorked)
                regularHours += Math.max(regularHoursWorked, 0)
                totalHours += hoursWorked
        })

        prisma.$disconnect()
        return {
            totalHours: parseFloat(totalHours.toFixed(1)),
            regularHours: parseFloat(regularHours.toFixed(1)),
            overtimeHours: parseFloat(overtimeHours.toFixed(1)),
            rdotHours: parseFloat(rdotHours.toFixed(1)),
            attendanceLogs: attendanceRecords
                .map((attendance) => {
                    if (attendance.timeOut) {
                        return {
                            timeIn: attendance.timeIn.toISOString(),
                            timeOut: attendance.timeOut.toISOString()
                        };
                    }
                    return undefined;
                })
                .filter((log) => log !== undefined)
        }

    } catch (error) {
        console.log(error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}

export async function getEmployeeLatestPayslip(employeeId: string){
    if(!employeeId) return null
    try {
        const payroll = await prisma.payroll.findFirst({
            where: {
                employeeId
            },
            orderBy: {
                periodEnd: "desc"
            },
            select: {
                periodStart: true,
                periodEnd: true
            }
        })

        return {
            periodStart: payroll?.periodStart.toISOString(),
            periodEnd: payroll?.periodEnd.toISOString()
        }
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function getPayrollById(id: string){
    try {
        const payroll = await prisma.payroll.findUnique({
            where: {
                id
            },
            include: {
                employee: true
            }
        })

        return payroll
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function updatePayslipStatus(id: string, status: PayslipStatus){
    try {
        const payslip = await prisma.payroll.update({
            where: {
                id
            },
            data: {
                status
            }
        })

        return payslip
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function createEmployeeCashAdvance(employeeId: string, amount: number, date: string){
    if(!employeeId) return null
    // console.log(date)
    const createdDate = new Date(date);
    // console.log(createdDate)
    try {
        const hasCashAdvance = await prisma.cashAdvance.findFirst({
            where: {
                employeeId
            }
        })
        if(hasCashAdvance){
            const response = await prisma.cashAdvance.updateMany({
                where: {
                    employeeId
                },
                data: {
                    amount: {
                        increment: amount
                    }
                }
            })
            await prisma.cashAdvanceLogs.create({
                data: {
                    cashAdvanceId: hasCashAdvance.id,
                    amount: amount,
                    date: createdDate
                }
            })

            return response
        }else{
            const response = await prisma.cashAdvance.create({
                data: {
                    employeeId,
                    amount,
                    logs: {
                        create: {
                            amount,
                            date: createdDate
                        }
                    }
                }
            })

            return response
        }
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function getCashAdvance(employerId: string){
    if(!employerId) return null
    try {
        const response = await prisma.cashAdvanceLogs.findMany({
            where: {
                cashAdvance: {
                    employee : {
                        employerId
                    }
                }
            },
            include: {
                cashAdvance: {
                    include: {
                        employee: true
                    }
                }
            },
            orderBy: {
                date: "desc"
            }
        })

        return response
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function getCashAdvancebalance(employerId: string){
    if(!employerId) return null
    try {
        const response = await prisma.cashAdvance.findMany({
            where: {
                employee: {
                    employerId
                }
            },
            include: {
                employee: true
            },
            orderBy: {
                employee: {
                    fullName: "desc"
                }
            }
        })

        return response
    } catch (error) {
        console.log(error)
        return null
    }
}
