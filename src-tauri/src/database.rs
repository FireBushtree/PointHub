use std::sync::Mutex;
use std::path::PathBuf;
use rusqlite::{Connection, Result as SqliteResult, params};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use tauri::{AppHandle, Manager};

use crate::models::{Class, Student, CreateClassRequest, UpdateClassRequest, CreateStudentRequest, UpdateStudentRequest};

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
        let conn = self.conn.lock().unwrap();

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
}