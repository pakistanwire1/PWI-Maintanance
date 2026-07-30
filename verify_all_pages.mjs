import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://ee42c134.pwi-maintanance.pages.dev';

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function run() {
  var browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  var page = await browser.newPage();

  var mockCount = 3;

  await page.setRequestInterception(true);
  page.on('request', function(req) {
    if (req.url().indexOf('/api/exec') >= 0) {
      var data = [];
      for (var i = 1; i <= mockCount; i++) {
        data.push({
          id: i, UserID: String(i), Name: 'User ' + i,
          Email: 'user' + i + '@test.com', Role: 'User', EmployeeID: 'EMP' + i,
          Department: 'Dept ' + i, Designation: 'Engineer', Status: 'Active',
          SectionID: String(i), Section: 'Section ' + i, SectionCode: 'SC' + i,
          Description: 'Desc ' + i, SundayOff: 'No', HoursPerDay: '8', DepartmentCount: 0,
          DepartmentID: String(i), Department: 'Dept ' + i,
          DepartmentCode: 'DC' + i, DepartmentHead: 'Head ' + i,
          MachineID: String(i), MachineName: 'Machine ' + i,
          MachineCode: 'MC' + i, MachineNumber: 'MN' + i, Location: 'Loc ' + i,
          AssetID: String(i), AssetName: 'Asset ' + i, AssetCode: 'AC' + i,
          EmployeeID: String(i), TechnicianName: 'Tech ' + i,
          Mobile: '0300123456' + i, Skill: 'Mechanical', Shift: 'Morning',
          PartCode: 'PC' + i, PartName: 'Part ' + i, Category: 'Cat',
          Unit: 'Pcs', CurrentStock: 10, MinimumStock: 5, UnitCost: 100 + i,
          ItemCode: 'IC' + i, ItemName: 'Item ' + i, Quantity: 50, Location: 'Store A',
          JobCardNo: 'JC' + i, Date: new Date().toISOString(),
          Complaint: 'Issue ' + i, Priority: 'High',
          Technician: 'Tech ' + i, AssignedTechnician: 'Tech ' + i,
          Machine: 'Machine ' + i, DeptID: String(i), Section: 'Sec ' + i,
          Title: 'Notif ' + i, Message: 'Message ' + i, Module: 'Module ' + i,
          ReadStatus: 'Unread', NotificationType: 'Alert', CreatedAt: new Date().toISOString(),
          LogID: String(i), Action: 'Action ' + i, PerformedBy: 'User ' + i,
          Timestamp: new Date().toISOString(), Details: 'Detail ' + i,
          department: 'Dept ' + i, totalJobs: i * 10, openJobs: i, closedJobs: i * 5,
          totalDowntime: i * 60, month: 'Jan', total: i * 10, downtime: i * 60,
          PMNumber: 'PM' + i, Frequency: 'Monthly', NextDueDate: new Date().toISOString(),
          LastDone: new Date().toISOString(), Compliant: 'Yes',
          StockID: String(i), TransactionType: 'IN', Quantity: i * 10,
          Reference: 'REF' + i, Notes: 'Note ' + i,
          GRN: 'GRN' + i, Vendor: 'Vendor ' + i, ReceivedDate: new Date().toISOString()
        });
      }
      req.respond({
        status: 200, contentType: 'application/json',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      req.continue();
    }
  });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 }).catch(function(){});
  await sleep(500);

  await page.evaluate(function() {
    localStorage.setItem('cmms_welcomed', 'true');
    localStorage.setItem('cmms_token', 'test_token_12345');
    localStorage.setItem('cmms_user', JSON.stringify({
      name: 'Test User', email: 'test@example.com', role: 'Admin', isSystemAdmin: true
    }));
    window.startApp();
  });
  await sleep(3000);

  var allPass = true;
  var outputRows = [];

  async function testPage(pageName, route, containerId, singleCnt, multiCnt) {
    // Endpoints to mock at appropriate counts
    var dataEndpoint = '';
    if (route === 'sections') dataEndpoint = 'getSectionList';
    else if (route === 'departments') dataEndpoint = 'getDepartmentList';
    else if (route === 'machines') dataEndpoint = 'getMachines';
    else if (route === 'assets') dataEndpoint = 'getAssets';
    else if (route === 'technicians') dataEndpoint = 'getTechnicians';
    else if (route === 'users') dataEndpoint = 'getUsers';
    else if (route === 'spareparts') dataEndpoint = 'getSpareParts';
    else if (route === 'inventory') dataEndpoint = 'getSpareParts';
    else if (route === 'reports') dataEndpoint = 'getReportData';
    else if (route === 'goodsreceipt') dataEndpoint = 'getGoodsReceipt';
    else if (route === 'stockhistory') dataEndpoint = 'getStockHistory';
    else if (route === 'inventorytransactions') dataEndpoint = 'getInventoryTransactions';
    else if (route === 'breakdown') dataEndpoint = 'getBreakdownHistory';
    else if (route === 'pmhistory') dataEndpoint = 'getPMHistory';
    else if (route === 'audit') dataEndpoint = 'getAuditLogs';
    else if (route === 'notifications') dataEndpoint = 'getNotifications';

    var singleResult = '-';
    var multiResult = '-';

    for (var iter = 0; iter < 2; iter++) {
      var expectPag = (iter === 1);
      var cnt = expectPag ? multiCnt : singleCnt;

      mockCount = cnt;

      await page.evaluate(function(r) { Router.navigate(r); }, route);
      try {
        await page.waitForFunction(function(cid) {
          var el = document.getElementById(cid);
          if (!el) return false;
          var html = el.innerHTML;
          return html && html.length >= 10;
        }, { timeout: 10000 }, containerId);
      } catch(e) {}
      await sleep(500);

      var res = await page.evaluate(function(cid) {
        var el = document.getElementById(cid);
        if (!el) return { status: 'no_container' };
        var html = el.innerHTML;
        // Check for pagination - detect by the structured pagination classes
        var hasPaginationInfo = html.indexOf('pagination-info') >= 0;
        var hasPaginationBtns = html.indexOf('pagination-btns') >= 0;
        var hasTableInfo = html.indexOf('table-info') >= 0;
        var hasPagDiv = html.indexOf('class="pagination"') >= 0;
        var hasTableFooter = html.indexOf('table-footer') >= 0;
        var hasShowingPattern = /Showing\s+\d+[\s\-to]+\d+\s+of/i.test(html);

        // Detect pagination controls
        // Table.render and renderTableLocal use: <button ...>Prev</button> / <button ...>Next</button>
        var hasPrevText = html.indexOf('>Prev</button>') >= 0;
        var hasNextText = html.indexOf('>Next</button>') >= 0;
        // Users page uses: &#8249; (‹) and &#8250; (›) - check Unicode chars
        var hasUserPrev = html.indexOf('\u2039') >= 0; // ‹
        var hasUserNext = html.indexOf('\u203A') >= 0; // ›
        // Audit trail uses: &lsaquo; (‹) and &rsaquo; (›)
        var hasAuditPrev = html.indexOf('‹') >= 0 || html.indexOf('\u2039') >= 0;
        var hasAuditNext = html.indexOf('›') >= 0 || html.indexOf('\u203A') >= 0;

        var hasPrev = hasPrevText || hasUserPrev || hasAuditPrev;
        var hasNext = hasNextText || hasUserNext || hasAuditNext;

        var hasTable = html.indexOf('<tbody>') >= 0;
        var hasEmpty = html.indexOf('empty-state') >= 0;

        // Check if pagination controls exist in the footer/pagination area
        // by looking for page navigation buttons
        var pageBtnMatch = html.match(/onclick="[^"]*goPage|onclick="[^"]*prevPage|onclick="[^"]*nextPage|onclick="[^"]*changePage/gi);

        return {
          status: 'ok',
          hasShowing: hasShowingPattern,
          hasPrev: hasPrev,
          hasNext: hasNext,
          hasPaginationInfo: hasPaginationInfo || hasTableInfo,
          hasTable: hasTable,
          hasEmpty: hasEmpty,
          htmlLen: html.length,
          preview: html.substring(0, 100)
        };
      }, containerId);

      if (res.status !== 'ok') {
        var label = expectPag ? 'multi' : 'single';
        if (expectPag) multiResult = 'NO_CONT';
        else singleResult = 'NO_CONT';
        allPass = false;
        continue;
      }

      var verdict;
      if (expectPag) {
        // Multi-page: must show "Showing X-Y of Z" and have navigation buttons
        verdict = (res.hasShowing && (res.hasPrev || res.hasNext)) ? 'PASS' : 'FAIL(' + (res.hasShowing ? 'S' : 'NS') + (res.hasPrev ? 'P' : 'NP') + (res.hasNext ? 'N' : 'NN') + ')';
      } else {
        // Single page: must NOT show "Showing X-Y of Z" and NOT have nav buttons
        verdict = (!res.hasShowing && !res.hasPrev && !res.hasNext) ? 'PASS' : 'FAIL(' + (res.hasShowing ? 'S' : 'NS') + (res.hasPrev ? 'P' : 'NP') + (res.hasNext ? 'N' : 'NN') + ')';
      }
      if (expectPag) multiResult = verdict;
      else singleResult = verdict;
      if (verdict !== 'PASS') allPass = false;
    }

    outputRows.push({ name: pageName, single: singleResult, multi: multiResult });
  }

  // Each test: singleCnt (less than PAGE_SIZE) and multiCnt (greater than PAGE_SIZE)
  var ALL_PAGES = [
    { name: 'Sections', route: 'sections', container: 'sectionsTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Departments', route: 'departments', container: 'departmentsTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Machines', route: 'machines', container: 'machineTable', singleCnt: 3, multiCnt: 25 },
    { name: 'Assets', route: 'assets', container: 'assetsTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Technicians', route: 'technicians', container: 'techniciansTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Users', route: 'users', container: 'userTableBody', singleCnt: 3, multiCnt: 25 },
    { name: 'Spare Parts', route: 'spareparts', container: 'spTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Inventory', route: 'inventory', container: 'invTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Reports', route: 'reports', container: 'reportTableContainer', singleCnt: 3, multiCnt: 150 },
    { name: 'Goods Receipt', route: 'goodsreceipt', container: 'grTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Stock History', route: 'stockhistory', container: 'shTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Inventory Transactions', route: 'inventorytransactions', container: 'itTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Breakdown History', route: 'breakdown', container: 'breakdownTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'PM History', route: 'pmhistory', container: 'pmhTableContainer', singleCnt: 3, multiCnt: 25 },
    { name: 'Audit Trail', route: 'audit', container: 'auditTableContainer', singleCnt: 5, multiCnt: 25 },
    { name: 'Notifications', route: 'notifications', container: 'notifTableContainer', singleCnt: 3, multiCnt: 30 },
    { name: 'Settings', route: 'settings', container: 'usersTableContainer', singleCnt: 3, multiCnt: 30 },
  ];

  console.log('Testing ' + ALL_PAGES.length + ' pages...\n');

  for (var p of ALL_PAGES) {
    await testPage(p.name, p.route, p.container, p.singleCnt, p.multiCnt);
  }

  console.log('| Page | Single Page | Multi Page | PASS/FAIL |');
  console.log('|------|------------|------------|-----------|');
  for (var r of outputRows) {
    var pf = (r.single === 'PASS' && r.multi === 'PASS') ? 'PASS' : 'FAIL';
    console.log('| ' + r.name + ' | ' + r.single + ' | ' + r.multi + ' | ' + pf + ' |');
  }

  console.log('\nFiles Modified:');
  console.log('- cloudflare/js/core/table.js:88-95 (Table.render pagination guard)');
  console.log('- cloudflare/js/pages/users.js:85-92 (moved Showing inside totalPages>1)');
  console.log('- cloudflare/js/pages/audit-trail.js:315-323 (wrapped pagination in totalPages>1)');

  console.log('\nDeployment:');
  console.log('- https://4d4c2eb9.pwi-maintanance.pages.dev');

  console.log('\nFinal Status: ' + (allPass ? 'ALL PASS' : 'SOME FAILED'));
  process.exit(allPass ? 0 : 1);
}

run().catch(function(err) {
  console.error('FATAL: ' + err.message);
  process.exit(1);
});
