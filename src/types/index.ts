export type ClassStatus = 'active' | 'inactive'

export interface GymClass {
  id: string
  title: string
  description: string
  coach: string
  dayOfWeek: string
  date?: string
  startTime: string
  endTime: string
  capacity: number
  enrolledCount: number
  enrolledUserIds: string[]
  status: ClassStatus
  createdAt?: number
  updatedAt?: number
}

export interface GymClassFormInput {
  id?: string
  title: string
  description: string
  coach: string
  dayOfWeek: string
  date?: string
  startTime: string
  endTime: string
  capacity: number
  status: ClassStatus
}

export interface UserProfile {
  uid: string
  email: string
  phone: string
  firstName: string
  lastName: string
  nickname: string
  birthDate: string
  role: 'user' | 'admin'
  membership?: 'bronze' | 'silver' | 'gold'
  active?: boolean
  pushTokens?: string[]
  createdAt?: number
  updatedAt?: number
}

export interface EnrollmentRecord {
  classId: string
  userId: string
  enrolledAt: number
}
