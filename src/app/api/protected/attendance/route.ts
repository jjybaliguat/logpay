import { AttendanceError } from "@/types/attendance";
import { AttendanceStatus, PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient()

function getShiftStartHour(shiftType: string) {
  switch (shiftType) {
    case "EVENING":
      return 17
    case "NIGHT":
      return 1
    case "NORMAL":
    default:
      return 8
  }
}

function getShiftEndHour(shiftType: string) {
  switch (shiftType) {
    case "EVENING":
      return 1
    case "NIGHT":
      return 9
    case "NORMAL":
    default:
      return 17
  }
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

export async function POST(req: Request) {
  const url = new URL(req.url)
  const searchParams = new URLSearchParams(url.search)
  const deviceToken = searchParams.get("deviceToken") as string
  const { fingerId, timeIn } = await req.json()

  const now = new Date()
  if (!deviceToken || !fingerId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: {
        fingerPrints: {
          some: { fingerId: Number(fingerId) },
        },
        fingerEnrolled: true,
        isActive: true,
        deviceId: deviceToken,
      },
      select: {
        id: true,
        fullName: true,
        shiftType: true,
        fingerPrints: { select: { fingerId: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: `Employee with fingerId ${fingerId} not found.` }, { status: 404 })
    }

    const shiftStartHour = getShiftStartHour(employee.shiftType)
    console.log(shiftStartHour)
    const shiftEndHour = getShiftEndHour(employee.shiftType)
    const graceMinutes = 15

    // Attendance date range handling (especially for night shifts)
    const startOfAttendanceDay = new Date(now)
    const endOfAttendanceDay = new Date(now)

    if (shiftEndHour < shiftStartHour) {
      // Overnight shift, start day at 12pm previous day
      startOfAttendanceDay.setHours(12, 0, 0, 0)
      startOfAttendanceDay.setDate(startOfAttendanceDay.getDate() - 1)
      endOfAttendanceDay.setHours(11, 59, 59, 999)
    } else {
      // Regular shift
      startOfAttendanceDay.setHours(0, 0, 0, 0)
      endOfAttendanceDay.setHours(23, 59, 59, 999)
    }

    // Check if already logged in today
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        deviceId: deviceToken,
        fingerprintId: { in: employee.fingerPrints.map(fp => fp.fingerId) },
        timeIn: { gte: startOfAttendanceDay, lte: endOfAttendanceDay },
      },
    })

    if (existingRecord) {
      if (existingRecord.timeOut) {
        return NextResponse.json({ error: AttendanceError.SIGNED_OUT_ALREADY }, { status: 400 })
      }

      const lastLoginTime = new Date(existingRecord.timeIn)
      const diffInMinutes = (now.getTime() - lastLoginTime.getTime()) / (1000 * 60)
      if (diffInMinutes < 30) {
        return NextResponse.json({ error: AttendanceError.SIGNED_IN_ALREADY }, { status: 400 })
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: { timeOut: now },
      })

      return NextResponse.json({
        name: employee.fullName?.split(" ")[0],
        timeOut: updatedAttendance.timeOut,
      })
    }

    // Fetch device & user config
    const device = await prisma.device.findUnique({
      where: { deviceId: deviceToken },
      include: { user: true },
    })

    if (!device || !device.user) {
      return NextResponse.json({ error: `No valid device/user found.` }, { status: 404 })
    }

        // Step 3: Construct shiftStart and graceCutoff in Manila time
        const shiftStart = new Date(now);
        shiftStart.setHours(shiftStartHour, 0, 0, 0); // Set to shift start in Manila
        
        const graceCutoff = new Date(shiftStart);
        graceCutoff.setHours(shiftStartHour, 0, 0, 0); // Set to shift start in Manila
        graceCutoff.setMinutes(graceCutoff.getMinutes() + (device.user.gracePeriodInMinutes ?? graceMinutes));

        // Step 4: Determine the actual time-in in Manila time
        const timeInUTC = timeIn ? new Date(timeIn) : new Date(); // Time provided or now (UTC)

        // Step 5: Determine attendance status
        const status: AttendanceStatus =
        timeInUTC > graceCutoff ? AttendanceStatus.LATE : AttendanceStatus.ONTIME;

    const attendance = await prisma.attendance.create({
      data: {
        fingerprintId: Number(fingerId),
        employeeId: employee.id,
        timeIn: timeInUTC,
        status,
        deviceId: deviceToken,
      },
      include: {
        employee: true,
      },
    })

    return NextResponse.json(
      {
        name: attendance.employee.fullName?.split(" ")[0],
        timeIn: attendance.timeIn,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
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