export interface EntryProps {
    id: string
    clientName: string
    address: string
    phone: string
    branchId: string | undefined
    branch: BranchProps
    createdAt: Date
    updatedAt: Date
}

export interface BranchProps{
    branchName: string
}