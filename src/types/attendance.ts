export interface Attendance {
    id: string,
    employeeId: string,
    employee: Employee,
    fingerprintId: string,
    timeIn: Date,
    timeOut: Date,
    status: AttendanceStatus,
    verifiedBy: string
}

export interface Employee {
    id: string,
    fullName: string,
    fingerprintId: string
}

export enum AttendanceStatus {
    PRESENT = "PRESENT",
    LATE = "LATE",
    ABSENT = "ABSENT"
}