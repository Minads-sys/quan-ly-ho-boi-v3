const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Export Excel Headers
code = code.replace(
    /\["STT", "Số phiếu thu", "Mã thẻ", "Tên Học Viên", "SĐT", "HLV Phụ Trách", "Gói Học", "Doanh thu", "Hình thức TT"\]/g,
    '["STT", "Số phiếu thu", "Mã thẻ", "Tên Học Viên", "SĐT", "Ngày Sinh", "HLV Phụ Trách", "Gói Học", "Doanh thu", "Hình thức TT"]'
);

// 2. Export Excel Rows
code = code.replace(
    /index \+ 1, hv\.soPhieuThu, hv\.maThe, hv\.tenHV, hv\.sdtHV, hv\.tenHLV, hv\.tenGoiHoc, hv\.hocPhi, formatThanhToanDisplay\(hv\)/g,
    'index + 1, hv.soPhieuThu, hv.maThe, hv.tenHV, hv.sdtHV, formatNgaySinhStr(hv.ngaySinh), hv.tenHLV, hv.tenGoiHoc, hv.hocPhi, formatThanhToanDisplay(hv)'
);

// 3. Print HTML Headers
code = code.replace(
    /<th style="border: 1px solid #ddd; padding: 6px;">SĐT<\/th>\s*<th style="border: 1px solid #ddd; padding: 6px;">HLV<\/th>/g,
    '<th style="border: 1px solid #ddd; padding: 6px;">SĐT</th>\n                    <th style="border: 1px solid #ddd; padding: 6px;">Ngày Sinh</th>\n                    <th style="border: 1px solid #ddd; padding: 6px;">HLV</th>'
);

// 4. Print HTML Rows
code = code.replace(
    /<td style="border: 1px solid #ddd; padding: 6px;">\$\{hv\.sdtHV\}<\/td>\s*<td style="border: 1px solid #ddd; padding: 6px;">\$\{hv\.tenHLV\}<\/td>/g,
    '<td style="border: 1px solid #ddd; padding: 6px;">${hv.sdtHV}</td>\n                        <td style="border: 1px solid #ddd; padding: 6px;">${formatNgaySinhStr(hv.ngaySinh)}</td>\n                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHLV}</td>'
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('done patch_js4');
