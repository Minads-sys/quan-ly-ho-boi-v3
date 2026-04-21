const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. Add calculateAge function and formatNgaySinhStr
code = code.replace(
    /const calculateNhomTuoi = \(ngaySinhStr\) => \{/,
    `const calculateAge = (ngaySinhStr) => {
    if (!ngaySinhStr) return null;
    const dob = new Date(ngaySinhStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

const formatNgaySinhStr = (str) => {
    if (!str) return '';
    const parts = str.split('-');
    if (parts.length === 3) return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
    return str;
};

const calculateNhomTuoi = (ngaySinhStr) => {`
);

// 2. In ghiDanhForm submit
code = code.replace(
    /const ngaySinh = ngaySinhInput\.value;\n\s*const nhomTuoi = calculateNhomTuoi\(ngaySinh\);/,
    `const ngaySinh = ngaySinhInput.value;
    const nhomTuoi = calculateNhomTuoi(ngaySinh);
    const age = calculateAge(ngaySinh);
    let ghiChu = "";
    
    if (age !== null && age < 6) {
        if (!confirm("Học viên dưới 6 tuổi, Bạn có muốn đăng ký?")) {
            ghiDanhSubmitButton.disabled = false;
            ghiDanhSpinner.classList.add('hidden');
            return;
        }
        ghiChu = "Học viên dưới 6 tuổi";
    }`
);

// 3. Add ghiChu to hocVienData
code = code.replace(
    /tenHV, sdtHV, ngaySinh, nhomTuoi, caHoc,/,
    `tenHV, sdtHV, ngaySinh, nhomTuoi, caHoc, ghiChu,`
);

// 4. Update hocvien table rendering
code = code.replace(
    /<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\$\{hv\.sdtHV\}<\/td>/,
    `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\${hv.sdtHV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\${formatNgaySinhStr(hv.ngaySinh)}</td>`
);

// colspan in empty table message
code = code.replace(
    /hocVienTableBody\.innerHTML = \`<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Không tìm thấy học viên nào\.<\/td><\/tr>\`;/,
    `hocVienTableBody.innerHTML = \`<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Không tìm thấy học viên nào.</td></tr>\`;`
);

// 5. Update renderHLVReport
code = code.replace(
    /reportByHLV\[hlvId\] = \{ tenHLV: hv\.tenHLV, caDay: caDay, soHVMoi: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 \};/g,
    `reportByHLV[hlvId] = { tenHLV: hv.tenHLV, caDay: caDay, soHVMoi: 0, soHV_6_8: 0, soHV_gt_8: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 };`
);

// update counts in renderHLVReport (and other 2 places)
// Since they all have exactly this line:
// reportByHLV[hlvId].tongThue += hv.thue;
// we can replace that with the new logic
code = code.replace(
    /reportByHLV\[hlvId\]\.tongThue \+= hv\.thue;/g,
    `reportByHLV[hlvId].tongThue += hv.thue;
        if (hv.nhomTuoi === '6-8') reportByHLV[hlvId].soHV_6_8++;
        else if (hv.nhomTuoi === '>8') reportByHLV[hlvId].soHV_gt_8++;`
);

// update report headers and cells
code = code.replace(
    /<th scope="col" data-key="caDay" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Ca Dạy <span class="text-gray-400 ml-1">\$\{getSortIcon\('caDay'\)\}<\/span><\/th>/,
    `<th scope="col" data-key="caDay" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Ca Dạy <span class="text-gray-400 ml-1">\${getSortIcon('caDay')}</span></th>
                        <th scope="col" data-key="soHV_6_8" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">6-8 tuổi <span class="text-gray-400 ml-1">\${getSortIcon('soHV_6_8')}</span></th>
                        <th scope="col" data-key="soHV_gt_8" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">> 8 tuổi <span class="text-gray-400 ml-1">\${getSortIcon('soHV_gt_8')}</span></th>`
);

code = code.replace(
    /<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\$\{hlv\.caDay\}<\/td>/,
    `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\${hlv.caDay}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\${hlv.soHV_6_8}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">\${hlv.soHV_gt_8}</td>`
);

// change colspan in renderHLVReport from 7 to 9
code = code.replace(
    /<td colspan="7" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu\.<\/td>/,
    `<td colspan="9" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu.</td>`
);

// update generateHLVReportPrintHTML
code = code.replace(
    /<th style="border: 1px solid #ddd; padding: 8px;">Ca Dạy<\/th>/,
    `<th style="border: 1px solid #ddd; padding: 8px;">Ca Dạy</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">6-8 tuổi</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">> 8 tuổi</th>`
);

code = code.replace(
    /<td style="border: 1px solid #ddd; padding: 8px;">\$\{hlv\.caDay\}<\/td>/,
    `<td style="border: 1px solid #ddd; padding: 8px;">\${hlv.caDay}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">\${hlv.soHV_6_8}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">\${hlv.soHV_gt_8}</td>`
);

// update handleExportExcel headers
code = code.replace(
    /\["Tên HLV", "Ca Dạy", "Số HV Mới", "Tổng Doanh Thu", "Tổng Hoa Hồng \(Gross\)", "Thuế Phải Nộp", "Thực Nhận \(Net\)"\]/,
    `["Tên HLV", "Ca Dạy", "6-8 tuổi", "> 8 tuổi", "Số HV Mới", "Tổng Doanh Thu", "Tổng Hoa Hồng (Gross)", "Thuế Phải Nộp", "Thực Nhận (Net)"]`
);

// update handleExportExcel cells
code = code.replace(
    /dataForSheet\.push\(\[hlv\.tenHLV, hlv\.caDay, hlv\.soHVMoi, hlv\.tongDoanhThu, hlv\.tongHoaHong, hlv\.tongThue, hlv\.tongThucNhan\]\);/,
    `dataForSheet.push([hlv.tenHLV, hlv.caDay, hlv.soHV_6_8, hlv.soHV_gt_8, hlv.soHVMoi, hlv.tongDoanhThu, hlv.tongHoaHong, hlv.tongThue, hlv.tongThucNhan]);`
);

// update handleExportExcel col widths
code = code.replace(
    /colWidths = \[ \{ wch: 30 \}, \{ wch: 15 \}, \{ wch: 10 \}, \{ wch: 20 \}, \{ wch: 25 \}, \{ wch: 20 \}, \{ wch: 25 \} \];/,
    `colWidths = [ { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 } ];`
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('done patch2.js');
