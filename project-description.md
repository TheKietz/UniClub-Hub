# 🎓 Student Club Management System

A modular system for managing student clubs in a university environment.  
The system is divided into three main subsystems while sharing a common core.

---

# 📌 Overview

This project consists of three main topics:

1. **Club, Member & Organization Management**
2. **Activity, Event & Task Management**
3. **Public Portal & Communication System**

All subsystems share a **common core architecture**, database, and services.

---

# 🧩 Shared Modules (Core System)

## 1. Authentication & User Management

- Login (JWT / Session)
- User profile management

## 2. Role-Based Access Control (RBAC)

- Roles:
  - Admin
  - Club Manager
  - Department Head
  - Member
  - Public User

## 3. System Categories

- Status
- Activity types
- Priority levels
- Club domains

## 4. File Management

- Upload images, documents
- File storage & retrieval

## 5. Logging & Monitoring

- Logging system
- Audit logs (track data changes)
- Error handling

## 6. Notification System

- Email notifications
- Web notifications

## 7. Architecture

- Layered / Clean Architecture
- Shared API
- Shared Database

---

# 📘 Topic 1: Club, Member & Organization Management

## 1. Description

This module manages **core data of student clubs**, including:

- Club information
- Organizational structure
- Members and roles

Acts as a **foundation layer** for other subsystems.

---

## 2. Functional Requirements

### 2.1 Student Features

- View club list
- Apply to join club
- Application approval / rejection

### 2.2 Club Management

- Create / Update / Delete / Search
- Attributes:
  - Name, Code, Description
  - Domain, Logo
  - Founding Date
  - Advisor
  - Status

### 2.3 Organization Management

- Executive board
- Departments
- Role assignment per department

### 2.4 Member Management

- Add / Update / Delete / Search
- Classification:
  - By club
  - By department
  - By role
- Role-based access control

### 2.5 Advanced Features

- Multi-club management
- Member participation history
- Member lifecycle:
  - Applicant → Probation → Official → Left
- KPI evaluation system
- Import / Export (Excel, CSV)
- Audit logs
- Role suggestion (rule-based / lightweight AI)
- Reports & statistics

---

## 3. Non-functional Requirements

- Secure data access
- High performance with large datasets
- Scalable architecture
- Easy integration

---

## 4. Evaluation

- Functional testing
- Data validation
- Management efficiency assessment

---

# 📗 Topic 2: Activity, Event & Task Management

## 1. Description

This module manages **club operations**, including:

- Activities
- Events
- Tasks

Supports planning, execution, and tracking.

---

## 2. Functional Requirements

### 2.1 Activity & Event Management

- Create / Update / Delete
- Manage:
  - Time
  - Location
  - Content

### 2.2 Task Management

- Create tasks
- Assign members
- Deadline & status tracking

### 2.3 Advanced Features

- Participant management
- Search activities & tasks
- Task dependencies (parent-child)
- Views:
  - Kanban
  - Calendar
  - Timeline
- Gantt chart
- Workflow management
- Auto reminders
- Workload distribution
- Progress tracking (%)
- Real-time updates (SignalR / WebSocket)
- Dashboard
- Activity logs
- Agile sprint (lightweight)
- Task suggestion
- Deadline prediction
- Priority recommendation

---

## 3. Non-functional Requirements

- Concurrent users support
- No data loss on disconnection
- Real-time performance
- Scalable system

---

## 4. Evaluation

- Workflow testing
- Operational efficiency comparison

---

# 📙 Topic 3: Portal & Communication System

## 1. Description

A public-facing system to:

- Promote clubs
- Provide information
- Allow student interaction

---

## 2. Functional Requirements

### 2.1 Club Landing Page

- Club introduction
- Organization structure
- Activities

### 2.2 Content Management (CMS)

- Articles, news
- Images, videos

### 2.3 Features

- Club listing
- Club registration
- Application management
- Search functionality
- Dynamic CMS
- Landing page templates
- Basic SEO
- Content roles:
  - Editor
  - Reviewer
- Multi-level approval workflow
- Analytics (traffic, engagement)
- Social media integration
- Club recommendation (AI lightweight)
- Notifications (email/web)
- Communication dashboard

---

## 3. Non-functional Requirements

- Fast loading speed
- Responsive design
- Caching
- Cloud deployment support

---

## 4. Evaluation

- User experience (UX)
- Communication effectiveness

---

# 🔗 System Integration

To avoid overlap between topics, the following components are shared:

- Authentication & User Management
- Role-Based Access Control
- File Upload System
- Notification System
- Logging & Audit Logs
- Shared Database
- Shared APIs between subsystems

---

# 🏗️ Suggested Architecture

Presentation Layer (Web / API)
↓
Application Layer (Services)
↓
Domain Layer (Business Logic)
↓
Infrastructure Layer (DB, External Services)

---

# 🚀 Deployment

- Web-based system
- Can be deployed on cloud (AWS, Azure, etc.)
- Supports scaling and modular expansion

---

# 🧪 Testing

- Unit Testing
- Integration Testing
- System Testing
- User Acceptance Testing (UAT)

---

# 📊 Future Improvements

- AI recommendation enhancements
- Performance optimization
- Mobile application integration
- Advanced analytics dashboard

---

# 👨‍💻 Authors

- Student Team Project
