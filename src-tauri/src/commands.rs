use tauri::State;
use crate::database::Database;
use crate::models::{Class, Student, CreateClassRequest, UpdateClassRequest, CreateStudentRequest, UpdateStudentRequest};
use std::fs;
use std::path::PathBuf;

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

// File operations
#[tauri::command]
pub async fn save_file_to_desktop(filename: String, data: Vec<u8>) -> Result<String, String> {
    let mut desktop_path = PathBuf::new();
    
    // 获取桌面路径
    if let Some(home_dir) = dirs::home_dir() {
        desktop_path = home_dir.join("Desktop");
    } else {
        return Err("无法获取桌面路径".to_string());
    }
    
    let file_path = desktop_path.join(filename);
    
    match fs::write(&file_path, data) {
        Ok(_) => Ok(file_path.to_string_lossy().to_string()),
        Err(e) => Err(format!("文件保存失败: {}", e))
    }
}