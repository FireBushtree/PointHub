import type { Class, Product, PurchaseRecord, PaginatedPurchaseRecords, Student } from '../types'
import { invoke } from '@tauri-apps/api/core'

// Class API
export const classApi = {
  async getAll(): Promise<Class[]> {
    return await invoke('get_classes')
  },

  async create(classData: Omit<Class, 'id' | 'createdAt' | 'studentCount'>): Promise<Class> {
    return await invoke('create_class', {
      request: {
        name: classData.name,
        description: classData.description,
      },
    })
  },

  async update(id: string, classData: Partial<Omit<Class, 'id' | 'createdAt' | 'studentCount'>>): Promise<Class> {
    return await invoke('update_class', {
      id,
      request: {
        name: classData.name,
        description: classData.description,
      },
    })
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_class', { id })
  },
}

// Student API
export const studentApi = {
  async getAll(): Promise<Student[]> {
    return await invoke('get_students')
  },

  async getByClass(classId: string): Promise<Student[]> {
    return await invoke('get_students_by_class', { classId })
  },

  async create(studentData: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    return await invoke('create_student', {
      request: {
        name: studentData.name,
        points: studentData.points,
        class_id: studentData.classId,
        student_number: studentData.studentNumber,
      },
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
  },
}

// Product API
export const productApi = {
  async getByClass(classId: string): Promise<Product[]> {
    return await invoke('get_products_by_class', { classId })
  },

  async create(productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    return await invoke('create_product', {
      request: {
        name: productData.name,
        points: productData.points,
        stock: productData.stock,
        class_id: productData.classId,
      },
    })
  },

  async update(id: string, productData: Partial<Omit<Product, 'id' | 'classId' | 'createdAt'>>): Promise<Product> {
    const request: any = {}

    if (productData.name !== undefined) {
      request.name = productData.name
    }
    if (productData.points !== undefined) {
      request.points = productData.points
    }
    if (productData.stock !== undefined) {
      request.stock = productData.stock
    }

    return await invoke('update_product', { id, request })
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_product', { id })
  },
}

// Purchase record API
export const purchaseApi = {
  async create(productId: string, studentId: string, quantity: number = 1): Promise<PurchaseRecord> {
    return await invoke('create_purchase_record', {
      request: {
        product_id: productId,
        student_id: studentId,
        quantity,
      },
    })
  },

  async getByClass(classId: string): Promise<PurchaseRecord[]> {
    return await invoke('get_purchase_records_by_class', { classId })
  },

  async getByClassPaginated(classId: string, page: number, pageSize: number): Promise<PaginatedPurchaseRecords> {
    return await invoke('get_purchase_records_paginated', {
      classId,
      page,
      pageSize
    })
  },

  async updateShippingStatus(recordId: string, status: 'pending' | 'shipped' | 'delivered'): Promise<void> {
    return await invoke('update_shipping_status', {
      recordId,
      request: {
        shipping_status: status,
      },
    })
  },
}

// File operations
export const fileApi = {
  async saveToDesktop(filename: string, data: Uint8Array): Promise<string> {
    return await invoke('save_file_to_desktop', {
      filename,
      data: Array.from(data),
    })
  },
}
