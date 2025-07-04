export interface Attendance {
    id: string,
    employeeId: string,
    employee: Employee,
    fingerprintId: string,
    timeIn: string,
    timeOut: string,
    status: AttendanceStatus,
    verifiedBy: string,
    createdAt: Date
}

export interface Employee {
    id: string,
    fullName: string,
    fingerprintId: string
}

export enum AttendanceStatus {
    ONTIME = "ONTIME",
    LATE = "LATE",
    ABSENT = "ABSENT"
}

export enum AttendanceError {
    SIGNED_IN_ALREADY = "SIGNED_IN_ALREADY",
    SIGNED_OUT_ALREADY = "SIGNED_OUT_ALREADY",
    TOO_EARLY = "TOO_EARLY",
}