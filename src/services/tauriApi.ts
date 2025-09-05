import { invoke } from '@tauri-apps/api/core'
import type { Class, Student } from '../types'

// Class API
export const classApi = {
  async getAll(): Promise<Class[]> {
    return await invoke('get_classes')
  },

  async create(classData: Omit<Class, 'id' | 'createdAt' | 'studentCount'>): Promise<Class> {
    return await invoke('create_class', {
      request: {
        name: classData.name,
        description: classData.description
      }
    })
  },

  async update(id: string, classData: Partial<Omit<Class, 'id' | 'createdAt' | 'studentCount'>>): Promise<Class> {
    return await invoke('update_class', {
      id,
      request: {
        name: classData.name,
        description: classData.description
      }
    })
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_class', { id })
  }
}

// Student API
export const studentApi = {
  async getAll(): Promise<Student[]> {
    return await invoke('get_students')
  },

  async getByClass(classId: string): Promise<Student[]> {
    return await invoke('get_students_by_class', { classId })
  },

  async create(studentData: Omit<Student, 'id'>): Promise<Student> {
    return await invoke('create_student', {
      request: {
        name: studentData.name,
        points: studentData.points,
        class_id: studentData.classId
      }
    })
  },

  async update(id: string, studentData: Partial<Omit<Student, 'id'>>): Promise<Student> {
    const request: any = {}
    
    if (studentData.name !== undefined) {
      request.name = studentData.name
    }
    if (studentData.points !== undefined) {
      request.points = studentData.points
    }
    if (studentData.classId !== undefined) {
      request.class_id = studentData.classId
    }

    return await invoke('update_student', { id, request })
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_student', { id })
  }
}

// File operations
export const fileApi = {
  async saveToDesktop(filename: string, data: Uint8Array): Promise<string> {
    return await invoke('save_file_to_desktop', { 
      filename, 
      data: Array.from(data)
    })
  }
}