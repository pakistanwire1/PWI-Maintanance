import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://723cd8be.pwi-maintanance.pages.dev';

const TEST_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' }
];

const TEST_ACTIONS = [
  { icon: 'edit', label: 'Edit', color: 'primary', onclick: "alert('{id}')", idField: 'id' }
];

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('Opening app...');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});

  await page.evaluate(() => {
    var c = document.createElement('div');
    c.id = 'paginationTestContainer';
    document.body.appendChild(c);
    c.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden';
  });

  var tests = [
    { name: 'Empty data (0 items)', data: [], pageSize: 10, expectPagination: false },
    { name: 'Single page (3 items)', data: [{ id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'}], pageSize: 10, expectPagination: false },
    { name: 'Exact one page (10 items)', data: Array.from({length:10},(_,i)=>({id:i+1,name:'Item'+(i+1)})), pageSize: 10, expectPagination: false },
    { name: 'Multi page (12 items, page 1)', data: Array.from({length:12},(_,i)=>({id:i+1,name:'Item'+(i+1)})), pageSize: 10, page: 1, expectPagination: true },
    { name: 'Multi page (12 items, page 2)', data: Array.from({length:12},(_,i)=>({id:i+1,name:'Item'+(i+1)})), pageSize: 10, page: 2, expectPagination: true },
    { name: 'Many pages (50 items)', data: Array.from({length:50},(_,i)=>({id:i+1,name:'Item'+(i+1)})), pageSize: 10, expectPagination: true },
  ];

  var passed = 0, failed = 0;

  for (var t of tests) {
    var paginationHtml = await page.evaluate(function(opts) {
      try {
        var container = document.getElementById('paginationTestContainer');
        if (!container) return 'NO_CONTAINER';
        Table.render('paginationTestContainer', {
          data: opts.data,
          columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }],
          page: opts.page || 1,
          pageSize: opts.pageSize,
          actions: [{ icon: 'edit', label: 'Edit', color: 'primary', onclick: "alert('{id}')", idField: 'id' }],
          onPrev: 'console.log("prev")',
          onNext: 'console.log("next")'
        });
        return container.innerHTML;
      } catch(e) { return 'ERROR: ' + e.message; }
    }, t);

    var hasPagination = paginationHtml.indexOf('pagination') !== -1;
    var hasPaginationInfo = paginationHtml.indexOf('Showing') !== -1;
    var hasPrevNext = paginationHtml.indexOf('Prev') !== -1 || paginationHtml.indexOf('Next') !== -1;
    var hasButtons = paginationHtml.indexOf('btn-sm') !== -1;

    var ok = true;
    if (t.expectPagination) {
      if (!hasPagination) { console.log('  FAIL: expected pagination but none found'); ok = false; }
      if (!hasPaginationInfo) { console.log('  FAIL: expected "Showing" but not found'); ok = false; }
      if (!hasPrevNext) { console.log('  FAIL: expected Prev/Next but not found'); ok = false; }
    } else {
      if (hasPagination) { console.log('  FAIL: unexpected pagination div found'); ok = false; }
      if (hasPaginationInfo) { console.log('  FAIL: unexpected "Showing" text found'); ok = false; }
      if (hasPrevNext) { console.log('  FAIL: unexpected Prev/Next found'); ok = false; }
      if (hasButtons) { console.log('  FAIL: unexpected button found'); ok = false; }
    }

    if (ok) {
      console.log('  PASS');
      passed++;
    } else {
      console.log('  HTML snippet: ' + paginationHtml.substring(0, 300));
      failed++;
    }
  }

  console.log('\n=== RESULTS ===');
  console.log('Passed: ' + passed + '/' + tests.length);
  console.log('Failed: ' + failed + '/' + tests.length);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(function(err) {
  console.error('FATAL: ' + err.message);
  process.exit(1);
});
