const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
let renderHLVReportIndex = -1;

// Find the start of renderHLVReport function
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const renderHLVReport = (data, startDate, endDate) => {')) {
        renderHLVReportIndex = i;
        break;
    }
}

if (renderHLVReportIndex !== -1) {
    for (let i = renderHLVReportIndex; i < lines.length; i++) {
        // Find the caDay column inside the map loop
        if (lines[i].includes('${hlv.caDay}')) {
            // Check if we haven't already inserted the lines
            if (!lines[i + 1].includes('soHV_6_8')) {
                lines.splice(i + 1, 0, 
                    '                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.soHV_6_8}</td>',
                    '                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.soHV_gt_8}</td>'
                );
                console.log('Replaced successfully');
            } else {
                console.log('Already replaced');
            }
            break;
        }
    }
}

fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
