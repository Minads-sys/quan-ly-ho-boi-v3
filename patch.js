const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. Selectors
code = code.replace(
    /const nhomTuoiSelect = document\.getElementById\('nhomTuoi'\);/,
    `const ngaySinhInput = document.getElementById('ngaySinh');`
);

code = code.replace(
    /const hocVienEditSdtInput = document\.getElementById\('hocvien-edit-sdt'\);/,
    `const hocVienEditSdtInput = document.getElementById('hocvien-edit-sdt');\nconst hocVienEditNgaySinhInput = document.getElementById('hocvien-edit-ngaysinh');`
);

// 2. Add calculateNhomTuoi function after global variables
code = code.replace(
    /let currentUser = null;/,
    `let currentUser = null;\n\nconst calculateNhomTuoi = (ngaySinhStr) => {\n    if (!ngaySinhStr) return 'N/A';\n    const dob = new Date(ngaySinhStr);\n    const today = new Date();\n    let age = today.getFullYear() - dob.getFullYear();\n    const m = today.getMonth() - dob.getMonth();\n    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {\n        age--;\n    }\n    return age <= 8 ? '6-8' : '>8';\n};`
);

// 3. Event listeners
code = code.replace(
    /nhomTuoiSelect\.addEventListener\('change', autoSelectHLV\);/,
    `ngaySinhInput.addEventListener('change', autoSelectHLV);`
);

// 4. In autoSelectHLV
code = code.replace(
    /const hlv = findBestHLV\(caHocSelect\.value, nhomTuoiSelect\.value\);/,
    `const hlv = findBestHLV(caHocSelect.value, calculateNhomTuoi(ngaySinhInput.value));`
);

// 5. In ghiDanhForm submit
code = code.replace(
    /const nhomTuoi = nhomTuoiSelect\.value;/,
    `const ngaySinh = ngaySinhInput.value;\n    const nhomTuoi = calculateNhomTuoi(ngaySinh);`
);

code = code.replace(
    /tenHV, sdtHV, nhomTuoi, caHoc,/,
    `tenHV, sdtHV, ngaySinh, nhomTuoi, caHoc,`
);

// 6. In openHocVienEditModal
code = code.replace(
    /hocVienEditSdtInput\.value = hocvien\.sdtHV;/,
    `hocVienEditSdtInput.value = hocvien.sdtHV;\n    hocVienEditNgaySinhInput.value = hocvien.ngaySinh || '';`
);

// 7. In edit form submit
code = code.replace(
    /tenHV: hocVienEditTenInput\.value\.trim\(\),\s*sdtHV: hocVienEditSdtInput\.value\.trim\(\),/,
    `tenHV: hocVienEditTenInput.value.trim(),\n            sdtHV: hocVienEditSdtInput.value.trim(),\n            ngaySinh: hocVienEditNgaySinhInput.value,\n            nhomTuoi: hocVienEditNgaySinhInput.value ? calculateNhomTuoi(hocVienEditNgaySinhInput.value) : (globalHocVienList.find(h => h.id === editId)?.nhomTuoi || 'N/A'),`
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('done patch.js');
