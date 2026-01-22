# Construction ERP Mobile App - Design Guidelines

## Core Architecture

### Authentication
**Role-based instant login** (no credentials required)
- 4 role buttons: Admin, Engineer, Client, Vendor
- Single tap authentication
- Role persists via AsyncStorage
- Logout returns to role selection

### Navigation
**Stack-only with modals**

**Information Architecture**:
```
Login → Dashboard → Module Stacks
                  ├─ Attendance → Submenu → [Add User | Manual Entry | Face Scan | View | Sheet]
                  ├─ Client → Project List → Detail Tabs [Plans | Agreements | Payments | Appointments]
                  ├─ Material → Inventory Table → New Order Modal
                  └─ Employee → List
```

**Modals**: File viewer, camera, payment detail, appointment form

---

## Design System

### Colors
**Primary**: `#1E40AF` (actions) | **Success**: `#10B981` (present/paid) | **Warning**: `#F59E0B` (pending) | **Error**: `#EF4444` (absent)

**Roles**: Admin `#7C3AED` | Engineer `#2563EB` | Client `#059669` | Vendor `#DC2626`

**Neutrals**: Background `#F9FAFB` | Surface `#FFFFFF` | Border `#E5E7EB` | Text `#111827` / `#6B7280`

### Typography
- **Headings**: System Bold, 20-24sp
- **Body**: System Regular, 16sp, line-height 1.5x
- **Labels**: System Medium, 14sp
- **Captions**: 12sp

### Spacing Scale
`xs:4 | sm:8 | md:12 | lg:16 | xl:24 | 2xl:32` (dp)

### Components

**Buttons**:
- Primary: Filled primary color, white text, h:48dp, r:12dp
- Secondary: 1dp border, primary text
- Press: opacity 0.7

**Cards**:
- White bg, r:12dp, p:16dp
- Shadow: `{width:0, height:1}, opacity:0.08, radius:3`
- Press: scale 0.98

**FAB**: 56x56dp, primary blue, bottom-right +16dp, shadow `{width:0, height:2}, opacity:0.10, radius:2`

**Tables**:
- Header: bg `#F3F4F6`, bold text
- Rows: Alternating white/`#F9FAFB`
- Cell: p:12dp, border 1dp `#E5E7EB`

**Form Inputs**:
- h:48dp, border 1dp `#D1D5DB`, r:8dp
- Focus: 2dp primary blue
- Floating labels

**Icons**: Feather icons, 20-24dp (UI), 32dp (cards)

### Accessibility
- Min touch: 44x44dp
- Contrast: 4.5:1 text, 3:1 UI
- Screen reader labels on all interactive elements
- Associated form labels

---

## Screen Specifications

### 1. Login
**Layout**: Centered title "Construction ERP" | ScrollView with `top: insets.top+xl, bottom: insets.bottom+xl`

**Content**: 4 role cards (2x2 grid), 150x150dp min touch target

**Visual**: Gradient bg (deep blue→slate gray) | Cards r:12dp with elevation

---

### 2. Dashboard
**Header**: Transparent | Left: role badge (pill) | Center: "Dashboard" | Right: logout icon

**Content**: ScrollView grid | `top: headerHeight+xl, bottom: insets.bottom+xl`

**Cards by Role**:
- Admin/Engineer: 9 cards (Attendance, Material, Client, Vendor, Sub Contractor, Photo, Look Ahead, App Integration, Management)
- Vendor: 2 (Material, Vendor)
- Client: 4 (Plan, Agreement, Payment, Appointment)

**Grid**: 2 cols phone, 3 tablet | p:16dp, r:8dp, white bg | Press: scale 0.97

**Colors**: Blue (client), green (material), orange (attendance)

---

### 3. Attendance Submenu
**Header**: Back button | "Attendance" title

**Content**: 5 full-width rows | `top: xl, bottom: insets.bottom+xl` | Left icon, text, chevron-right | Dividers

---

### 4. Add User Form
**Header**: "Cancel" (left) | "Add User" | "Save" (right)

**Content**: ScrollView form | `top: xl, bottom: insets.bottom+xl`

**Fields**: ID, Name, Age, Address, Role dropdown, Salary | Camera button → modal | Face preview (circular, 80dp)

---

### 5. Attendance Sheet ⭐
**Header**: "Attendance Sheet" | Right: Monthly/Daily toggle

**Filters**: Role dropdown, name search (autocomplete)

**Content**: Horizontal scroll table | `top: xl, bottom: insets.bottom+xl`

**Monthly View**:
- Rows: Employees | Cols: Days (1-31) + Total Present + Salary/Day + Total Salary
- Cells: "P" (green), "A" (red), "-" (Sundays)
- Editable: Tap to toggle P/A (Admin/Engineer only)
- Sticky header, alternating rows

**Daily View**: Date attendance list | Present/Absent count

**Graphs** (bottom sheet):
- Monthly: Bar chart (X:employees, Y:days)
- Daily: Doughnut (present vs absent)

**Search**: Autocomplete dropdown

**Filters**: Role chips (Mason, Labor, Engineer, Supervisor, All)

---

### 6. Client List
**Header**: "Clients" | Right: "+" (Admin/Engineer)

**Content**: ScrollView 1-col grid | `top: xl, bottom: insets.bottom+xl`

**Cards**: Project name, client name, status badge

---

### 7. Client Project Detail (Tabs)
**Header**: Project name

**Tabs**: Plans & Designs | Agreements | Payments | Appointments

**Tab 1-2 (Plans/Agreements)**:
- FAB upload (Admin/Engineer)
- Grid thumbnails
- Tap → modal viewer
- Delete icon (Admin/Engineer)

**Tab 3 (Payments)**:
- Total amount card
- Stages list: Name, Amount, Progress bar, Paid/Pending badge
- Tap → detail (edit for Admin/Engineer, view for Client)
- Transaction history
- Edit mode (header button, Admin/Engineer)

**Tab 4 (Appointments)**:
- Date/Time pickers, Reason input
- Submit button

---

### 8. Material Inventory
**Header**: "Material" | Right: "+" (Admin/Engineer)

**Filters**: Date, Client, Supplier, Material dropdowns

**Content**: Horizontal scroll table | `top: xl, bottom: insets.bottom+xl`

**Columns**: Date | Client/Site | Material | Unit Price | Supplier | Ordered Qty | Total Cost | Payment Status | Available Stock

**Features**: 
- Fixed header
- Low stock rows: amber highlight, warning icon
- Stock editable (tap, Admin/Engineer)

---

### 9. New Material Order (Modal)
**Header**: "Cancel" (left) | "New Order" | "Place Order" (right)

**Form**: Client dropdown, Material dropdown, Supplier dropdown, Quantity input

**Display**: Auto-calculated total (large, bold)

**Payment**: "Pay Now"/"Pay Later" radio | UPI/Card/Bank icons (simulated)

---

### 10. Employee List
**Header**: "Employees"

**Filters**: Search bar, role chips (horizontal scroll)

**Content**: ScrollView list | `top: xl, bottom: insets.bottom+xl`

**Cards**: Name, Type, Age, Salary/Day

---

## Critical Assets
1. **App Icon**: Hard hat + building silhouette
2. **Module Icons**: Use Feather fallback
3. **Avatars** (future): Admin (hard hat), Engineer (blueprint), Client (building), Vendor (truck)

**Rule**: Rely on Feather icons for navigation/actions

---

## Implementation Notes

**All Screens Follow**:
- Content insets: `top: varies, bottom: insets.bottom+xl`
- SafeAreaView with edges `['left', 'right']`
- StatusBar auto-style
- ScrollView for main content

**Header Types**:
- **Custom**: Login, Dashboard (transparent/gradient)
- **Default**: All others (back button, title, optional right action)

**Role Permissions**:
- **Admin/Engineer**: Full CRUD
- **Client**: View + limited forms (appointments)
- **Vendor**: Limited view

**Data Persistence**: AsyncStorage for user role, future: SQLite for app data