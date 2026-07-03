const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const logFile = '/Users/hoangquan/Downloads/moitailaiapp.proxymanlogv2';
const tempDir = '/Users/hoangquan/Downloads/temp_check_261';

execSync(`rm -rf "${tempDir}"`);
execSync(`mkdir -p "${tempDir}"`);
execSync(`python3 -c "import zipfile; zipfile.ZipFile('${logFile}').extractall('${tempDir}')"`);

const files = fs.readdirSync(tempDir);
console.log(`Tổng số file giải nén: ${files.length}`);

const match = files.filter(f => f.includes('request_261'));
console.log("Các file chứa request_261:");
console.log(match);

match.forEach(file => {
    const content = fs.readFileSync(path.join(tempDir, file), 'utf-8');
    const logData = JSON.parse(content);
    console.log(`File: ${file} | URL: ${logData.request.fullPath || logData.request.url}`);
});

execSync(`rm -rf "${tempDir}"`);
