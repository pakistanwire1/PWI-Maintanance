import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://723cd8be.pwi-maintanance.pages.dev';

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function run() {
  var browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  var page = await browser.newPage();

  // Show all browser console output
  page.on('console', function(msg) {
    var t = msg.text();
    if (t.indexOf('TRACE') >= 0 || t.indexOf('MACHINES') >= 0 || t.indexOf('Section') >= 0 || t.indexOf('error') >= 0) {
      console.log('  [B] ' + t.substring(0, 400));
    }
  });

  var mockCount = 3;
  await page.setRequestInterception(true);
  page.on('request', function(req) {
    if (req.url().indexOf('/api/exec') >= 0) {
      var data = [];
      for (var i = 1; i <= mockCount; i++) {
        data.push({
          id: i, SectionID: String(i), Section: 'Section ' + i,
          SectionCode: 'SC' + i, Description: 'Desc ' + i, Status: 'Active',
          SundayOff: 'No', HoursPerDay: '8', DepartmentCount: 0,
          DepartmentID: String(i), Department: 'Department ' + i, Name: 'Name ' + i,
          DepartmentCode: 'DC' + i, DepartmentHead: 'Head ' + i,
          MachineID: String(i), MachineName: 'Machine ' + i, MachineCode: 'MC' + i,
          MachineNumber: 'MN' + i, Location: 'Loc ' + i,
          AssetID: String(i), AssetName: 'Asset ' + i, AssetCode: 'AC' + i,
          EmployeeID: String(i), TechnicianName: 'Tech ' + i, Designation: 'Engineer',
          Email: 'user' + i + '@test.com', Mobile: '0300123456' + i, Skill: 'Mechanical',
          Shift: 'Morning', UserID: String(i), Role: 'User',
          PartCode: 'PC' + i, PartName: 'Part ' + i, Category: 'Cat',
          Unit: 'Pcs', CurrentStock: 10, MinimumStock: 5, UnitCost: 100 + i,
          ItemCode: 'IC' + i, ItemName: 'Item ' + i, Quantity: 50, Location: 'Store A'
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

  async function testPage(pageName, route, containerId, expectPag) {
    mockCount = expectPag ? 25 : 3;
    console.log('\n--- ' + pageName + ' (' + mockCount + ' records, ' + (expectPag ? 'expect pag' : 'no pag') + ') ---');

    await page.evaluate(function(r) { Router.navigate(r); }, route);
    // Wait for container to appear with data (wait for tbody or empty-state)
    try {
      await page.waitForFunction(function(cid, hasData) {
        var el = document.getElementById(cid);
        if (!el) return false;
        var html = el.innerHTML;
        if (!html || html.length < 10) return false;
        return html.indexOf('<tbody>') >= 0 || html.indexOf('empty-state') >= 0;
      }, { timeout: 10000 }, containerId, true);
    } catch(e) {
      // Timeout - check what happened
    }
    await sleep(500);

    var res = await page.evaluate(function(cid) {
      var el = document.getElementById(cid);
      if (!el) return { status: 'no_container: ' + cid, pc: (document.getElementById('pageContent')||{}).innerHTML };
      var html = el.innerHTML;
      return {
        status: 'ok',
        htmlLen: html.length,
        hasPag: html.indexOf('pagination') >= 0 && (html.indexOf('pagination-info') >= 0 || html.indexOf('pagination-btns') >= 0),
        hasShowing: html.indexOf('Showing') >= 0,
        hasPrevNext: html.indexOf('Prev') >= 0 || html.indexOf('Next') >= 0,
        hasTable: html.indexOf('<tbody>') >= 0,
        hasEmpty: html.indexOf('empty-state') >= 0
      };
    }, containerId);

    if (res.status !== 'ok') {
      console.log('  FAIL - ' + res.status);
      console.log('    pageContent (first 300): ' + (res.pc || '').substring(0, 300));
      allPass = false;
      return;
    }
    if (expectPag) {
      if (res.hasPag && res.hasShowing && res.hasPrevNext) {
        console.log('  PASS');
      } else {
        console.log('  FAIL (pag:' + res.hasPag + ' show:' + res.hasShowing + ' pn:' + res.hasPrevNext + ', htmlLen:' + res.htmlLen + ')');
        allPass = false;
      }
    } else {
      if (res.hasPag || res.hasShowing || res.hasPrevNext) {
        console.log('  FAIL (unwanted pagination)');
        allPass = false;
      } else {
        console.log('  PASS');
      }
    }
  }

  var PAGES = [
    ['Sections', 'sections', 'sectionsTableContainer'],
    ['Departments', 'departments', 'departmentsTableContainer'],
    ['Machines', 'machines', 'machineTable'],
    ['Assets', 'assets', 'assetsTableContainer'],
    ['Technicians', 'technicians', 'techniciansTableContainer'],
  ];

  console.log('========== SINGLE PAGE (3 records, expect NO pagination) ==========');
  for (var p of PAGES) await testPage(p[0], p[1], p[2], false);

  console.log('\n========== MULTI PAGE (25 records, expect pagination) ==========');
  for (var p2 of PAGES) await testPage(p2[0], p2[1], p2[2], true);

  console.log('\n========== VERDICT ==========');
  if (allPass) { console.log('ALL PASS'); process.exit(0); }
  else { console.log('SOME FAILED'); process.exit(1); }
  
  await browser.close();
}

run().catch(function(err) {
  console.error('FATAL: ' + err.message);
  process.exit(1);
});
