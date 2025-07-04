import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient()

export async function DELETE(req: Request){
    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search)
    const id = searchParams.get('id') as string

    if(!id){
        return NextResponse.json({error: "Missing id field"}, {status: 400})
    }

    try {
        const cashAdvanceLogs = await prisma.cashAdvanceLogs.findUnique({
            where: {
                id
            },
            include: {
                cashAdvance: true
            }
        })
        await prisma.cashAdvanceLogs.delete({
            where: {
                id
            }
        })

        const cashAdvance = await prisma.cashAdvance.findUnique({
            where: { id: cashAdvanceLogs?.cashAdvanceId! },
            select: { amount: true }
            });

        
        if(cashAdvanceLogs && cashAdvance){
            if(cashAdvance.amount >= cashAdvanceLogs?.amount){
                await prisma.cashAdvance.updateMany({
                    where: {
                        id: cashAdvanceLogs?.cashAdvanceId!
                    },
                    data: {
                        amount: {
                            decrement: cashAdvanceLogs?.amount
                        }
                    },
                })
            }else if(cashAdvance?.amount < cashAdvanceLogs?.amount){
                await prisma.cashAdvance.updateMany({
                    where: {
                        id: cashAdvanceLogs?.cashAdvanceId!
                    },
                    data: {
                        amount: 0
                    }
                })
            }
        }

        return NextResponse.json({message: "Cash Advance record deleted"}, {status: 200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}