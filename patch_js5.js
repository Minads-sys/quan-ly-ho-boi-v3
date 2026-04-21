const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Add showCustomConfirm below showModal
const confirmCode = `
const genericConfirmModal = document.getElementById('generic-confirm-modal');
const genericConfirmTitle = document.getElementById('generic-confirm-title');
const genericConfirmMessage = document.getElementById('generic-confirm-message');
const genericConfirmOk = document.getElementById('generic-confirm-ok');
const genericConfirmCancel = document.getElementById('generic-confirm-cancel');

const showCustomConfirm = (message, title = "Xác nhận") => {
    return new Promise((resolve) => {
        genericConfirmTitle.textContent = title;
        genericConfirmMessage.textContent = message;
        genericConfirmModal.classList.remove('hidden');
        setTimeout(() => genericConfirmModal.classList.add('flex'), 10);

        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            genericConfirmModal.classList.remove('flex');
            setTimeout(() => genericConfirmModal.classList.add('hidden'), 300);
            genericConfirmOk.removeEventListener('click', handleOk);
            genericConfirmCancel.removeEventListener('click', handleCancel);
        };

        genericConfirmOk.addEventListener('click', handleOk);
        genericConfirmCancel.addEventListener('click', handleCancel);
    });
};
`;

code = code.replace(
    /const showModal = \(message, title = "Thông báo"\) => \{/,
    confirmCode + '\\nconst showModal = (message, title = "Thông báo") => {'
);

// 2. Replace confirm("Học viên dưới 6 tuổi...")
code = code.replace(
    /if \(!confirm\("Học viên dưới 6 tuổi, Bạn có muốn đăng ký\?"\)\) \{/,
    'if (!(await showCustomConfirm("Học viên dưới 6 tuổi, Bạn có muốn đăng ký?"))) {'
);

// 3. Replace confirm("Bạn có chắc chắn muốn phát hành...")
code = code.replace(
    /const confirmRelease = confirm\("Bạn có chắc chắn muốn phát hành bản cập nhật mới\? Hành động này sẽ ép TẤT CẢ trình duyệt của nhân viên tải lại trang ngay lập tức\."\);/,
    'const confirmRelease = await showCustomConfirm("Bạn có chắc chắn muốn phát hành bản cập nhật mới? Hành động này sẽ ép TẤT CẢ trình duyệt của nhân viên tải lại trang ngay lập tức.");'
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('done patch_js5');
