const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFiles = [
    '/Users/hoangquan/Downloads/lognew1.proxymanlogv2',
    '/Users/hoangquan/Downloads/moitailaiapp.proxymanlogv2',
    '/Users/hoangquan/Downloads/moinhat1.proxymanlogv2',
    '/Users/hoangquan/Downloads/getxu.proxymanlogv2',
    '/Users/hoangquan/Downloads/api.mydramawave.com_07-02-2026-15-09-13.proxymanlogv2',
    '/Users/hoangquan/Downloads/getthuocphim_quangcao.proxymanlogv2'
];

const tempDir = '/Users/hoangquan/Downloads/temp_any';

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

execSync(`rm -rf "${tempDir}"`);
execSync(`mkdir -p "${tempDir}"`);

logFiles.forEach(zipFile => {
    if (!fs.existsSync(zipFile)) return;
    const zipTempDir = path.join(tempDir, path.basename(zipFile, '.proxymanlogv2'));
    try {
        execSync(`ditto -x -k "${zipFile}" "${zipTempDir}"`);
    } catch(e) {}
});

const allFiles = walk(tempDir);
console.log(`Tìm thấy tổng cộng ${allFiles.length} file.`);

let found = 0;
allFiles.forEach(filePath => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const logData = JSON.parse(content);
        const req = logData.request || {};
        const url = req.fullPath || req.url || req.uri || '';
        
        if (url.toLowerCase().includes('init')) {
            found++;
            console.log(`[KHỚP ANY] File: ${path.relative(tempDir, filePath)} | URL: ${url}`);
        }
    } catch(e) {}
});

console.log(`\nTổng số request chứa 'init' tìm thấy: ${found}`);
execSync(`rm -rf "${tempDir}"`);
