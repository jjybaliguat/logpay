import { AttendanceError } from "@/types/attendance";
import { getUTCDateWithTime } from "@/utils/getUTCDateWithTime";
import { AttendanceStatus, PrismaClient, ShiftType } from "@prisma/client";
import { addDays, setHours, setMinutes, setSeconds } from "date-fns";
import { NextResponse } from "next/server";

const prisma = new PrismaClient()

function timeToSeconds(date: Date) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export async function GET(req: Request){
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search) 
    const id = searchParams.get('id') as string
    const limit = searchParams.get('limit') as string
    const filters: any = {};
    if(!id){
        return NextResponse.json({message: "Unauthorized"}, {status: 401})
    }else{
        filters.employerId = id
    }

    try {
        const attendanceLogs = await prisma.attendance.findMany({
            where: {
                employee: filters
            },
            take: limit? Number(limit) : 100,
            include: {
                employee: {
                    include: {
                        fingerPrints: true
                    }
                }
            },
            orderBy: {
                timeIn: "desc"
            }
        })
        // console.log(attendanceLogs)
        prisma.$disconnect()
        return NextResponse.json(attendanceLogs.map((attendance)=>{
            return {
                ...attendance,
                timeIn: attendance.timeIn.toISOString(),
                timeOut: attendance.timeOut?.toISOString()
            }
        }), {status: 200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message: "Internal Server Error"}, {status: 500})
    }
}

export async function POST(req: Request){
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search) 
    const deviceToken = searchParams.get('deviceToken') as string
    const {fingerId, timeIn, timeOut} = await req.json()
    // const filters: any = {};
    const now = new Date();
    const manilaDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
            // Get start and end of today
        const startOfDay = new Date(manilaDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(manilaDate);
        endOfDay.setHours(23, 59, 59, 999);
        // Get 12:00 PM timestamp for today
        // const thresholdLogin = new Date(now);
        // thresholdLogin.setHours(8, , 0, 0);

    if(!deviceToken){
        return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    if(!fingerId){
        return NextResponse.json({error: "Missing required field."}, {status: 400})
    }

    try {
        // const employee = await prisma.employee.findFirst({
        //     where: {
        //         deviceId: deviceToken,
        //         fingerprintId: fingerId,
        //         fingerEnrolled: true
        //     }
        // })
        const employee = await prisma.employee.findFirst({
            where: {
                fingerPrints: {
                    some: {
                        fingerId: Number(fingerId),
                    }
                },
                fingerEnrolled: true,
                isActive: true,
                deviceId: deviceToken
            },
            include: {
                fingerPrints: true
            }
            // select: {
            //     id: true, // Get employee ID
            //     fingerPrints: { select: { fingerId: true } }, // Get all their fingerIds,
            //     fullName: true
            // }
        })

        if(!employee){
            return NextResponse.json({error: `Employee with fingerId ${fingerId} not found.`}, {status: 404})
        }

        const device = await prisma.device.findUnique({
            where: {
                deviceId: deviceToken
            },
            include: {
                user: true
            }
        })

        const baseDate = timeIn || timeOut ? new Date(timeIn ?? timeOut) : manilaDate;

        const startTimeStr = employee.customStartTime ?? device?.user?.workStartTime!;
        const endTimeStr = employee.customEndTime ?? device?.user?.workEndTime!;

        const startTime = getUTCDateWithTime(baseDate, startTimeStr);
        let endTime = getUTCDateWithTime(baseDate, endTimeStr);

        // ✅ Handle cross-day shift (end time is "earlier" than start time)
        if (endTime <= startTime && timeOut) {
            startTime.setUTCDate(startTime.getUTCDate() - 1);
            // endTime.setUTCDate(endTime.getUTCDate() + 1);
        }
        if (endTime <= startTime) {
            endTime.setUTCDate(endTime.getUTCDate() + 1);
        }

        // Check if there's already a time-in record for today
        const existingRecord = await prisma.attendance.findFirst({
            where: {
            deviceId: deviceToken,
            fingerprintId: { in: employee.fingerPrints.map(fp => fp.fingerId) }, // Check all fingerIds
            timeIn: { gte: startTime, lte: endTime }, // Check today's records
            },
        });

        if (existingRecord) {
            // Prevent duplicate time-out
            if (existingRecord.timeOut) {
                return NextResponse.json({ error: AttendanceError.SIGNED_OUT_ALREADY }, { status: 400 });
            }

            const proposedTimeOut = timeOut ? new Date(timeOut) : manilaDate;

            console.log(manilaDate)

            if (proposedTimeOut <= new Date(existingRecord.timeIn)) {
                return NextResponse.json({ error: "Invalid timeOut: must be after timeIn." }, { status: 400 });
            }

            const updatedAttendance = await prisma.attendance.update({
                where: { id: existingRecord.id },
                data: {
                    timeOut: proposedTimeOut,
                },
            });

            return NextResponse.json({
                name: employee?.fullName?.split(" ")[0],
                timeOut: updatedAttendance.timeOut,
            });
        }

        if(!device){
            return NextResponse.json({error: `No device found with deviceId ${deviceToken}`})
        }

        let cutoffTime = new Date(manilaDate);
        if(employee.shiftType != ShiftType.NORMAL){
            const startHours = Number(employee.customStartTime?.split(":")[0]);
            const startMinutes = Number(employee.customStartTime?.split(":")[1]);
            cutoffTime.setUTCHours(startHours, startMinutes + Number(device.user?.gracePeriodInMinutes), 0);
        }else{
            cutoffTime.setUTCHours(8, Number(device.user?.gracePeriodInMinutes), 0, 0); // set time-in grace period time
        }

        // Determine status
        const timeNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
        timeNow.setUTCSeconds(0);
        let status
        if(!timeIn){
            status = timeNow > cutoffTime ? AttendanceStatus.LATE : AttendanceStatus.ONTIME
        }else{
            let timeInTime = new Date(timeIn)
            timeInTime.setUTCSeconds(0)
            status = timeToSeconds(timeInTime) > timeToSeconds(cutoffTime) ? AttendanceStatus.LATE : AttendanceStatus.ONTIME
        }
        // const status = timeIn > cutoffTime ? AttendanceStatus.LATE : AttendanceStatus.ONTIME;

        const attendance = await prisma.attendance.create({
            data: {
                fingerprintId: Number(fingerId),
                employeeId: employee?.id as string,
                timeIn: timeIn? timeIn : manilaDate,
                status,
                deviceId: deviceToken,
            },
            include: {
                employee: true
            }
        })
        prisma.$disconnect()
        return NextResponse.json({name: attendance.employee.fullName?.split(" ")[0], timeIn: attendance.timeIn}, {status: 201})
    } catch (error) {
        console.log(error)
        return NextResponse.json({error: "Internal Server Error."})
    }
}

export async function PATCH(req: Request) {
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search) 
    const id = searchParams.get('id') as string
    const {timeIn, timeOut} = await req.json()

    try {
        const attendance = await prisma.attendance.update({
            where: {
                id
            },
            data: {
                timeIn,
                timeOut
            }
        })

        return NextResponse.json(attendance, {status: 200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({error: "Internal Server Error."})
    }
}

export async function DELETE(req: Request) {
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search)
    const id = searchParams.get("id") as string
    if(!id) return NextResponse.json({message: "Missing required params"}, {status: 500})
    try {
        const attendance = await prisma.attendance.findUnique({
            where: {
                id
            }
        })
        if(!attendance) return NextResponse.json({message: `Attendance with id ${id} not found.`}, {status: 404})
        await prisma.attendance.delete({
            where: {
                id
            }
        })
        return NextResponse.json({message: "Attendance Record Deleted Successfully"}, {status: 200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message: "Internal Server Error"}, {status: 500})
    }
}