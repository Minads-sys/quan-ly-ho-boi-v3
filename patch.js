const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên HLV<\/th>/,
    `<th scope="col" data-key="tenHLV" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Tên HLV <span class="text-gray-400 ml-1">\${getSortIcon('tenHLV')}</span></th>`
);

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ca Dạy<\/th>/,
    `<th scope="col" data-key="caDay" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Ca Dạy <span class="text-gray-400 ml-1">\${getSortIcon('caDay')}</span></th>`
);

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số HV Mới<\/th>/,
    `<th scope="col" data-key="soHVMoi" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Số HV Mới <span class="text-gray-400 ml-1">\${getSortIcon('soHVMoi')}</span></th>`
);

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Doanh Thu<\/th>/,
    `<th scope="col" data-key="tongDoanhThu" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Tổng Doanh Thu <span class="text-gray-400 ml-1">\${getSortIcon('tongDoanhThu')}</span></th>`
);

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Hoa Hồng \(Gross\)<\/th>/,
    `<th scope="col" data-key="tongHoaHong" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Tổng Hoa Hồng (Gross) <span class="text-gray-400 ml-1">\${getSortIcon('tongHoaHong')}</span></th>`
);

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thuế Phải Nộp<\/th>/,
    `<th scope="col" data-key="tongThue" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Thuế Phải Nộp <span class="text-gray-400 ml-1">\${getSortIcon('tongThue')}</span></th>`
);

code = code.replace(
    /<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thực Nhận \(Net\)<\/th>/,
    `<th scope="col" data-key="tongThucNhan" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Thực Nhận (Net) <span class="text-gray-400 ml-1">\${getSortIcon('tongThucNhan')}</span></th>`
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('done');
