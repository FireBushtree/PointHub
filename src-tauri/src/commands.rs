use tauri::State;
use crate::database::Database;
use crate::models::{Class, Student, CreateClassRequest, UpdateClassRequest, CreateStudentRequest, UpdateStudentRequest, Product, CreateProductRequest, UpdateProductRequest, PurchaseRecord, CreatePurchaseRequest, UpdateShippingStatusRequest};
use std::fs;

// Class commands
#[tauri::command]
pub async fn get_classes(database: State<'_, Database>) -> Result<Vec<Class>, String> {
    database.get_all_classes()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_class(database: State<'_, Database>, request: CreateClassRequest) -> Result<Class, String> {
    database.create_class(request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_class(database: State<'_, Database>, id: String, request: UpdateClassRequest) -> Result<Class, String> {
    database.update_class(&id, request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_class(database: State<'_, Database>, id: String) -> Result<(), String> {
    database.delete_class(&id)
        .map_err(|e| e.to_string())
}

// Student commands
#[tauri::command]
pub async fn get_students(database: State<'_, Database>) -> Result<Vec<Student>, String> {
    database.get_all_students()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_students_by_class(database: State<'_, Database>, class_id: String) -> Result<Vec<Student>, String> {
    database.get_students_by_class(&class_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_student(database: State<'_, Database>, request: CreateStudentRequest) -> Result<Student, String> {
    database.create_student(request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_student(database: State<'_, Database>, id: String, request: UpdateStudentRequest) -> Result<Student, String> {
    database.update_student(&id, request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_student(database: State<'_, Database>, id: String) -> Result<(), String> {
    database.delete_student(&id)
        .map_err(|e| e.to_string())
}

// Product commands
#[tauri::command]
pub async fn get_products_by_class(database: State<'_, Database>, class_id: String) -> Result<Vec<Product>, String> {
    database.get_products_by_class(&class_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_product(database: State<'_, Database>, request: CreateProductRequest) -> Result<Product, String> {
    database.create_product(request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_product(database: State<'_, Database>, id: String, request: UpdateProductRequest) -> Result<Product, String> {
    database.update_product(&id, request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_product(database: State<'_, Database>, id: String) -> Result<(), String> {
    database.delete_product(&id)
        .map_err(|e| e.to_string())
}

// File operations
#[tauri::command]
pub async fn save_file_to_desktop(filename: String, data: Vec<u8>) -> Result<String, String> {
    // 获取桌面路径
    let desktop_path = if let Some(home_dir) = dirs::home_dir() {
        home_dir.join("Desktop")
    } else {
        return Err("无法获取桌面路径".to_string());
    };

    let file_path = desktop_path.join(filename);

    match fs::write(&file_path, data) {
        Ok(_) => Ok(file_path.to_string_lossy().to_string()),
        Err(e) => Err(format!("文件保存失败: {}", e))
    }
}

// Purchase record commands
#[tauri::command]
pub async fn create_purchase_record(database: State<'_, Database>, request: CreatePurchaseRequest) -> Result<PurchaseRecord, String> {
    database.create_purchase_record(request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_purchase_records_by_class(database: State<'_, Database>, class_id: String) -> Result<Vec<PurchaseRecord>, String> {
    database.get_purchase_records_by_class(&class_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_shipping_status(database: State<'_, Database>, record_id: String, request: UpdateShippingStatusRequest) -> Result<(), String> {
    database.update_shipping_status(&record_id, &request.shipping_status)
        .map_err(|e| e.to_string())
}