import type { Class, Student } from '../types'
import { mockClasses, mockStudents } from './mockData'

const classes: Class[] = [...mockClasses]
let students: Student[] = [...mockStudents]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const classApi = {
  async getAll(): Promise<Class[]> {
    await delay(200)
    return [...classes]
  },

  async create(classData: Omit<Class, 'id' | 'createdAt'>): Promise<Class> {
    await delay(200)
    const newClass: Class = {
      ...classData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    classes.push(newClass)
    return newClass
  },

  async update(id: string, classData: Partial<Omit<Class, 'id' | 'createdAt'>>): Promise<Class> {
    await delay(200)
    const index = classes.findIndex(c => c.id === id)
    if (index === -1)
      throw new Error('Class not found')

    classes[index] = { ...classes[index], ...classData }
    return classes[index]
  },

  async delete(id: string): Promise<void> {
    await delay(200)
    const index = classes.findIndex(c => c.id === id)
    if (index === -1)
      throw new Error('Class not found')

    classes.splice(index, 1)
    students = students.filter(s => s.classId !== id)
  },
}

export const studentApi = {
  async getAll(): Promise<Student[]> {
    await delay(200)
    return [...students]
  },

  async create(studentData: Omit<Student, 'id'>): Promise<Student> {
    await delay(200)
    const newStudent: Student = {
      ...studentData,
      id: Date.now().toString(),
    }
    students.push(newStudent)

    const classIndex = classes.findIndex(c => c.id === studentData.classId)
    if (classIndex !== -1) {
      classes[classIndex].studentCount += 1
    }

    return newStudent
  },

  async update(id: string, studentData: Partial<Omit<Student, 'id'>>): Promise<Student> {
    await delay(200)
    const index = students.findIndex(s => s.id === id)
    if (index === -1)
      throw new Error('Student not found')

    students[index] = { ...students[index], ...studentData }
    return students[index]
  },

  async delete(id: string): Promise<void> {
    await delay(200)
    const index = students.findIndex(s => s.id === id)
    if (index === -1)
      throw new Error('Student not found')

    const student = students[index]
    students.splice(index, 1)

    const classIndex = classes.findIndex(c => c.id === student.classId)
    if (classIndex !== -1) {
      classes[classIndex].studentCount -= 1
    }
  },
}
