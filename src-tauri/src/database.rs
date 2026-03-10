use std::sync::Mutex;
use std::path::PathBuf;
use rusqlite::{Connection, Result as SqliteResult, params};
use rusqlite::OptionalExtension;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use tauri::{AppHandle, Manager};

use crate::models::{
    Class,
    Student,
    CreateClassRequest,
    UpdateClassRequest,
    CreateStudentRequest,
    UpdateStudentRequest,
    Product,
    CreateProductRequest,
    UpdateProductRequest,
    PurchaseRecord,
    CreatePurchaseRequest,
    PaginatedPurchaseRecords,
    WheelConfig,
    WheelSlot,
    SaveWheelConfigRequest,
    SpinWheelResult,
    SpinWheelRequest,
};

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let db_dir = Self::find_best_data_location(app_handle)?;
        std::fs::create_dir_all(&db_dir)?;

        let db_path = db_dir.join("pointhub.db");
        let conn = Connection::open(db_path)?;

        let database = Database {
            conn: Mutex::new(conn),
        };

        database.init_tables()?;
        database.init_sample_data()?;

        Ok(database)
    }

    fn find_best_data_location(app_handle: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let possible_dirs = vec![
            PathBuf::from("D:\\PointHub"),
            PathBuf::from("E:\\PointHub"),
            PathBuf::from("F:\\PointHub"),
            app_handle.path().app_data_dir()?,
        ];

        for dir in possible_dirs {
            if let Some(parent) = dir.parent() {
                if parent.exists() {
                    return Ok(dir);
                }
            }
        }

        Ok(app_handle.path().app_data_dir()?)
    }

    fn init_tables(&self) -> SqliteResult<()> {
        let mut conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS classes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                student_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                student_number TEXT NOT NULL DEFAULT '',
                points INTEGER NOT NULL DEFAULT 0,
                class_id TEXT NOT NULL,
                class_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(class_id) REFERENCES classes(id)
            )",
            [],
        )?;

        // Add created_at column to existing students table if it doesn't exist
        let _ = conn.execute(
            "ALTER TABLE students ADD COLUMN created_at TEXT DEFAULT ''",
            [],
        );

        // Add student_number column to existing students table if it doesn't exist
        let _ = conn.execute(
            "ALTER TABLE students ADD COLUMN student_number TEXT DEFAULT ''",
            [],
        );

        // Update any existing students without created_at
        conn.execute(
            "UPDATE students SET created_at = ? WHERE created_at = '' OR created_at IS NULL",
            [&Utc::now().to_rfc3339()],
        )?;

        // Update any existing students without student_number (generate default)
        conn.execute(
            "UPDATE students SET student_number = 'STU' || substr(id, 1, 8) WHERE student_number = '' OR student_number IS NULL",
            [],
        )?;

        // Create products table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                points INTEGER NOT NULL,
                stock INTEGER NOT NULL,
                class_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(class_id) REFERENCES classes(id)
            )",
            [],
        )?;

        // Create purchase_records table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS purchase_records (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                points INTEGER NOT NULL,
                student_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                class_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                shipping_status TEXT NOT NULL DEFAULT 'pending',
                source TEXT NOT NULL DEFAULT '购买',
                FOREIGN KEY(student_id) REFERENCES students(id),
                FOREIGN KEY(class_id) REFERENCES classes(id)
            )",
            [],
        )?;

        // Add shipping_status column to existing purchase_records table if it doesn't exist
        let _ = conn.execute(
            "ALTER TABLE purchase_records ADD COLUMN shipping_status TEXT DEFAULT 'pending'",
            [],
        );

        // Add source column to existing purchase_records table if it doesn't exist
        let _ = conn.execute(
            "ALTER TABLE purchase_records ADD COLUMN source TEXT DEFAULT '购买'",
            [],
        );

        // Backfill source for historical records
        conn.execute(
            "UPDATE purchase_records SET source = '购买' WHERE source = '' OR source IS NULL",
            [],
        )?;

        // One wheel config per class
        conn.execute(
            "CREATE TABLE IF NOT EXISTS wheel_configs (
                class_id TEXT PRIMARY KEY,
                spin_cost INTEGER NOT NULL DEFAULT 10,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(class_id) REFERENCES classes(id)
            )",
            [],
        )?;

        // Wheel slots control probability via duplicated slots.
        conn.execute(
            "CREATE TABLE IF NOT EXISTS wheel_slots (
                id TEXT PRIMARY KEY,
                class_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                slot_index INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(class_id) REFERENCES classes(id),
                FOREIGN KEY(product_id) REFERENCES products(id)
            )",
            [],
        )?;

        // Rebuild purchase_records table if old schema still contains product_id foreign key
        if let Some(schema_sql) = conn
            .query_row(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'purchase_records'",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()? 
        {
            if schema_sql.contains("FOREIGN KEY(\"product_id\")")
                || schema_sql.contains("FOREIGN KEY(product_id)")
            {
                conn.execute("PRAGMA foreign_keys = OFF", [])?;

                let migration_result: SqliteResult<()> = (|| {
                    let tx = conn.transaction()?;
                    tx.execute("DROP TABLE IF EXISTS purchase_records_new", [])?;
                    tx.execute(
                        "CREATE TABLE purchase_records_new (
                            id TEXT PRIMARY KEY,
                            product_id TEXT NOT NULL,
                            product_name TEXT NOT NULL,
                            points INTEGER NOT NULL,
                            student_id TEXT NOT NULL,
                            student_name TEXT NOT NULL,
                            quantity INTEGER NOT NULL,
                            class_id TEXT NOT NULL,
                            created_at TEXT NOT NULL,
                            shipping_status TEXT NOT NULL DEFAULT 'pending',
                            source TEXT NOT NULL DEFAULT '购买',
                            FOREIGN KEY(student_id) REFERENCES students(id),
                            FOREIGN KEY(class_id) REFERENCES classes(id)
                        )",
                        [],
                    )?;

                    tx.execute(
                        "INSERT INTO purchase_records_new (
                            id, product_id, product_name, points, student_id, student_name, quantity, class_id, created_at, shipping_status, source
                        )
                        SELECT
                            id, product_id, product_name, points, student_id, student_name, quantity, class_id, created_at, COALESCE(shipping_status, 'pending'), COALESCE(source, '购买')
                        FROM purchase_records",
                        [],
                    )?;

                    tx.execute("DROP TABLE purchase_records", [])?;
                    tx.execute(
                        "ALTER TABLE purchase_records_new RENAME TO purchase_records",
                        [],
                    )?;
                    tx.commit()?;
                    Ok(())
                })();

                conn.execute("PRAGMA foreign_keys = ON", [])?;
                migration_result?;
            }
        }

        Ok(())
    }

    fn init_sample_data(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        // Check if data already exists
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM classes", [], |row| row.get(0))?;
        if count > 0 {
            return Ok(());
        }

        // Insert sample class
        let class_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO classes (id, name, description, student_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                class_id,
                "计算机科学与技术2021级1班",
                "计算机科学与技术专业",
                1,
                now
            ],
        )?;

        // Insert sample student
        let student_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO students (id, name, student_number, points, class_id, class_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                student_id,
                "张三",
                "2021001",
                85,
                class_id,
                "计算机科学与技术2021级1班",
                now
            ],
        )?;

        Ok(())
    }

    // Class CRUD operations
    pub fn get_all_classes(&self) -> Result<Vec<Class>, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, description, student_count, created_at FROM classes ORDER BY created_at DESC")?;

        let class_iter = stmt.query_map([], |row| {
            let created_at_str: String = row.get(4)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Class {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                student_count: row.get(3)?,
                created_at,
            })
        })?;

        let mut classes = Vec::new();
        for class in class_iter {
            classes.push(class?);
        }

        Ok(classes)
    }

    pub fn create_class(&self, req: CreateClassRequest) -> Result<Class, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();
        let created_at_str = created_at.to_rfc3339();

        conn.execute(
            "INSERT INTO classes (id, name, description, student_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, req.name, req.description, 0, created_at_str],
        )?;

        Ok(Class {
            id,
            name: req.name,
            description: req.description,
            student_count: 0,
            created_at,
        })
    }

    pub fn update_class(&self, id: &str, req: UpdateClassRequest) -> Result<Class, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        // Build dynamic update query
        if let Some(name) = &req.name {
            conn.execute(
                "UPDATE classes SET name = ? WHERE id = ?",
                params![name, id],
            )?;
        }

        if let Some(description) = &req.description {
            conn.execute(
                "UPDATE classes SET description = ? WHERE id = ?",
                params![description, id],
            )?;
        }

        if req.name.is_none() && req.description.is_none() {
            return Err("No fields to update".into());
        }

        // Update class_name in students table if name changed
        if let Some(new_name) = &req.name {
            conn.execute(
                "UPDATE students SET class_name = ? WHERE class_id = ?",
                params![new_name, id],
            )?;
        }

        // Get updated class
        let mut stmt = conn.prepare("SELECT id, name, description, student_count, created_at FROM classes WHERE id = ?")?;
        let class = stmt.query_row([id], |row| {
            let created_at_str: String = row.get(4)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Class {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                student_count: row.get(3)?,
                created_at,
            })
        })?;

        Ok(class)
    }

    pub fn delete_class(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        // Delete students first
        conn.execute("DELETE FROM students WHERE class_id = ?", [id])?;
        conn.execute("DELETE FROM products WHERE class_id = ?", [id])?;
        conn.execute("DELETE FROM purchase_records WHERE class_id = ?", [id])?;
        conn.execute("DELETE FROM wheel_slots WHERE class_id = ?", [id])?;
        conn.execute("DELETE FROM wheel_configs WHERE class_id = ?", [id])?;

        // Delete class
        conn.execute("DELETE FROM classes WHERE id = ?", [id])?;

        Ok(())
    }

    // Student CRUD operations
    pub fn get_all_students(&self) -> Result<Vec<Student>, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, student_number, points, class_id, class_name, created_at FROM students ORDER BY CAST(student_number AS INTEGER) ASC")?;

        let student_iter = stmt.query_map([], |row| {
            let created_at_str: String = row.get(6)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                student_number: row.get(2)?,
                points: row.get(3)?,
                class_id: row.get(4)?,
                class_name: row.get(5)?,
                created_at,
            })
        })?;

        let mut students = Vec::new();
        for student in student_iter {
            students.push(student?);
        }

        Ok(students)
    }

    pub fn get_students_by_class(&self, class_id: &str) -> Result<Vec<Student>, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, student_number, points, class_id, class_name, created_at FROM students WHERE class_id = ? ORDER BY CAST(student_number AS INTEGER) ASC")?;

        let student_iter = stmt.query_map([class_id], |row| {
            let created_at_str: String = row.get(6)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                student_number: row.get(2)?,
                points: row.get(3)?,
                class_id: row.get(4)?,
                class_name: row.get(5)?,
                created_at,
            })
        })?;

        let mut students = Vec::new();
        for student in student_iter {
            students.push(student?);
        }

        Ok(students)
    }

    pub fn create_student(&self, req: CreateStudentRequest) -> Result<Student, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();
        let created_at_str = created_at.to_rfc3339();

        // Get class name
        let class_name: String = conn.query_row(
            "SELECT name FROM classes WHERE id = ?",
            [&req.class_id],
            |row| row.get(0),
        )?;

        conn.execute(
            "INSERT INTO students (id, name, student_number, points, class_id, class_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, req.name, req.student_number, req.points, req.class_id, class_name, created_at_str],
        )?;

        // Update class student count
        conn.execute(
            "UPDATE classes SET student_count = (SELECT COUNT(*) FROM students WHERE class_id = ?) WHERE id = ?",
            params![req.class_id, req.class_id],
        )?;

        Ok(Student {
            id,
            name: req.name,
            student_number: req.student_number,
            points: req.points,
            class_id: req.class_id,
            class_name,
            created_at,
        })
    }

    pub fn update_student(&self, id: &str, req: UpdateStudentRequest) -> Result<Student, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        // Get current student info
        let current_student: Student = {
            let mut stmt = conn.prepare("SELECT id, name, student_number, points, class_id, class_name, created_at FROM students WHERE id = ?")?;
            stmt.query_row([id], |row| {
                let created_at_str: String = row.get(6)?;
                let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                Ok(Student {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    student_number: row.get(2)?,
                    points: row.get(3)?,
                    class_id: row.get(4)?,
                    class_name: row.get(5)?,
                    created_at,
                })
            })?
        };

        // Update fields individually
        let mut class_changed = false;
        let mut has_updates = false;

        if let Some(name) = &req.name {
            conn.execute(
                "UPDATE students SET name = ? WHERE id = ?",
                params![name, id],
            )?;
            has_updates = true;
        }

        if let Some(student_number) = &req.student_number {
            conn.execute(
                "UPDATE students SET student_number = ? WHERE id = ?",
                params![student_number, id],
            )?;
            has_updates = true;
        }

        if let Some(points) = req.points {
            conn.execute(
                "UPDATE students SET points = ? WHERE id = ?",
                params![points, id],
            )?;
            has_updates = true;
        }

        if let Some(class_id) = &req.class_id {
            if class_id != &current_student.class_id {
                class_changed = true;
                has_updates = true;

                // Get new class name
                let class_name: String = conn.query_row(
                    "SELECT name FROM classes WHERE id = ?",
                    [class_id],
                    |row| row.get(0),
                )?;

                conn.execute(
                    "UPDATE students SET class_id = ?, class_name = ? WHERE id = ?",
                    params![class_id, class_name, id],
                )?;
            }
        }

        if !has_updates {
            return Ok(current_student);
        }

        // Update student counts if class changed
        if class_changed {
            if let Some(new_class_id) = &req.class_id {
                // Update old class student count
                conn.execute(
                    "UPDATE classes SET student_count = (SELECT COUNT(*) FROM students WHERE class_id = ?) WHERE id = ?",
                    params![current_student.class_id, current_student.class_id],
                )?;

                // Update new class student count
                conn.execute(
                    "UPDATE classes SET student_count = (SELECT COUNT(*) FROM students WHERE class_id = ?) WHERE id = ?",
                    params![new_class_id, new_class_id],
                )?;
            }
        }

        // Get updated student
        let mut stmt = conn.prepare("SELECT id, name, student_number, points, class_id, class_name, created_at FROM students WHERE id = ?")?;
        let student = stmt.query_row([id], |row| {
            let created_at_str: String = row.get(6)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                student_number: row.get(2)?,
                points: row.get(3)?,
                class_id: row.get(4)?,
                class_name: row.get(5)?,
                created_at,
            })
        })?;

        Ok(student)
    }

    pub fn delete_student(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        // Get class_id before deleting
        let class_id: String = conn.query_row(
            "SELECT class_id FROM students WHERE id = ?",
            [id],
            |row| row.get(0),
        )?;

        // Delete student
        conn.execute("DELETE FROM students WHERE id = ?", [id])?;

        // Update class student count
        conn.execute(
            "UPDATE classes SET student_count = (SELECT COUNT(*) FROM students WHERE class_id = ?) WHERE id = ?",
            params![class_id, class_id],
        )?;

        Ok(())
    }

    // Product CRUD operations
    pub fn get_products_by_class(&self, class_id: &str) -> Result<Vec<Product>, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, points, stock, class_id, created_at FROM products WHERE class_id = ? ORDER BY created_at DESC")?;

        let product_iter = stmt.query_map([class_id], |row| {
            let created_at_str: String = row.get(5)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                points: row.get(2)?,
                stock: row.get(3)?,
                class_id: row.get(4)?,
                created_at,
            })
        })?;

        let mut products = Vec::new();
        for product in product_iter {
            products.push(product?);
        }

        Ok(products)
    }

    pub fn create_product(&self, req: CreateProductRequest) -> Result<Product, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();
        let created_at_str = created_at.to_rfc3339();

        conn.execute(
            "INSERT INTO products (id, name, points, stock, class_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, req.name, req.points, req.stock, req.class_id, created_at_str],
        )?;

        Ok(Product {
            id,
            name: req.name,
            points: req.points,
            stock: req.stock,
            class_id: req.class_id,
            created_at,
        })
    }

    pub fn update_product(&self, id: &str, req: UpdateProductRequest) -> Result<Product, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        let mut has_updates = false;

        if let Some(name) = &req.name {
            conn.execute(
                "UPDATE products SET name = ? WHERE id = ?",
                params![name, id],
            )?;
            has_updates = true;
        }

        if let Some(points) = req.points {
            conn.execute(
                "UPDATE products SET points = ? WHERE id = ?",
                params![points, id],
            )?;
            has_updates = true;
        }

        if let Some(stock) = req.stock {
            conn.execute(
                "UPDATE products SET stock = ? WHERE id = ?",
                params![stock, id],
            )?;
            has_updates = true;
        }

        if !has_updates {
            return Err("No fields to update".into());
        }

        // Get updated product
        let mut stmt = conn.prepare("SELECT id, name, points, stock, class_id, created_at FROM products WHERE id = ?")?;
        let product = stmt.query_row([id], |row| {
            let created_at_str: String = row.get(5)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                points: row.get(2)?,
                stock: row.get(3)?,
                class_id: row.get(4)?,
                created_at,
            })
        })?;

        Ok(product)
    }

    pub fn delete_product(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM products WHERE id = ?", [id])?;
        Ok(())
    }

    // Purchase records methods
    pub fn create_purchase_record(&self, req: CreatePurchaseRequest) -> Result<PurchaseRecord, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        // Start transaction
        conn.execute("BEGIN TRANSACTION", [])?;

        // Get product and student info
        let product: Product = conn.query_row(
            "SELECT id, name, points, stock, class_id, created_at FROM products WHERE id = ?",
            [&req.product_id],
            |row| {
                Ok(Product {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    points: row.get(2)?,
                    stock: row.get(3)?,
                    class_id: row.get(4)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?).map_err(|_| rusqlite::Error::InvalidColumnType(5, "datetime".to_string(), rusqlite::types::Type::Text))?.with_timezone(&Utc),
                })
            },
        )?;

        let student: Student = conn.query_row(
            "SELECT id, name, student_number, points, class_id, class_name, created_at FROM students WHERE id = ?",
            [&req.student_id],
            |row| {
                Ok(Student {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    student_number: row.get(2)?,
                    points: row.get(3)?,
                    class_id: row.get(4)?,
                    class_name: row.get(5)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?).map_err(|_| rusqlite::Error::InvalidColumnType(6, "datetime".to_string(), rusqlite::types::Type::Text))?.with_timezone(&Utc),
                })
            },
        )?;

        // Check if product has enough stock
        if product.stock < req.quantity {
            conn.execute("ROLLBACK", [])?;
            return Err("库存不足".into());
        }

        let total_points = product.points * req.quantity;

        // Check if student has enough points
        if student.points < total_points {
            conn.execute("ROLLBACK", [])?;
            return Err("积分不足".into());
        }

        // Create purchase record
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();

        conn.execute(
            "INSERT INTO purchase_records (id, product_id, product_name, points, student_id, student_name, quantity, class_id, created_at, shipping_status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                &id,
                &product.id,
                &product.name,
                &total_points,
                &student.id,
                &student.name,
                &req.quantity,
                &product.class_id,
                &created_at.to_rfc3339(),
                "pending",
                "购买"
            ],
        )?;

        // Update student points
        conn.execute(
            "UPDATE students SET points = points - ? WHERE id = ?",
            params![&total_points, &student.id],
        )?;

        // Update product stock
        conn.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            params![&req.quantity, &product.id],
        )?;

        // Commit transaction
        conn.execute("COMMIT", [])?;

        Ok(PurchaseRecord {
            id,
            product_id: product.id,
            product_name: product.name,
            points: total_points,
            student_id: student.id,
            student_name: student.name,
            quantity: req.quantity,
            class_id: product.class_id,
            created_at,
            shipping_status: "pending".to_string(),
            source: "购买".to_string(),
        })
    }

    pub fn get_purchase_records_by_class(&self, class_id: &str) -> Result<Vec<PurchaseRecord>, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, product_id, product_name, points, student_id, student_name, quantity, class_id, created_at, shipping_status, source FROM purchase_records WHERE class_id = ? ORDER BY created_at DESC")?;

        let records = stmt.query_map([class_id], |row| {
            Ok(PurchaseRecord {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                points: row.get(3)?,
                student_id: row.get(4)?,
                student_name: row.get(5)?,
                quantity: row.get(6)?,
                class_id: row.get(7)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?).map_err(|_| rusqlite::Error::InvalidColumnType(8, "datetime".to_string(), rusqlite::types::Type::Text))?.with_timezone(&Utc),
                shipping_status: row.get(9)?,
                source: row.get(10)?,
            })
        })?;

        let mut result = Vec::new();
        for record in records {
            result.push(record?);
        }

        Ok(result)
    }

    pub fn get_purchase_records_paginated(&self, class_id: &str, page: i64, page_size: i64, source: Option<&str>) -> Result<PaginatedPurchaseRecords, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();

        let source_filter = source.filter(|value| !value.trim().is_empty() && *value != "all");
        let source_value = source_filter.unwrap_or("");

        // 获取总记录数
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM purchase_records WHERE class_id = ?1 AND (?2 = '' OR source = ?2)",
            params![class_id, source_value],
            |row| row.get(0),
        )?;

        // 计算总页数
        let total_pages = (total + page_size - 1) / page_size;

        // 计算偏移量
        let offset = (page - 1) * page_size;

        // 分页查询数据
        let mut stmt = conn.prepare(
            "SELECT id, product_id, product_name, points, student_id, student_name, quantity, class_id, created_at, shipping_status, source
             FROM purchase_records
             WHERE class_id = ?1 AND (?2 = '' OR source = ?2)
             ORDER BY created_at DESC
             LIMIT ?3 OFFSET ?4"
        )?;

        let records = stmt.query_map(params![class_id, source_value, page_size, offset], |row| {
            Ok(PurchaseRecord {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                points: row.get(3)?,
                student_id: row.get(4)?,
                student_name: row.get(5)?,
                quantity: row.get(6)?,
                class_id: row.get(7)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?).map_err(|_| rusqlite::Error::InvalidColumnType(8, "datetime".to_string(), rusqlite::types::Type::Text))?.with_timezone(&Utc),
                shipping_status: row.get(9)?,
                source: row.get(10)?,
            })
        })?;

        let mut result = Vec::new();
        for record in records {
            result.push(record?);
        }

        Ok(PaginatedPurchaseRecords {
            records: result,
            total,
            total_pages,
            current_page: page,
            page_size,
        })
    }

    pub fn get_wheel_config(&self, class_id: &str) -> Result<WheelConfig, Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let now_rfc3339 = Utc::now().to_rfc3339();
        let class_exists: Option<String> = conn
            .query_row("SELECT id FROM classes WHERE id = ?", [class_id], |row| row.get(0))
            .optional()?;
        if class_exists.is_none() {
            return Err("班级不存在".into());
        }

        let existing: Option<(i32, String, String)> = conn
            .query_row(
                "SELECT spin_cost, created_at, updated_at FROM wheel_configs WHERE class_id = ?",
                [class_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()?;

        if existing.is_none() {
            conn.execute(
                "INSERT INTO wheel_configs (class_id, spin_cost, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![class_id, 10, now_rfc3339, now_rfc3339],
            )?;
        }

        let (spin_cost, created_at_raw, updated_at_raw): (i32, String, String) = conn.query_row(
            "SELECT spin_cost, created_at, updated_at FROM wheel_configs WHERE class_id = ?",
            [class_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;

        let mut stmt = conn.prepare(
            "SELECT
                ws.id,
                ws.class_id,
                ws.product_id,
                p.name,
                p.points,
                p.stock,
                ws.slot_index
             FROM wheel_slots ws
             JOIN products p ON p.id = ws.product_id
             WHERE ws.class_id = ?
             ORDER BY ws.slot_index ASC",
        )?;

        let slot_rows = stmt.query_map([class_id], |row| {
            Ok(WheelSlot {
                id: row.get(0)?,
                class_id: row.get(1)?,
                product_id: row.get(2)?,
                product_name: row.get(3)?,
                product_points: row.get(4)?,
                product_stock: row.get(5)?,
                slot_index: row.get(6)?,
            })
        })?;

        let mut slots = Vec::new();
        for slot in slot_rows {
            slots.push(slot?);
        }

        Ok(WheelConfig {
            class_id: class_id.to_string(),
            spin_cost,
            slots,
            created_at: DateTime::parse_from_rfc3339(&created_at_raw)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&updated_at_raw)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }

    pub fn save_wheel_config(
        &self,
        class_id: &str,
        req: SaveWheelConfigRequest,
    ) -> Result<WheelConfig, Box<dyn std::error::Error>> {
        if req.spin_cost <= 0 {
            return Err("抽奖消耗积分必须大于0".into());
        }
        if req.product_ids.is_empty() {
            return Err("转盘至少需要一个奖品格子".into());
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let class_exists: Option<String> = tx
            .query_row(
                "SELECT id FROM classes WHERE id = ?",
                [class_id],
                |row| row.get(0),
            )
            .optional()?;
        if class_exists.is_none() {
            return Err("班级不存在".into());
        }

        for product_id in &req.product_ids {
            let product_exists: Option<String> = tx
                .query_row(
                    "SELECT id FROM products WHERE id = ? AND class_id = ?",
                    params![product_id, class_id],
                    |row| row.get(0),
                )
                .optional()?;
            if product_exists.is_none() {
                return Err(format!("奖品不存在或不属于当前班级: {}", product_id).into());
            }
        }

        let now = Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO wheel_configs (class_id, spin_cost, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(class_id) DO UPDATE SET
                spin_cost = excluded.spin_cost,
                updated_at = excluded.updated_at",
            params![class_id, req.spin_cost, now, now],
        )?;

        tx.execute("DELETE FROM wheel_slots WHERE class_id = ?", [class_id])?;

        for (index, product_id) in req.product_ids.iter().enumerate() {
            tx.execute(
                "INSERT INTO wheel_slots (id, class_id, product_id, slot_index, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    Uuid::new_v4().to_string(),
                    class_id,
                    product_id,
                    index as i32,
                    now
                ],
            )?;
        }

        tx.commit()?;
        drop(conn);

        self.get_wheel_config(class_id)
    }

    pub fn spin_wheel(
        &self,
        class_id: &str,
        req: SpinWheelRequest,
    ) -> Result<SpinWheelResult, Box<dyn std::error::Error>> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let spin_cost: i32 = tx
            .query_row(
                "SELECT spin_cost FROM wheel_configs WHERE class_id = ?",
                [class_id],
                |row| row.get(0),
            )
            .optional()?
            .ok_or("请先配置大转盘")?;

        if spin_cost <= 0 {
            return Err("抽奖消耗积分配置无效".into());
        }

        let mut slots_stmt = tx.prepare(
            "SELECT
                ws.id,
                ws.class_id,
                ws.product_id,
                p.name,
                p.points,
                p.stock,
                ws.slot_index
             FROM wheel_slots ws
             JOIN products p ON p.id = ws.product_id
             WHERE ws.class_id = ?
             ORDER BY ws.slot_index ASC",
        )?;

        let slot_rows = slots_stmt.query_map([class_id], |row| {
            Ok(WheelSlot {
                id: row.get(0)?,
                class_id: row.get(1)?,
                product_id: row.get(2)?,
                product_name: row.get(3)?,
                product_points: row.get(4)?,
                product_stock: row.get(5)?,
                slot_index: row.get(6)?,
            })
        })?;

        let mut slots = Vec::new();
        for slot in slot_rows {
            slots.push(slot?);
        }
        drop(slots_stmt);

        if slots.is_empty() {
            return Err("转盘未配置奖品格子".into());
        }

        if let Some(slot) = slots.iter().find(|slot| slot.product_stock <= 0) {
            return Err(format!("奖品库存不足，无法开启转盘: {}", slot.product_name).into());
        }

        let (student_name, current_points): (String, i32) = tx
            .query_row(
                "SELECT name, points FROM students WHERE id = ? AND class_id = ?",
                params![req.student_id, class_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?
            .ok_or("学生不存在或不属于当前班级")?;

        if current_points < spin_cost {
            return Err("积分不足，无法开启转盘".into());
        }

        let winning_index = (Uuid::new_v4().as_u128() % slots.len() as u128) as usize;
        let mut winning_slot = slots[winning_index].clone();

        tx.execute(
            "UPDATE students SET points = points - ? WHERE id = ?",
            params![spin_cost, req.student_id],
        )?;

        let stock_rows = tx.execute(
            "UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0",
            params![winning_slot.product_id],
        )?;
        if stock_rows == 0 {
            return Err("奖品库存不足，无法完成抽奖".into());
        }
        winning_slot.product_stock -= 1;

        let record_id = Uuid::new_v4().to_string();
        let created_at = Utc::now();
        tx.execute(
            "INSERT INTO purchase_records (id, product_id, product_name, points, student_id, student_name, quantity, class_id, created_at, shipping_status, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, 'pending', '抽奖')",
            params![
                record_id,
                winning_slot.product_id,
                winning_slot.product_name,
                spin_cost,
                req.student_id,
                student_name,
                class_id,
                created_at.to_rfc3339(),
            ],
        )?;

        let remaining_points: i32 = tx.query_row(
            "SELECT points FROM students WHERE id = ?",
            [req.student_id.as_str()],
            |row| row.get(0),
        )?;

        tx.commit()?;

        let record = PurchaseRecord {
            id: record_id,
            product_id: winning_slot.product_id.clone(),
            product_name: winning_slot.product_name.clone(),
            points: spin_cost,
            student_id: req.student_id.clone(),
            student_name: student_name.clone(),
            quantity: 1,
            class_id: class_id.to_string(),
            created_at,
            shipping_status: "pending".to_string(),
            source: "抽奖".to_string(),
        };

        Ok(SpinWheelResult {
            winning_slot,
            spent_points: spin_cost,
            remaining_points,
            student_id: req.student_id,
            student_name,
            record,
        })
    }

    pub fn update_shipping_status(&self, record_id: &str, status: &str) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE purchase_records SET shipping_status = ? WHERE id = ?",
            params![status, record_id],
        )?;
        Ok(())
    }
}
