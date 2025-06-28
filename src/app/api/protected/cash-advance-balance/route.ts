import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient()

export async function PATCH(req: Request){
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search)
    const id = searchParams.get('id') as string
    try {
        await prisma.cashAdvance.update({
            where: {
                id
            },
            data: {
                amount: 0
            }
        })

        return NextResponse.json({ message: "Cash Advance record Deleted"}, { status: 200 })
    } catch (error) {
        console.log(error)
        return NextResponse.json({message: "Internal Server Error"}, {status: 500})
    }
}