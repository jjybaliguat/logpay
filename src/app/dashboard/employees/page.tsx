import { DatePicker } from '@/components/DatePicker'
import { AddEmployeeDialog } from '@/components/dialogs/AddEmployeeDialog'
import HeaderBreadCrumb from '@/components/layout/HeaderBreadCrumb'
import { EmployeesTable } from '@/components/table/EmployeesTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import React from 'react'

const EmployeesPage = () => {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <HeaderBreadCrumb />
      <Card>
        <CardHeader className='flex flex-row justify-between items-center'>
          <CardTitle>Employees</CardTitle>
          <Button asChild>
            <Link href="/dashboard/employees/add">Add Employee</Link>
          </Button>
        </CardHeader>
        <CardContent className='w-full'>
            <EmployeesTable />
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeesPage