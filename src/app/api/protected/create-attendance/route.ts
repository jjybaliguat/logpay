import { AttendanceStatus } from "@/types/attendance";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient()

export async function POST(req: Request) {
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search)
    const deviceToken = searchParams.get('deviceToken') as string
    const {employeeId, timeIn, timeOut} = await req.json()
    try {
        const device = await prisma.device.findUnique({
            where: {
                deviceId: deviceToken
            },
            include: {
                user: true
            }
        })
        const employee = await prisma.employee.findUnique({
            where: {
                id: employeeId
            },
            include: {
                fingerPrints: true
            }
        })
        if(!employee) return NextResponse.json({message: "Employee not found"}, {status: 400})

        const cutoffTime = new Date();
        cutoffTime.setHours(8, Number(device?.user?.gracePeriodInMinutes), 0, 0); // set time-in grace period time
        
        let status
        const timeInTime = new Date(timeIn)
        timeInTime.setUTCSeconds(0)
        status = timeInTime > cutoffTime ? AttendanceStatus.LATE : AttendanceStatus.ONTIME
        const attendance = await prisma.attendance.create({
            data: {
                fingerprintId: employee.fingerPrints[0].fingerId,
                employeeId: employeeId,
                timeIn,
                timeOut,
                status,
                deviceId: deviceToken
            }
        })
        prisma.$disconnect()
        return NextResponse.json(attendance, {status: 201})
    } catch (error) {
        console.log(error)
    }
}