mod models;
mod database;
mod commands;

use database::Database;
use commands::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let database = Database::new(app.handle())?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_classes,
            create_class,
            update_class,
            delete_class,
            get_students,
            get_students_by_class,
            create_student,
            update_student,
            delete_student,
            get_products_by_class,
            create_product,
            update_product,
            delete_product,
            save_file_to_desktop,
            create_purchase_record,
            get_purchase_records_by_class,
            get_purchase_records_paginated,
            update_shipping_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
