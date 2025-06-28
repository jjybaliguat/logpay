import { CreateAttendanceDialog } from '@/components/dialogs/CreateAttendanceDialog'
import HeaderBreadCrumb from '@/components/layout/HeaderBreadCrumb'
import { AttendanceTable } from '@/components/table/AttendanceTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import React from 'react'

const AttendancePage = () => {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <HeaderBreadCrumb />
        <Card>
            <CardHeader className='flex flex-row justify-between items-center'>
                <CardTitle>Attendance</CardTitle>
                <CreateAttendanceDialog />
            </CardHeader>
            <CardContent>
                <AttendanceTable />
            </CardContent>
            </Card>
    </div>
  )
}

export default AttendancePage