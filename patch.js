const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Add DOM elements
const replace1 = "const hocVienEditCancelButton = document.getElementById('hocvien-edit-cancel-button');";
code = code.replace(replace1, replace1 + "\nconst hocVienEditSoBuoiDaHocInput = document.getElementById('hocvien-edit-sobuoidahoc');\nconst checkinMatheInput = document.getElementById('checkin-mathe');\nconst checkinResultContainer = document.getElementById('checkin-result-container');\nconst checkinInfo = document.getElementById('checkin-info');");

// 2. Add soBuoiDaHoc to hocVienData (Ghi danh)
const replace2 = "soBuoi: goiHoc.soBuoi,\n            hocPhi: hocPhi,";
code = code.replace(replace2, "soBuoi: goiHoc.soBuoi,\n            soBuoiDaHoc: 0,\n            hocPhi: hocPhi,");

// 3. Edit Form population
const replace3 = "hocVienEditMaTheInput.value = hocvien.maThe || '';";
code = code.replace(replace3, replace3 + "\n    if(hocVienEditSoBuoiDaHocInput) hocVienEditSoBuoiDaHocInput.value = hocvien.soBuoiDaHoc || 0;");

// 4. Edit Form submit
const replace4 = "maThe: hocVienEditMaTheInput.value.trim(),\n            soPhieuThu: hocVienEditPhieuThuInput.value.trim(),";
code = code.replace(replace4, replace4 + "\n            soBuoiDaHoc: parseInt(hocVienEditSoBuoiDaHocInput ? hocVienEditSoBuoiDaHocInput.value : 0) || 0,");

// 5. Import logic
const replace5 = "soBuoi: goiHoc.soBuoi,\n                    hocPhi: hocPhi,";
code = code.replace(replace5, "soBuoi: goiHoc.soBuoi,\n                    soBuoiDaHoc: 0,\n                    hocPhi: hocPhi,");

// 6. Append checkin logic
const checkinCode = \
// --- LOGIC CHECK-IN ---
if (checkinMatheInput) {
    checkinMatheInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const maThe = checkinMatheInput.value.trim();
            if (!maThe) return;

            checkinMatheInput.value = '';
            checkinMatheInput.disabled = true;
            checkinInfo.innerHTML = \\\<div class="flex justify-center"><div class="loader-sm loader border-indigo-600"></div></div>\\\;
            checkinResultContainer.classList.remove('hidden');

            try {
                const q = query(collection(db, "hocvien"), where("maThe", "==", maThe));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    checkinInfo.innerHTML = \\\<p class="text-red-600 font-bold">? Không tìm th?y h?c viên v?i mã th? này!</p>\\\;
                    checkinMatheInput.disabled = false;
                    checkinMatheInput.focus();
                    return;
                }

                const docSnap = querySnapshot.docs[0];
                const hocvien = docSnap.data();
                const hvId = docSnap.id;

                const now = new Date();
                const hanSuDung = hocvien.ngayHetHan.toDate();
                if (now > hanSuDung) {
                    checkinInfo.innerHTML = \\\
                        <p class="text-red-600 font-bold">? Th? dã h?t h?n!</p>
                        <p><strong>Tên:</strong> \\\</p>
                        <p><strong>Ngày h?t h?n:</strong> \\\</p>
                    \\\;
                    checkinMatheInput.disabled = false;
                    checkinMatheInput.focus();
                    return;
                }

                const soBuoiDaHoc = hocvien.soBuoiDaHoc || 0;
                const tongSoBuoi = hocvien.soBuoi || 0;
                
                if (soBuoiDaHoc >= tongSoBuoi && tongSoBuoi > 0) {
                    checkinInfo.innerHTML = \\\
                        <p class="text-red-600 font-bold">? Ðã h?t s? bu?i h?c!</p>
                        <p><strong>Tên:</strong> \\\</p>
                        <p><strong>Gói h?c:</strong> \\\</p>
                        <p><strong>Ðã h?c:</strong> \\\ / \\\ bu?i</p>
                    \\\;
                    checkinMatheInput.disabled = false;
                    checkinMatheInput.focus();
                    return;
                }

                const newSoBuoiDaHoc = soBuoiDaHoc + 1;
                await updateDoc(doc(db, "hocvien", hvId), {
                    soBuoiDaHoc: newSoBuoiDaHoc
                });

                await addDoc(collection(db, "lichsu_checkin"), {
                    maThe: maThe,
                    hocVienId: hvId,
                    tenHV: hocvien.tenHV,
                    tenGoiHoc: hocvien.tenGoiHoc,
                    soBuoiDaHocSauCheckin: newSoBuoiDaHoc,
                    thoiGian: Timestamp.now()
                });

                checkinInfo.innerHTML = \\\
                    <p class="text-green-600 font-bold text-xl mb-2">? Check-in Thành Công!</p>
                    <p><strong>H?c Viên:</strong> \\\</p>
                    <p><strong>Gói H?c:</strong> \\\</p>
                    <p><strong>HLV:</strong> \\\</p>
                    <p><strong>S? bu?i:</strong> \\\ / \\\</p>
                    <p><strong>H?n s? d?ng:</strong> \\\</p>
                    <p class="mt-4 text-sm text-gray-500 italic">Ðang in vé...</p>
                \\\;

                inVeK80(hocvien, newSoBuoiDaHoc, tongSoBuoi, maThe);

            } catch (error) {
                console.error("L?i khi check-in:", error);
                checkinInfo.innerHTML = \\\<p class="text-red-600 font-bold">? L?i h? th?ng: \\\</p>\\\;
            } finally {
                checkinMatheInput.disabled = false;
                checkinMatheInput.focus();
            }
        }
    });
}

function inVeK80(hocvien, soBuoiDaHoc, tongSoBuoi, maThe) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');
    
    const ticketHtml = \\\
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>In Vé K80</title>
            <style>
                @page { margin: 0; size: auto; }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    width: 72mm;
                    color: #000;
                    background: white;
                }
                .ticket-wrapper {
                    text-align: center;
                    padding: 5px;
                    box-sizing: border-box;
                }
                .pool-name {
                    font-size: 14pt;
                    font-weight: bold;
                    margin: 5px 0;
                }
                .ticket-title {
                    font-size: 18pt;
                    font-weight: bold;
                    margin: 0 0 10px 0;
                }
                .ticket-info {
                    text-align: left;
                    font-size: 11pt;
                    margin-bottom: 10px;
                    line-height: 1.6;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                }
                .ticket-info p {
                    margin: 3px 0;
                }
                .hidden { display: none !important; }
                .qr-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 10px;
                }
                .qr-container img {
                    width: 120px;
                    height: 120px;
                }
                .qr-text {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="ticket-wrapper">
                <h2 class="pool-name">H? boi Phú Lâm</h2>
                <h1 class="ticket-title">VÉ H?C BOI</h1>
                <div class="ticket-info">
                    <p><strong>Th?i gian:</strong> \\\</p>
                    <p><strong>H?c Viên:</strong> \\\</p>
                    <p><strong>Gói H?c:</strong> \\\</p>
                    <p><strong>HLV:</strong> \\\</p>
                    <p class="hidden"><strong>Bu?i h?c:</strong> \\\ / \\\</p>
                </div>
                <div class="qr-container">
                    <div id="qrcode-container"></div>
                    <p class="qr-text">Mã Th?: \\\</p>
                </div>
            </div>
            
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <script>
                new QRCode(document.getElementById("qrcode-container"), {
                    text: "\\\",
                    width: 120,
                    height: 120,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
                
                setTimeout(() => {
                    window.print();
                }, 500);
            </script>
        </body>
        </html>
    \\\;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(ticketHtml);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
}
\

code += "\n" + checkinCode;
fs.writeFileSync('app.js', code, 'utf8');
