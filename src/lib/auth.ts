// @ts-nocheck
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from 'bcryptjs'
import { hashPassword } from "@/utils/hashPassword"
import { NextResponse } from "next/server"
const prisma = new PrismaClient()

export const authOptions : any = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
        name: "credentials",
        credentials: {
            email: { label: "Email", type: "email", placeholder: ""},
            password: { label: "Password", type: "password", }
        },
        async authorize(credentials) {

          // console.log(credentials)
          if(!credentials?.email || !credentials.password){
            return null
          }
          // console.log(JSON.stringify(credentials))
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              company: true
            }
          })
          const subUser = await prisma.subUser.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              parent: {
                include: {
                  company: true
                }
              }
            }
          })

          // console.log(user)

          if(!user && !subUser){
            throw new Error("Invalid Credentials")
          }
          // const hashedPass = hashPassword(credentials.password)
          const passwordMatched = await bcrypt.compare(credentials.password, user? user.password : subUser?.password)
          if(!passwordMatched){
            throw new Error("Invalid Credentials")
          }
          console.log(user)
          if(user){
            return user
          }else{
            return {
            ...subUser,
            workStartTime: subUser?.parent?.workStartTime,
            workEndTime: subUser?.parent?.workEndTime,
            gracePeriodInMinutes: subUser?.parent?.gracePeriodInMinutes,
            minutesThresholdAfterLate: subUser?.parent?.minutesThresholdAfterLate,
            overtimeThresholdInMinutes: subUser?.parent?.overtimeThresholdInMinutes,
            lateDeducInMinutes: subUser?.parent?.lateDeducInMinutes,
            overtimeRate: subUser?.parent?.overtimeRate,
            rdotRate: subUser?.parent?.rdotRate,
            company: subUser?.parent.company
          };    
          }
          },
    })
  ],
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt", // Use JWT for session storage
    maxAge: 60*60, // 1hr expiration if inactive
    updateAge: 15*60, // update every 15mins
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Add user id and role to the token object
      if (user) {
        token.id = user.id;
        token.parentId = user.parentId;
        token.name = user.name;
        token.email = user.email;
        token.photo = user.photo
        token.role = user.role;
        token.company = user.company;
        token.workStartTime = user.workStartTime;
        token.workEndTime = user.workEndTime;
        token.gracePeriodInMinutes = user.gracePeriodInMinutes;
        token.minutesThresholdAfterLate = user.minutesThresholdAfterLate;
        token.overtimeThresholdInMinutes = user.overtimeThresholdInMinutes;
        token.lateDeducInMinutes = user.lateDeducInMinutes;
        token.overtimeRate = user.overtimeRate;
      }

      // ---> ADDITION <---
      if (trigger == "update") {
        if (session?.user?.name && session?.user?.email) {
          token.email = session.user.email,
          token.name = session.user.name
          token.company = session.user.company
          token.workStartTime = session.user.workStartTime;
          token.workEndTime = session.user.workEndTime;
          token.gracePeriodInMinutes = session.user.gracePeriodInMinutes;
          token.minutesThresholdAfterLate = session.user.minutesThresholdAfterLate;
          token.overtimeThresholdInMinutes = session.user.overtimeThresholdInMinutes;
          token.lateDeducInMinutes = session.user.lateDeducInMinutes;
          token.overtimeRate = session.user.overtimeRate;
          token.rdotRate = session.user.rdotRate;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Add id and role to the session object
      if (token) {
        session.user.id = token.id;
        session.user.parentId = token.parentId;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.photo = token.photo;
        session.user.company = token.company;
        session.user.workStartTime = token.workStartTime;
        session.user.workEndTime = token.workEndTime;
        session.user.gracePeriodInMinutes = token.gracePeriodInMinutes;
        session.user.minutesThresholdAfterLate = token.minutesThresholdAfterLate;
        session.user.overtimeThresholdInMinutes = token.overtimeThresholdInMinutes;
        session.user.lateDeducInMinutes = token.lateDeducInMinutes;
        session.user.overtimeRate = token.overtimeRate;
        session.user.rdotRate = token.rdotRate;
        session.expires = new Date(token.exp * 1000).toISOString();
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development"
}