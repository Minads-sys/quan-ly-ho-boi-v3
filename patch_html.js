const fs = require('fs');

let code = fs.readFileSync('app.html', 'utf8');

const target1 = `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Học Viên</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SĐT</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Ghi Danh</th>`;

const replacement1 = `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Học Viên</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SĐT</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Sinh</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Ghi Danh</th>`;

code = code.replace(target1, replacement1);
code = code.replace(target1.replace(/\n/g, '\r\n'), replacement1.replace(/\n/g, '\r\n'));

fs.writeFileSync('app.html', code, 'utf8');
console.log('done app.html');
