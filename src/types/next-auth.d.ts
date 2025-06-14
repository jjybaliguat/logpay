import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  export interface Session {
    user: {
      /** The user's postal address. */
      id: string,
      parentId?: string,
      name: string,
      email: string,
      photo: string,
      role: UserRole
      company: Company
      workStartTime: string,
      workEndTime: string,
      gracePeriodInMinutes: number,
      minutesThresholdAfterLate: number,
      overtimeThresholdInMinutes: number,
      lateDeducInMinutes: number,
      overtimeRate: number,
      rdotRate: number
    } & DefaultSession["user"];
  }

  interface User {
    id: string,
    parentId?: string,
    name: string,
    email: string,
    photo: string,
    role: UserRole,
    workStartTime: string,
    workEndTime: string,
    gracePeriodInMinutes: number,
    minutesThresholdAfterLate: number,
    overtimeThresholdInMinutes: number,
    lateDeducInMinutes: number,
    overtimeRate: number,
    rdotRate: number,
    company: Company
  }

  interface Company {
    name: string,
    address: string,
    contact: string
  }

  export enum UserRole {
    ADMIN = "ADMIN",
    EDITOR = "EDITOR",
    DEVELOPER = "DEVELOPER",
  }
}