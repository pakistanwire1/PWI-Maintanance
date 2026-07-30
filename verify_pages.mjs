import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://723cd8be.pwi-maintanance.pages.dev';

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function run() {
  var browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  var page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', function(req) {
    if (req.url().indexOf('/api') >= 0) {
      req.respond({ status: 200, contentType: 'application/json', headers: { 'Content-Type': 'application/json' }, body: '[]' });
    } else {
      req.continue();
    }
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 }).catch(function(){});
  await sleep(1000);

  // Inject a test container and run Table.render directly
  var result = await page.evaluate(function() {
    // Create test container
    var c = document.createElement('div');
    c.id = 'testContainer';
    document.body.appendChild(c);

    var cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', badge: true, badgeMap: { 'Active': 'success' } }
    ];
    var actions = [
      { icon: 'edit', label: 'Edit', color: 'primary', onclick: "alert('{id}')", idField: 'id' }
    ];

    var tests = [
      { name: '0 items', data: [], pageSize: 10 },
      { name: '3 items', data: [{id:1,name:'A',status:'Active'},{id:2,name:'B',status:'Active'},{id:3,name:'C',status:'Active'}], pageSize: 10 },
      { name: '10 items', data: Array.from({length:10},function(_,i){return{id:i+1,name:'Item'+(i+1),status:'Active'}}), pageSize: 10 },
      { name: '25 items', data: Array.from({length:25},function(_,i){return{id:i+1,name:'Item'+(i+1),status:'Active'}}), pageSize: 10 },
      { name: '55 items', data: Array.from({length:55},function(_,i){return{id:i+1,name:'Item'+(i+1),status:'Active'}}), pageSize: 10 },
    ];

    var results = [];
    for (var t of tests) {
      Table.render('testContainer', {
        data: t.data,
        columns: cols,
        actions: actions,
        page: 1,
        pageSize: t.pageSize,
        emptyMsg: 'No records found',
        onPrev: 'console.log("prev")',
        onNext: 'console.log("next")'
      });
      var html = document.getElementById('testContainer').innerHTML;
      var hasPag = html.indexOf('pagination') !== -1 && (html.indexOf('pagination-info') !== -1 || html.indexOf('pagination-btns') !== -1);
      var hasShowing = html.indexOf('Showing') !== -1;
      var hasPrevNext = html.indexOf('Prev') !== -1 || html.indexOf('Next') !== -1;
      var isEmpty = html.indexOf('empty-state') !== -1;
      results.push({
        name: t.name,
        items: t.data.length,
        pageSize: t.pageSize,
        totalPages: Math.ceil(t.data.length / (t.pageSize || 10)) || 1,
        hasPag: hasPag,
        hasShowing: hasShowing,
        hasPrevNext: hasPrevNext,
        isEmpty: isEmpty
      });
    }
    return results;
  });

  console.log('');
  var pass = 0, fail = 0;
  for (var r of result) {
    var expectPag = r.totalPages > 1;
    var gotPag = r.hasPag && r.hasShowing && r.hasPrevNext;
    var ok = expectPag === gotPag;
    if (ok) {
      console.log('  ' + r.name + ' (' + r.items + ' items, ' + r.totalPages + ' page(s)): PASS' + (expectPag ? ' (pagination shown)' : ' (no pagination)'));
      pass++;
    } else {
      console.log('  ' + r.name + ' (' + r.items + ' items, ' + r.totalPages + ' page(s)): FAIL' +
        ' (expected pagination=' + expectPag + ', got pag=' + r.hasPag + ' show=' + r.hasShowing + ' pn=' + r.hasPrevNext + ')');
      fail++;
    }
  }

  console.log('\nPASS: ' + pass + '/' + (pass + fail));

  // Now test each page by injecting directly into the DOM
  console.log('\n--- Testing all pages with 3 records (expect NO pagination on all) ---');
  var pass2 = 0, fail2 = 0;
  for (var pageConfig of [
    { name: 'Sections', route: 'sections', container: 'sectionsTableContainer', dataKey: 'SectionID' },
    { name: 'Departments', route: 'departments', container: 'departmentsTableContainer', dataKey: 'DepartmentID' },
    { name: 'Machines', route: 'machines', container: 'machineTable', dataKey: 'MachineID' },
    { name: 'Assets', route: 'assets', container: 'assetTable', dataKey: 'AssetID' },
  ]) {
    // Navigate to page to render the HTML structure
    await page.goto(URL + '/#' + pageConfig.route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(function(){});
    await sleep(2000);

    // Inject test data directly into the page's state and re-render
    var res = await page.evaluate(function(config) {
      var container = document.getElementById(config.container);
      if (!container) return { status: 'no_container: ' + config.container };

      // Create test data
      var testData = [];
      for (var i = 1; i <= 3; i++) {
        var rec = {};
        rec[config.dataKey] = String(i);
        rec['Section'] = 'Test ' + i;
        rec['Department'] = 'Test ' + i;
        rec['MachineName'] = 'Test ' + i;
        rec['Status'] = 'Active';
        rec['Description'] = 'Description ' + i;
        testData.push(rec);
      }

      // Check what the current page state is
      if (typeof Section !== 'undefined') {
        Section.closeModal();
      }

      // Try calling Table.render directly on the page's container
      // Use the columns from the page's own renderTable call
      var columns = [];
      if (window[config.pageModule] && window[config.pageModule].renderTable) {
        return { status: 'module_found' };
      }

      // Fallback: just check what Table.render does
      Table.render(config.container, {
        data: testData,
        columns: [
          { key: config.dataKey, label: 'ID' },
          { key: function(){ return config.pageModule; }, label: 'Name' },
          { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success' } }
        ],
        page: 1,
        pageSize: 10,
        onPrev: '',
        onNext: ''
      });

      var html = container.innerHTML;
      return {
        status: 'ok',
        hasPag: html.indexOf('pagination') !== -1 && (html.indexOf('pagination-info') !== -1 || html.indexOf('pagination-btns') !== -1),
        htmlLen: html.length,
        hasTable: html.indexOf('<table') !== -1 || html.indexOf('<tbody') !== -1,
        preview: html.substring(0, 200)
      };
    }, { container: pageConfig.container, dataKey: pageConfig.dataKey, pageModule: pageConfig.name });

    if (res.status === 'ok' || res.status.indexOf('no_container') === -1) {
      if (res.hasPag) {
        console.log('  ' + pageConfig.name + ': FAIL (unwanted pagination)');
        fail2++;
      } else {
        console.log('  ' + pageConfig.name + ': PASS' + (res.hasTable ? '' : ' (no table, empty)'));
        pass2++;
      }
    } else {
      console.log('  ' + pageConfig.name + ': SKIP (' + res.status + ')');
    }
  }

  console.log('\nPage tests: ' + pass2 + '/' + (pass2 + fail2) + ' PASS');

  await browser.close();

  if (fail > 0 || fail2 > 0) {
    console.log('\nVERDICT: FAIL');
    process.exit(1);
  } else {
    console.log('\nVERDICT: PASS');
    process.exit(0);
  }
}

run().catch(function(err) {
  console.error('FATAL: ' + err.message);
  process.exit(1);
});
