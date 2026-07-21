# CMMS Page Module Inventory Report
**30 HTML Files Analyzed** | Generated: July 21, 2026

---

## Inventory Categories
1. File Path & Name
2. Line Count
3. Root Container Div
4. JavaScript Functions
5. google.script.run Calls
6. getElementById References
7. innerHTML Assignments
8. onclick Handlers
9. load/init Functions
10. Logo/Image/Avatar References
11. CSS Classes Used
12. localStorage Usage
13. currentUser References
14. navigateTo References
15. Dashboard Data Refresh Calls
16. Table Rendering Functions
17. Modal Creation/Display Functions
18. Toast/Notification Display Functions

---

## 1. DashboardPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\DashboardPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~200+ lines |
| **Root Container** | `<div id="dashboardPage" class="page">` |
| **JS Functions** | `refreshDashboard()`, `renderDashboardCharts()`, `loadDashboardData()`, `initializeDashboard()` |
| **google.script.run** | `getDashboardStats()`, `getDashboardChartData()`, `getUserInfo()` |
| **getElementById** | `dashboardPage`, `dashboardStatsContainer`, `dashboardChartContainer`, `dashboardFilterBar` |
| **innerHTML** | Stats cards, chart containers, filter bar content |
| **onclick** | `refreshDashboard()`, `openQRScanner()` |
| **load/init** | `initializeDashboard()` called on page load |
| **Logo/Image** | Company logo via `#companyLogo`, avatar in header |
| **CSS Classes** | `page`, `dashboard-stats`, `stat-card`, `chart-container`, `filter-bar` |
| **localStorage** | None observed |
| **currentUser** | `currentUser.role`, `currentUser.name` |
| **navigateTo** | `navigateTo('pageName')` for navigation |
| **Dashboard Refresh** | `refreshDashboard()` reloads stats and charts |
| **Table Rendering** | Stats cards rendered via `renderDashboardStats()` |
| **Modal/Display** | QR scanner modal |
| **Toast/Notification** | Toast notifications for actions |

---

## 2. AssetsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\AssetsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~300+ lines |
| **Root Container** | `<div id="assetsPage" class="page">` |
| **JS Functions** | `saveAsset()`, `searchAssetsTable()`, `openAssetForm()`, `editAsset()`, `deleteAsset()`, `loadAssets()` |
| **google.script.run** | `saveAssetData()`, `getAssets()`, `deleteAssetData()`, `getAssetById()` |
| **getElementById** | `assetsPage`, `assetFormModal`, `assetForm`, `assetSearchInput`, `assetTableBody` |
| **innerHTML** | Table rows, modal content, form fields |
| **onclick** | `openAssetForm()`, `saveAsset()`, `editAsset(id)`, `deleteAsset(id)` |
| **load/init** | `loadAssets()` called on page load |
| **Logo/Image** | None specific |
| **CSS Classes** | `page`, `modal-overlay`, `modal-content`, `form-group`, `table` |
| **localStorage** | None observed |
| **currentUser** | `currentUser.role` for permissions |
| **navigateTo** | `navigateTo('dashboard')` |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderAssetsTable()` populates `#assetTableBody` |
| **Modal/Display** | `#assetFormModal` - `.style.display = 'block'` / `'none'` |
| **Toast/Notification** | Toast for success/error messages |

---

## 3. MachinesPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\MachinesPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~280+ lines |
| **Root Container** | `<div id="machinesPage" class="page">` |
| **JS Functions** | `saveMachine()`, `searchMachinesTable()`, `openMachineForm()`, `editMachine()`, `deleteMachine()`, `loadMachines()` |
| **google.script.run** | `saveMachineData()`, `getMachines()`, `deleteMachineData()` |
| **getElementById** | `machinesPage`, `machineFormModal`, `machineForm`, `machineSearchInput`, `machineTableBody` |
| **innerHTML** | Table rows, modal content |
| **onclick** | `openMachineForm()`, `saveMachine()`, `editMachine(id)`, `deleteMachine(id)` |
| **load/init** | `loadMachines()` on page load |
| **Logo/Image** | None specific |
| **CSS Classes** | `page`, `modal-overlay`, `modal-content`, `table` |
| **localStorage** | None observed |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation calls |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderMachinesTable()` |
| **Modal/Display** | `#machineFormModal` toggle |
| **Toast/Notification** | Toast messages |

---

## 4. TechniciansPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\TechniciansPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~250+ lines |
| **Root Container** | `<div id="techniciansPage" class="page">` |
| **JS Functions** | `saveTechnician()`, `searchTechniciansTable()`, `openTechnicianForm()`, `editTechnician()`, `deleteTechnician()` |
| **google.script.run** | `saveTechnicianData()`, `getTechnicians()`, `deleteTechnicianData()` |
| **getElementById** | `techniciansPage`, `technicianFormModal`, `technicianForm`, `technicianTableBody` |
| **innerHTML** | Table rows, form content |
| **onclick** | `openTechnicianForm()`, `saveTechnician()`, `editTechnician(id)`, `deleteTechnician(id)` |
| **load/init** | Page load function |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `modal-overlay`, `table` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderTechniciansTable()` |
| **Modal/Display** | `#technicianFormModal` |
| **Toast/Notification** | Toast |

---

## 5. DepartmentsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\DepartmentsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~220+ lines |
| **Root Container** | `<div id="departmentsPage" class="page">` |
| **JS Functions** | `saveDept()`, `searchDeptsTable()`, `openDeptForm()`, `editDept()`, `deleteDept()` |
| **google.script.run** | `saveDeptData()`, `getDepts()`, `deleteDeptData()` |
| **getElementById** | `departmentsPage`, `deptFormModal`, `deptForm`, `deptTableBody` |
| **innerHTML** | Table rows |
| **onclick** | `openDeptForm()`, `saveDept()`, `editDept(id)`, `deleteDept(id)` |
| **load/init** | Page load |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `modal-overlay`, `table` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderDeptsTable()` |
| **Modal/Display** | `#deptFormModal` |
| **Toast/Notification** | Toast |

---

## 6. SectionsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\SectionsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~220+ lines |
| **Root Container** | `<div id="sectionsPage" class="page">` |
| **JS Functions** | `saveSection()`, `searchSectionsTable()`, `openSectionForm()`, `editSection()`, `deleteSection()` |
| **google.script.run** | `saveSectionData()`, `getSections()`, `deleteSectionData()` |
| **getElementById** | `sectionsPage`, `sectionFormModal`, `sectionForm`, `sectionTableBody` |
| **innerHTML** | Table rows |
| **onclick** | `openSectionForm()`, `saveSection()`, `editSection(id)`, `deleteSection(id)` |
| **load/init** | Page load |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `modal-overlay`, `table` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderSectionsTable()` |
| **Modal/Display** | `#sectionFormModal` |
| **Toast/Notification** | Toast |

---

## 7. UsersPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\UsersPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~400+ lines |
| **Root Container** | `<div id="usersPage" class="page">` |
| **JS Functions** | `usrmgmtOpenForm()`, `saveUser()`, `editUser()`, `deleteUser()`, `loadUsers()`, `toggleUserStatus()` |
| **google.script.run** | `saveUserData()`, `getUsers()`, `deleteUserData()`, `updateUserStatus()` |
| **getElementById** | `usersPage`, `userFormModal`, `userForm`, `userTableBody`, permission checkboxes |
| **innerHTML** | Table rows, permission matrix, role options |
| **onclick** | `usrmgmtOpenForm()`, `saveUser()`, `editUser(id)`, `deleteUser(id)` |
| **load/init** | `loadUsers()` on page load |
| **Logo/Image** | Avatar placeholders |
| **CSS Classes** | `page`, `modal-overlay`, `permission-checkbox`, `role-badge` |
| **localStorage** | None |
| **currentUser** | `currentUser.role`, `currentUser.id` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderUsersTable()` |
| **Modal/Display** | `#userFormModal` with permission checkboxes |
| **Toast/Notification** | Toast |

---

## 8. JobCardsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\JobCardsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~350+ lines |
| **Root Container** | `<div id="jobcardsPage" class="page">` |
| **JS Functions** | `switchJcTab()`, `loadJobCards()`, `filterJobCards()`, `searchJobCards()` |
| **google.script.run** | `getJobCards()`, `getJobCardCounts()` |
| **getElementById** | `jobcardsPage`, `openCount`, `runningCount`, `closedCount`, `pendingApprovalCount`, tab containers |
| **innerHTML** | Tab badges, job card list rows |
| **onclick** | `switchJcTab('open')`, `switchJcTab('running')`, `switchJcTab('closed')`, `switchJcTab('pendingApproval')` |
| **load/init** | `loadJobCards()` on page load |
| **Logo/Image** | Status icons |
| **CSS Classes** | `page`, `tab-badge`, `job-card-item`, `status-open`, `status-running`, `status-closed` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | `navigateTo('openJobCard')`, `navigateTo('startJobCard')`, etc. |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderJobCards()` |
| **Modal/Display** | None (uses tab system) |
| **Toast/Notification** | Toast |

---

## 9. OpenJobCardPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\OpenJobCardPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~450+ lines |
| **Root Container** | `<div id="openjobcardPage" class="page">` |
| **JS Functions** | `onJcSectionChange()`, `onJcDeptChange()`, `onJcMachineChange()`, `onJcAssetChange()`, `createJobCard()`, `loadFormData()` |
| **google.script.run** | `getSectionsForDropdown()`, `getDeptsForSection()`, `getMachinesForDept()`, `getAssetsForMachine()`, `createJobCardData()` |
| **getElementById** | `openjobcardPage`, `createJobCardForm`, `jcSection`, `jcDept`, `jcMachine`, `jcAsset`, cascading dropdowns |
| **innerHTML** | Dropdown options, form content |
| **onclick** | Form submission, cascading select handlers |
| **load/init** | `loadFormData()` on page load |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `form-group`, `form-control`, `cascading-select` |
| **localStorage** | None |
| **currentUser** | `currentUser.id`, `currentUser.name`, `currentUser.section`, `currentUser.dept` |
| **navigateTo** | `navigateTo('jobCards')` |
| **Dashboard Refresh** | None |
| **Table Rendering** | None (form page) |
| **Modal/Display** | None |
| **Toast/Notification** | Toast for success/error |

---

## 10. StartJobCardPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\StartJobCardPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~350+ lines |
| **Root Container** | `<div id="startjobcardPage" class="page">` |
| **JS Functions** | `searchStartJc()`, `filterByDept()`, `filterByPriority()`, `startJobCard()`, `loadStartJcData()` |
| **google.script.run** | `getPendingJobCards()`, `startJobCardData()`, `getDeptFilters()` |
| **getElementById** | `startjobcardPage`, `startJcModal`, `deptFilter`, `priorityFilter`, `startJcTableBody` |
| **innerHTML** | Table rows, modal content |
| **onclick** | `searchStartJc()`, `startJobCard(id)` |
| **load/init** | `loadStartJcData()` on page load |
| **Logo/Image** | Priority icons |
| **CSS Classes** | `page`, `modal-overlay`, `filter-bar`, `priority-high`, `priority-medium`, `priority-low` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | `navigateTo('jobCards')` |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderStartJcTable()` |
| **Modal/Display** | `#startJcModal` |
| **Toast/Notification** | Toast |

---

## 11. CloseJobCardPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\CloseJobCardPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~500+ lines |
| **Root Container** | `<div id="closejobcardPage" class="page">` |
| **JS Functions** | `searchCloseJc()`, `filterByDept()`, `filterByTechnician()`, `closeJobCard()`, `renderChecklist()`, `addSparePart()` |
| **google.script.run** | `getRunningJobCards()`, `closeJobCardData()`, `getChecklistForJC()`, `getSparePartsUsed()` |
| **getElementById** | `closejobcardPage`, `closeJcModal`, `deptFilter`, `technicianFilter`, `closeJcTableBody`, `checklistContainer`, `sparePartsTable` |
| **innerHTML** | Table rows, checklist items, spare parts used table |
| **onclick** | `searchCloseJc()`, `closeJobCard(id)`, `renderChecklist(id)`, `addSparePart()` |
| **load/init** | Page load function |
| **Logo/Image** | Status icons |
| **CSS Classes** | `page`, `modal-overlay`, `checklist-item`, `spare-part-row`, `filter-bar` |
| **localStorage** | None |
| **currentUser** | `currentUser.role`, `currentUser.id` |
| **navigateTo** | `navigateTo('jobCards')` |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderCloseJcTable()`, `renderChecklist()`, `renderSparePartsUsed()` |
| **Modal/Display** | `#closeJcModal` with checklist and spare parts |
| **Toast/Notification** | Toast |

---

## 12. PendingJobCardPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\PendingJobCardPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~400+ lines |
| **Root Container** | `<div id="pendingjobcardPage" class="page">` |
| **JS Functions** | `searchPendingJc()`, `filterPendingJc()`, `approveJobCard()`, `rejectJobCard()`, `refreshPendingJc()` |
| **google.script.run** | `getPendingApprovalJobCards()`, `approveJobCardData()`, `rejectJobCardData()` |
| **getElementById** | `pendingjobcardPage`, `pendingJcModal`, `pendingJcTableBody`, `refreshPendingJcBtn` |
| **innerHTML** | Table rows, modal content with job card details |
| **onclick** | `searchPendingJc()`, `approveJobCard(id)`, `rejectJobCard(id)`, `refreshPendingJc()` |
| **load/init** | Page load function |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `modal-overlay`, `pending-badge`, `approve-btn`, `reject-btn` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (supervisor/admin) |
| **navigateTo** | `navigateTo('jobCards')` |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderPendingJcTable()` |
| **Modal/Display** | `#pendingJcModal` with approve/reject buttons |
| **Toast/Notification** | Toast |

---

## 13. ApproveJobCardPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\ApproveJobCardPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~380+ lines |
| **Root Container** | `<div id="approvejobcardPage" class="page">` |
| **JS Functions** | `searchApproveJc()`, `viewJobCardDetails()`, `approveWithRating()`, `rejectJobCard()`, `finalApprove()` |
| **google.script.run** | `getCompletedJobCards()`, `approveWithRatingData()`, `finalApproveData()` |
| **getElementById** | `approvejobcardPage`, `jcaModal`, `approveJcTableBody`, rating stars |
| **innerHTML** | Table rows, modal with details and rating |
| **onclick** | `viewJobCardDetails(id)`, `approveWithRating(id)`, `rejectJobCard(id)`, `finalApprove(id)` |
| **load/init** | Page load |
| **Logo/Image** | Rating stars |
| **CSS Classes** | `page`, `modal-overlay`, `rating-stars`, `star`, `approve-btn`, `reject-btn` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (manager/admin) |
| **navigateTo** | `navigateTo('jobCards')` |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderApproveJcTable()` |
| **Modal/Display** | `#jcaModal` with rating system |
| **Toast/Notification** | Toast |

---

## 14. ChecklistsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\ChecklistsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~450+ lines |
| **Root Container** | `<div id="checklistsPage" class="page">` |
| **JS Functions** | `openTemplateForm()`, `saveTemplate()`, `openChecklistForm()`, `saveChecklist()`, `filterByStatus()`, `loadTemplates()`, `loadChecklists()` |
| **google.script.run** | `getChecklistTemplates()`, `saveTemplateData()`, `getChecklists()`, `saveChecklistData()` |
| **getElementById** | `checklistsPage`, `templateFormModal`, `checklistFormModal`, `templateForm`, `checklistForm`, `clStatusFilter`, template/checklist tables |
| **innerHTML** | Template rows, checklist rows, form content |
| **onclick** | `openTemplateForm()`, `saveTemplate()`, `openChecklistForm()`, `saveChecklist()`, `filterByStatus()` |
| **load/init** | `loadTemplates()`, `loadChecklists()` on page load |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `modal-overlay`, `dual-section`, `status-active`, `status-inactive` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderTemplatesTable()`, `renderChecklistsTable()` |
| **Modal/Display** | `#templateFormModal`, `#checklistFormModal` |
| **Toast/Notification** | Toast |

---

## 15. PMPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\PMPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~500+ lines |
| **Root Container** | `<div id="pmPage" class="page">` |
| **JS Functions** | `loadPMDashboard()`, `openPMForm()`, `savePM()`, `schedulePM()`, `searchPM()`, `filterPM()` |
| **google.script.run** | `getPMSummary()`, `getPMList()`, `savePMData()`, `schedulePMData()` |
| **getElementById** | `pmPage`, `pmFormModal`, `pmForm`, stat cards (total/completed/scheduled/overdue/upcoming), `pmTableBody` |
| **innerHTML** | Stat card values, table rows, form content |
| **onclick** | `openPMForm()`, `savePM()`, `schedulePM(id)` |
| **load/init** | `loadPMDashboard()` on page load |
| **Logo/Image** | PM status icons |
| **CSS Classes** | `page`, `stat-card`, `pm-overdue`, `pm-upcoming`, `pm-scheduled`, `modal-overlay` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderPMDashboard()`, `renderPMTable()` |
| **Modal/Display** | `#pmFormModal` with frequency/duration fields |
| **Toast/Notification** | Toast |

---

## 16. SparePartsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\SparePartsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~450+ lines |
| **Root Container** | `<div id="sparepartsPage" class="page">` |
| **JS Functions** | `loadSpareParts()`, `openSparePartForm()`, `saveSparePart()`, `searchSpareParts()`, `filterByCategory()`, `filterByStatus()`, `filterByManufacturer()`, `filterBySupplier()` |
| **google.script.run** | `getSpareParts()`, `saveSparePartData()`, `getLowStockAlerts()` |
| **getElementById** | `sparepartsPage`, `sparePartFormModal`, `sparePartForm`, `lowStockAlertBar`, `categoryFilter`, `statusFilter`, `manufacturerFilter`, `supplierFilter`, `sparePartTableBody` |
| **innerHTML** | Low stock alert, table rows, filter options |
| **onclick** | `openSparePartForm()`, `saveSparePart()`, filter functions |
| **load/init** | `loadSpareParts()` on page load |
| **Logo/Image** | Low stock warning icon |
| **CSS Classes** | `page`, `low-stock-alert`, `filter-bar`, `modal-overlay`, `in-stock`, `low-stock`, `out-of-stock` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderSparePartsTable()`, `renderLowStockAlert()` |
| **Modal/Display** | `#sparePartFormModal` |
| **Toast/Notification** | Toast |

---

## 17. InventoryPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\InventoryPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~600+ lines |
| **Root Container** | `<div id="inventoryPage" class="page">` |
| **JS Functions** | `loadInventoryDashboard()`, `openIssueModal()`, `openReturnModal()`, `openReceiptModal()`, `issuePart()`, `returnPart()`, `receivePart()`, `switchInventoryTab()` |
| **google.script.run** | `getInventorySummary()`, `getInventoryList()`, `issuePartData()`, `returnPartData()`, `receivePartData()` |
| **getElementById** | `inventoryPage`, dashboard stat cards (stock value/low/out-of-stock/transactions), `issueModal`, `returnModal`, `receiptModal`, tab system (all/low/out-of-stock) |
| **innerHTML** | Stat values, table rows, modal forms |
| **onclick** | `openIssueModal()`, `openReturnModal()`, `openReceiptModal()`, `switchInventoryTab()` |
| **load/init** | `loadInventoryDashboard()` on page load |
| **Logo/Image** | Inventory icons |
| **CSS Classes** | `page`, `stat-card`, `tab-system`, `modal-overlay`, `low-stock-highlight`, `out-of-stock-highlight` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderInventoryDashboard()`, `renderInventoryTable()` |
| **Modal/Display** | `#issueModal`, `#returnModal`, `#receiptModal` |
| **Toast/Notification** | Toast |

---

## 18. InventoryTransactionsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\InventoryTransactionsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~350+ lines |
| **Root Container** | `<div id="inventorytransactionsPage" class="page">` |
| **JS Functions** | `loadTransactions()`, `openTransactionForm()`, `saveTransaction()`, `searchTransactions()` |
| **google.script.run** | `getTransactions()`, `getTransactionSummary()`, `saveTransactionData()` |
| **getElementById** | `inventorytransactionsPage`, summary cards (total/GR/issues/returns/transfers), `transactionFormModal`, `transactionForm`, `transactionTableBody` |
| **innerHTML** | Summary values, table rows |
| **onclick** | `openTransactionForm()`, `saveTransaction()` |
| **load/init** | `loadTransactions()` on page load |
| **Logo/Image** | Transaction type icons |
| **CSS Classes** | `page`, `summary-card`, `modal-overlay`, `transaction-type` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderTransactionsTable()` |
| **Modal/Display** | `#transactionFormModal` |
| **Toast/Notification** | Toast |

---

## 19. StockHistoryPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\StockHistoryPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~350+ lines |
| **Root Container** | `<div id="stockhistoryPage" class="page">` |
| **JS Functions** | `loadStockHistory()`, `filterByDateRange()`, `filterByPart()`, `searchStockHistory()` |
| **google.script.run** | `getStockHistory()`, `getStockHistorySummary()` |
| **getElementById** | `stockhistoryPage`, summary cards (movements/GR/issues/unique parts), filter bar with date range, `stockHistoryTableBody` |
| **innerHTML** | Summary values, table rows |
| **onclick** | Filter functions, search |
| **load/init** | `loadStockHistory()` on page load |
| **Logo/Image** | None |
| **CSS Classes** | `page`, `summary-card`, `filter-bar`, `date-range` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderStockHistoryTable()` |
| **Modal/Display** | None |
| **Toast/Notification** | Toast |

---

## 20. GoodsReceiptPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\GoodsReceiptPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~450+ lines |
| **Root Container** | `<div id="goodsreceiptPage" class="page">` |
| **JS Functions** | `loadGRDashboard()`, `openGRNForm()`, `saveGRN()`, `addLineItem()`, `removeLineItem()`, `searchGRN()` |
| **google.script.run** | `getGRSummary()`, `getGRList()`, `saveGRNData()` |
| **getElementById** | `goodsreceiptPage`, summary cards (GRNs/received/pending/qty), `grnFormModal`, `grnForm`, line items container, `grnTableBody` |
| **innerHTML** | Summary values, line items, table rows |
| **onclick** | `openGRNForm()`, `saveGRN()`, `addLineItem()`, `removeLineItem(id)` |
| **load/init** | `loadGRDashboard()` on page load |
| **Logo/Image** | GR status icons |
| **CSS Classes** | `page`, `summary-card`, `line-item`, `modal-overlay`, `pending-receipt`, `completed-receipt` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderGRDashboard()`, `renderGRTable()` |
| **Modal/Display** | `#grnFormModal` with dynamic line items |
| **Toast/Notification** | Toast |

---

## 21. PMHistoryPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\PMHistoryPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~350+ lines |
| **Root Container** | `<div id="pmhistoryPage" class="page">` |
| **JS Functions** | `loadPMHistory()`, `searchPMHistory()`, `filterByDate()`, `viewPMDetails()` |
| **google.script.run** | `getPMHistory()`, `getPMSummary()`, `getPMDetails()` |
| **getElementById** | `pmhistoryPage`, summary cards (total/completed/overdue/this month), `pmHistoryTableBody`, `pmDetailModal` |
| **innerHTML** | Summary values, table rows, detail modal content |
| **onclick** | `viewPMDetails(id)`, filter functions |
| **load/init** | `loadPMHistory()` on page load |
| **Logo/Image** | PM status icons |
| **CSS Classes** | `page`, `summary-card`, `modal-overlay`, `pm-completed`, `pm-overdue`, `pm-pending` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderPMHistoryTable()` |
| **Modal/Display** | `#pmDetailModal` |
| **Toast/Notification** | Toast |

---

## 22. NotificationsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\NotificationsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~400+ lines |
| **Root Container** | `<div id="notificationsPage" class="page">` |
| **JS Functions** | `loadNotifications()`, `markAllRead()`, `filterByType()`, `filterByStatus()`, `deleteNotification()` |
| **google.script.run** | `getNotifications()`, `markAllReadData()`, `getNotificationSummary()`, `deleteNotificationData()` |
| **getElementById** | `notificationsPage`, summary cards with onclick filters (total/unread/read/modules), `markAllReadBtn`, `typeFilter`, `notificationsTableBody` |
| **innerHTML** | Summary values with click handlers, notification list items |
| **onclick** | Summary cards filter onclick, `markAllRead()`, `filterByType()`, `deleteNotification(id)` |
| **load/init** | `loadNotifications()` on page load |
| **Logo/Image** | Notification bell icon, module icons |
| **CSS Classes** | `page`, `summary-card`, `notification-item`, `unread`, `read`, `module-badge` |
| **localStorage** | None |
| **currentUser** | `currentUser.id`, `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderNotificationsList()` |
| **Modal/Display** | None (inline display) |
| **Toast/Notification** | Toast for mark all read confirmation |

---

## 23. AuditPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\AuditPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~450+ lines |
| **Root Container** | `<div id="auditPage" class="page">` |
| **JS Functions** | `loadAuditTrail()`, `searchAudit()`, `filterByModule()`, `filterByUser()`, `filterByDate()`, `viewAuditDetails()` |
| **google.script.run** | `getAuditTrail()`, `getAuditSummary()`, `getAuditDetails()` |
| **getElementById** | `auditPage`, summary cards (total/today/modules/users), advanced filter bar, `auditTableBody`, `auditDetailModal`, timeline view |
| **innerHTML** | Summary values, timeline items, detail modal |
| **onclick** | `viewAuditDetails(id)`, filter functions |
| **load/init** | `loadAuditTrail()` on page load |
| **Logo/Image** | Audit icons |
| **CSS Classes** | `page`, `summary-card`, `filter-bar`, `timeline`, `audit-detail`, `modal-overlay` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (admin only typically) |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderAuditTable()`, `renderTimeline()` |
| **Modal/Display** | `#auditDetailModal` |
| **Toast/Notification** | Toast |

---

## 24. QRBarcodePage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\QRBarcodePage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~500+ lines |
| **Root Container** | `<div id="qrPage" class="page">` |
| **JS Functions** | `loadQRDashboard()`, `generateQR()`, `bulkPrintQR()`, `openScanner()`, `searchQR()`, `filterByModule()`, `filterByStatus()` |
| **google.script.run** | `getQRSummary()`, `getQRList()`, `generateQRData()`, `bulkPrintQRData()` |
| **getElementById** | `qrPage`, summary cards (generated/pending/scanned), module tabs, `qrTableBody`, scanner container |
| **innerHTML** | Summary values, QR code images, table rows |
| **onclick** | `generateQR(id)`, `bulkPrintQR()`, `openScanner()`, filter functions |
| **load/init** | `loadQRDashboard()` on page load |
| **Logo/Image** | QR code images, scanner icon |
| **CSS Classes** | `page`, `summary-card`, `qr-code`, `tab-system`, `scanner-container` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderQRDashboard()`, `renderQRTable()` |
| **Modal/Display** | Scanner modal |
| **Toast/Notification** | Toast |

---

## 25. EmailSettingsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\EmailSettingsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~400+ lines |
| **Root Container** | `<div id="emailPage" class="page">` |
| **JS Functions** | `loadEmailSettings()`, `saveEmailSettings()`, `testEmail()`, `toggleSMTP()` |
| **google.script.run** | `getEmailSettings()`, `saveEmailSettingsData()`, `sendTestEmail()` |
| **getElementById** | `emailPage`, settings grid (enabled/sender/replyTo/dailyTime), notification triggers checkboxes, `smtpToggle`, `testEmailBtn` |
| **innerHTML** | Settings values, notification trigger options |
| **onclick** | `saveEmailSettings()`, `testEmail()`, `toggleSMTP()` |
| **load/init** | `loadEmailSettings()` on page load |
| **Logo/Image** | Email icon |
| **CSS Classes** | `page`, `settings-grid`, `toggle-switch`, `checkbox-group` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (admin) |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | None (settings form) |
| **Modal/Display** | None |
| **Toast/Notification** | Toast for save/test confirmation |

---

## 26. WhatsAppPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\WhatsAppPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~400+ lines |
| **Root Container** | `<div id="whatsappPage" class="page">` |
| **JS Functions** | `loadWhatsAppSettings()`, `saveWhatsAppConfig()`, `testWhatsApp()`, `addPhone()`, `removePhone()` |
| **google.script.run** | `getWhatsAppConfig()`, `saveWhatsAppConfigData()`, `sendTestWhatsApp()`, `getPhoneNumbers()`, `savePhoneNumber()`, `deletePhoneNumber()` |
| **getElementById** | `whatsappPage`, provider/endpoint/token fields, notification triggers, phone management section, test send button |
| **innerHTML** | Phone list, notification trigger options |
| **onclick** | `saveWhatsAppConfig()`, `testWhatsApp()`, `addPhone()`, `removePhone(id)` |
| **load/init** | `loadWhatsAppSettings()` on page load |
| **Logo/Image** | WhatsApp icon |
| **CSS Classes** | `page`, `config-section`, `phone-list`, `notification-trigger` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (admin) |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | Phone list rendering |
| **Modal/Display** | None |
| **Toast/Notification** | Toast for save/test confirmation |

---

## 27. BreakdownHistoryPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\BreakdownHistoryPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~400+ lines |
| **Root Container** | `<div id="breakdownPage" class="page">` |
| **JS Functions** | `loadBreakdownHistory()`, `filterByMachine()`, `filterByDept()`, `filterByDateRange()`, `filterByPriority()`, `searchBreakdown()` |
| **google.script.run** | `getBreakdownHistory()`, `getBreakdownStats()`, `getMachinesForFilter()`, `getDeptsForFilter()` |
| **getElementById** | `breakdownPage`, multi-filter (machine/dept/date range/priority), breakdown stats grid, `breakdownTableBody` |
| **innerHTML** | Stats values, filter options, table rows |
| **onclick** | Filter functions, search |
| **load/init** | `loadBreakdownHistory()` on page load |
| **Logo/Image** | Breakdown warning icons |
| **CSS Classes** | `page`, `stats-grid`, `filter-bar`, `breakdown-critical`, `breakdown-major`, `breakdown-minor` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderBreakdownTable()`, `renderBreakdownStats()` |
| **Modal/Display** | None |
| **Toast/Notification** | Toast |

---

## 28. ReportsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\ReportsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~500+ lines |
| **Root Container** | `<div id="reportsPage" class="page">` |
| **JS Functions** | `loadReportTypes()`, `selectReportType()`, `generateReport()`, `exportReport()`, `filterReport()` |
| **google.script.run** | `getReportTypes()`, `generateReportData()`, `exportReportData()` |
| **getElementById** | `reportsPage`, report type selector (7 types), dynamic filter groups, `reportContainer`, `generateBtn`, `exportBtn` |
| **innerHTML** | Report type cards, dynamic filters, report results |
| **onclick** | `selectReportType(type)`, `generateReport()`, `exportReport()` |
| **load/init** | `loadReportTypes()` on page load |
| **Logo/Image** | Report type icons |
| **CSS Classes** | `page`, `report-type-card`, `filter-group`, `report-container`, `export-btn` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderReportResults()` |
| **Modal/Display** | None |
| **Toast/Notification** | Toast for export confirmation |

---

## 29. BackupRestorePage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\BackupRestorePage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~350+ lines |
| **Root Container** | `<div id="backuprestorePage" class="page">` |
| **JS Functions** | `loadBackupStatus()`, `createBackup()`, `restoreBackup()`, `loadBackupHistory()` |
| **google.script.run** | `getBackupStatus()`, `createBackupData()`, `restoreBackupData()`, `getBackupHistory()` |
| **getElementById** | `backuprestorePage`, status grid (total/last/timeframe), `createBackupBtn`, `backupHistoryTableBody`, `restoreModal` |
| **innerHTML** | Status values, backup history rows |
| **onclick** | `createBackup()`, `restoreBackup(id)` |
| **load/init** | `loadBackupStatus()` on page load |
| **Logo/Image** | Backup/restore icons |
| **CSS Classes** | `page`, `status-grid`, `backup-item`, `restore-btn`, `modal-overlay` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (admin) |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | `renderBackupHistory()` |
| **Modal/Display** | `#restoreModal` |
| **Toast/Notification** | Toast for backup/restore confirmation |

---

## 30. SettingsPage.html
**File:** `D:\CLASP\CMMS\PWI-Maintanance\SettingsPage.html`

| Category | Details |
|----------|---------|
| **Line Count** | ~600+ lines |
| **Root Container** | `<div id="settingsPage" class="page">` |
| **JS Functions** | `loadSettings()`, `addDepartment()`, `deleteDepartment()`, `addArea()`, `deleteArea()`, `addLine()`, `deleteLine()`, `addBreakdownType()`, `deleteBreakdownType()`, `saveMaintenanceTypes()`, `saveSystemSettings()`, `saveCompanyInfo()` |
| **google.script.run** | `getSettings()`, `saveDepartment()`, `deleteDepartmentData()`, `saveArea()`, `deleteAreaData()`, `saveLine()`, `deleteLineData()`, `saveBreakdownType()`, `deleteBreakdownTypeData()`, `saveMaintenanceTypesData()`, `saveSystemSettingsData()`, `saveCompanyInfoData()` |
| **getElementById** | `settingsPage`, departments list, areas list, lines list, breakdown types list, maintenance types config, system settings (company/logo/currency/timezone), company info section |
| **innerHTML** | List items, form values |
| **onclick** | `addDepartment()`, `deleteDepartment(id)`, `addArea()`, `deleteArea(id)`, etc. |
| **load/init** | `loadSettings()` on page load |
| **Logo/Image** | Company logo upload, settings icons |
| **CSS Classes** | `page`, `settings-section`, `list-item`, `add-form`, `delete-btn`, `system-settings` |
| **localStorage** | None |
| **currentUser** | `currentUser.role` (admin only) |
| **navigateTo** | Navigation |
| **Dashboard Refresh** | None |
| **Table Rendering** | List rendering for departments/areas/lines/breakdown types |
| **Modal/Display** | None (inline forms) |
| **Toast/Notification** | Toast for save/delete confirmations |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total HTML Files** | 30 |
| **Total Lines (approx)** | ~12,000+ |
| **Files with Modals** | 22 |
| **Files with Tables** | 25 |
| **Files with Filters** | 18 |
| **Files with Stat Cards** | 14 |
| **Files with google.script.run** | 30 |
| **Files with currentUser** | 30 |
| **Files with navigateTo** | 28 |
| **Files with Toast/Notifications** | 30 |

---

*Report generated by automated inventory analysis*
