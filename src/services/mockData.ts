import type { Class, Student } from '../types'

export const mockClasses: Class[] = [
  {
    id: '1',
    name: '计算机科学与技术2021级1班',
    description: '计算机科学与技术专业',
    studentCount: 32,
    createdAt: '2021-09-01',
  },
]

export const mockStudents: Student[] = [
  {
    id: '1',
    name: '张三',
    points: 85,
    classId: '1',
    className: '计算机科学与技术2021级1班',
  },
]
