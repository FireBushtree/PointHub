use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Class {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "studentCount")]
    pub student_count: i32,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    pub id: String,
    pub name: String,
    #[serde(rename = "studentNumber")]
    pub student_number: String,
    pub points: i32,
    #[serde(rename = "classId")]
    pub class_id: String,
    #[serde(rename = "className")]
    pub class_name: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClassRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClassRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStudentRequest {
    pub name: String,
    pub student_number: String,
    pub points: i32,
    pub class_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStudentRequest {
    pub name: Option<String>,
    pub student_number: Option<String>,
    pub points: Option<i32>,
    pub class_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub points: i32,
    pub stock: i32,
    #[serde(rename = "classId")]
    pub class_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub points: i32,
    pub stock: i32,
    pub class_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductRequest {
    pub name: Option<String>,
    pub points: Option<i32>,
    pub stock: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseRecord {
    pub id: String,
    #[serde(rename = "productId")]
    pub product_id: String,
    #[serde(rename = "productName")]
    pub product_name: String,
    pub points: i32,
    #[serde(rename = "studentId")]
    pub student_id: String,
    #[serde(rename = "studentName")]
    pub student_name: String,
    pub quantity: i32,
    #[serde(rename = "classId")]
    pub class_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseRequest {
    pub product_id: String,
    pub student_id: String,
    pub quantity: i32,
}