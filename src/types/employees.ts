import { ShiftType } from "@prisma/client"
import { Device } from "./device"

export interface Employees{
    id: string,
    employerId: string,
    empCode: string,
    fullName: string
    email: string
    phone?: string
    department?: string
    position: string
    dailyRate: number
    hireDate: Date
    tinNumber: string,
    sssNumber: string,
    pagIbigNumber: string,
    philHealthNumber: string,
    isActive: Boolean
    fingerprintId: number,
    fingerEnrolled: boolean,
    deviceId: string,
    device: Device,
    customStartTime: string,
    customEndTime: string,
    shiftType: ShiftType,
    cashAdvance: {
        id: string,
        amount: number
    }[],
    fingerPrints: {
        id: string,
        fingerId: number
    }[]
}