export interface Class {
  id: string
  name: string
  description?: string
  studentCount: number
  createdAt: string
}

export interface Student {
  id: string
  name: string
  studentNumber: string
  points: number
  classId: string
  className: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  points: number
  stock: number
  classId: string
  createdAt: string
}
