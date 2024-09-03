"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react";

const formSchema = z.object({
  branchName: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string({
    required_error: "Password is required!"
  })
})

export default function Login() {
  const [errorMess, setErrorMess] = useState('')
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchName: "",
      password: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    const response: any = await signIn('credentials', {
      ...values,
      redirect: false
    });

    if(response?.error){
      console.log(response.error)
      setErrorMess(response.error)
    }else{
      setErrorMess("")
      window.location.href = "/dashboard"
    }
    // console.log(values)
  }

  return (
    <div className="bg-black flex justify-center items-center h-screen">
      <div className="bg-background p-5 rounded-md w-[350px]">
        <h1 className="text-center font-bold text-[24px]">Sierra Raffle Entries</h1>
        <h3 className="text-destructive text-center font-bold mt-2">{errorMess}</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="branchName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Branch name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit">Login</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
