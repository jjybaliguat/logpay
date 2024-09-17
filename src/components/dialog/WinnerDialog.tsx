"use client"
import React, { useRef } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import Image from 'next/image';

function WinnerDialog({
  btnRef
}: {
  btnRef: any
}) {
    const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
        <Dialog>
            <DialogTrigger asChild>
                <Button ref={btnRef} className='hidden' variant="outline"></Button>
            </DialogTrigger>
            <DialogClose ref={buttonRef} asChild>
                <Button type="button" variant="secondary" className='hidden'>
                Close
                </Button>
            </DialogClose>
          <DialogContent className="sm:max-w-[425px] z-100">
                <DialogHeader>
                <DialogTitle>Congratulations</DialogTitle>
                {/* <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                </DialogDescription> */}
                </DialogHeader>
          </DialogContent>
        </Dialog>
    </>
  )
}

export default WinnerDialog