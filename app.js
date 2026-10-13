// Import các hàm của Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    where,
    getDocs,
    Timestamp,
    writeBatch,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCBe8S-LX-cR1ePQtI-zkJ1OqeosTqKyDk",
    authDomain: "ghi-danh-hoc-boi-q6-v3.firebaseapp.com",
    projectId: "ghi-danh-hoc-boi-q6-v3",
    storageBucket: "ghi-danh-hoc-boi-q6-v3.firebasestorage.app",
    messagingSenderId: "23962314394",
    appId: "1:23962314394:web:84b4f8acec35ed05932123"
};

// --- KHỞI TẠO FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- BIẾN TOÀN CỤC ---
let currentUser = null;

const calculateAge = (ngaySinhStr) => {
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
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return str;
};

const calculateNhomTuoi = (ngaySinhStr) => {
    if (!ngaySinhStr) return 'N/A';
    const dob = new Date(ngaySinhStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age <= 8 ? '6-8' : '>8';
};
let currentUserRole = null; // 'admin', 'letan', or null
let initialAppVersion = null; // Dùng để track reload
let globalRateHBA = 0;
let globalRateTax = 0;
let globalGoiHocList = [];
let globalHLVList = [];
let globalHocVienList = []; // Danh sách gốc từ Firestore
let filteredHocVienList = []; // Danh sách đã lọc/tìm kiếm để hiển thị
let currentDeleteInfo = { type: null, id: null }; // Để modal xoá biết xoá gì
let lastRegisteredHocVien = null; // Lưu HV vừa ghi danh để In
let quickReportData = []; // Lưu HV trong ngày cho báo cáo nhanh

// Biến lưu các hàm unsubscribe listeners
let unsubGoiHoc = null;
let unsubHLV = null;
let unsubHocVien = null;
let unsubChiPhi = null;
let unsubDinhPhiMau = null;

// Biến toàn cục cho KQKD
let globalChiPhiList = [];
let globalThuKhacList = [];
let globalDinhPhiMauList = [];
let currentKqkdPeriodMode = 'month';
let currentKqkdMonth = '';
let currentKqkdStartDate = null;
let currentKqkdEndDate = null;
let currentKqkdSummaryData = null;
let currentEditingExpenseId = null;
let currentEditingIncomeId = null;

// Nhóm chi phí chuẩn
const EXPENSE_GROUPS = {
    mat_bang: { label: 'Mặt Bằng / Thuê Hồ', badgeClass: 'bg-blue-100 text-blue-800' },
    nhan_su: { label: 'Nhân Sự Quản Lý & An Toàn', badgeClass: 'bg-green-100 text-green-800' },
    van_hanh: { label: 'Tiện Ích (Điện, Nước, Net)', badgeClass: 'bg-yellow-100 text-yellow-800' },
    hoa_chat: { label: 'Hóa Chất & Bảo Trì Hồ', badgeClass: 'bg-purple-100 text-purple-800' },
    marketing: { label: 'Marketing & Dụng Cụ', badgeClass: 'bg-pink-100 text-pink-800' },
    chi_phi_khac: { label: 'Chi Phí Khác (Tùy Biến)', badgeClass: 'bg-gray-100 text-gray-800' }
};

// 12 Chi phí tối thiểu gợi ý cho Hồ bơi Q6
const DEFAULT_DINH_PHI_MAU = [
    { id: 'mau_1', tenChiPhi: 'Tiền thuê mặt bằng hồ bơi / làn bơi Q6', nhomChiPhi: 'mat_bang', soTienMacDinh: 15000000, ghiChu: 'Hợp đồng thuê định kỳ TTTDTT', isTinhKQKD: true, thuTu: 1 },
    { id: 'mau_2', tenChiPhi: 'Lương nhân viên lễ tân & ghi danh', nhomChiPhi: 'nhan_su', soTienMacDinh: 6000000, ghiChu: 'Lương ca trực quầy tiếp đón', isTinhKQKD: true, thuTu: 2 },
    { id: 'mau_3', tenChiPhi: 'Lương nhân viên cứu hộ (Lifeguard)', nhomChiPhi: 'nhan_su', soTienMacDinh: 6000000, ghiChu: 'Trực an toàn bể bơi', isTinhKQKD: true, thuTu: 3 },
    { id: 'mau_4', tenChiPhi: 'Lương nhân viên vệ sinh sàn & tạp vụ', nhomChiPhi: 'nhan_su', soTienMacDinh: 3000000, ghiChu: 'Vệ sinh phòng tắm tráng, WC', isTinhKQKD: true, thuTu: 4 },
    { id: 'mau_5', tenChiPhi: 'Tiền điện (Bơm lọc cát tuần hoàn & chiếu sáng)', nhomChiPhi: 'van_hanh', soTienMacDinh: 4000000, ghiChu: 'Điện kinh doanh 3 pha', isTinhKQKD: true, thuTu: 5 },
    { id: 'mau_6', tenChiPhi: 'Tiền nước sạch cấp hồ & tráng xả', nhomChiPhi: 'van_hanh', soTienMacDinh: 2500000, ghiChu: 'Bổ sung hao hụt & vòi tắm tráng', isTinhKQKD: true, thuTu: 6 },
    { id: 'mau_7', tenChiPhi: 'Hóa chất Clo, PAC, pH xử lý nước hồ', nhomChiPhi: 'hoa_chat', soTienMacDinh: 2000000, ghiChu: 'Khử trùng nước đạt chuẩn y tế', isTinhKQKD: true, thuTu: 7 },
    { id: 'mau_8', tenChiPhi: 'Bảo trì máy bơm, robot hút cặn đáy hồ', nhomChiPhi: 'hoa_chat', soTienMacDinh: 1000000, ghiChu: 'Bảo dưỡng định kỳ thiết bị lọc', isTinhKQKD: true, thuTu: 8 },
    { id: 'mau_9', tenChiPhi: 'Dụng cụ dạy bơi (Phao tay, ván bơi, kính)', nhomChiPhi: 'marketing', soTienMacDinh: 500000, ghiChu: 'Hao mòn & bổ sung cụm phao tập', isTinhKQKD: true, thuTu: 9 },
    { id: 'mau_10', tenChiPhi: 'Quảng cáo Facebook & Tuyển sinh hè', nhomChiPhi: 'marketing', soTienMacDinh: 1500000, ghiChu: 'Ngân sách marketing khóa bơi kèm', isTinhKQKD: true, thuTu: 10 },
    { id: 'mau_11', tenChiPhi: 'Internet cáp quang, giấy in thẻ, mực in', nhomChiPhi: 'van_hanh', soTienMacDinh: 500000, ghiChu: 'Quầy lễ tân check-in', isTinhKQKD: true, thuTu: 11 },
    { id: 'mau_12', tenChiPhi: 'Thuốc men sơ cấp cứu & An toàn hồ', nhomChiPhi: 'chi_phi_khac', soTienMacDinh: 300000, ghiChu: 'Tủ thuốc y tế dự phòng', isTinhKQKD: true, thuTu: 12 }
];

// --- DOM ELEMENTS (Các phần tử UI chính) ---
const globalLoader = document.getElementById('global-loader');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginSpinner = document.getElementById('login-spinner');
const userEmailElement = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const tabNavigation = document.getElementById('tab-navigation');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

// Elements cho Mobile Menu
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

const toggleMobileMenu = (forceClose = false) => {
    if (!mobileMenuBtn) return;
    const isMenuOpen = !tabNavigation.classList.contains('-translate-x-full');
    
    if (isMenuOpen || forceClose) {
        tabNavigation.classList.add('-translate-x-full');
        mobileMenuOverlay.classList.add('hidden', 'opacity-0');
    } else {
        tabNavigation.classList.remove('-translate-x-full');
        mobileMenuOverlay.classList.remove('hidden');
        setTimeout(() => mobileMenuOverlay.classList.remove('opacity-0'), 10);
    }
};

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => toggleMobileMenu());
if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => toggleMobileMenu(true));
if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', () => toggleMobileMenu(true));

// Elements cho Modal
const customModal = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseButton = document.getElementById('modal-close-button');

// Elements cho Modal Xoá
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteMessage = document.getElementById('delete-message');
const deleteCancelButton = document.getElementById('delete-cancel-button');
const deleteConfirmButton = document.getElementById('delete-confirm-button');

// Elements cho Tab Cài Đặt (Step 2a)
const rateHBAInput = document.getElementById('setting-rate-hba');
const rateTaxInput = document.getElementById('setting-rate-tax');
const saveSettingsButton = document.getElementById('save-settings-button');
const settingsSpinner = document.getElementById('settings-spinner');
const releaseUpdateButton = document.getElementById('release-update-button');
const releaseSpinner = document.getElementById('release-spinner');
const updateReloadModal = document.getElementById('update-reload-modal');

// Elements cho Tab Gói Học (Step 2b)
const goiHocTableBody = document.getElementById('goi-hoc-table-body');
const addGoiHocButton = document.getElementById('add-goi-hoc-button');
const goiHocModal = document.getElementById('goi-hoc-modal');
const goiHocModalTitle = document.getElementById('goi-hoc-modal-title');
const goiHocForm = document.getElementById('goi-hoc-form');
const goiHocIdInput = document.getElementById('goi-hoc-id');
const goiHocTenInput = document.getElementById('goi-hoc-ten');
const goiHocSoBuoiInput = document.getElementById('goi-hoc-so-buoi');
const goiHocHocPhiInput = document.getElementById('goi-hoc-hoc-phi');
const goiHocThoiHanInput = document.getElementById('goi-hoc-thoi-han');
const goiHocCancelButton = document.getElementById('goi-hoc-cancel-button');

// Elements cho Tab HLV (Step 2c)
const hlvTableBody = document.getElementById('hlv-table-body');
const hlvExcelBtn = document.getElementById('hlv-excel-btn');
const addHLVButton = document.getElementById('add-hlv-button');
const hlvModal = document.getElementById('hlv-modal');
const hlvModalTitle = document.getElementById('hlv-modal-title');
const hlvForm = document.getElementById('hlv-form');
const hlvIdInput = document.getElementById('hlv-id');
const hlvTenInput = document.getElementById('hlv-ten');
const hlvCaDaySelect = document.getElementById('hlv-ca-day');
const hlvLoaiSelect = document.getElementById('hlv-loai');
const hlvUuTienInput = document.getElementById('hlv-uu-tien');
const hlvCancelButton = document.getElementById('hlv-cancel-button');

// Elements cho Tab Ghi Danh (Step 3a)
const ghiDanhForm = document.getElementById('ghi-danh-form');
const goiHocSelect = document.getElementById('goiHoc');
const displayHocPhi = document.getElementById('displayHocPhi');
const displayHLV = document.getElementById('displayHLV');
const chkChiDinh = document.getElementById('chkChiDinh');
const chiDinhDropdownContainer = document.getElementById('chi-dinh-dropdown-container');
const hlvChiDinhSelect = document.getElementById('hlvChiDinh');
const caHocSelect = document.getElementById('caHoc');
const ngaySinhInput = document.getElementById('ngaySinh');
const ghiDanhSubmitButton = document.getElementById('ghi-danh-submit-button');
const ghiDanhSpinner = document.getElementById('ghi-danh-spinner');
const ghiDanhResetButton = document.getElementById('ghi-danh-reset-button');
const ghiDanhPrintButton = document.getElementById('ghi-danh-print-button');
const tenHVInput = document.getElementById('tenHV');
const sdtHVInput = document.getElementById('sdtHV');
const maTheInput = document.getElementById('maThe');
const soPhieuThuInput = document.getElementById('soPhieuThu');
const ttTienMatInput = document.getElementById('ttTienMat');
const ttChuyenKhoanInput = document.getElementById('ttChuyenKhoan');
const ttQuetTheInput = document.getElementById('ttQuetThe');
const ttStatusDiv = document.getElementById('ttStatus');

// Elements cho Tab Quản lý HV
const hocVienTableBody = document.getElementById('hocvien-table-body');
const hvSearchInput = document.getElementById('hv-search-input');
const filterBtnHomNay = document.getElementById('filter-hv-today');
const filterBtnThangNay = document.getElementById('filter-hv-thangnay');
const filterBtnTatCa = document.getElementById('filter-hv-tatca');
// --- Elements Mới cho bộ lọc tùy chỉnh ---
const filterBtnTuyChinh = document.getElementById('filter-hv-tuychinh');
const hvCustomFilterContainer = document.getElementById('hv-custom-filter-container');
const hvDateFromInput = document.getElementById('hv-date-from');
const hvDateToInput = document.getElementById('hv-date-to');
const hvCustomApplyBtn = document.getElementById('hv-custom-filter-apply');
let currentHVFilter = 'thangnay';
// ----------------------------------------
const hvListPrintBtn = document.getElementById('hv-list-print-btn');
const hvListExcelBtn = document.getElementById('hv-list-excel-btn');

// Elements cho Modal Sửa Học Viên
const hocVienEditModal = document.getElementById('hocvien-edit-modal');
const hocVienEditForm = document.getElementById('hocvien-edit-form');
const hocVienEditIdInput = document.getElementById('hocvien-edit-id');
const hocVienEditThoiHanInput = document.getElementById('hocvien-edit-thoi-han');
const hocVienEditTenInput = document.getElementById('hocvien-edit-ten');
const hocVienEditSdtInput = document.getElementById('hocvien-edit-sdt');
const hocVienEditNgaySinhInput = document.getElementById('hocvien-edit-ngaysinh');
const hocVienEditMaTheInput = document.getElementById('hocvien-edit-mathe');
const hocVienEditPhieuThuInput = document.getElementById('hocvien-edit-phieuthu');
const hocVienEditGoiHocInput = document.getElementById('hocvien-edit-goihoc');
const hocVienEditHLVInput = document.getElementById('hocvien-edit-hlv');
const editTtTienMatInput = document.getElementById('edit-ttTienMat');
const editTtChuyenKhoanInput = document.getElementById('edit-ttChuyenKhoan');
const editTtQuetTheInput = document.getElementById('edit-ttQuetThe');
const editTtStatusDiv = document.getElementById('editTtStatus');
const editHocPhiValueInput = document.getElementById('hocvien-edit-hocphi-value');
const hocVienEditNgayGhiInput = document.getElementById('hocvien-edit-ngayghi');
const hocVienEditNgayHetInput = document.getElementById('hocvien-edit-ngayhet');
const hocVienEditCancelButton = document.getElementById('hocvien-edit-cancel-button');
const hocVienEditSoBuoiDaHocInput = document.getElementById('hocvien-edit-sobuoidahoc');
const checkinMatheInput = document.getElementById('checkin-mathe');
const checkinResultContainer = document.getElementById('checkin-result-container');
const checkinInfo = document.getElementById('checkin-info');

// Elements cho In Phiếu
const printSection = document.getElementById('print-section');

// Elements cho Báo cáo nhanh
const qrDtNgay = document.getElementById('qr-dt-ngay');
const qrDtThang = document.getElementById('qr-dt-thang');
const qrHvNgay = document.getElementById('qr-hv-ngay');
const qrHvThang = document.getElementById('qr-hv-thang');
const qrHvTableBody = document.getElementById('qr-hv-table-body');
const qrPrintBtn = document.getElementById('qr-print-btn');
const qrExcelBtn = document.getElementById('qr-excel-btn');
const qrViewBtn = document.getElementById('qr-view-btn');


// Elements cho Tab Báo Cáo
const reportTypeSelect = document.getElementById('report-type');
const reportQuickFilterBtns = document.querySelectorAll('.report-quick-filter-btn');
const reportViewBtn = document.getElementById('report-view-btn');
const reportSpinner = document.getElementById('report-spinner');
const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const reportDateRangeContainer = document.getElementById('report-date-range');
const reportPrintBtn = document.getElementById('report-print-btn');
const reportExcelBtn = document.getElementById('report-excel-btn');
const reportResultsContainer = document.getElementById('report-results-container');
let currentReportData = [];
let currentReportType = 'tongquan';
let currentReportParams = {};

// Elements cho Tab Import
const importFileInput = document.getElementById('import-file-input');
const importStartBtn = document.getElementById('import-start-btn');
const importSpinner = document.getElementById('import-spinner');
const importResultsContainer = document.getElementById('import-results-container');
const importLog = document.getElementById('import-log');


// --- HÀM UTILITY (Chung) ---

const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value || 0);
};

const formatDateForInput = (date) => {
    if (!date) return '';
    const d = (date instanceof Date) ? date : date.toDate();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (date) => {
    if (!date) return 'N/A';
    const d = (date instanceof Date) ? date : date.toDate();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
};

const formatDateTimeForDisplay = (date) => {
    if (!date) return 'N/A';
    const d = (date instanceof Date) ? date : date.toDate();
    const time = d.toLocaleTimeString('vi-VN');
    return `${formatDateForDisplay(d)} ${time}`;
};

// --- HÀM HỖ TRỢ THANH TOÁN KẾT HỢP ---

// Tạo mảng thanhToanChiTiet từ 3 input
const buildThanhToanChiTiet = (tienMat, chuyenKhoan, quetThe) => {
    const result = [];
    if (tienMat > 0) result.push({ hinhThuc: 'Tiền mặt', soTien: tienMat });
    if (chuyenKhoan > 0) result.push({ hinhThuc: 'Chuyển khoản', soTien: chuyenKhoan });
    if (quetThe > 0) result.push({ hinhThuc: 'Quẹt thẻ', soTien: quetThe });
    return result;
};

// Tạo chuỗi hinhThucThanhToan tóm tắt (tương thích ngược)
const buildHTTTSummary = (chiTiet) => {
    if (!chiTiet || chiTiet.length === 0) return 'N/A';
    return chiTiet.map(ct => ct.hinhThuc).join(' + ');
};

// Tạo chuỗi hiển thị chi tiết thanh toán
const formatThanhToanDisplay = (hv) => {
    if (hv.thanhToanChiTiet && hv.thanhToanChiTiet.length > 0) {
        return hv.thanhToanChiTiet.map(ct => {
            const shortName = ct.hinhThuc === 'Tiền mặt' ? 'TM' : ct.hinhThuc === 'Chuyển khoản' ? 'CK' : 'QT';
            return `${shortName}: ${formatCurrency(ct.soTien)}`;
        }).join(' + ');
    }
    return hv.hinhThucThanhToan || 'N/A';
};

// Tách tiền theo HTTT từ 1 học viên (tương thích dữ liệu cũ + mới)
const getTienTheoHTTT = (hv) => {
    let tienMat = 0, chuyenKhoan = 0, quetThe = 0;
    if (hv.thanhToanChiTiet && hv.thanhToanChiTiet.length > 0) {
        for (const ct of hv.thanhToanChiTiet) {
            if (ct.hinhThuc === 'Tiền mặt') tienMat += ct.soTien;
            else if (ct.hinhThuc === 'Chuyển khoản') chuyenKhoan += ct.soTien;
            else if (ct.hinhThuc === 'Quẹt thẻ') quetThe += ct.soTien;
        }
    } else {
        // Dữ liệu cũ: toàn bộ hocPhi thuộc hinhThucThanhToan
        if (hv.hinhThucThanhToan === 'Tiền mặt') tienMat = hv.hocPhi;
        else if (hv.hinhThucThanhToan === 'Chuyển khoản') chuyenKhoan = hv.hocPhi;
        else if (hv.hinhThucThanhToan === 'Quẹt thẻ') quetThe = hv.hocPhi;
    }
    return { tienMat, chuyenKhoan, quetThe };
};

// Cập nhật trạng thái khớp/chưa khớp thanh toán
const updateTTStatus = (statusDiv, tienMat, chuyenKhoan, quetThe, hocPhi) => {
    const tongNhap = tienMat + chuyenKhoan + quetThe;
    if (hocPhi <= 0) {
        statusDiv.textContent = `Tổng: ${formatCurrency(tongNhap)} / Học phí: 0 VNĐ`;
        statusDiv.className = 'text-sm font-semibold text-gray-500 text-right';
    } else if (tongNhap === hocPhi) {
        statusDiv.innerHTML = `✅ Khớp: <strong>${formatCurrency(tongNhap)}</strong> / ${formatCurrency(hocPhi)} VNĐ`;
        statusDiv.className = 'text-sm font-semibold text-green-600 text-right';
    } else {
        statusDiv.innerHTML = `❌ Chưa khớp: <strong>${formatCurrency(tongNhap)}</strong> / ${formatCurrency(hocPhi)} VNĐ (Thiếu ${formatCurrency(hocPhi - tongNhap)})`;
        statusDiv.className = 'text-sm font-semibold text-red-600 text-right';
    }
};


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

const showModal = (message, title = "Thông báo") => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
    setTimeout(() => customModal.classList.add('flex'), 10);
};

const closeModal = () => {
    customModal.classList.remove('flex');
    setTimeout(() => customModal.classList.add('hidden'), 300);
};
modalCloseButton.addEventListener('click', closeModal);

// Modal Xoá/Vô Hiệu Hóa
const showDeleteModal = (type, id, name, isActive = true) => {
    currentDeleteInfo = { type, id, isActive };
    
    // Kiểm tra loại để hiện thông báo phù hợp
    if (type === 'hlv') {
        if (isActive) {
            deleteMessage.textContent = `Bạn có chắc chắn muốn VÔ HIỆU HÓA HLV "${name}"? Họ sẽ không được phân công học viên mới nữa.`;
            deleteConfirmButton.textContent = "Vô hiệu hóa";
            deleteConfirmButton.classList.remove('bg-green-600', 'hover:bg-green-700');
            deleteConfirmButton.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            deleteMessage.textContent = `Bạn có muốn KÍCH HOẠT LẠI HLV "${name}"?`;
            deleteConfirmButton.textContent = "Kích hoạt lại";
            deleteConfirmButton.classList.remove('bg-red-600', 'hover:bg-red-700');
            deleteConfirmButton.classList.add('bg-green-600', 'hover:bg-green-700');
        }
    } else {
        deleteMessage.textContent = `Bạn có chắc chắn muốn xoá "${name}"? Hành động này không thể hoàn tác.`;
        deleteConfirmButton.textContent = "Xác nhận Xoá";
        deleteConfirmButton.classList.add('bg-red-600', 'hover:bg-red-700');
    }
    
    deleteConfirmModal.classList.remove('hidden');
    setTimeout(() => deleteConfirmModal.classList.add('flex'), 10);
};

const closeDeleteModal = () => {
    deleteConfirmModal.classList.remove('flex');
    setTimeout(() => deleteConfirmModal.classList.add('hidden'), 300);
};
deleteCancelButton.addEventListener('click', closeDeleteModal);

// Hàm xử lý Vô Hiệu Hóa / Xóa
const handleConfirmDelete = async () => {
    const { type, id, isActive } = currentDeleteInfo;
    if (!type || !id) return;

    try {
        if (type === 'goi_hoc') {
            await deleteDoc(doc(db, "goi_hoc", id));
            showModal("Đã xoá thành công!", "Thành công");
        } else if (type === 'hlv') {
            // Logic Soft Delete cho HLV
            const newState = !isActive; // Đảo ngược trạng thái
            await updateDoc(doc(db, "hlv", id), { active: newState });
            showModal(newState ? "Đã kích hoạt lại HLV." : "Đã vô hiệu hóa HLV.", "Thành công");
        } else if (type === 'hocvien') {
            await deleteDoc(doc(db, "hocvien", id));
            showModal("Đã xoá thành công!", "Thành công");
        }
    } catch (error) {
        console.error("Lỗi khi xử lý:", error);
        showModal(`Lỗi: ${error.message}`, "Lỗi");
    } finally {
        closeDeleteModal();
        currentDeleteInfo = { type: null, id: null };
    }
};
deleteConfirmButton.addEventListener('click', handleConfirmDelete);


const detachAllListeners = () => {
    if (unsubGoiHoc) {
        unsubGoiHoc();
        unsubGoiHoc = null;
    }
    if (unsubHLV) {
        unsubHLV();
        unsubHLV = null;
    }
    if (unsubHocVien) {
        unsubHocVien();
        unsubHocVien = null;
    }
    if (unsubChiPhi) {
        unsubChiPhi();
        unsubChiPhi = null;
    }
    if (unsubDinhPhiMau) {
        unsubDinhPhiMau();
        unsubDinhPhiMau = null;
    }
};




const setupUIForRole = (role) => {
    if (role === 'admin') {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }
};

const loadAllInitialData = async () => {
    await Promise.all([
        loadSettings(),
        loadGoiHoc(),
        loadHLV()
    ]);
    await loadHocVien();
    setupGhiDanhTab();
    setupReportTabDefaults();
    setupKQKDTab();
    
    // Set default date for QR filter if exists
    if(document.getElementById('qr-date-from')) {
        document.getElementById('qr-date-from').value = formatDateForInput(new Date());
    }
    if(document.getElementById('qr-date-to')) {
        document.getElementById('qr-date-to').value = formatDateForInput(new Date());
    }
};

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    
    loginButton.disabled = true;
    loginSpinner.classList.remove('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        let message = "Đăng nhập thất bại.";
        if (error.code === 'auth/invalid-credential') message = "Sai email hoặc mật khẩu.";
        showModal(message, "Lỗi");
    } finally {
        loginButton.disabled = false;
        loginSpinner.classList.add('hidden');
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        showModal(`Lỗi đăng xuất: ${error.message}`, "Lỗi");
    }
});

tabNavigation.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-button')) {
        const tabName = e.target.dataset.tab;
        
        tabButtons.forEach(btn => {
            btn.classList.remove('active-tab', 'border-indigo-600', 'text-indigo-600', 'bg-indigo-50');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        tabPanels.forEach(panel => panel.classList.remove('active'));

        e.target.classList.add('active-tab', 'border-indigo-600', 'text-indigo-600', 'bg-indigo-50');
        e.target.classList.remove('border-transparent', 'text-gray-500');
        
        // Auto close mobile menu when a tab is clicked
        toggleMobileMenu(true);
        
        const panelToShow = document.getElementById(`content-${tabName}`);
        if (panelToShow) {
            panelToShow.classList.add('active');
        }
    }
});


// --- NGHIỆP VỤ BƯỚC 2a: CÀI ĐẶT ---

let unsubSettings = null;

const loadSettings = () => {
    return new Promise((resolve) => {
        if (unsubSettings) unsubSettings();
        
        unsubSettings = onSnapshot(doc(db, "app_config", "main_config"), (docSnap) => {
            if (docSnap.exists()) {
                const config = docSnap.data();
                globalRateHBA = config.rateHBA || 0;
                globalRateTax = config.rateTax || 0;
                
                rateHBAInput.value = globalRateHBA;
                rateTaxInput.value = globalRateTax;
                
                // Nạp định phí mẫu và danh sách chi phí từ main_config (Khắc phục lỗi permission)
                if (Array.isArray(config.dinhPhiMau) && config.dinhPhiMau.length > 0) {
                    globalDinhPhiMauList = config.dinhPhiMau;
                } else {
                    globalDinhPhiMauList = JSON.parse(JSON.stringify(DEFAULT_DINH_PHI_MAU));
                }

                if (Array.isArray(config.danhSachChiPhi)) {
                    globalChiPhiList = config.danhSachChiPhi;
                } else {
                    globalChiPhiList = [];
                }

                if (Array.isArray(config.danhSachThuKhac)) {
                    globalThuKhacList = config.danhSachThuKhac;
                } else {
                    globalThuKhacList = [];
                }

                if (typeof calculateAndRenderKQKD === 'function') {
                    calculateAndRenderKQKD();
                }
                if (typeof renderTemplateListModal === 'function') {
                    renderTemplateListModal();
                }

                // Logic ép tải lại khi có phiên bản mới
                if (config.appVersion) {
                    if (initialAppVersion === null) {
                        // Lần đầu tải trang, lưu lại version hiện tại
                        initialAppVersion = config.appVersion;
                    } else if (config.appVersion > initialAppVersion) {
                        // Nếu version trên db lớn hơn version lúc mới tải, ép tải lại trang
                        updateReloadModal.classList.remove('hidden');
                        setTimeout(() => {
                            window.location.href = window.location.pathname + '?v=' + config.appVersion;
                        }, 2000); // Đợi 2s cho user đọc thông báo rồi reload
                    }
                }
            }
            resolve();
        }, (error) => {
            console.error("Lỗi load settings realtime:", error);
            resolve(); // Vẫn resolve để không chặn app
        });
    });
};

saveSettingsButton.addEventListener('click', async () => {
    const rateHBA = parseFloat(rateHBAInput.value) || 0;
    const rateTax = parseFloat(rateTaxInput.value) || 0;

    saveSettingsButton.disabled = true;
    settingsSpinner.classList.remove('hidden');

    try {
        await updateDoc(doc(db, "app_config", "main_config"), { rateHBA, rateTax });
        showModal("Đã lưu cài đặt thành công!", "Thành công");
    } catch (error) {
        showModal(`Lỗi lưu cài đặt: ${error.message}`, "Lỗi");
    } finally {
        saveSettingsButton.disabled = false;
        settingsSpinner.classList.add('hidden');
    }
});

releaseUpdateButton.addEventListener('click', async () => {
    // Chỉ admin mới có nút này nhờ class admin-only
    const confirmRelease = await showCustomConfirm("Bạn có chắc chắn muốn phát hành bản cập nhật mới? Hành động này sẽ ép TẤT CẢ trình duyệt của nhân viên tải lại trang ngay lập tức.");
    if (!confirmRelease) return;

    releaseUpdateButton.disabled = true;
    releaseSpinner.classList.remove('hidden');

    const newVersion = Date.now();

    try {
        await updateDoc(doc(db, "app_config", "main_config"), { appVersion: newVersion });
        // Không cần hiện thông báo ở đây vì onSnapshot sẽ catch được appVersion mới và reload luôn trang này.
    } catch (error) {
        showModal(`Lỗi phát hành cập nhật: ${error.message}`, "Lỗi");
        releaseUpdateButton.disabled = false;
        releaseSpinner.classList.add('hidden');
    }
});


// --- NGHIỆP VỤ BƯỚC 2b: QUẢN LÝ GÓI HỌC ---

const loadGoiHoc = () => {
    if (unsubGoiHoc) unsubGoiHoc();
    const q = query(collection(db, "goi_hoc"));
    unsubGoiHoc = onSnapshot(q, (querySnapshot) => {
        globalGoiHocList = [];
        querySnapshot.forEach((doc) => {
            globalGoiHocList.push({ id: doc.id, ...doc.data() });
        });
        renderGoiHocTable();
        setupGhiDanhTab();
    });
};

const renderGoiHocTable = () => {
    if (!goiHocTableBody) return;
    if (globalGoiHocList.length === 0) {
        goiHocTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Chưa có gói học nào.</td></tr>`;
        return;
    }

    goiHocTableBody.innerHTML = globalGoiHocList.map(goi => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${goi.tenGoi}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${goi.soBuoi}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(goi.hocPhi)} VNĐ</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${goi.thoiHan} ngày</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium admin-only">
                <button data-id="${goi.id}" class="edit-goi-hoc-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${goi.id}" data-name="${goi.tenGoi}" class="delete-goi-hoc-btn text-red-600 hover:text-red-900 ml-4">Xoá</button>
            </td>
        </tr>
    `).join('');
};

const openGoiHocModal = (goi = null) => {
    goiHocForm.reset();
    if (goi) {
        goiHocModalTitle.textContent = "Sửa Gói Học";
        goiHocIdInput.value = goi.id;
        goiHocTenInput.value = goi.tenGoi;
        goiHocSoBuoiInput.value = goi.soBuoi;
        goiHocHocPhiInput.value = goi.hocPhi;
        goiHocThoiHanInput.value = goi.thoiHan;
    } else {
        goiHocModalTitle.textContent = "Thêm Gói Học Mới";
        goiHocIdInput.value = "";
    }
    goiHocModal.classList.remove('hidden');
    setTimeout(() => goiHocModal.classList.add('flex'), 10);
};

const closeGoiHocModal = () => {
    goiHocModal.classList.remove('flex');
    setTimeout(() => goiHocModal.classList.add('hidden'), 300);
};
addGoiHocButton.addEventListener('click', () => openGoiHocModal());
goiHocCancelButton.addEventListener('click', closeGoiHocModal);

goiHocForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = goiHocIdInput.value;
    const data = {
        tenGoi: goiHocTenInput.value,
        soBuoi: parseInt(goiHocSoBuoiInput.value) || 0,
        hocPhi: parseInt(goiHocHocPhiInput.value) || 0,
        thoiHan: parseInt(goiHocThoiHanInput.value) || 0,
    };

    try {
        if (id) {
            await setDoc(doc(db, "goi_hoc", id), data);
        } else {
            await addDoc(collection(db, "goi_hoc"), data);
        }
        closeGoiHocModal();
        showModal("Đã lưu gói học thành công!", "Thành công");
    } catch (error) {
        showModal(`Lỗi: ${error.message}`, "Lỗi");
    }
});

goiHocTableBody.addEventListener('click', (e) => {
    const target = e.target;
    const id = target.dataset.id;
    
    if (target.classList.contains('edit-goi-hoc-btn')) {
        const goi = globalGoiHocList.find(g => g.id === id);
        if (goi) openGoiHocModal(goi);
    }
    
    if (target.classList.contains('delete-goi-hoc-btn')) {
        const name = target.dataset.name;
        showDeleteModal('goi_hoc', id, name);
    }
});


// --- NGHIỆP VỤ BƯỚC 2c: QUẢN LÝ HLV (ĐÃ SỬA CHO SOFT DELETE) ---

const loadHLV = () => {
    if (unsubHLV) unsubHLV();
    const q = query(collection(db, "hlv"));
    unsubHLV = onSnapshot(q, (querySnapshot) => {
        globalHLVList = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const isActive = data.active !== false; 
            globalHLVList.push({ 
                id: doc.id, 
                ...data,
                active: isActive,
                soHVHienTai: 0,
                soHV_6_8: 0,
                soHV_gt_8: 0
            });
        });
        renderHLVTable();
        setupGhiDanhTab();
        updateHLVCounters();
    });
};

const renderHLVTable = () => {
    if (!hlvTableBody) return;
    if (globalHLVList.length === 0) {
        hlvTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Chưa có HLV nào.</td></tr>`;
        return;
    }

    const sortedList = [...globalHLVList].sort((a, b) => (a.thuTuUuTien || 99) - (b.thuTuUuTien || 99));

    hlvTableBody.innerHTML = sortedList.map(hlv => {
        const rowClass = hlv.active ? '' : 'inactive-row';
        const statusText = hlv.active ? '<span class="text-green-600 font-bold">Đang làm</span>' : '<span class="text-gray-500 italic">Đã nghỉ</span>';
        const btnText = hlv.active ? 'Vô hiệu hóa' : 'Kích hoạt lại';
        const btnColor = hlv.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900';
        
        return `
        <tr class="hover:bg-gray-50 ${rowClass}">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hlv.tenHLV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.caDay}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${hlv.loaiHLV === 'Tự động' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${hlv.loaiHLV}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.thuTuUuTien || 99}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${hlv.soHVHienTai || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${statusText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium admin-only">
                <button data-id="${hlv.id}" class="edit-hlv-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${hlv.id}" data-name="${hlv.tenHLV}" data-active="${hlv.active}" class="delete-hlv-btn ${btnColor} ml-4">${btnText}</button>
            </td>
        </tr>
    `}).join('');
};

const openHLVModal = (hlv = null) => {
    hlvForm.reset();
    hlvUuTienInput.value = "99";
    if (hlv) {
        hlvModalTitle.textContent = "Sửa Thông Tin HLV";
        hlvIdInput.value = hlv.id;
        hlvTenInput.value = hlv.tenHLV;
        hlvCaDaySelect.value = hlv.caDay;
        hlvLoaiSelect.value = hlv.loaiHLV;
        hlvUuTienInput.value = hlv.thuTuUuTien || 99;
    } else {
        hlvModalTitle.textContent = "Thêm HLV Mới";
        hlvIdInput.value = "";
    }
    hlvModal.classList.remove('hidden');
    setTimeout(() => hlvModal.classList.add('flex'), 10);
};

const closeHLVModal = () => {
    hlvModal.classList.remove('flex');
    setTimeout(() => hlvModal.classList.add('hidden'), 300);
};
addHLVButton.addEventListener('click', () => openHLVModal());
hlvCancelButton.addEventListener('click', closeHLVModal);

hlvForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = hlvIdInput.value;
    const data = {
        tenHLV: hlvTenInput.value,
        caDay: hlvCaDaySelect.value,
        loaiHLV: hlvLoaiSelect.value,
        thuTuUuTien: parseInt(hlvUuTienInput.value) || 99,
        active: true 
    };

    try {
        if (id) {
            await setDoc(doc(db, "hlv", id), data, { merge: true }); 
        } else {
            await addDoc(collection(db, "hlv"), data);
        }
        closeHLVModal();
        showModal("Đã lưu HLV thành công!", "Thành công");
    } catch (error) {
        showModal(`Lỗi: ${error.message}`, "Lỗi");
    }
});

hlvTableBody.addEventListener('click', (e) => {
    const target = e.target;
    const id = target.dataset.id;
    
    if (target.classList.contains('edit-hlv-btn')) {
        const hlv = globalHLVList.find(h => h.id === id);
        if (hlv) openHLVModal(hlv);
    }
    
    if (target.classList.contains('delete-hlv-btn')) {
        const hlv = globalHLVList.find(h => h.id === id);
        showDeleteModal('hlv', id, hlv.tenHLV, hlv.active);
    }
});


// --- NGHIỆP VỤ BƯỚC 3a: GHI DANH & THUẬT TOÁN ---

const loadHocVien = () => {
    if (unsubHocVien) unsubHocVien();
    const q = query(collection(db, "hocvien"));
    unsubHocVien = onSnapshot(q, (querySnapshot) => {
        globalHocVienList = [];
        querySnapshot.forEach((doc) => {
            globalHocVienList.push({ id: doc.id, ...doc.data() });
        });
        
        updateHLVCounters();
        applyHocVienFilterAndRender();
        updateQuickReport();
    });
};

const updateHLVCounters = () => {
    if (globalHLVList.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const hlv of globalHLVList) {
        hlv.soHVHienTai = 0;
        hlv.soHV_6_8 = 0;
        hlv.soHV_gt_8 = 0;
    }

    for (const hv of globalHocVienList) {
        const hlv = globalHLVList.find(h => h.id === hv.hlvId);
        if (!hlv) continue;
        
        const ngayHetHan = hv.ngayHetHan.toDate();
        if (ngayHetHan >= today) {
            hlv.soHVHienTai++;
            if (hv.nhomTuoi === '6-8') {
                hlv.soHV_6_8++;
            } else if (hv.nhomTuoi === '>8') {
                hlv.soHV_gt_8++;
            }
        }
    }
    
    renderHLVTable();
};

const setupGhiDanhTab = () => {
    goiHocSelect.innerHTML = '<option value="">-- Chọn gói học --</option>';
    for (const goi of globalGoiHocList) {
        goiHocSelect.innerHTML += `<option value="${goi.id}">${goi.tenGoi} (${formatCurrency(goi.hocPhi)} VNĐ)</option>`;
    }

    const hlvChiDinhList = globalHLVList.filter(hlv => hlv.loaiHLV === 'Chỉ Định' && hlv.active !== false);
    hlvChiDinhSelect.innerHTML = '<option value="">-- Chọn HLV --</option>';
    for (const hlv of hlvChiDinhList) {
        hlvChiDinhSelect.innerHTML += `<option value="${hlv.id}">${hlv.tenHLV} (${hlv.caDay})</option>`;
    }
};

goiHocSelect.addEventListener('change', () => {
    const goiId = goiHocSelect.value;
    const goi = globalGoiHocList.find(g => g.id === goiId);
    if (goi) {
        displayHocPhi.textContent = `${formatCurrency(goi.hocPhi)} VNĐ`;
        // Auto-fill toàn bộ học phí vào ô Tiền mặt mặc định
        ttTienMatInput.value = goi.hocPhi;
        ttChuyenKhoanInput.value = 0;
        ttQuetTheInput.value = 0;
    } else {
        displayHocPhi.textContent = `0 VNĐ`;
        ttTienMatInput.value = 0;
        ttChuyenKhoanInput.value = 0;
        ttQuetTheInput.value = 0;
    }
    updateGhiDanhTTStatus();
    autoSelectHLV();
});

// Lắng nghe sự kiện nhập tiền trên 3 ô thanh toán (Form Ghi Danh)
const updateGhiDanhTTStatus = () => {
    const goiId = goiHocSelect.value;
    const goi = globalGoiHocList.find(g => g.id === goiId);
    const hocPhi = goi ? goi.hocPhi : 0;
    const tm = parseInt(ttTienMatInput.value) || 0;
    const ck = parseInt(ttChuyenKhoanInput.value) || 0;
    const qt = parseInt(ttQuetTheInput.value) || 0;
    updateTTStatus(ttStatusDiv, tm, ck, qt, hocPhi);
};
ttTienMatInput.addEventListener('input', updateGhiDanhTTStatus);
ttChuyenKhoanInput.addEventListener('input', updateGhiDanhTTStatus);
ttQuetTheInput.addEventListener('input', updateGhiDanhTTStatus);

chkChiDinh.addEventListener('change', () => {
    if (chkChiDinh.checked) {
        chiDinhDropdownContainer.classList.remove('hidden');
        displayHLV.textContent = "-- Đang Chỉ Định --";
    } else {
        chiDinhDropdownContainer.classList.add('hidden');
        hlvChiDinhSelect.value = "";
        autoSelectHLV();
    }
});
caHocSelect.addEventListener('change', autoSelectHLV);
ngaySinhInput.addEventListener('change', autoSelectHLV);
hlvChiDinhSelect.addEventListener('change', () => {
    if (chkChiDinh.checked) {
        const hlv = globalHLVList.find(h => h.id === hlvChiDinhSelect.value);
        displayHLV.textContent = hlv ? hlv.tenHLV : "-- Chờ --";
    }
});


// THUẬT TOÁN CHIA HLV 3 VÒNG
function findBestHLV(caDay, nhomTuoi) {
    let candidates = globalHLVList.filter(hlv => 
        hlv.caDay === caDay && hlv.loaiHLV === 'Tự động' && hlv.active !== false
    );
    
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Vòng 1
    let minSoHV = Math.min(...candidates.map(h => h.soHVHienTai));
    candidates = candidates.filter(hlv => hlv.soHVHienTai === minSoHV);
    if (candidates.length === 1) return candidates[0];

    // Vòng 2
    const keyNhomTuoi = (nhomTuoi === '6-8') ? 'soHV_6_8' : 'soHV_gt_8';
    let minNhomTuoi = Math.min(...candidates.map(h => h[keyNhomTuoi]));
    candidates = candidates.filter(hlv => hlv[keyNhomTuoi] === minNhomTuoi);
    if (candidates.length === 1) return candidates[0];

    // Vòng 3
    let minUuTien = Math.min(...candidates.map(h => h.thuTuUuTien || 99));
    candidates = candidates.filter(hlv => (hlv.thuTuUuTien || 99) === minUuTien);

    return candidates[0]; 
};

function autoSelectHLV() {
    if (chkChiDinh.checked) return;
    const hlv = findBestHLV(caHocSelect.value, calculateNhomTuoi(ngaySinhInput.value));
    displayHLV.textContent = hlv ? hlv.tenHLV : "Không tìm thấy HLV phù hợp";
};

ghiDanhForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tenHV = tenHVInput.value.trim();
    const sdtHV = sdtHVInput.value.trim();
    const goiHocId = goiHocSelect.value;
    const caHoc = caHocSelect.value;
    const ngaySinh = ngaySinhInput.value;
    const nhomTuoi = calculateNhomTuoi(ngaySinh);
    const age = calculateAge(ngaySinh);
    let ghiChu = "";
    
    if (age !== null && age < 6) {
        if (!(await showCustomConfirm("Học viên dưới 6 tuổi, Bạn có muốn đăng ký?"))) {
            ghiDanhSubmitButton.disabled = false;
            ghiDanhSpinner.classList.add('hidden');
            return;
        }
        ghiChu = "Học viên dưới 6 tuổi";
    }

    if (!tenHV || !sdtHV || !goiHocId) {
        showModal("Vui lòng điền đầy đủ thông tin bắt buộc.", "Thiếu thông tin");
        return;
    }

    // Thu thập và validate thanh toán kết hợp
    const tienMat = parseInt(ttTienMatInput.value) || 0;
    const chuyenKhoan = parseInt(ttChuyenKhoanInput.value) || 0;
    const quetThe = parseInt(ttQuetTheInput.value) || 0;
    const goiHocCheck = globalGoiHocList.find(g => g.id === goiHocId);
    const tongNhap = tienMat + chuyenKhoan + quetThe;

    if (!goiHocCheck || tongNhap !== goiHocCheck.hocPhi) {
        showModal(`Tổng thanh toán (${formatCurrency(tongNhap)} VNĐ) chưa khớp với Học phí (${formatCurrency(goiHocCheck ? goiHocCheck.hocPhi : 0)} VNĐ). Vui lòng kiểm tra lại.\nKhông cho phép công nợ.`, "Lỗi thanh toán");
        return;
    }

    const thanhToanChiTiet = buildThanhToanChiTiet(tienMat, chuyenKhoan, quetThe);
    const hinhThucThanhToan = buildHTTTSummary(thanhToanChiTiet);
    
    ghiDanhSubmitButton.disabled = true;
    ghiDanhSpinner.classList.remove('hidden');

    try {
        const goiHoc = goiHocCheck;
        if (!goiHoc) throw new Error("Gói học không hợp lệ.");

        let hlvDuocChon = null;
        if (chkChiDinh.checked) {
            const hlvId = hlvChiDinhSelect.value;
            if (!hlvId) throw new Error("Vui lòng chọn HLV chỉ định.");
            hlvDuocChon = globalHLVList.find(h => h.id === hlvId);
        } else {
            hlvDuocChon = findBestHLV(caHoc, nhomTuoi);
        }
        if (!hlvDuocChon) throw new Error("Không tìm thấy HLV phù hợp.");

        const today = new Date();
        const ngayHetHan = new Date(today);
        ngayHetHan.setDate(today.getDate() + goiHoc.thoiHan);

        const hocPhi = goiHoc.hocPhi;
        const rateHBA = globalRateHBA / 100;
        const rateTax = globalRateTax / 100;
        const hbaNhan = hocPhi * rateHBA;
        const tongHoaHong = hocPhi - hbaNhan;
        const thue = tongHoaHong * rateTax;
        const hlvThucNhan = tongHoaHong - thue;

        const hocVienData = {
            tenHV, sdtHV, ngaySinh, nhomTuoi, caHoc, ghiChu,
            hinhThucThanhToan,
            thanhToanChiTiet,
            maThe: maTheInput.value.trim(),
            soPhieuThu: soPhieuThuInput.value.trim(),
            goiHocId: goiHocId,
            tenGoiHoc: goiHoc.tenGoi,
            soBuoi: goiHoc.soBuoi,
            soBuoiDaHoc: 0,
            hocPhi: hocPhi,
            hlvId: hlvDuocChon.id,
            tenHLV: hlvDuocChon.tenHLV,
            ngayGhiDanh: Timestamp.fromDate(today),
            ngayHetHan: Timestamp.fromDate(ngayHetHan),
            thoiHan: goiHoc.thoiHan,
            hbaNhan, tongHoaHong, thue, hlvThucNhan,
            nguoiGhiDanhId: currentUser.uid,
            nguoiGhiDanhEmail: currentUser.email,
        };
        
        const docRef = await addDoc(collection(db, "hocvien"), hocVienData);
        
        showModal(`Đã ghi danh thành công cho học viên "${tenHV}".\nHLV phụ trách: ${hlvDuocChon.tenHLV}.`, "Thành công");
        
        lastRegisteredHocVien = { id: docRef.id, ...hocVienData };
        ghiDanhPrintButton.disabled = false;
    } catch (error) {
        showModal(`Lỗi khi ghi danh: ${error.message}`, "Lỗi");
    } finally {
        ghiDanhSubmitButton.disabled = false;
        ghiDanhSpinner.classList.add('hidden');
    }
});

const resetGhiDanhForm = () => {
    ghiDanhForm.reset();
    displayHocPhi.textContent = "0 VNĐ";
    displayHLV.textContent = "-- Chờ --";
    ghiDanhPrintButton.disabled = true;
    lastRegisteredHocVien = null;
    chiDinhDropdownContainer.classList.add('hidden');
    ttTienMatInput.value = 0;
    ttChuyenKhoanInput.value = 0;
    ttQuetTheInput.value = 0;
    ttStatusDiv.textContent = 'Tổng: 0 / Học phí: 0 VNĐ';
    ttStatusDiv.className = 'text-sm font-semibold text-gray-500 text-right';
    autoSelectHLV();
};
ghiDanhResetButton.addEventListener('click', resetGhiDanhForm);

// --- HÀM IN PHIẾU DÙNG CHUNG (MỚI) ---
const printReceipt = (hv) => {
    if (!hv) return;

    // Xử lý ngày tháng an toàn
    const ngayGhiDanh = (hv.ngayGhiDanh && hv.ngayGhiDanh.toDate) ? hv.ngayGhiDanh.toDate() : new Date(hv.ngayGhiDanh);
    const ngayHetHan = (hv.ngayHetHan && hv.ngayHetHan.toDate) ? hv.ngayHetHan.toDate() : new Date(hv.ngayHetHan);
    
    // Logic xác định ca trực
    const gioGhiDanh = ngayGhiDanh.getHours();
    const nguoiLapPhieu = gioGhiDanh < 12 ? "Lễ tân ca sáng" : "Lễ tân ca chiều";
    
    const printContent = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
            <h5>Hồ bơi HBA Phú Lâm</h5>
        </div>
        <h2 id="print-title">PHIẾU GHI DANH HỌC BƠI</h2>
        <div id="print-details">
            <p><strong>Ngày giờ ghi danh:</strong> ${formatDateTimeForDisplay(ngayGhiDanh)}</p>
            <p><strong>Mã HV:</strong> ${hv.maThe || hv.id.substring(0, 10).toUpperCase()}</p>
            <p><strong>Số phiếu thu:</strong> ${hv.soPhieuThu || 'N/A'}</p>
            <p><strong>Hình thức TT:</strong> ${formatThanhToanDisplay(hv)}</p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
            <p><strong>Họ tên học viên:</strong> ${hv.tenHV}</p>
            <p><strong>Số điện thoại:</strong> ${hv.sdtHV}</p>
            <p><strong>Gói học:</strong> ${hv.tenGoiHoc} (${hv.soBuoi} buổi)</p>
            <p><strong>HLV phụ trách:</strong> ${hv.tenHLV}</p>
            <p><strong>Học phí:</strong> ${formatCurrency(hv.hocPhi)} VNĐ</p>
            <p><strong>Ngày hết hạn:</strong> ${formatDateForDisplay(ngayHetHan)}</p>
        </div>
        <div style="border: 2px solid #000000; padding: 10px; margin-top: 20px; text-align: center; color: #000000;">
    <p style="margin-bottom: 5px; bold; font-size: 16px;">
        Phiếu đã in không được phép sửa/xóa, mọi thay đổi vui lòng liên hệ hotline <strong>0909932627</strong> để được hỗ trợ.
    </p>
    <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: 15px;">
        LỄ TÂN VÀ HUẤN LUYỆN VIÊN KHÔNG ĐƯỢC THAY ĐỔI THÔNG TIN TRÊN PHIẾU
    </p>
</div>
        <div id="print-signatures">
            <div class="signature-box">
                <p><strong>Học viên</strong></p>
                <p>(Ký, họ tên)</p>
            </div>
            <div class="signature-box">
                <p><strong>HLV phụ trách</strong></p>
                <p>(Ký, họ tên)</p>
            </div>
            <div class="signature-box">
                <p><strong>${nguoiLapPhieu}</strong></p>
                <p>(Ký, họ tên)</p>
            </div>
        </div>
    `;
    
    printSection.innerHTML = printContent;
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing');
        printSection.classList.add('hidden');
    }, 250);
};

// Cập nhật hàm cũ để dùng hàm chung
const handlePrintPhieu = () => {
    if (!lastRegisteredHocVien) {
        showModal("Không có thông tin học viên để in.", "Lỗi");
        return;
    }
    printReceipt(lastRegisteredHocVien); 
    resetGhiDanhForm();
};
ghiDanhPrintButton.addEventListener('click', handlePrintPhieu);


// --- (MỚI) "DAILY REPORT" CHO LỄ TÂN (TAB GHI DANH) ---

// Hàm update báo cáo nhanh dựa trên bộ lọc ngày
const updateQuickReport = (startDate = null, endDate = null) => {
    const now = new Date();
    
    // Mặc định là "Hôm nay" nếu không truyền tham số
    let start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Đảm bảo end bao gồm hết ngày
    if (endDate) end.setHours(23, 59, 59);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let doanhThuLoc = 0;
    let doanhThuThangNay = 0;
    let soHVLoc = 0;
    let soHVThangNay = 0;
    let danhSachHVLocHTML = '';
    
    quickReportData = []; // Reset dữ liệu báo cáo

    globalHocVienList.forEach((hv, index) => {
        const ngayGhiDanh = hv.ngayGhiDanh.toDate();
        
        // Tính toán cho bộ lọc (Ngày/Khoảng ngày)
        if (ngayGhiDanh >= start && ngayGhiDanh <= end) {
            doanhThuLoc += hv.hocPhi;
            soHVLoc++;
            quickReportData.push(hv); 

            // Tạo hàng bảng (9 cột)
            danhSachHVLocHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${soHVLoc}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.soPhieuThu || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.maThe || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hv.tenHV}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.sdtHV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatNgaySinhStr(hv.ngaySinh)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenHLV}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenGoiHoc}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${formatCurrency(hv.hocPhi)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatThanhToanDisplay(hv)}</td>
                </tr>
            `;
        }
        
        // Tính toán cho Tháng này (Luôn hiển thị)
        if (ngayGhiDanh >= startOfMonth) {
            doanhThuThangNay += hv.hocPhi;
            soHVThangNay++;
        }
    });
    
    // Cập nhật UI
    qrDtNgay.textContent = `${formatCurrency(doanhThuLoc)} VNĐ`;
    qrDtThang.textContent = `${formatCurrency(doanhThuThangNay)} VNĐ`;
    qrHvNgay.textContent = soHVLoc;
    qrHvThang.textContent = soHVThangNay;
    
    if (soHVLoc === 0) {
        qrHvTableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu trong khoảng thời gian này.</td></tr>`;
    } else {
        qrHvTableBody.innerHTML = danhSachHVLocHTML;
    }
};

// Xử lý sự kiện lọc ngày cho Daily Report
if (document.getElementById('qr-view-btn')) {
    document.getElementById('qr-view-btn').addEventListener('click', () => {
        const fromDate = document.getElementById('qr-date-from').value;
        const toDate = document.getElementById('qr-date-to').value;
        if (fromDate && toDate) {
            updateQuickReport(fromDate, toDate);
        } else {
            showModal("Vui lòng chọn đầy đủ Từ ngày và Đến ngày.", "Lỗi");
        }
    });
}

// In Báo cáo nhanh (ĐÃ CẬP NHẬT: Quẹt thẻ)
const handlePrintQuickReport = () => {
    if (quickReportData.length === 0) {
        showModal("Không có dữ liệu để in.", "Lỗi");
        return;
    }
    
    let totalTienMat = 0;
    let totalChuyenKhoan = 0;
    let totalQuetThe = 0; // MỚI
    let totalDoanhThu = 0;

    const tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 6px;">STT</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Số phiếu thu</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Mã thẻ</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Tên Học Viên</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">SĐT</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Ngày Sinh</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">HLV</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Gói Học</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Doanh thu</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">HTTT</th>
                </tr>
            </thead>
            <tbody>
                ${quickReportData.map((hv, index) => {
                    const tien = getTienTheoHTTT(hv);
                    totalTienMat += tien.tienMat;
                    totalChuyenKhoan += tien.chuyenKhoan;
                    totalQuetThe += tien.quetThe;
                    totalDoanhThu += hv.hocPhi;
                    
                    return `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 6px;">${index + 1}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.soPhieuThu || ''}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.maThe || ''}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHV}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.sdtHV}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${formatNgaySinhStr(hv.ngaySinh)}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHLV}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenGoiHoc}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${formatCurrency(hv.hocPhi)}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${formatThanhToanDisplay(hv)}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;

    const dateLabel = document.getElementById('qr-date-from') && document.getElementById('qr-date-from').value 
        ? `${formatDateForDisplay(new Date(document.getElementById('qr-date-from').value))}` 
        : formatDateForDisplay(new Date());

    const printContent = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
        </div>
        <h2 id="print-title">BÁO CÁO DOANH THU HỌC BƠI NGÀY ${dateLabel}</h2>
        ${tableHTML}
        <div id="print-qr-summary" style="margin-top: 20px; font-size: 12pt; text-align: right;">
            <p>Tổng Tiền mặt: <strong>${formatCurrency(totalTienMat)} VNĐ</strong></p>
            <p>Tổng Chuyển khoản: <strong>${formatCurrency(totalChuyenKhoan)} VNĐ</strong></p>
            <p>Tổng Quẹt thẻ: <strong>${formatCurrency(totalQuetThe)} VNĐ</strong></p> <p style="font-size: 14pt;">TỔNG CỘNG: <strong>${formatCurrency(totalDoanhThu)} VNĐ</strong></p>
        </div>
        <div id="print-qr-signatures" style="display: flex; justify-content: space-around; margin-top: 50px;">
            <div style="text-align: center;"><p><strong>Người lập phiếu</strong></p><p style="margin-top: 5px;">(Ký, họ tên)</p><div style="height: 60px;"></div></div>
            <div style="text-align: center;"><p><strong>Kế toán</strong></p><p style="margin-top: 5px;">(Ký, họ tên)</p><div style="height: 60px;"></div></div>
            <div style="text-align: center;"><p><strong>Giám đốc</strong></p><p style="margin-top: 5px;">(Ký, họ tên)</p><div style="height: 60px;"></div></div>
        </div>
    `;
    
    printSection.innerHTML = printContent;
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing');
        printSection.classList.add('hidden');
    }, 250);
};
if(qrPrintBtn) qrPrintBtn.addEventListener('click', handlePrintQuickReport);

// Xuất Excel Báo cáo nhanh (ĐÃ CẬP NHẬT: Quẹt thẻ)
const handleExportQuickReport = () => {
    if (quickReportData.length === 0) {
        showModal("Không có dữ liệu để xuất Excel.", "Lỗi");
        return;
    }

    try {
        let totalTienMat = 0, totalChuyenKhoan = 0, totalQuetThe = 0, totalDoanhThu = 0;
        const dateLabel = document.getElementById('qr-date-from') && document.getElementById('qr-date-from').value 
            ? `${formatDateForDisplay(new Date(document.getElementById('qr-date-from').value))}` 
            : formatDateForDisplay(new Date());

        const dataForSheet = [
            [`BÁO CÁO DOANH THU HỌC BƠI NGÀY ${dateLabel}`],
            [],
            ["STT", "Số phiếu thu", "Mã thẻ", "Tên Học Viên", "SĐT", "Ngày Sinh", "HLV Phụ Trách", "Gói Học", "Doanh thu", "Hình thức TT"]
        ];

        quickReportData.forEach((hv, index) => {
            const tien = getTienTheoHTTT(hv);
            totalTienMat += tien.tienMat;
            totalChuyenKhoan += tien.chuyenKhoan;
            totalQuetThe += tien.quetThe;
            totalDoanhThu += hv.hocPhi;

            dataForSheet.push([
                index + 1, hv.soPhieuThu, hv.maThe, hv.tenHV, hv.sdtHV, formatNgaySinhStr(hv.ngaySinh), hv.tenHLV, hv.tenGoiHoc, hv.hocPhi, formatThanhToanDisplay(hv)
            ]);
        });
        
        dataForSheet.push([]);
        dataForSheet.push(["", "", "", "", "", "", "Tổng Tiền mặt:", totalTienMat]);
        dataForSheet.push(["", "", "", "", "", "", "Tổng Chuyển khoản:", totalChuyenKhoan]);
        dataForSheet.push(["", "", "", "", "", "", "Tổng Quẹt thẻ:", totalQuetThe]); // MỚI
        dataForSheet.push(["", "", "", "", "", "", "TỔNG CỘNG:", totalDoanhThu]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];

        XLSX.utils.book_append_sheet(wb, ws, 'DailyReport');
        XLSX.writeFile(wb, `BaoCaoNgay_${dateLabel.replace(/\//g, '-')}.xlsx`);

    } catch (error) {
        showModal(`Lỗi xuất Excel: ${error.message}`, "Lỗi");
    }
};
if(qrExcelBtn) qrExcelBtn.addEventListener('click', handleExportQuickReport);


// --- (MỚI) NGHIỆP VỤ BƯỚC 3b: QUẢN LÝ HỌC VIÊN ---

const applyHocVienFilterAndRender = () => {
    let list = [...globalHocVienList];
    const now = new Date();
    
    if (currentHVFilter === 'thangnay') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        list = list.filter(hv => hv.ngayGhiDanh.toDate() >= startOfMonth);
    } else if (currentHVFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        list = list.filter(hv => hv.ngayGhiDanh.toDate() >= startOfToday);
    } else if (currentHVFilter === 'custom') { // --- LOGIC MỚI: LỌC TÙY CHỈNH ---
        const fromDateVal = hvDateFromInput.value;
        const toDateVal = hvDateToInput.value;
        
        if (fromDateVal && toDateVal) {
            const startDate = new Date(fromDateVal);
            const endDate = new Date(toDateVal);
            endDate.setHours(23, 59, 59); // Lấy hết ngày cuối cùng
            
            list = list.filter(hv => {
                const nd = hv.ngayGhiDanh.toDate();
                return nd >= startDate && nd <= endDate;
            });
        }
    }
    
    const searchTerm = hvSearchInput.value.toLowerCase().trim();
    if (searchTerm) {
        list = list.filter(hv => 
            hv.tenHV.toLowerCase().includes(searchTerm) ||
            hv.sdtHV.includes(searchTerm) ||
            (hv.maThe && hv.maThe.toLowerCase().includes(searchTerm))
        );
    }
    
    list.sort((a, b) => b.ngayGhiDanh.toDate() - a.ngayGhiDanh.toDate());
    filteredHocVienList = list;
    renderHocVienTable();
};

// Thay thế hàm renderHocVienTable cũ trong file app.js

const renderHocVienTable = () => {
    if (!hocVienTableBody) return;
    
    if (filteredHocVienList.length === 0) {
        // Cập nhật colspan thành 8 vì đã thêm 1 cột
        hocVienTableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Không tìm thấy học viên nào.</td></tr>`;
        return;
    }
    
    hocVienTableBody.innerHTML = filteredHocVienList.map((hv, index) => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.maThe || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hv.tenHV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.sdtHV}</td>
            
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDateTimeForDisplay(hv.ngayGhiDanh)}</td>
            
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenHLV || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenGoiHoc}</td>
            
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium admin-only">
                <button data-id="${hv.id}" class="print-hocvien-btn text-yellow-600 hover:text-yellow-900 mr-4" title="In lại phiếu">In</button>
                <button data-id="${hv.id}" class="edit-hocvien-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${hv.id}" data-name="${hv.tenHV}" class="delete-hocvien-btn text-red-600 hover:text-red-900 ml-4">Xoá</button>
            </td>
        </tr>
    `).join('');
};

hvSearchInput.addEventListener('input', applyHocVienFilterAndRender);

const updateHVFilterButtons = (activeBtn) => {
    // Thêm filterBtnTuyChinh vào mảng nút
    const buttons = [filterBtnHomNay, filterBtnThangNay, filterBtnTatCa, filterBtnTuyChinh];
    buttons.forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
            btn.classList.add('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
        }
    });
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
        activeBtn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
    }
};

filterBtnHomNay.addEventListener('click', () => {
    currentHVFilter = 'today';
    hvCustomFilterContainer.classList.add('hidden'); // Ẩn khung chọn ngày
    updateHVFilterButtons(filterBtnHomNay);
    applyHocVienFilterAndRender();
});

filterBtnThangNay.addEventListener('click', () => {
    currentHVFilter = 'thangnay';
    hvCustomFilterContainer.classList.add('hidden'); // Ẩn khung chọn ngày
    updateHVFilterButtons(filterBtnThangNay);
    applyHocVienFilterAndRender();
});

filterBtnTatCa.addEventListener('click', () => {
    currentHVFilter = 'tatca';
    hvCustomFilterContainer.classList.add('hidden'); // Ẩn khung chọn ngày
    updateHVFilterButtons(filterBtnTatCa);
    applyHocVienFilterAndRender();
});

// --- SỰ KIỆN CHO NÚT TÙY CHỈNH ---
filterBtnTuyChinh.addEventListener('click', () => {
    currentHVFilter = 'custom';
    hvCustomFilterContainer.classList.remove('hidden'); // Hiện khung chọn ngày
    
    // Tự động điền ngày hôm nay nếu đang trống
    if (!hvDateFromInput.value) hvDateFromInput.value = formatDateForInput(new Date());
    if (!hvDateToInput.value) hvDateToInput.value = formatDateForInput(new Date());
    
    updateHVFilterButtons(filterBtnTuyChinh);
    // Chưa gọi apply ngay, đợi người dùng bấm nút "Lọc dữ liệu"
});

hvCustomApplyBtn.addEventListener('click', () => {
    if (!hvDateFromInput.value || !hvDateToInput.value) {
        showModal("Vui lòng chọn đầy đủ Từ ngày và Đến ngày.", "Thiếu thông tin");
        return;
    }
    applyHocVienFilterAndRender();
});

hocVienTableBody.addEventListener('click', (e) => {
    const target = e.target;
    const id = target.dataset.id;
    
    // --- BẮT SỰ KIỆN NÚT IN ---
    if (target.classList.contains('print-hocvien-btn')) {
        const hocvien = globalHocVienList.find(hv => hv.id === id);
        if (hocvien) {
            printReceipt(hocvien);
        }
    }
    // --------------------------

    if (target.classList.contains('edit-hocvien-btn')) {
        const hocvien = globalHocVienList.find(hv => hv.id === id);
        if (hocvien) openHocVienEditModal(hocvien);
    }
    
    if (target.classList.contains('delete-hocvien-btn')) {
        const name = target.dataset.name;
        showDeleteModal('hocvien', id, name);
    }
});

const openHocVienEditModal = (hocvien) => {
    hocVienEditForm.reset();
    hocVienEditIdInput.value = hocvien.id;
    hocVienEditThoiHanInput.value = hocvien.thoiHan; 
    
    hocVienEditTenInput.value = hocvien.tenHV;
    hocVienEditSdtInput.value = hocvien.sdtHV;
    hocVienEditNgaySinhInput.value = hocvien.ngaySinh || '';
    hocVienEditMaTheInput.value = hocvien.maThe || '';
    if(hocVienEditSoBuoiDaHocInput) hocVienEditSoBuoiDaHocInput.value = hocvien.soBuoiDaHoc || 0;
    hocVienEditPhieuThuInput.value = hocvien.soPhieuThu || '';
    hocVienEditGoiHocInput.value = hocvien.tenGoiHoc;
    editHocPhiValueInput.value = hocvien.hocPhi || 0;

    // Load thanh toán chi tiết vào 3 ô input
    const tien = getTienTheoHTTT(hocvien);
    editTtTienMatInput.value = tien.tienMat;
    editTtChuyenKhoanInput.value = tien.chuyenKhoan;
    editTtQuetTheInput.value = tien.quetThe;
    updateEditTTStatus();
    
    hocVienEditHLVInput.innerHTML = ''; 
    globalHLVList.forEach(hlv => {
        if (hlv.active !== false || hlv.id === hocvien.hlvId) {
             const option = document.createElement('option');
             option.value = hlv.id;
             option.textContent = `${hlv.tenHLV} (${hlv.caDay})`;
             if (hlv.active === false) option.textContent += ' (Đã nghỉ)';
             hocVienEditHLVInput.appendChild(option);
        }
    });
    hocVienEditHLVInput.value = hocvien.hlvId;
    
    hocVienEditNgayGhiInput.value = formatDateForInput(hocvien.ngayGhiDanh);
    hocVienEditNgayHetInput.value = formatDateForInput(hocvien.ngayHetHan);
    
    hocVienEditModal.classList.remove('hidden');
    setTimeout(() => hocVienEditModal.classList.add('flex'), 10);
};

// Lắng nghe sự kiện nhập tiền trên 3 ô thanh toán (Modal Sửa HV)
const updateEditTTStatus = () => {
    const hocPhi = parseInt(editHocPhiValueInput.value) || 0;
    const tm = parseInt(editTtTienMatInput.value) || 0;
    const ck = parseInt(editTtChuyenKhoanInput.value) || 0;
    const qt = parseInt(editTtQuetTheInput.value) || 0;
    updateTTStatus(editTtStatusDiv, tm, ck, qt, hocPhi);
};
editTtTienMatInput.addEventListener('input', updateEditTTStatus);
editTtChuyenKhoanInput.addEventListener('input', updateEditTTStatus);
editTtQuetTheInput.addEventListener('input', updateEditTTStatus);

const closeHocVienEditModal = () => {
    hocVienEditModal.classList.remove('flex');
    setTimeout(() => hocVienEditModal.classList.add('hidden'), 300);
};
hocVienEditCancelButton.addEventListener('click', closeHocVienEditModal);

hocVienEditNgayGhiInput.addEventListener('change', () => {
    try {
        const ngayGhiDanh = new Date(hocVienEditNgayGhiInput.value);
        const thoiHan = parseInt(hocVienEditThoiHanInput.value);
        if (isNaN(thoiHan)) return;

        const ngayHetHanMoi = new Date(ngayGhiDanh.getTime());
        ngayHetHanMoi.setDate(ngayGhiDanh.getDate() + thoiHan);
        
        hocVienEditNgayHetInput.value = formatDateForInput(ngayHetHanMoi);
    } catch (e) {
        console.error("Lỗi tính ngày hết hạn:", e);
    }
});

hocVienEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = hocVienEditIdInput.value;
    if (!id) return;

    // Validate thanh toán kết hợp
    const hocPhi = parseInt(editHocPhiValueInput.value) || 0;
    const tienMat = parseInt(editTtTienMatInput.value) || 0;
    const chuyenKhoan = parseInt(editTtChuyenKhoanInput.value) || 0;
    const quetThe = parseInt(editTtQuetTheInput.value) || 0;
    const tongNhap = tienMat + chuyenKhoan + quetThe;

    if (hocPhi > 0 && tongNhap !== hocPhi) {
        showModal(`Tổng thanh toán (${formatCurrency(tongNhap)} VNĐ) chưa khớp với Học phí (${formatCurrency(hocPhi)} VNĐ). Vui lòng kiểm tra lại.`, "Lỗi thanh toán");
        return;
    }

    const thanhToanChiTiet = buildThanhToanChiTiet(tienMat, chuyenKhoan, quetThe);
    const hinhThucThanhToan = buildHTTTSummary(thanhToanChiTiet);

    try {
        const ngayGhiDanhMoi = new Date(hocVienEditNgayGhiInput.value);
        const ngayHetHanMoi = new Date(hocVienEditNgayHetInput.value);
        
        const newHlvId = hocVienEditHLVInput.value;
        const newHlv = globalHLVList.find(h => h.id === newHlvId);
        if (!newHlv) throw new Error("HLV được chọn không hợp lệ.");
        const newHlvTen = newHlv.tenHLV;
        
        const hocVienCu = globalHocVienList.find(h => h.id === id);
        
        // Tính lại hoa hồng, thuế
        const rateHBA = globalRateHBA / 100;
        const rateTax = globalRateTax / 100;
        const hbaNhan = hocPhi * rateHBA;
        const tongHoaHong = hocPhi - hbaNhan;
        const thue = tongHoaHong * rateTax;
        const hlvThucNhan = tongHoaHong - thue;

        const dataToUpdate = {
            tenHV: hocVienEditTenInput.value.trim(),
            sdtHV: hocVienEditSdtInput.value.trim(),
            ngaySinh: hocVienEditNgaySinhInput.value,
            nhomTuoi: hocVienEditNgaySinhInput.value ? calculateNhomTuoi(hocVienEditNgaySinhInput.value) : (hocVienCu?.nhomTuoi || 'N/A'),
            maThe: hocVienEditMaTheInput.value.trim(),
            soPhieuThu: hocVienEditPhieuThuInput.value.trim(),
            soBuoiDaHoc: parseInt(hocVienEditSoBuoiDaHocInput ? hocVienEditSoBuoiDaHocInput.value : 0) || 0,
            hinhThucThanhToan,
            thanhToanChiTiet,
            ngayGhiDanh: Timestamp.fromDate(ngayGhiDanhMoi),
            ngayHetHan: Timestamp.fromDate(ngayHetHanMoi),
            hlvId: newHlvId,   
            tenHLV: newHlvTen,
            hocPhi: hocPhi,
            hbaNhan: hbaNhan,
            tongHoaHong: tongHoaHong,
            thue: thue,
            hlvThucNhan: hlvThucNhan
        };

        await updateDoc(doc(db, "hocvien", id), dataToUpdate);

        // --- GHI LOG HOẠT ĐỘNG ---
        if (currentUser) {
            try {
                let logDesc = `Đã sửa thông tin học viên: ${dataToUpdate.tenHV}.`;
                if (hocVienCu) {
                    if (hocVienCu.hlvId !== newHlvId) {
                        logDesc += ` Đổi HLV: ${hocVienCu.tenHLV || 'N/A'} -> ${newHlvTen}.`;
                    }
                    if (hocVienCu.hocPhi !== hocPhi) {
                        logDesc += ` Đổi Giá: ${formatCurrency(hocVienCu.hocPhi || 0)} -> ${formatCurrency(hocPhi)}.`;
                    }
                }
                
                await addDoc(collection(db, "activity_logs"), {
                    action: 'EDIT_STUDENT',
                    description: logDesc,
                    studentId: id,
                    studentName: dataToUpdate.tenHV,
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    timestamp: Timestamp.now()
                });
            } catch (logError) {
                console.error("Lỗi khi ghi log hoạt động:", logError);
            }
        }
        // -------------------------
        closeHocVienEditModal();
        showModal("Cập nhật thông tin học viên thành công!", "Thành công");
    } catch (error) {
        showModal(`Lỗi cập nhật: ${error.message}`, "Lỗi");
    }
});


// --- (MỚI) BƯỚC 4b/c: TAB BÁO CÁO ADMIN ---

const getReportDateRange = (filterType) => {
    const now = new Date();
    let startDate, endDate;
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (filterType === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filterType === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filterType === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else {
        startDate = new Date(reportStartDateInput.value);
        endDate = new Date(reportEndDateInput.value);
        endDate.setHours(23, 59, 59);
    }
    return { startDate, endDate };
};

const setupReportTabDefaults = () => {
    const { startDate, endDate } = getReportDateRange('this-month');
    reportStartDateInput.value = formatDateForInput(startDate);
    reportEndDateInput.value = formatDateForInput(endDate);
};

reportQuickFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        reportQuickFilterBtns.forEach(b => {
            b.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
            b.classList.add('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
        });
        
        targetBtn.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
        targetBtn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
        
        const filterType = targetBtn.id.replace('report-filter-', '');
        if (filterType === 'custom') {
            reportDateRangeContainer.classList.remove('hidden');
        } else {
            reportDateRangeContainer.classList.add('hidden');
            const { startDate, endDate } = getReportDateRange(filterType);
            reportStartDateInput.value = formatDateForInput(startDate);
            reportEndDateInput.value = formatDateForInput(endDate);
        }
    });
});

const generateReport = () => {
    reportSpinner.classList.remove('hidden');
    reportViewBtn.disabled = true;
    reportPrintBtn.disabled = true;
    reportExcelBtn.disabled = true;
    
    try {
        const reportType = reportTypeSelect.value;
        let filterType = 'custom'; 
        reportQuickFilterBtns.forEach(btn => {
            if (btn.classList.contains('bg-indigo-600')) {
                filterType = btn.id.replace('report-filter-', '');
            }
        });

        const { startDate, endDate } = getReportDateRange(filterType);
        
        if (isNaN(startDate) || isNaN(endDate)) throw new Error("Ngày không hợp lệ.");
        
        const filteredData = globalHocVienList.filter(hv => {
            const ngayGhiDanh = hv.ngayGhiDanh.toDate();
            return ngayGhiDanh >= startDate && ngayGhiDanh <= endDate;
        });

        currentReportData = filteredData;
        currentReportType = reportType;
        currentReportParams = { startDate, endDate };

        if (reportType === 'tongquan') {
            renderTongQuanReport(filteredData, startDate, endDate);
        } else if (reportType === 'hlv') {
            renderHLVReport(filteredData, startDate, endDate);
        } else if (reportType === 'doanhthu_chitiet') {
            renderDoanhThuChiTietReport(filteredData, startDate, endDate);
        }
        
        reportPrintBtn.disabled = false;
        reportExcelBtn.disabled = false; 

    } catch (error) {
        showModal(`Lỗi: ${error.message}`, "Lỗi");
        reportResultsContainer.innerHTML = `<p class="text-center text-red-500">Lỗi: ${error.message}</p>`;
    } finally {
        reportSpinner.classList.add('hidden');
        reportViewBtn.disabled = false;
    }
};
reportViewBtn.addEventListener('click', generateReport);


const renderTongQuanReport = (data, startDate, endDate) => {
    let totalRevenue = 0, totalHbaNhan = 0, totalHlvGross = 0, totalThue = 0, totalHlvNet = 0;
    
    data.forEach(hv => {
        totalRevenue += hv.hocPhi; totalHbaNhan += hv.hbaNhan; totalHlvGross += hv.tongHoaHong; totalThue += hv.thue; totalHlvNet += hv.hlvThucNhan;
    });
    
    const html = `
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Báo Cáo Tổng Quan</h3>
        <p class="text-sm text-gray-600 mb-4">
            Từ ngày: <span class="font-medium">${formatDateForDisplay(startDate)}</span> 
            Đến ngày: <span class="font-medium">${formatDateForDisplay(endDate)}</span>
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <span class="block text-sm font-medium text-blue-700">Tổng Doanh Thu</span>
                <span class="text-2xl font-bold text-blue-900">${formatCurrency(totalRevenue)} VNĐ</span>
            </div>
            <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
                <span class="block text-sm font-medium text-green-700">Tổng HV Mới</span>
                <span class="text-2xl font-bold text-green-900">${data.length}</span>
            </div>
            <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <span class="block text-sm font-medium text-yellow-700">HLV Thực Nhận (Net)</span>
                <span class="text-2xl font-bold text-yellow-900">${formatCurrency(totalHlvNet)} VNĐ</span>
            </div>
        </div>
        
        <div class="overflow-x-auto rounded-lg shadow">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chỉ số</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr class="hover:bg-gray-50"><td class="px-6 py-4 text-sm font-medium">Tổng Doanh Thu</td><td class="px-6 py-4 text-sm font-bold">${formatCurrency(totalRevenue)}</td></tr>
                    <tr class="hover:bg-gray-50"><td class="px-6 py-4 text-sm">HBA Nhận (${globalRateHBA}%)</td><td class="px-6 py-4 text-sm">${formatCurrency(totalHbaNhan)}</td></tr>
                    <tr class="hover:bg-gray-50"><td class="px-6 py-4 text-sm">Tổng Hoa Hồng HLV (Gross)</td><td class="px-6 py-4 text-sm">${formatCurrency(totalHlvGross)}</td></tr>
                    <tr class="hover:bg-gray-50"><td class="px-6 py-4 text-sm">Tổng Thuế TNCN (${globalRateTax}%)</td><td class="px-6 py-4 text-sm">${formatCurrency(totalThue)}</td></tr>
                    <tr class="hover:bg-gray-50"><td class="px-6 py-4 text-sm font-medium">Tổng HLV Thực Nhận (Net)</td><td class="px-6 py-4 text-sm font-bold">${formatCurrency(totalHlvNet)}</td></tr>
                </tbody>
            </table>
        </div>
    `;
    reportResultsContainer.innerHTML = html;
};

// CẬP NHẬT: Thêm cột Tổng Hoa Hồng
let currentHlvReportSort = { key: 'tongThucNhan', dir: -1 };

const renderHLVReport = (data, startDate, endDate) => {
    const reportByHLV = {};
    data.forEach(hv => {
        const hlvId = hv.hlvId;
        if (!hlvId) return;
        if (!reportByHLV[hlvId]) {
            const hlvObj = globalHLVList.find(h => h.id === hlvId);
            const caDay = hlvObj ? hlvObj.caDay : 'N/A';
            reportByHLV[hlvId] = { tenHLV: hv.tenHLV, caDay: caDay, soHVMoi: 0, soHV_6_8: 0, soHV_gt_8: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 };
        }
        reportByHLV[hlvId].soHVMoi++;
        reportByHLV[hlvId].tongDoanhThu += hv.hocPhi;
        reportByHLV[hlvId].tongHoaHong += hv.tongHoaHong; // CẬP NHẬT: Cộng dồn hoa hồng từ DB
        reportByHLV[hlvId].tongThue += hv.thue;
        if (hv.nhomTuoi === '6-8') reportByHLV[hlvId].soHV_6_8++;
        else if (hv.nhomTuoi === '>8') reportByHLV[hlvId].soHV_gt_8++;
        reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
    });

    let reportArray = Object.values(reportByHLV);
    
    reportArray.sort((a, b) => {
        const key = currentHlvReportSort.key;
        const dir = currentHlvReportSort.dir;
        let valA = a[key];
        let valB = b[key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });

    const getSortIcon = (key) => {
        if (currentHlvReportSort.key === key) {
            return currentHlvReportSort.dir === 1 ? '↑' : '↓';
        }
        return '↕';
    };

    const html = `
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Báo Cáo Thu Nhập HLV</h3>
        <p class="text-sm text-gray-600 mb-4">
            Từ ngày: <span class="font-medium">${formatDateForDisplay(startDate)}</span> 
            Đến ngày: <span class="font-medium">${formatDateForDisplay(endDate)}</span>
        </p>
        <div class="overflow-x-auto rounded-lg shadow">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" data-key="tenHLV" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Tên HLV <span class="text-gray-400 ml-1">${getSortIcon('tenHLV')}</span></th>
                        <th scope="col" data-key="caDay" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Ca Dạy <span class="text-gray-400 ml-1">${getSortIcon('caDay')}</span></th>
                        <th scope="col" data-key="soHV_6_8" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">6-8 tuổi <span class="text-gray-400 ml-1">${getSortIcon('soHV_6_8')}</span></th>
                        <th scope="col" data-key="soHV_gt_8" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">> 8 tuổi <span class="text-gray-400 ml-1">${getSortIcon('soHV_gt_8')}</span></th>
                        <th scope="col" data-key="soHVMoi" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Số HV Mới <span class="text-gray-400 ml-1">${getSortIcon('soHVMoi')}</span></th>
                        <th scope="col" data-key="tongDoanhThu" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Tổng Doanh Thu <span class="text-gray-400 ml-1">${getSortIcon('tongDoanhThu')}</span></th>
                        <th scope="col" data-key="tongHoaHong" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Tổng Hoa Hồng (Gross) <span class="text-gray-400 ml-1">${getSortIcon('tongHoaHong')}</span></th>
                        <th scope="col" data-key="tongThue" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Thuế Phải Nộp <span class="text-gray-400 ml-1">${getSortIcon('tongThue')}</span></th>
                        <th scope="col" data-key="tongThucNhan" class="hlv-sort-th cursor-pointer hover:bg-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none">Thực Nhận (Net) <span class="text-gray-400 ml-1">${getSortIcon('tongThucNhan')}</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${reportArray.length === 0 
                        ? `<tr><td colspan="9" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu.</td></tr>`
                        : reportArray.map(hlv => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hlv.tenHLV}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.caDay}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.soHV_6_8}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.soHV_gt_8}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.soHVMoi}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hlv.tongDoanhThu)} VNĐ</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">${formatCurrency(hlv.tongHoaHong)} VNĐ</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">${formatCurrency(hlv.tongThue)} VNĐ</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${formatCurrency(hlv.tongThucNhan)} VNĐ</td>
                            </tr>
                        `).join('')
                    }
                </tbody>
            </table>
        </div>
    `;
    reportResultsContainer.innerHTML = html;

    const ths = reportResultsContainer.querySelectorAll('.hlv-sort-th');
    ths.forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (currentHlvReportSort.key === key) {
                currentHlvReportSort.dir *= -1;
            } else {
                currentHlvReportSort.key = key;
                currentHlvReportSort.dir = -1;
            }
            renderHLVReport(data, startDate, endDate);
        });
    });
};

const renderDoanhThuChiTietReport = (data, startDate, endDate) => {
    data.sort((a, b) => a.ngayGhiDanh.toDate() - b.ngayGhiDanh.toDate());
    const totalRevenue = data.reduce((acc, hv) => acc + hv.hocPhi, 0);

    const html = `
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Báo Cáo Doanh Thu (Chi tiết)</h3>
        <p class="text-sm text-gray-600 mb-4">
            Từ ngày: <span class="font-medium">${formatDateForDisplay(startDate)}</span> 
            Đến ngày: <span class="font-medium">${formatDateForDisplay(endDate)}</span>
        </p>
        
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <span class="block text-sm font-medium text-blue-700">Tổng Doanh Thu (trong kỳ)</span>
            <span class="text-2xl font-bold text-blue-900">${formatCurrency(totalRevenue)} VNĐ</span>
        </div>
        
        <div class="overflow-x-auto rounded-lg shadow">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Học Viên</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SĐT</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HLV Phụ Trách</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gói Học</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình thức TT</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HBA Nhận</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Hoa Hồng</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thuế</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HLV Thực Nhận</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${data.length === 0 
                        ? `<tr><td colspan="11" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu.</td></tr>`
                        : data.map((hv, index) => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${index + 1}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hv.tenHV}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.sdtHV}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenHLV}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenGoiHoc}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${formatCurrency(hv.hocPhi)} VNĐ</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatThanhToanDisplay(hv)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hv.hbaNhan)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hv.tongHoaHong)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hv.thue)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">${formatCurrency(hv.hlvThucNhan)}</td>
                            </tr>
                        `).join('')
                    }
                </tbody>
            </table>
        </div>
    `;
    reportResultsContainer.innerHTML = html;
};

const generateTongQuanPrintHTML = (data) => {
    // (Giữ nguyên code cũ cho TongQuan)
    let totalRevenue = 0, totalHbaNhan = 0, totalHlvGross = 0, totalThue = 0, totalHlvNet = 0;
    data.forEach(hv => {
        totalRevenue += hv.hocPhi; totalHbaNhan += hv.hbaNhan; totalHlvGross += hv.tongHoaHong; totalThue += hv.thue; totalHlvNet += hv.hlvThucNhan;
    });
    return `
        <h3 style="font-size: 16pt; font-weight: bold; margin-bottom: 10px;">Chi tiết Báo cáo Tổng quan</h3>
        <p style="font-size: 12pt; margin-bottom: 5px;"><strong>Tổng Doanh Thu:</strong> ${formatCurrency(totalRevenue)} VNĐ</p>
        <p style="font-size: 12pt; margin-bottom: 5px;"><strong>Tổng HV Mới:</strong> ${data.length}</p>
        <p style="font-size: 12pt; margin-bottom: 20px;"><strong>Tổng HLV Thực Nhận:</strong> ${formatCurrency(totalHlvNet)} VNĐ</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12pt;">
            <thead style="background-color: #f3f4f6;">
                <tr><th style="border: 1px solid #ddd; padding: 8px;">Chỉ số</th><th style="border: 1px solid #ddd; padding: 8px;">Số tiền (VNĐ)</th></tr>
            </thead>
            <tbody>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">Tổng Doanh Thu</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalRevenue)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">HBA Nhận (${globalRateHBA}%)</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalHbaNhan)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">Tổng Hoa Hồng HLV</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalHlvGross)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">Tổng Thuế TNCN (${globalRateTax}%)</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalThue)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">Tổng HLV Thực Nhận</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalHlvNet)}</td></tr>
            </tbody>
        </table>
    `;
};

// CẬP NHẬT: Thêm cột Tổng Hoa Hồng
const generateHLVReportPrintHTML = (data) => {
    const reportByHLV = {};
    data.forEach(hv => {
        const hlvId = hv.hlvId;
        if (!hlvId) return;
        if (!reportByHLV[hlvId]) {
            const hlvObj = globalHLVList.find(h => h.id === hlvId);
            const caDay = hlvObj ? hlvObj.caDay : 'N/A';
            reportByHLV[hlvId] = { tenHLV: hv.tenHLV, caDay: caDay, soHVMoi: 0, soHV_6_8: 0, soHV_gt_8: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 };
        }
        reportByHLV[hlvId].soHVMoi++; 
        reportByHLV[hlvId].tongDoanhThu += hv.hocPhi; 
        reportByHLV[hlvId].tongHoaHong += hv.tongHoaHong; // CẬP NHẬT
        reportByHLV[hlvId].tongThue += hv.thue;
        if (hv.nhomTuoi === '6-8') reportByHLV[hlvId].soHV_6_8++;
        else if (hv.nhomTuoi === '>8') reportByHLV[hlvId].soHV_gt_8++; 
        reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
    });
    const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);

    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 11pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Tên HLV</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Ca Dạy</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">6-8 tuổi</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">> 8 tuổi</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Số HV</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Tổng Doanh Thu</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Tổng Hoa Hồng</th> <th style="border: 1px solid #ddd; padding: 8px;">Thuế</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Thực Nhận</th>
                </tr>
            </thead>
            <tbody>
                ${reportArray.map(hlv => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.tenHLV}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.caDay}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.soHV_6_8}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.soHV_gt_8}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.soHVMoi}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(hlv.tongDoanhThu)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(hlv.tongHoaHong)}</td> <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(hlv.tongThue)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(hlv.tongThucNhan)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

const generateDoanhThuChiTietPrintHTML = (data) => {
    data.sort((a, b) => a.ngayGhiDanh.toDate() - b.ngayGhiDanh.toDate());
    const totalRevenue = data.reduce((acc, hv) => acc + hv.hocPhi, 0);

    return `
        <p style="font-size: 12pt; margin-bottom: 20px;"><strong>Tổng Doanh Thu:</strong> ${formatCurrency(totalRevenue)} VNĐ</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 4px;">STT</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Tên HV</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">SĐT</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">HLV</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Gói</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Doanh thu</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">TT</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">HBA</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">HH</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Thuế</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">HLV Net</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((hv, index) => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 4px;">${index + 1}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${hv.tenHV}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${hv.sdtHV}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${hv.tenHLV}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${hv.tenGoiHoc}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${formatCurrency(hv.hocPhi)}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${formatThanhToanDisplay(hv)}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${formatCurrency(hv.hbaNhan)}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${formatCurrency(hv.tongHoaHong)}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${formatCurrency(hv.thue)}</td>
                        <td style="border: 1px solid #ddd; padding: 4px;">${formatCurrency(hv.hlvThucNhan)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

const handlePrintReport = () => {
    if (currentReportData.length === 0 && (currentReportType === 'tongquan' || currentReportType === 'doanhthu_chitiet')) {
        // Cho phép in rỗng
    } else if (currentReportData.length === 0) {
        showModal("Không có dữ liệu để in.", "Lỗi");
        return;
    }

    const { startDate, endDate } = currentReportParams;
    let title = "";
    let tableHTML = "";

    if (currentReportType === 'tongquan') {
        title = "BÁO CÁO TỔNG QUAN";
        tableHTML = generateTongQuanPrintHTML(currentReportData);
    } else if (currentReportType === 'hlv') {
        title = "BÁO CÁO THU NHẬP HUẤN LUYỆN VIÊN";
        tableHTML = generateHLVReportPrintHTML(currentReportData);
    } else if (currentReportType === 'doanhthu_chitiet') {
        title = "BÁO CÁO DOANH THU (CHI TIẾT)";
        tableHTML = generateDoanhThuChiTietPrintHTML(currentReportData);
    }

    const dateRangeHTML = `
        <p style="font-size: 12pt; margin-bottom: 20px; text-align: center;">
            Từ ngày: ${formatDateForDisplay(startDate)} - Đến ngày: ${formatDateForDisplay(endDate)}
        </p>
    `;

    const printContent = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
            <h5>Hồ bơi HBA Phú Lâm</h5>
        </div>
        <h2 id="print-title">${title}</h2>
        ${dateRangeHTML}
        ${tableHTML}
    `;

    printSection.innerHTML = printContent;
    
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing');
        printSection.classList.add('hidden');
    }, 250);
};
reportPrintBtn.addEventListener('click', handlePrintReport);

// --- HÀM XUẤT EXCEL ĐÃ SỬA LỖI ---
const handleExportExcel = () => {
    if (currentReportData.length === 0 && (currentReportType === 'tongquan' || currentReportType === 'doanhthu_chitiet')) {
        // Cho phép xuất rỗng
    } else if (currentReportData.length === 0) {
        showModal("Không có dữ liệu để xuất Excel.", "Lỗi");
        return;
    }

    let dataForSheet = [];
    let sheetName = "BaoCao";
    let colWidths = []; // Biến lưu độ rộng cột

    const { startDate, endDate } = currentReportParams;
    const dateRangeStr = `${formatDateForInput(startDate)}_den_${formatDateForInput(endDate)}`;

    try {
        if (currentReportType === 'tongquan') {
            sheetName = `TongQuan_${dateRangeStr}`;
            let totalRevenue = 0, totalHbaNhan = 0, totalHlvGross = 0, totalThue = 0, totalHlvNet = 0;
            currentReportData.forEach(hv => {
                totalRevenue += hv.hocPhi; totalHbaNhan += hv.hbaNhan; totalHlvGross += hv.tongHoaHong; totalThue += hv.thue; totalHlvNet += hv.hlvThucNhan;
            });
            dataForSheet = [
                ["BÁO CÁO TỔNG QUAN"],
                [`Từ ngày: ${formatDateForDisplay(startDate)}`, `Đến ngày: ${formatDateForDisplay(endDate)}`],
                [], ["Chỉ số", "Số tiền (VNĐ)"],
                ["Tổng Doanh Thu", totalRevenue], [`HBA Nhận (${globalRateHBA}%)`, totalHbaNhan],
                ["Tổng Hoa Hồng HLV (Gross)", totalHlvGross], [`Tổng Thuế TNCN (${globalRateTax}%)`, totalThue],
                ["Tổng HLV Thực Nhận (Net)", totalHlvNet]
            ];
            // Cấu hình độ rộng cột cho Tổng quan
            colWidths = [ { wch: 30 }, { wch: 25 } ];
        
        } else if (currentReportType === 'hlv') {
            sheetName = `ThuNhapHLV_${dateRangeStr}`;
            const reportByHLV = {};
            currentReportData.forEach(hv => {
                const hlvId = hv.hlvId;
                if (!hlvId) return;
                if (!reportByHLV[hlvId]) { 
                    const hlvObj = globalHLVList.find(h => h.id === hlvId);
                    const caDay = hlvObj ? hlvObj.caDay : 'N/A';
                    reportByHLV[hlvId] = { tenHLV: hv.tenHLV, caDay: caDay, soHVMoi: 0, soHV_6_8: 0, soHV_gt_8: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 }; 
                }
                reportByHLV[hlvId].soHVMoi++; 
                reportByHLV[hlvId].tongDoanhThu += hv.hocPhi; 
                reportByHLV[hlvId].tongHoaHong += hv.tongHoaHong;
                reportByHLV[hlvId].tongThue += hv.thue;
        if (hv.nhomTuoi === '6-8') reportByHLV[hlvId].soHV_6_8++;
        else if (hv.nhomTuoi === '>8') reportByHLV[hlvId].soHV_gt_8++; 
                reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
            });
            const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);
            
            dataForSheet = [
                ["BÁO CÁO THU NHẬP HLV"], [`Từ ngày: ${formatDateForDisplay(startDate)}`, `Đến ngày: ${formatDateForDisplay(endDate)}`], [],
                ["Tên HLV", "Ca Dạy", "6-8 tuổi", "> 8 tuổi", "Số HV Mới", "Tổng Doanh Thu", "Tổng Hoa Hồng (Gross)", "Thuế Phải Nộp", "Thực Nhận (Net)"]
            ];
            reportArray.forEach(hlv => {
                dataForSheet.push([hlv.tenHLV, hlv.caDay, hlv.soHV_6_8, hlv.soHV_gt_8, hlv.soHVMoi, hlv.tongDoanhThu, hlv.tongHoaHong, hlv.tongThue, hlv.tongThucNhan]);
            });
            
            // Cấu hình độ rộng cột cho HLV
            colWidths = [ { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 } ];
        
        } else if (currentReportType === 'doanhthu_chitiet') {
            sheetName = `DoanhThuChiTiet_${dateRangeStr}`;
            const totalRevenue = currentReportData.reduce((acc, hv) => acc + hv.hocPhi, 0);
            dataForSheet = [
                ["BÁO CÁO DOANH THU (CHI TIẾT)"],
                [`Từ ngày: ${formatDateForDisplay(startDate)}`, `Đến ngày: ${formatDateForDisplay(endDate)}`],
                ["Tổng Doanh Thu:", totalRevenue],
                [],
                ["STT", "Tên Học Viên", "SĐT", "HLV Phụ Trách", "Gói Học", "Doanh thu", "Hình thức TT", "HBA Nhận", "Tổng Hoa Hồng", "Thuế", "HLV Thực Nhận"]
            ];
            
            currentReportData.sort((a, b) => a.ngayGhiDanh.toDate() - b.ngayGhiDanh.toDate()).forEach((hv, index) => {
                dataForSheet.push([
                    index + 1, hv.tenHV, hv.sdtHV, hv.tenHLV, hv.tenGoiHoc, hv.hocPhi,
                    formatThanhToanDisplay(hv), hv.hbaNhan, hv.tongHoaHong, hv.thue, hv.hlvThucNhan
                ]);
            });
            // Cấu hình độ rộng cột cho Chi tiết
            colWidths = [ { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 } ];
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(dataForSheet); // Tạo worksheet sau khi đã có dữ liệu
        
        if (colWidths.length > 0) {
            ws['!cols'] = colWidths; // Áp dụng độ rộng cột sau khi tạo worksheet
        }

        XLSX.utils.book_append_sheet(wb, ws, 'BaoCao');
        const fileName = `BaoCao_${sheetName}.xlsx`;
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error("Lỗi khi xuất Excel:", error);
        showModal(`Không thể xuất file Excel: ${error.message}`, "Lỗi");
    }
};
reportExcelBtn.addEventListener('click', handleExportExcel);

// --- (MỚI) BƯỚC 5c: IMPORT DỮ LIỆU ---
const handleImportStart = () => {
    const file = importFileInput.files[0];
    if (!file) {
        showModal("Vui lòng chọn một file Excel để import.", "Lỗi");
        return;
    }
    
    importStartBtn.disabled = true;
    importSpinner.classList.remove('hidden');
    importResultsContainer.classList.remove('hidden');
    importLog.innerHTML = '<p>Bắt đầu đọc file...</p>';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Chuyển sang mảng, dùng header: 1 để lấy mảng của các mảng
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (rows.length < 2) {
                throw new Error("File không có dữ liệu (chỉ có hàng tiêu đề).");
            }

            const headers = rows[0].map(h => String(h).trim());
            const expectedHeaders = ["Tên Học Viên", "Số Điện Thoại", "Tên Gói Học", "Học phí", "Tên HLV", "Ca Dạy"];
            
            // 1. Kiểm tra tiêu đề nghiêm ngặt
            if (headers.length < 6 ||
                headers[0] !== expectedHeaders[0] ||
                headers[1] !== expectedHeaders[1] ||
                headers[2] !== expectedHeaders[2] ||
                headers[3] !== expectedHeaders[3] ||
                headers[4] !== expectedHeaders[4] ||
                headers[5] !== expectedHeaders[5]) {
                throw new Error(`Cấu trúc cột không hợp lệ. Phải là: ${expectedHeaders.join(', ')}`);
            }

            importLog.innerHTML += '<p>Đã đọc file. Bắt đầu xác thực dữ liệu...</p>';
            
            let successCount = 0;
            let errorCount = 0;
            const logMessages = [];
            const batch = writeBatch(db);
            const today = new Date(); // Ngày ghi danh cho tất cả HV import
            const rateHBA = globalRateHBA / 100;
            const rateTax = globalRateTax / 100;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 1; // Số dòng trên Excel
                
                const tenHV = row[0] ? String(row[0]).trim() : '';
                const sdtHV = row[1] ? String(row[1]).trim() : '';
                const tenGoiHoc = row[2] ? String(row[2]).trim() : '';
                const hocPhi = parseInt(row[3]) || 0;
                const tenHLV = row[4] ? String(row[4]).trim() : '';
                const caDay = row[5] ? String(row[5]).trim() : '';

                // 2. Kiểm tra dữ liệu
                if (!tenHV || !tenGoiHoc || !tenHLV || !caDay || hocPhi === 0) {
                    logMessages.push(`<p class="text-red-400">[LỖI Dòng ${rowNum}]: Thiếu Tên, Gói Học, HLV, Ca Dạy hoặc Học Phí. Bỏ qua.</p>`);
                    errorCount++;
                    continue;
                }

                // 3. Kiểm tra Gói Học (KHỚP 100%)
                const goiHoc = globalGoiHocList.find(g => g.tenGoi === tenGoiHoc);
                if (!goiHoc) {
                    logMessages.push(`<p class="text-red-400">[LỖI Dòng ${rowNum}]: Tên Gói Học "${tenGoiHoc}" không tìm thấy trong CSDL. Bỏ qua.</p>`);
                    errorCount++;
                    continue;
                }
                
                // 4. Kiểm tra HLV & Ca Dạy (KHỚP 100%)
                const hlv = globalHLVList.find(h => h.tenHLV === tenHLV && h.caDay === caDay);
                if (!hlv) {
                    logMessages.push(`<p class="text-red-400">[LỖI Dòng ${rowNum}]: Không tìm thấy HLV "${tenHLV}" dạy "${caDay}". Bỏ qua.</p>`);
                    errorCount++;
                    continue;
                }

                // 5. Nếu tất cả đều OK -> Tính toán và thêm vào Batch
                const ngayHetHan = new Date(today);
                ngayHetHan.setDate(today.getDate() + goiHoc.thoiHan);

                const hbaNhan = hocPhi * rateHBA;
                const tongHoaHong = hocPhi - hbaNhan;
                const thue = tongHoaHong * rateTax;
                const hlvThucNhan = tongHoaHong - thue;

                const hocVienData = {
                    tenHV, sdtHV, 
                    nhomTuoi: 'N/A', // Import không có nhóm tuổi
                    caHoc: caDay,
                    maThe: '',
                    soPhieuThu: `Import ${formatDateForDisplay(today)}`,
                    hinhThucThanhToan: 'N/A', // (NÂNG CẤP)
                    goiHocId: goiHoc.id,
                    tenGoiHoc: goiHoc.tenGoi,
                    soBuoi: goiHoc.soBuoi,
                    soBuoiDaHoc: 0,
                    hocPhi: hocPhi,
                    hlvId: hlv.id,
                    tenHLV: hlv.tenHLV,
                    ngayGhiDanh: Timestamp.fromDate(today),
                    ngayHetHan: Timestamp.fromDate(ngayHetHan),
                    thoiHan: goiHoc.thoiHan,
                    hbaNhan, tongHoaHong, thue, hlvThucNhan,
                    nguoiGhiDanhId: currentUser.uid,
                    nguoiGhiDanhEmail: currentUser.email,
                };
                
                const newDocRef = doc(collection(db, "hocvien"));
                batch.set(newDocRef, hocVienData);
                successCount++;
            }
            
            importLog.innerHTML += `<p>Đã xác thực ${rows.length - 1} dòng. Đang lưu vào CSDL...</p>`;
            
            // 6. Ghi Batch
            if (successCount > 0) {
                await batch.commit();
            }

            // 7. Hoàn tất
            importLog.innerHTML += `<p class="text-green-400 font-bold">--- IMPORT HOÀN TẤT ---</p>`;
            importLog.innerHTML += `<p class="text-green-400">Thành công: ${successCount} / ${rows.length - 1}</p>`;
            importLog.innerHTML += `<p class="text-red-400">Thất bại: ${errorCount} / ${rows.length - 1}</p>`;
            importLog.innerHTML += `<p>--- Chi tiết lỗi ---</p>`;
            importLog.innerHTML += logMessages.join('');

        } catch (error) {
            console.error("Lỗi khi import:", error);
            importLog.innerHTML += `<p class="text-red-400 font-bold">ĐÃ XẢY RA LỖI NGHIÊM TRỌNG:</p>`;
            importLog.innerHTML += `<p class="text-red-400">${error.message}</p>`;
            showModal(`Lỗi khi xử lý file: ${error.message}`, "Lỗi Import");
        } finally {
            importStartBtn.disabled = false;
            importSpinner.classList.add('hidden');
            importFileInput.value = ""; // Xoá file đã chọn
        }
    };
    reader.readAsBinaryString(file);
};
// --- BỔ SUNG: LOGIC IN & XUẤT EXCEL CHO TAB QUẢN LÝ HV ---

// 1. Hàm Xử lý In Danh sách Học viên
const handlePrintStudentList = () => {
    if (!filteredHocVienList || filteredHocVienList.length === 0) {
        showModal("Không có dữ liệu học viên để in.", "Lỗi");
        return;
    }

    const tableRows = filteredHocVienList.map((hv, index) => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${hv.maThe || ''}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHV}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${hv.sdtHV}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatDateForDisplay(hv.ngayGhiDanh)}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHLV || ''}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenGoiHoc}</td>
        </tr>
    `).join('');

    const printContent = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
            <h5>Hồ bơi HBA Phú Lâm</h5>
        </div>
        <h2 id="print-title">DANH SÁCH HỌC VIÊN</h2>
        <p style="text-align: center; margin-bottom: 15px;">Ngày in: ${formatDateForDisplay(new Date())}</p>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 6px;">STT</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Mã Thẻ</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Tên Học Viên</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">SĐT</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Ngày Ghi Danh</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">HLV Phụ Trách</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Gói Học</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;

    const printSection = document.getElementById('print-section');
    printSection.innerHTML = printContent;
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing');
        printSection.classList.add('hidden');
    }, 250);
};

// 2. Hàm Xử lý Xuất Excel Danh sách Học viên
const handleExportStudentList = () => {
    if (!filteredHocVienList || filteredHocVienList.length === 0) {
        showModal("Không có dữ liệu học viên để xuất Excel.", "Lỗi");
        return;
    }

    try {
        const dataForSheet = [
            ["DANH SÁCH HỌC VIÊN"],
            [`Ngày xuất: ${formatDateForDisplay(new Date())}`],
            [],
            ["STT", "Mã Thẻ", "Tên Học Viên", "SĐT", "Ngày Ghi Danh", "HLV Phụ Trách", "Gói Học", "Học Phí", "Trạng Thái"]
        ];

        filteredHocVienList.forEach((hv, index) => {
            dataForSheet.push([
                index + 1,
                hv.maThe || '',
                hv.tenHV,
                hv.sdtHV,
                formatDateForDisplay(hv.ngayGhiDanh),
                hv.tenHLV || '',
                hv.tenGoiHoc,
                hv.hocPhi,
                hv.active !== false ? "Hoạt động" : "Đã nghỉ"
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
        
        // Cấu hình độ rộng cột
        ws['!cols'] = [
            { wch: 5 },  // STT
            { wch: 15 }, // Ma The
            { wch: 25 }, // Ten
            { wch: 15 }, // SDT
            { wch: 15 }, // Ngay
            { wch: 25 }, // HLV
            { wch: 25 }, // Goi Hoc
            { wch: 15 }, // Hoc Phi
            { wch: 15 }  // Trang thai
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHV');
        XLSX.writeFile(wb, `DanhSachHocVien_${formatDateForInput(new Date())}.xlsx`);

    } catch (error) {
        console.error("Lỗi xuất Excel:", error);
        showModal(`Lỗi xuất Excel: ${error.message}`, "Lỗi");
    }
};
// ... (Các dòng code cuối cùng của file app.js)

importStartBtn.addEventListener('click', handleImportStart);

// --- THÊM 2 DÒNG NÀY ---
if (hvListPrintBtn) hvListPrintBtn.addEventListener('click', handlePrintStudentList);
if (hvListExcelBtn) hvListExcelBtn.addEventListener('click', handleExportStudentList);

// --- XUẤT EXCEL DỮ LIỆU HLV ---
const handleExportHLVList = () => {
    try {
        if (!globalHLVList || globalHLVList.length === 0) {
            showModal('Không có dữ liệu HLV để xuất.', 'Thông báo');
            return;
        }
        // Sắp xếp theo thứ tự ưu tiên
        const sortedList = [...globalHLVList].sort((a, b) => (a.thuTuUuTien || 99) - (b.thuTuUuTien || 99));
        const dataToExport = sortedList.map((hlv, index) => ({
            'STT': index + 1,
            'Tên HLV': hlv.tenHLV,
            'Ca Dạy': hlv.caDay,
            'Loại HLV': hlv.loaiHLV,
            'Thứ tự Ưu tiên': hlv.thuTuUuTien || 99,
            'Số HV đang dạy': hlv.soHVHienTai || 0,
            'Trạng thái': hlv.active ? 'Đang làm' : 'Đã nghỉ'
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        // Định dạng độ rộng cột
        ws['!cols'] = [
            { wch: 5 },   // STT
            { wch: 25 },  // Tên HLV
            { wch: 15 },  // Ca Dạy
            { wch: 20 },  // Loại HLV
            { wch: 15 },  // Thứ tự Ưu tiên
            { wch: 20 },  // Số HV đang dạy
            { wch: 15 }   // Trạng thái
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHLV');
        XLSX.writeFile(wb, `DanhSachHLV_${formatDateForInput(new Date())}.xlsx`);
    } catch (error) {
        console.error('Lỗi xuất Excel HLV:', error);
        showModal(`Lỗi xuất Excel: ${error.message}`, 'Lỗi');
    }
};
if (hlvExcelBtn) hlvExcelBtn.addEventListener('click', handleExportHLVList);

// --- NGHIỆP VỤ BƯỚC 1: XÁC THỰC & PHÂN QUYỀN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userEmailElement.textContent = user.email;

        try {
            const roleDoc = await getDoc(doc(db, "user_roles", user.uid));
            if (roleDoc.exists()) {
                currentUserRole = roleDoc.data().role;
            } else {
                currentUserRole = 'letan'; 
                console.warn("Không tìm thấy vai trò, gán letan.");
            }
            
            setupUIForRole(currentUserRole);
            await loadAllInitialData();

        } catch (error) {
            console.error("Lỗi role:", error);
            showModal(`Lỗi tải dữ liệu tài khoản: ${error.message}`, "Lỗi");
            currentUserRole = null;
            setupUIForRole(null); 
        }
        
        mainApp.classList.remove('hidden');
        loginScreen.classList.add('hidden');
    } else {
        currentUser = null;
        currentUserRole = null;
        mainApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        setupUIForRole(null); 
        detachAllListeners();
        globalGoiHocList = [];
        globalHLVList = [];
        globalHocVienList = [];
        globalRateHBA = 0;
        globalRateTax = 0;
    }
    globalLoader.classList.add('hidden');
});

// --- LỌC THEO CỘT TRONG CÁC BẢNG ---
function applyTableFilters(tableBody) {
    if (!tableBody) return;
    const table = tableBody.closest('table');
    if (!table) return;
    
    const thead = table.querySelector('thead');
    const inputs = thead.querySelectorAll('.col-filter-input');
    
    const filters = [];
    inputs.forEach(input => {
        const val = input.value.trim().toLowerCase();
        if (val) {
            filters.push({
                index: parseInt(input.dataset.colindex),
                value: val
            });
        }
    });

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        // Skip empty state row (1 cell with colspan)
        if (row.cells.length === 1 && row.cells[0].hasAttribute('colspan')) {
            row.style.display = '';
            return;
        }
        
        let match = true;
        for (const f of filters) {
            const cell = row.cells[f.index];
            if (!cell) {
                match = false;
                break;
            }
            const text = cell.textContent.trim().toLowerCase();
            if (!text.includes(f.value)) {
                match = false;
                break;
            }
        }
        row.style.display = match ? '' : 'none';
    });
}

function initTableColumnFilters() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const thead = table.querySelector('thead');
        if (!thead) return;
        const headerRows = thead.querySelectorAll('tr');
        if (headerRows.length === 0) return;
        
        const headerCells = headerRows[headerRows.length - 1].querySelectorAll('th');
        headerCells.forEach((th, index) => {
            const text = th.textContent.trim();
            // Skip "STT" and "Hành động"
            if (text === 'STT' || text === 'Hành động' || th.querySelector('.sr-only')) {
                return;
            }
            
            const inputContainer = document.createElement('div');
            inputContainer.className = 'mt-2';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Lọc...';
            input.className = 'col-filter-input block w-full px-2 py-1 text-xs border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-normal text-gray-700 bg-white';
            input.dataset.colindex = index;
            
            input.addEventListener('input', () => {
                const tbody = table.querySelector('tbody');
                if (tbody) applyTableFilters(tbody);
            });
            
            inputContainer.appendChild(input);
            th.appendChild(inputContainer);
        });

        // Setup MutationObserver to auto-apply filters when tbody changes (e.g. re-rendered by Firebase)
        const tbody = table.querySelector('tbody');
        if (tbody) {
            const observer = new MutationObserver(() => {
                applyTableFilters(tbody);
            });
            observer.observe(tbody, { childList: true });
        }
    });
}

// Ensure initTableColumnFilters is called
initTableColumnFilters();

// --- NÚT LÊN ĐẦU TRANG ---
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
            backToTopBtn.classList.add('translate-y-0', 'opacity-100');
        } else {
            backToTopBtn.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
            backToTopBtn.classList.remove('translate-y-0', 'opacity-100');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- LỊCH SỬ THAO TÁC (ACTIVITY LOGS) ---
const logDateFromInput = document.getElementById('log-date-from');
const logDateToInput = document.getElementById('log-date-to');
const loadLogsBtn = document.getElementById('load-logs-btn');
const loadLogsSpinner = document.getElementById('load-logs-spinner');
const logsTableBody = document.getElementById('logs-table-body');

// Set default dates: from = today, to = today
if (logDateFromInput) {
    logDateFromInput.value = formatDateForInput(new Date());
}
if (logDateToInput) {
    logDateToInput.value = formatDateForInput(new Date());
}

if (loadLogsBtn) {
    loadLogsBtn.addEventListener('click', async () => {
        // Chỉ Admin mới được dùng
        if (currentUserRole !== 'admin') {
            showModal('Bạn không có quyền xem lịch sử thao tác.', 'Lỗi');
            return;
        }

        const fromVal = logDateFromInput.value;
        const toVal = logDateToInput.value;

        if (!fromVal || !toVal) {
            showModal('Vui lòng chọn cả Từ ngày và Đến ngày.', 'Lỗi');
            return;
        }

        const fromDate = new Date(fromVal);
        const toDate = new Date(toVal);
        toDate.setHours(23, 59, 59, 999);

        // Kiểm tra khoảng cách tối đa 45 ngày
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 0) {
            showModal('Ngày bắt đầu phải trước ngày kết thúc.', 'Lỗi');
            return;
        }

        if (diffDays > 45) {
            showModal('Khoảng thời gian tối đa là 45 ngày. Vui lòng chọn khoảng thời gian ngắn hơn.', 'Lỗi');
            return;
        }

        // Show spinner
        loadLogsBtn.disabled = true;
        if (loadLogsSpinner) loadLogsSpinner.classList.remove('hidden');
        logsTableBody.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500 text-sm">Đang tải...</td></tr>';

        try {
            const fromTimestamp = Timestamp.fromDate(fromDate);
            const toTimestamp = Timestamp.fromDate(toDate);

            const q = query(
                collection(db, "activity_logs"),
                where('timestamp', '>=', fromTimestamp),
                where('timestamp', '<=', toTimestamp),
                orderBy('timestamp', 'desc'),
                limit(100)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                logsTableBody.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500 text-sm">Không có log nào trong khoảng thời gian này.</td></tr>';
                return;
            }

            let html = '';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const time = data.timestamp ? formatDateTimeForDisplay(data.timestamp) : 'N/A';
                const user = data.userEmail || 'N/A';
                const desc = data.description || 'N/A';
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${time}</td>
                        <td class="px-4 py-3 text-sm text-gray-800 font-medium">${user}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${desc}</td>
                    </tr>
                `;
            });
            logsTableBody.innerHTML = html;

        } catch (error) {
            console.error('Lỗi tải log:', error);
            logsTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-red-500 text-sm">Lỗi: ${error.message}</td></tr>`;
        } finally {
            loadLogsBtn.disabled = false;
            if (loadLogsSpinner) loadLogsSpinner.classList.add('hidden');
        }
    });
}


// --- LOGIC CHECK-IN ---
if (checkinMatheInput) {
    checkinMatheInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const maThe = checkinMatheInput.value.trim();
            if (!maThe) return;

            checkinMatheInput.value = '';
            checkinMatheInput.disabled = true;
            checkinInfo.innerHTML = `<div class="flex justify-center"><div class="loader-sm loader border-indigo-600"></div></div>`;
            checkinResultContainer.classList.remove('hidden');

            try {
                const q = query(collection(db, "hocvien"), where("maThe", "==", maThe));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    checkinInfo.innerHTML = `<p class="text-red-600 font-bold">❌ Không tìm thấy học viên với mã thẻ này!</p>`;
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
                    checkinInfo.innerHTML = `
                        <p class="text-red-600 font-bold">❌ Thẻ đã hết hạn!</p>
                        <p><strong>Tên:</strong> ${hocvien.tenHV}</p>
                        <p><strong>Ngày hết hạn:</strong> ${hanSuDung.toLocaleDateString('vi-VN')}</p>
                    `;
                    checkinMatheInput.disabled = false;
                    checkinMatheInput.focus();
                    return;
                }

                const soBuoiDaHoc = hocvien.soBuoiDaHoc || 0;
                const tongSoBuoi = hocvien.soBuoi || 0;
                
                if (soBuoiDaHoc >= tongSoBuoi && tongSoBuoi > 0) {
                    checkinInfo.innerHTML = `
                        <p class="text-red-600 font-bold">❌ Đã hết số buổi học!</p>
                        <p><strong>Tên:</strong> ${hocvien.tenHV}</p>
                        <p><strong>Gói học:</strong> ${hocvien.tenGoiHoc}</p>
                        <p><strong>Đã học:</strong> ${soBuoiDaHoc} / ${tongSoBuoi} buổi</p>
                    `;
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

                checkinInfo.innerHTML = `
                    <p class="text-green-600 font-bold text-xl mb-2">✅ Check-in Thành Công!</p>
                    <p><strong>Học Viên:</strong> ${hocvien.tenHV}</p>
                    <p><strong>Gói Học:</strong> ${hocvien.tenGoiHoc}</p>
                    <p><strong>HLV:</strong> ${hocvien.tenHLV}</p>
                    <p><strong>Số buổi:</strong> ${newSoBuoiDaHoc} / ${tongSoBuoi}</p>
                    <p><strong>Hạn sử dụng:</strong> ${hanSuDung.toLocaleDateString('vi-VN')}</p>
                    <p class="mt-4 text-sm text-gray-500 italic">Đang in vé...</p>
                `;

                inVeK80(hocvien, newSoBuoiDaHoc, tongSoBuoi, maThe);

            } catch (error) {
                console.error("Lỗi khi check-in:", error);
                checkinInfo.innerHTML = `<p class="text-red-600 font-bold">❌ Lỗi hệ thống: ${error.message}</p>`;
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
    
    const ticketHtml = `
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
                <h2 class="pool-name">Hồ bơi Phú Lâm</h2>
                <h1 class="ticket-title">VÉ HỌC BƠI</h1>
                <div class="ticket-info">
                    <p><strong>Thời gian:</strong> ${timeStr}</p>
                    <p><strong>Học Viên:</strong> ${hocvien.tenHV}</p>
                    <p><strong>Gói Học:</strong> ${hocvien.tenGoiHoc}</p>
                    <p><strong>HLV:</strong> ${hocvien.tenHLV}</p>
                    <p class="hidden"><strong>Buổi học:</strong> ${soBuoiDaHoc} / ${tongSoBuoi}</p>
                </div>
                <div class="qr-container">
                    <div id="qrcode-container"></div>
                    <p class="qr-text">Mã Thẻ: ${maThe}</p>
                </div>
            </div>
            
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <script>
                new QRCode(document.getElementById("qrcode-container"), {
                    text: "${maThe}",
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
    `;

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

// =========================================================================
// --- MODULE BÁO CÁO KẾT QUẢ KINH DOANH & QUẢN LÝ CHI PHÍ CỐ ĐỊNH (P&L) ---
// =========================================================================

// Helper lưu dữ liệu vào document app_config/main_config (Hoàn toàn không bị lỗi permissions)
const saveChiPhiToFirestore = async () => {
    await setDoc(doc(db, "app_config", "main_config"), {
        danhSachChiPhi: globalChiPhiList
    }, { merge: true });
};

const saveDinhPhiMauToFirestore = async () => {
    await setDoc(doc(db, "app_config", "main_config"), {
        dinhPhiMau: globalDinhPhiMauList
    }, { merge: true });
};

const saveThuKhacToFirestore = async () => {
    await setDoc(doc(db, "app_config", "main_config"), {
        danhSachThuKhac: globalThuKhacList
    }, { merge: true });
};

// Helper format month cho input type="month"
const formatMonthForInput = (date) => {
    if (!date) return '';
    const d = (date instanceof Date) ? date : (typeof date.toDate === 'function' ? date.toDate() : new Date(date));
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

// Helper lấy ngày của khoản chi
const getExpenseDate = (cp) => {
    if (!cp) return new Date();
    if (cp.ngayChi) {
        if (typeof cp.ngayChi.toDate === 'function') return cp.ngayChi.toDate();
        return new Date(cp.ngayChi);
    }
    if (cp.thangNam) {
        const parts = cp.thangNam.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
    }
    return new Date();
};

const getExpenseDateDisplay = (cp) => {
    if (!cp) return 'N/A';
    if (cp.ngayChi) {
        if (typeof cp.ngayChi === 'string' && cp.ngayChi.includes('-') && cp.ngayChi.length === 10) {
            const p = cp.ngayChi.split('-');
            return `${p[2]}/${p[1]}/${p[0]}`;
        }
        return formatDateForDisplay(getExpenseDate(cp));
    }
    return cp.thangNam || 'N/A';
};

// Helper lấy ngày của khoản thu khác
const getIncomeDate = (tk) => {
    if (!tk) return new Date();
    if (tk.ngayThu) {
        if (typeof tk.ngayThu.toDate === 'function') return tk.ngayThu.toDate();
        return new Date(tk.ngayThu);
    }
    if (tk.thangNam) {
        const parts = tk.thangNam.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
    }
    return new Date();
};

const getIncomeDateDisplay = (tk) => {
    if (!tk) return 'N/A';
    if (tk.ngayThu) {
        if (typeof tk.ngayThu === 'string' && tk.ngayThu.includes('-') && tk.ngayThu.length === 10) {
            const p = tk.ngayThu.split('-');
            return `${p[2]}/${p[1]}/${p[0]}`;
        }
        return formatDateForDisplay(getIncomeDate(tk));
    }
    return tk.thangNam || 'N/A';
};

// Khởi tạo tab KQKD
const setupKQKDTab = () => {
    const now = new Date();
    currentKqkdMonth = formatMonthForInput(now);

    const filterMonthInput = document.getElementById('kqkd-filter-month');
    if (filterMonthInput) {
        filterMonthInput.value = currentKqkdMonth;
    }

    const filterFromInput = document.getElementById('kqkd-filter-from');
    const filterToInput = document.getElementById('kqkd-filter-to');
    if (filterFromInput && filterToInput) {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filterFromInput.value = formatDateForInput(firstDayOfMonth);
        filterToInput.value = formatDateForInput(lastDayOfMonth);
    }

    setupKQKDEventListeners();
    calculateAndRenderKQKD();
};

// Thiết lập các Event Listeners của Tab KQKD
const setupKQKDEventListeners = () => {
    // 1. Radio chọn chế độ thời gian
    const modeRadios = document.querySelectorAll('input[name="kqkd-period-mode"]');
    const monthContainer = document.getElementById('kqkd-month-container');
    const customContainer = document.getElementById('kqkd-custom-range-container');

    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentKqkdPeriodMode = e.target.value;
            if (currentKqkdPeriodMode === 'month') {
                if (monthContainer) monthContainer.classList.remove('hidden');
                if (customContainer) customContainer.classList.add('hidden');
            } else if (currentKqkdPeriodMode === 'custom') {
                if (monthContainer) monthContainer.classList.add('hidden');
                if (customContainer) customContainer.classList.remove('hidden');
            } else { // 'all'
                if (monthContainer) monthContainer.classList.add('hidden');
                if (customContainer) customContainer.classList.add('hidden');
            }
            calculateAndRenderKQKD();
        });
    });

    // 2. Nút Xem Báo Cáo
    const viewBtn = document.getElementById('kqkd-view-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            calculateAndRenderKQKD();
        });
    }

    // 3. Thay đổi tháng trực tiếp
    const filterMonthInput = document.getElementById('kqkd-filter-month');
    if (filterMonthInput) {
        filterMonthInput.addEventListener('change', (e) => {
            currentKqkdMonth = e.target.value;
            calculateAndRenderKQKD();
        });
    }

    // 4. Nút Áp Dụng Định Phí Mẫu vào kỳ hiện tại
    const applyBtn = document.getElementById('kqkd-apply-template-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', handleApplyDinhPhiMau);
    }

    // 5. Nút Mở Modal Thêm Chi Phí
    const addExpenseBtn = document.getElementById('kqkd-add-expense-btn');
    const addExpenseQuickBtn = document.getElementById('kqkd-add-expense-quick-btn');
    if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => openExpenseModal());
    if (addExpenseQuickBtn) addExpenseQuickBtn.addEventListener('click', () => openExpenseModal());

    // 6. Form Thêm / Sửa Chi Phí Submit
    const expenseForm = document.getElementById('kqkd-expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseFormSubmit);
    }

    // Nút Huỷ modal chi phí
    const cancelExpenseBtn = document.getElementById('kqkd-exp-cancel-btn');
    if (cancelExpenseBtn) {
        cancelExpenseBtn.addEventListener('click', () => closeExpenseModal());
    }

    // 5b. Nút Mở Modal Thêm Thu Khác (Phiếu Thu)
    const addIncomeBtn = document.getElementById('kqkd-add-income-btn');
    const addIncomeQuickBtn = document.getElementById('kqkd-add-income-quick-btn');
    if (addIncomeBtn) addIncomeBtn.addEventListener('click', () => openThuKhacModal());
    if (addIncomeQuickBtn) addIncomeQuickBtn.addEventListener('click', () => openThuKhacModal());

    // 6b. Form Thêm / Sửa Thu Khác Submit
    const incomeForm = document.getElementById('kqkd-income-form');
    if (incomeForm) {
        incomeForm.addEventListener('submit', handleThuKhacFormSubmit);
    }

    // Nút Huỷ modal thu khác
    const cancelIncomeBtn = document.getElementById('kqkd-income-cancel-btn');
    if (cancelIncomeBtn) {
        cancelIncomeBtn.addEventListener('click', () => closeThuKhacModal());
    }

    // Tự động đồng bộ tháng hạch toán khi chọn ngày thu thực tế
    const incomeDateInput = document.getElementById('kqkd-income-date');
    if (incomeDateInput) {
        incomeDateInput.addEventListener('change', (e) => {
            if (e.target.value) {
                const mInput = document.getElementById('kqkd-income-month');
                if (mInput) mInput.value = e.target.value.substring(0, 7);
            }
        });
    }

    // 7. Modal Định Phí Mẫu
    const templateBtn = document.getElementById('kqkd-template-btn');
    if (templateBtn) {
        templateBtn.addEventListener('click', () => openTemplateModal());
    }

    const closeTemplateBtn = document.getElementById('kqkd-tpl-close-btn');
    const closeTemplateX = document.getElementById('kqkd-tpl-close-x');
    if (closeTemplateBtn) closeTemplateBtn.addEventListener('click', () => closeTemplateModal());
    if (closeTemplateX) closeTemplateX.addEventListener('click', () => closeTemplateModal());

    // Nút khởi tạo định phí mẫu mặc định nếu trống
    const initDefaultTplBtn = document.getElementById('kqkd-tpl-init-default-btn');
    if (initDefaultTplBtn) {
        initDefaultTplBtn.addEventListener('click', handleInitDefaultDinhPhiMau);
    }

    // Nút thêm định phí mẫu mới
    const addNewTplBtn = document.getElementById('kqkd-tpl-add-new-btn');
    if (addNewTplBtn) {
        addNewTplBtn.addEventListener('click', handleAddNewTemplatePrompt);
    }

    // 8. Nút Toggle All Checkbox trong sổ chi phí
    const toggleAllBtn = document.getElementById('kqkd-toggle-all-check');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', handleToggleAllExpensesInView);
    }

    // 8b. Nút Toggle All Checkbox trong sổ thu khác
    const toggleAllIncomeBtn = document.getElementById('kqkd-toggle-all-income');
    if (toggleAllIncomeBtn) {
        toggleAllIncomeBtn.addEventListener('click', handleToggleAllThuKhacInView);
    }

    // 9. Nút In Báo Cáo KQKD
    const printBtn = document.getElementById('kqkd-print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', handlePrintKQKD);
    }

    // 10. Nút Xuất Excel KQKD
    const excelBtn = document.getElementById('kqkd-excel-btn');
    if (excelBtn) {
        excelBtn.addEventListener('click', handleExportExcelKQKD);
    }
};

// =========================================================================
// --- TÍNH TOÁN VÀ HIỂN THỊ KẾT QUẢ KINH DOANH (P&L) ---
// =========================================================================

function calculateAndRenderKQKD() {
    // 1. Xác định phạm vi thời gian
    let periodLabel = '';
    let filteredStudents = [];
    let filteredExpenses = [];
    let filteredThuKhac = [];

    const monthInput = document.getElementById('kqkd-filter-month');
    if (monthInput && monthInput.value) {
        currentKqkdMonth = monthInput.value;
    } else {
        currentKqkdMonth = formatMonthForInput(new Date());
    }

    if (currentKqkdPeriodMode === 'month') {
        const [yearStr, monthStr] = currentKqkdMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;
        const startDate = new Date(year, month, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        periodLabel = `Tháng ${monthStr}/${yearStr}`;

        // Lọc học viên trong tháng
        filteredStudents = globalHocVienList.filter(hv => {
            if (!hv.ngayGhiDanh) return false;
            const d = hv.ngayGhiDanh.toDate();
            return d >= startDate && d <= endDate;
        });

        // Lọc chi phí có thangNam trùng khớp
        filteredExpenses = globalChiPhiList.filter(cp => cp.thangNam === currentKqkdMonth);

        // Lọc thu khác có thangNam trùng khớp
        filteredThuKhac = globalThuKhacList.filter(t => t.thangNam === currentKqkdMonth);

    } else if (currentKqkdPeriodMode === 'custom') {
        const fromInput = document.getElementById('kqkd-filter-from');
        const toInput = document.getElementById('kqkd-filter-to');
        const startDate = fromInput && fromInput.value ? new Date(`${fromInput.value}T00:00:00`) : new Date(2000, 0, 1);
        const endDate = toInput && toInput.value ? new Date(`${toInput.value}T23:59:59`) : new Date(2100, 11, 31);
        periodLabel = `Từ ${formatDateForDisplay(startDate)} đến ${formatDateForDisplay(endDate)}`;

        // Lọc học viên trong khoảng ngày
        filteredStudents = globalHocVienList.filter(hv => {
            if (!hv.ngayGhiDanh) return false;
            const d = hv.ngayGhiDanh.toDate();
            return d >= startDate && d <= endDate;
        });

        // Lọc chi phí trong khoảng ngày
        filteredExpenses = globalChiPhiList.filter(cp => {
            if (cp.ngayChi) {
                const d = (cp.ngayChi instanceof Timestamp) ? cp.ngayChi.toDate() : new Date(cp.ngayChi);
                return d >= startDate && d <= endDate;
            }
            if (cp.thangNam) {
                const [y, m] = cp.thangNam.split('-');
                const cpDate = new Date(parseInt(y), parseInt(m) - 1, 15);
                return cpDate >= startDate && cpDate <= endDate;
            }
            return false;
        });

        // Lọc thu khác trong khoảng ngày
        filteredThuKhac = globalThuKhacList.filter(t => {
            if (t.ngayThu) {
                const d = (t.ngayThu instanceof Timestamp) ? t.ngayThu.toDate() : new Date(t.ngayThu);
                return d >= startDate && d <= endDate;
            }
            if (t.thangNam) {
                const [y, m] = t.thangNam.split('-');
                const tDate = new Date(parseInt(y), parseInt(m) - 1, 15);
                return tDate >= startDate && tDate <= endDate;
            }
            return false;
        });

    } else { // 'all' - Toàn bộ thời gian
        periodLabel = 'Toàn Bộ Thời Gian (Lũy Kế)';
        filteredStudents = [...globalHocVienList];
        filteredExpenses = [...globalChiPhiList];
        filteredThuKhac = [...globalThuKhacList];
    }

    // 2. Tính toán Doanh thu, Hoa hồng HLV, Lợi nhuận gộp
    let totalRevenue = 0;
    let totalHlvCost = 0;
    let totalGrossProfit = 0;

    filteredStudents.forEach(hv => {
        totalRevenue += (hv.hocPhi || 0);
        totalHlvCost += (hv.tongHoaHong || 0);
        totalGrossProfit += (hv.hbaNhan || 0);
    });

    // 3. Phân tách và tổng hợp Chi phí
    let totalActiveExpense = 0;
    let activeExpenseCount = 0;
    const expenseByGroup = {
        mat_bang: 0,
        nhan_su: 0,
        van_hanh: 0,
        hoa_chat: 0,
        marketing: 0,
        chi_phi_khac: 0
    };

    filteredExpenses.forEach(cp => {
        const isActive = cp.isTinhKQKD !== false;
        const amount = Number(cp.soTien) || 0;
        if (isActive) {
            totalActiveExpense += amount;
            activeExpenseCount++;
            const grp = cp.nhomChiPhi || 'chi_phi_khac';
            if (expenseByGroup[grp] !== undefined) {
                expenseByGroup[grp] += amount;
            } else {
                expenseByGroup.chi_phi_khac += amount;
            }
        }
    });

    // 3b. Phân tách và tổng hợp Thu khác
    let totalActiveThuKhac = 0;
    let activeThuKhacCount = 0;
    filteredThuKhac.forEach(t => {
        if (t.isTinhKQKD !== false) {
            totalActiveThuKhac += (Number(t.soTien) || 0);
            activeThuKhacCount++;
        }
    });

    // 4. Tính toán Lợi nhuận ròng (Net Profit) & Tổng Doanh Thu
    const tongDoanhThu = totalRevenue + totalActiveThuKhac;
    const netProfit = totalGrossProfit + totalActiveThuKhac - totalActiveExpense;
    const profitMargin = tongDoanhThu > 0 ? ((netProfit / tongDoanhThu) * 100).toFixed(1) : 0;

    // 5. Phân tích Điểm hòa vốn (Thu khác bù đắp chi phí)
    const hbaRateDecimal = globalRateHBA > 0 ? (globalRateHBA / 100) : 0.3; // Mặc định 30% nếu chưa đặt
    const netExpenseToCover = Math.max(0, totalActiveExpense - totalActiveThuKhac);
    const breakEvenRevenue = hbaRateDecimal > 0 ? Math.round(netExpenseToCover / hbaRateDecimal) : 0;
    const avgHocPhi = filteredStudents.length > 0 ? Math.round(totalRevenue / filteredStudents.length) : 1500000;
    const breakEvenStudents = avgHocPhi > 0 ? Math.ceil(breakEvenRevenue / avgHocPhi) : 0;

    // Lưu dữ liệu tổng kết để In / Excel
    currentKqkdSummaryData = {
        periodLabel,
        totalRevenue,
        studentCount: filteredStudents.length,
        totalHlvCost,
        totalGrossProfit,
        totalThuKhac: totalActiveThuKhac,
        totalActiveThuKhac,
        activeThuKhacCount,
        filteredThuKhac,
        tongDoanhThu,
        totalActiveExpense,
        activeExpenseCount,
        expenseByGroup,
        netProfit,
        profitMargin,
        breakEvenRevenue,
        avgHocPhi,
        breakEvenStudents,
        filteredExpenses,
        filteredStudents
    };

    // 6. Cập nhật giao diện các Thẻ KPI
    updateKpiCards(currentKqkdSummaryData);

    // 7. Cập nhật Bảng P&L
    renderPnlTable(currentKqkdSummaryData);

    // 8. Cập nhật Bảng Sổ Chi Phí
    renderExpenseTable(filteredExpenses);

    // 9. Cập nhật Bảng Sổ Thu Khác
    renderThuKhacTable(filteredThuKhac);
};

// Cập nhật các thẻ KPI
const updateKpiCards = (data) => {
    const kpiDoanhThu = document.getElementById('kpi-doanh-thu');
    const kpiSoHv = document.getElementById('kpi-so-hv');
    const kpiThuKhac = document.getElementById('kpi-thu-khac');
    const kpiThuKhacCount = document.getElementById('kpi-thu-khac-count');
    const kpiHlvCost = document.getElementById('kpi-hlv-cost');
    const kpiHlvRate = document.getElementById('kpi-hlv-rate');
    const kpiLoiNhuanGop = document.getElementById('kpi-loi-nhuan-gop');
    const kpiHbaRate = document.getElementById('kpi-hba-rate');
    const kpiTongChiPhi = document.getElementById('kpi-tong-chi-phi');
    const kpiChiPhiCount = document.getElementById('kpi-chi-phi-count');
    const kpiLoiNhuanRong = document.getElementById('kpi-loi-nhuan-rong');
    const kpiBadgeProfit = document.getElementById('kpi-badge-profit');
    const kpiProfitMargin = document.getElementById('kpi-profit-margin');
    const kpiDiemHoaVon = document.getElementById('kpi-diem-hoa-von');
    const kpiHvHoaVon = document.getElementById('kpi-hv-hoa-von');
    const kpiCardNetProfit = document.getElementById('kpi-card-net-profit');
    const pnlPeriodLabel = document.getElementById('pnl-period-label');

    if (pnlPeriodLabel) pnlPeriodLabel.textContent = data.periodLabel;
    if (kpiDoanhThu) kpiDoanhThu.textContent = `${formatCurrency(data.tongDoanhThu)} đ`;
    if (kpiSoHv) kpiSoHv.textContent = `${data.studentCount} HV + ${data.activeThuKhacCount} khoản thu khác`;

    if (kpiThuKhac) kpiThuKhac.textContent = `${formatCurrency(data.totalThuKhac)} đ`;
    if (kpiThuKhacCount) kpiThuKhacCount.textContent = `${data.activeThuKhacCount} phiếu thu`;

    if (kpiHlvCost) kpiHlvCost.textContent = `${formatCurrency(data.totalHlvCost)} đ`;
    const hlvRatePct = data.totalRevenue > 0 ? ((data.totalHlvCost / data.totalRevenue) * 100).toFixed(1) : (100 - globalRateHBA);
    if (kpiHlvRate) kpiHlvRate.textContent = `${hlvRatePct}% Doanh thu`;

    if (kpiLoiNhuanGop) kpiLoiNhuanGop.textContent = `${formatCurrency(data.totalGrossProfit)} đ`;
    const hbaRatePct = data.totalRevenue > 0 ? ((data.totalGrossProfit / data.totalRevenue) * 100).toFixed(1) : globalRateHBA;
    if (kpiHbaRate) kpiHbaRate.textContent = `HBA giữ lại ${hbaRatePct}%`;

    if (kpiTongChiPhi) kpiTongChiPhi.textContent = `${formatCurrency(data.totalActiveExpense)} đ`;
    if (kpiChiPhiCount) kpiChiPhiCount.textContent = `${data.activeExpenseCount} khoản chi hợp lệ`;

    if (kpiLoiNhuanRong) kpiLoiNhuanRong.textContent = `${formatCurrency(data.netProfit)} đ`;
    if (kpiProfitMargin) kpiProfitMargin.textContent = `Biên LN: ${data.profitMargin}%`;

    if (kpiDiemHoaVon) kpiDiemHoaVon.textContent = `${formatCurrency(data.breakEvenRevenue)} đ`;
    if (kpiHvHoaVon) kpiHvHoaVon.textContent = `Cần tối thiểu: ~${data.breakEvenStudents} HV`;

    // Đổi màu sắc thẻ Lợi nhuận ròng tùy Lãi / Lỗ
    if (kpiCardNetProfit && kpiBadgeProfit) {
        if (data.netProfit >= 0) {
            kpiCardNetProfit.className = 'bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm';
            kpiBadgeProfit.className = 'px-2 py-0.5 rounded text-xs font-bold bg-emerald-200 text-emerald-800';
            kpiBadgeProfit.textContent = 'LÃI';
            if (kpiLoiNhuanRong) kpiLoiNhuanRong.className = 'block text-xl font-bold text-emerald-900 mt-1';
        } else {
            kpiCardNetProfit.className = 'bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-sm';
            kpiBadgeProfit.className = 'px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-800';
            kpiBadgeProfit.textContent = 'LỖ';
            if (kpiLoiNhuanRong) kpiLoiNhuanRong.className = 'block text-xl font-bold text-rose-900 mt-1';
        }
    }
};

// Render Bảng P&L
const renderPnlTable = (data) => {
    const tbody = document.getElementById('pnl-table-body');
    if (!tbody) return;

    const rev = data.tongDoanhThu || data.totalRevenue || 0;
    const calcPct = (val) => rev > 0 ? `${((val / rev) * 100).toFixed(1)}%` : '0.0%';

    const html = `
        <!-- 1. DOANH THU THUẦN -->
        <tr class="bg-blue-50/60 font-bold text-gray-900">
            <td class="py-2.5 px-3">1. DOANH THU THUẦN (Học phí)</td>
            <td class="py-2.5 px-3 text-right text-blue-700">${formatCurrency(data.totalRevenue)} đ</td>
            <td class="py-2.5 px-3 text-right text-blue-700">${calcPct(data.totalRevenue)}</td>
        </tr>

        <!-- 1b. THU NHẬP KHÁC -->
        <tr class="text-gray-700">
            <td class="py-2 px-3 pl-6">(+) Thu Nhập Khác (Phiếu thu bổ sung)</td>
            <td class="py-2 px-3 text-right text-teal-700">${formatCurrency(data.totalThuKhac)} đ</td>
            <td class="py-2 px-3 text-right text-gray-500">${calcPct(data.totalThuKhac)}</td>
        </tr>

        <!-- = TỔNG DOANH THU -->
        <tr class="bg-cyan-50/50 font-bold text-gray-800 border-t border-cyan-200">
            <td class="py-2.5 px-3">(=) TỔNG DOANH THU</td>
            <td class="py-2.5 px-3 text-right text-cyan-700">${formatCurrency(data.tongDoanhThu)} đ</td>
            <td class="py-2.5 px-3 text-right text-cyan-700">—</td>
        </tr>

        <!-- 2. CHI PHÍ TRỰC TIẾP -->
        <tr class="text-gray-700">
            <td class="py-2 px-3 pl-6">(-) Chi phí HLV (Hoa hồng ca dạy)</td>
            <td class="py-2 px-3 text-right text-amber-700">${formatCurrency(data.totalHlvCost)} đ</td>
            <td class="py-2 px-3 text-right text-gray-500">${calcPct(data.totalHlvCost)}</td>
        </tr>

        <!-- = LỢI NHUẬN GỘP -->
        <tr class="bg-indigo-50/70 font-bold text-indigo-950 border-t border-b border-indigo-100">
            <td class="py-2.5 px-3">(=) LỢI NHUẬN GỘP (HBA Nhận)</td>
            <td class="py-2.5 px-3 text-right text-indigo-700">${formatCurrency(data.totalGrossProfit)} đ</td>
            <td class="py-2.5 px-3 text-right text-indigo-700">${calcPct(data.totalGrossProfit)}</td>
        </tr>

        <!-- 3. TỔNG CHI PHÍ CỐ ĐỊNH & VẬN HÀNH -->
        <tr class="bg-rose-50/40 font-bold text-gray-800">
            <td class="py-2.5 px-3">2. CHI PHÍ CỐ ĐỊNH & KHÁC (Đang tính)</td>
            <td class="py-2.5 px-3 text-right text-rose-700">${formatCurrency(data.totalActiveExpense)} đ</td>
            <td class="py-2.5 px-3 text-right text-rose-700">${calcPct(data.totalActiveExpense)}</td>
        </tr>

        <!-- Chi tiết các nhóm chi phí -->
        <tr class="text-xs text-gray-600">
            <td class="py-1.5 px-3 pl-6">• Mặt bằng & Thuê hồ bơi</td>
            <td class="py-1.5 px-3 text-right">${formatCurrency(data.expenseByGroup.mat_bang)} đ</td>
            <td class="py-1.5 px-3 text-right text-gray-400">${calcPct(data.expenseByGroup.mat_bang)}</td>
        </tr>
        <tr class="text-xs text-gray-600">
            <td class="py-1.5 px-3 pl-6">• Lương nhân sự (Lễ tân, cứu hộ, tạp vụ)</td>
            <td class="py-1.5 px-3 text-right">${formatCurrency(data.expenseByGroup.nhan_su)} đ</td>
            <td class="py-1.5 px-3 text-right text-gray-400">${calcPct(data.expenseByGroup.nhan_su)}</td>
        </tr>
        <tr class="text-xs text-gray-600">
            <td class="py-1.5 px-3 pl-6">• Tiện ích (Điện, nước, internet)</td>
            <td class="py-1.5 px-3 text-right">${formatCurrency(data.expenseByGroup.van_hanh)} đ</td>
            <td class="py-1.5 px-3 text-right text-gray-400">${calcPct(data.expenseByGroup.van_hanh)}</td>
        </tr>
        <tr class="text-xs text-gray-600">
            <td class="py-1.5 px-3 pl-6">• Hóa chất & Bảo trì thiết bị</td>
            <td class="py-1.5 px-3 text-right">${formatCurrency(data.expenseByGroup.hoa_chat)} đ</td>
            <td class="py-1.5 px-3 text-right text-gray-400">${calcPct(data.expenseByGroup.hoa_chat)}</td>
        </tr>
        <tr class="text-xs text-gray-600">
            <td class="py-1.5 px-3 pl-6">• Marketing & Dụng cụ dạy bơi</td>
            <td class="py-1.5 px-3 text-right">${formatCurrency(data.expenseByGroup.marketing)} đ</td>
            <td class="py-1.5 px-3 text-right text-gray-400">${calcPct(data.expenseByGroup.marketing)}</td>
        </tr>
        <tr class="text-xs text-gray-600">
            <td class="py-1.5 px-3 pl-6">• Chi phí khác (Tùy biến)</td>
            <td class="py-1.5 px-3 text-right">${formatCurrency(data.expenseByGroup.chi_phi_khac)} đ</td>
            <td class="py-1.5 px-3 text-right text-gray-400">${calcPct(data.expenseByGroup.chi_phi_khac)}</td>
        </tr>

        <!-- = LỢI NHUẬN RÒNG -->
        <tr class="${data.netProfit >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'} font-bold text-base border-t-2 border-gray-300">
            <td class="py-3 px-3">(=) LỢI NHUẬN RÒNG (EBITDA)</td>
            <td class="py-3 px-3 text-right ${data.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}">${formatCurrency(data.netProfit)} đ</td>
            <td class="py-3 px-3 text-right ${data.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}">${data.profitMargin}%</td>
        </tr>

        <!-- CHỈ SỐ HÒA VỐN -->
        <tr class="bg-gray-50 text-xs text-gray-600 font-medium">
            <td class="py-2 px-3 italic">Doanh thu cần đạt để Hòa Vốn:</td>
            <td colspan="2" class="py-2 px-3 text-right font-bold text-purple-700">${formatCurrency(data.breakEvenRevenue)} đ (~ ${data.breakEvenStudents} học viên)</td>
        </tr>
    `;

    tbody.innerHTML = html;
};

// Render Bảng Sổ Chi Phí & Checkbox tương tác trực tiếp
const renderExpenseTable = (expenses) => {
    const tbody = document.getElementById('expense-table-body');
    const badge = document.getElementById('expense-count-badge');
    if (!tbody) return;

    if (badge) badge.textContent = `${expenses.length} khoản`;

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <p class="mb-3">Chưa có khoản chi nào trong kỳ hạch toán này.</p>
                    <button onclick="window.handleQuickApplyTemplate()" class="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold py-2 px-4 rounded-lg text-xs transition-colors">
                        ⚡ Bấm vào đây để Áp Dụng Định Phí Mẫu Ngay
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    expenses.forEach((cp) => {
        const isActive = cp.isTinhKQKD !== false;
        const grp = EXPENSE_GROUPS[cp.nhomChiPhi] || EXPENSE_GROUPS.chi_phi_khac;
        const ngayChiStr = cp.ngayChi ? formatDateForDisplay(cp.ngayChi) : (cp.thangNam || 'N/A');

        html += `
            <tr class="hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-50 bg-gray-50' : ''}">
                <td class="py-2.5 px-3 text-center">
                    <input type="checkbox" ${isActive ? 'checked' : ''} 
                           onchange="window.handleToggleExpense('${cp.id}', ${isActive})" 
                           class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                           title="${isActive ? 'Đang tính vào KQKD (Click để bỏ tính)' : 'Đang tạm dừng tính (Click để bật tính)'}">
                </td>
                <td class="py-2.5 px-3">
                    <div class="font-medium text-gray-900 ${!isActive ? 'line-through text-gray-400' : ''}">${cp.tenChiPhi}</div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${grp.badgeClass}">
                            ${grp.label}
                        </span>
                        ${cp.ghiChu ? `<span class="text-xs text-gray-400 truncate max-w-[200px]" title="${cp.ghiChu}">• ${cp.ghiChu}</span>` : ''}
                    </div>
                </td>
                <td class="py-2.5 px-3 text-right font-bold ${isActive ? 'text-rose-700' : 'text-gray-400 line-through'}">
                    ${formatCurrency(cp.soTien)} đ
                </td>
                <td class="py-2.5 px-3 text-center text-xs text-gray-500 whitespace-nowrap">
                    ${ngayChiStr}
                </td>
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                    <button onclick="window.handleEditExpense('${cp.id}')" class="text-indigo-600 hover:text-indigo-900 p-1 mr-1" title="Sửa">
                        ✏️
                    </button>
                    <button onclick="window.handleDeleteExpense('${cp.id}', '${cp.tenChiPhi.replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900 p-1" title="Xóa">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

// Render Bảng Sổ Thu Khác & Checkbox tương tác trực tiếp
const renderThuKhacTable = (thuKhacList) => {
    const tbody = document.getElementById('income-table-body');
    const badge = document.getElementById('income-count-badge');
    if (!tbody) return;

    if (badge) badge.textContent = `${thuKhacList.length} phiếu`;

    if (thuKhacList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <p class="mb-3">Chưa có phiếu thu khác nào trong kỳ hạch toán này.</p>
                    <button onclick="window.handleOpenThuKhacModalQuick()" class="bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 font-semibold py-2 px-4 rounded-lg text-xs transition-colors">
                        ➕ Bấm vào đây để Thêm Phiếu Thu Mới
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    thuKhacList.forEach((tk) => {
        const isActive = tk.isTinhKQKD !== false;
        const ngayThuStr = tk.ngayThu ? formatDateForDisplay(tk.ngayThu) : (tk.thangNam || 'N/A');

        html += `
            <tr class="hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-50 bg-gray-50' : ''}">
                <td class="py-2.5 px-3 text-center">
                    <input type="checkbox" ${isActive ? 'checked' : ''} 
                           onchange="window.handleToggleThuKhac('${tk.id}', ${isActive})" 
                           class="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded border-gray-300 cursor-pointer"
                           title="${isActive ? 'Đang tính vào KQKD (Click để bỏ tính)' : 'Đang tạm dừng tính (Click để bật tính)'}">
                </td>
                <td class="py-2.5 px-3">
                    <div class="font-medium text-gray-900 ${!isActive ? 'line-through text-gray-400' : ''}">${tk.tenKhoanThu}</div>
                    ${tk.ghiChu ? `<div class="text-xs text-gray-400 truncate max-w-[250px]" title="${tk.ghiChu}">• ${tk.ghiChu}</div>` : ''}
                </td>
                <td class="py-2.5 px-3 text-right font-bold ${isActive ? 'text-teal-700' : 'text-gray-400 line-through'}">
                    ${formatCurrency(tk.soTien)} đ
                </td>
                <td class="py-2.5 px-3 text-center text-xs text-gray-500 whitespace-nowrap">
                    ${ngayThuStr}
                </td>
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                    <button onclick="window.handleEditThuKhac('${tk.id}')" class="text-teal-600 hover:text-teal-900 p-1 mr-1" title="Sửa">
                        ✏️
                    </button>
                    <button onclick="window.handleDeleteThuKhac('${tk.id}', '${(tk.tenKhoanThu || '').replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900 p-1" title="Xóa">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.handleOpenThuKhacModalQuick = () => {
    openThuKhacModal();
};

// =========================================================================
// --- THAO TÁC SỔ CHI PHÍ (CRUD & CHECKBOX TOGGLE) ---
// =========================================================================

// Bật/tắt Checkbox tính KQKD
window.handleToggleExpense = async (expenseId, currentStatus) => {
    try {
        const cp = globalChiPhiList.find(c => c.id === expenseId);
        if (cp) {
            cp.isTinhKQKD = !currentStatus;
            calculateAndRenderKQKD();
            await saveChiPhiToFirestore();
        }
    } catch (error) {
        showModal(`Lỗi cập nhật trạng thái chi phí: ${error.message}`, "Lỗi");
    }
};

// Bật tất cả / Bỏ chọn tất cả chi phí trong kỳ đang xem
const handleToggleAllExpensesInView = async () => {
    if (!currentKqkdSummaryData || !currentKqkdSummaryData.filteredExpenses || currentKqkdSummaryData.filteredExpenses.length === 0) {
        showModal("Không có khoản chi nào trong kỳ này.", "Thông báo");
        return;
    }

    const expenses = currentKqkdSummaryData.filteredExpenses;
    const hasInactive = expenses.some(cp => cp.isTinhKQKD === false);
    const targetStatus = hasInactive; // Nếu có mục chưa tick thì tick hết, ngược lại bỏ tick hết

    try {
        expenses.forEach(targetCp => {
            const cp = globalChiPhiList.find(c => c.id === targetCp.id);
            if (cp) cp.isTinhKQKD = targetStatus;
        });
        calculateAndRenderKQKD();
        await saveChiPhiToFirestore();
        showModal(`Đã ${targetStatus ? 'BẬT' : 'TẮT'} tính vào KQKD cho ${expenses.length} khoản chi.`, "Thành công");
    } catch (error) {
        showModal(`Lỗi cập nhật hàng loạt: ${error.message}`, "Lỗi");
    }
};

// Mở modal Thêm/Sửa Chi Phí
const openExpenseModal = (expenseData = null) => {
    const modal = document.getElementById('kqkd-expense-modal');
    const form = document.getElementById('kqkd-expense-form');
    const title = document.getElementById('kqkd-exp-modal-title');
    if (!modal || !form) return;

    form.reset();
    currentEditingExpenseId = expenseData ? expenseData.id : null;

    if (expenseData) {
        if (title) title.innerHTML = '<span>✏️</span> <span>Sửa Khoản Chi Phí</span>';
        document.getElementById('kqkd-exp-id').value = expenseData.id;
        document.getElementById('kqkd-exp-name').value = expenseData.tenChiPhi || '';
        document.getElementById('kqkd-exp-group').value = expenseData.nhomChiPhi || 'mat_bang';
        document.getElementById('kqkd-exp-amount').value = expenseData.soTien || 0;
        document.getElementById('kqkd-exp-month').value = expenseData.thangNam || currentKqkdMonth;
        
        if (expenseData.ngayChi) {
            const d = getExpenseDate(expenseData);
            document.getElementById('kqkd-exp-date').value = formatDateForInput(d);
        } else {
            document.getElementById('kqkd-exp-date').value = formatDateForInput(new Date());
        }

        document.getElementById('kqkd-exp-active').checked = expenseData.isTinhKQKD !== false;
        document.getElementById('kqkd-exp-note').value = expenseData.ghiChu || '';
    } else {
        if (title) title.innerHTML = '<span>➕</span> <span>Thêm Khoản Chi Phí</span>';
        document.getElementById('kqkd-exp-id').value = '';
        document.getElementById('kqkd-exp-month').value = currentKqkdMonth || formatMonthForInput(new Date());
        document.getElementById('kqkd-exp-date').value = formatDateForInput(new Date());
        document.getElementById('kqkd-exp-active').checked = true;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

const closeExpenseModal = () => {
    const modal = document.getElementById('kqkd-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentEditingExpenseId = null;
};

// Submit form Thêm / Sửa Chi Phí
const handleExpenseFormSubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('kqkd-exp-save-btn');
    const spinner = document.getElementById('kqkd-exp-spinner');

    if (saveBtn) saveBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');

    try {
        const id = document.getElementById('kqkd-exp-id').value;
        const tenChiPhi = document.getElementById('kqkd-exp-name').value.trim();
        const nhomChiPhi = document.getElementById('kqkd-exp-group').value;
        const soTien = Number(document.getElementById('kqkd-exp-amount').value) || 0;
        const thangNam = document.getElementById('kqkd-exp-month').value;
        const ngayChiStr = document.getElementById('kqkd-exp-date').value;
        const isTinhKQKD = document.getElementById('kqkd-exp-active').checked;
        const ghiChu = document.getElementById('kqkd-exp-note').value.trim();

        if (!tenChiPhi) throw new Error("Vui lòng nhập tên khoản chi.");
        if (soTien < 0) throw new Error("Số tiền không hợp lệ.");

        if (id) {
            const cp = globalChiPhiList.find(c => c.id === id);
            if (cp) {
                cp.tenChiPhi = tenChiPhi;
                cp.nhomChiPhi = nhomChiPhi;
                cp.soTien = soTien;
                cp.thangNam = thangNam;
                cp.ngayChi = ngayChiStr;
                cp.isTinhKQKD = isTinhKQKD;
                cp.ghiChu = ghiChu;
                cp.ngayCapNhat = new Date().toISOString();
            }
            await saveChiPhiToFirestore();
            showModal(`Đã cập nhật khoản chi "${tenChiPhi}".`, "Thành công");
        } else {
            const newExpense = {
                id: 'cp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                tenChiPhi,
                nhomChiPhi,
                soTien,
                thangNam,
                isTinhKQKD,
                ghiChu,
                ngayChi: ngayChiStr || `${thangNam}-01`,
                nguoiTaoEmail: currentUser ? currentUser.email : 'admin',
                ngayTao: new Date().toISOString()
            };
            globalChiPhiList.unshift(newExpense);
            await saveChiPhiToFirestore();
            showModal(`Đã thêm khoản chi "${tenChiPhi}".`, "Thành công");
        }

        calculateAndRenderKQKD();
        closeExpenseModal();
    } catch (error) {
        showModal(`Lỗi lưu chi phí: ${error.message}`, "Lỗi");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
};

// Sửa khoản chi từ bảng
window.handleEditExpense = (expenseId) => {
    const cp = globalChiPhiList.find(c => c.id === expenseId);
    if (cp) {
        openExpenseModal(cp);
    }
};

// Xoá khoản chi
window.handleDeleteExpense = async (expenseId, expenseName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khoản chi "${expenseName}"?`)) return;

    try {
        globalChiPhiList = globalChiPhiList.filter(c => c.id !== expenseId);
        calculateAndRenderKQKD();
        await saveChiPhiToFirestore();
        showModal(`Đã xóa khoản chi "${expenseName}".`, "Thành công");
    } catch (error) {
        showModal(`Lỗi xóa chi phí: ${error.message}`, "Lỗi");
    }
};

// =========================================================================
// --- THAO TÁC SỔ THU KHÁC (CRUD & CHECKBOX TOGGLE) ---
// =========================================================================

// Bật/tắt Checkbox tính KQKD cho Thu Khác
window.handleToggleThuKhac = async (incomeId, currentStatus) => {
    try {
        const tk = globalThuKhacList.find(t => t.id === incomeId);
        if (tk) {
            tk.isTinhKQKD = !currentStatus;
            calculateAndRenderKQKD();
            await saveThuKhacToFirestore();
        }
    } catch (error) {
        showModal(`Lỗi cập nhật trạng thái phiếu thu: ${error.message}`, "Lỗi");
    }
};

// Bật tất cả / Bỏ chọn tất cả thu khác trong kỳ đang xem
const handleToggleAllThuKhacInView = async () => {
    if (!currentKqkdSummaryData || !currentKqkdSummaryData.filteredThuKhac || currentKqkdSummaryData.filteredThuKhac.length === 0) {
        showModal("Không có phiếu thu nào trong kỳ này.", "Thông báo");
        return;
    }

    const incomeList = currentKqkdSummaryData.filteredThuKhac;
    const hasInactive = incomeList.some(tk => tk.isTinhKQKD === false);
    const targetStatus = hasInactive; // Nếu có mục chưa tick thì tick hết, ngược lại bỏ tick hết

    try {
        incomeList.forEach(targetTk => {
            const tk = globalThuKhacList.find(t => t.id === targetTk.id);
            if (tk) tk.isTinhKQKD = targetStatus;
        });
        calculateAndRenderKQKD();
        await saveThuKhacToFirestore();
        showModal(`Đã ${targetStatus ? 'BẬT' : 'TẮT'} tính vào KQKD cho ${incomeList.length} phiếu thu.`, "Thành công");
    } catch (error) {
        showModal(`Lỗi cập nhật hàng loạt: ${error.message}`, "Lỗi");
    }
};

// Mở modal Thêm/Sửa Phiếu Thu Khác
const openThuKhacModal = (incomeData = null) => {
    const modal = document.getElementById('kqkd-income-modal');
    const form = document.getElementById('kqkd-income-form');
    const title = document.getElementById('kqkd-income-modal-title');
    if (!modal || !form) return;

    form.reset();
    currentEditingIncomeId = incomeData ? incomeData.id : null;

    if (incomeData) {
        if (title) title.innerHTML = '<span>✏️</span> <span>Sửa Phiếu Thu Khác</span>';
        document.getElementById('kqkd-income-id').value = incomeData.id;
        document.getElementById('kqkd-income-name').value = incomeData.tenKhoanThu || '';
        document.getElementById('kqkd-income-amount').value = incomeData.soTien || 0;
        document.getElementById('kqkd-income-month').value = incomeData.thangNam || currentKqkdMonth;

        if (incomeData.ngayThu) {
            const d = getIncomeDate(incomeData);
            document.getElementById('kqkd-income-date').value = formatDateForInput(d);
        } else {
            document.getElementById('kqkd-income-date').value = formatDateForInput(new Date());
        }

        document.getElementById('kqkd-income-active').checked = incomeData.isTinhKQKD !== false;
        document.getElementById('kqkd-income-note').value = incomeData.ghiChu || '';
    } else {
        if (title) title.innerHTML = '<span>💰</span> <span>Thêm Phiếu Thu Khác</span>';
        document.getElementById('kqkd-income-id').value = '';
        document.getElementById('kqkd-income-month').value = currentKqkdMonth || formatMonthForInput(new Date());
        document.getElementById('kqkd-income-date').value = formatDateForInput(new Date());
        document.getElementById('kqkd-income-active').checked = true;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

const closeThuKhacModal = () => {
    const modal = document.getElementById('kqkd-income-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentEditingIncomeId = null;
};

// Submit form Thêm / Sửa Phiếu Thu Khác
const handleThuKhacFormSubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('kqkd-income-save-btn');
    const spinner = document.getElementById('kqkd-income-spinner');

    if (saveBtn) saveBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');

    try {
        const id = document.getElementById('kqkd-income-id').value;
        const tenKhoanThu = document.getElementById('kqkd-income-name').value.trim();
        const soTien = Number(document.getElementById('kqkd-income-amount').value) || 0;
        let thangNam = document.getElementById('kqkd-income-month').value;
        const ngayThuStr = document.getElementById('kqkd-income-date').value;
        const isTinhKQKD = document.getElementById('kqkd-income-active').checked;
        const ghiChu = document.getElementById('kqkd-income-note').value.trim();

        if (!tenKhoanThu) throw new Error("Vui lòng nhập tên khoản thu.");
        if (soTien < 0) throw new Error("Số tiền không hợp lệ.");
        if (!thangNam && ngayThuStr) {
            thangNam = ngayThuStr.substring(0, 7);
        }

        if (id) {
            const tk = globalThuKhacList.find(t => t.id === id);
            if (tk) {
                tk.tenKhoanThu = tenKhoanThu;
                tk.soTien = soTien;
                tk.thangNam = thangNam;
                tk.ngayThu = ngayThuStr;
                tk.isTinhKQKD = isTinhKQKD;
                tk.ghiChu = ghiChu;
                tk.ngayCapNhat = new Date().toISOString();
            }
            await saveThuKhacToFirestore();
            showModal(`Đã cập nhật phiếu thu "${tenKhoanThu}".`, "Thành công");
        } else {
            const newIncome = {
                id: 'thu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                tenKhoanThu,
                soTien,
                thangNam,
                ngayThu: ngayThuStr || `${thangNam}-01`,
                isTinhKQKD,
                ghiChu,
                nguoiTaoEmail: currentUser ? currentUser.email : 'admin',
                ngayTao: new Date().toISOString()
            };
            globalThuKhacList.unshift(newIncome);
            await saveThuKhacToFirestore();
            showModal(`Đã thêm phiếu thu "${tenKhoanThu}".`, "Thành công");
        }

        calculateAndRenderKQKD();
        closeThuKhacModal();
    } catch (error) {
        showModal(`Lỗi lưu phiếu thu: ${error.message}`, "Lỗi");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
};

// Sửa phiếu thu từ bảng
window.handleEditThuKhac = (incomeId) => {
    const tk = globalThuKhacList.find(t => t.id === incomeId);
    if (tk) {
        openThuKhacModal(tk);
    }
};

// Xoá phiếu thu
window.handleDeleteThuKhac = async (incomeId, incomeName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phiếu thu "${incomeName}"?`)) return;

    try {
        globalThuKhacList = globalThuKhacList.filter(t => t.id !== incomeId);
        calculateAndRenderKQKD();
        await saveThuKhacToFirestore();
        showModal(`Đã xóa phiếu thu "${incomeName}".`, "Thành công");
    } catch (error) {
        showModal(`Lỗi xóa phiếu thu: ${error.message}`, "Lỗi");
    }
};

// =========================================================================
// --- ĐỊNH PHÍ MẪU & ÁP DỤNG ĐỊNH PHÍ ---
// =========================================================================

// Nạp nhanh định phí mẫu từ banner khi bảng trống
window.handleQuickApplyTemplate = () => {
    handleApplyDinhPhiMau();
};

// Áp dụng định phí mẫu sang kỳ đang xem
async function handleApplyDinhPhiMau() {
    if (globalDinhPhiMauList.length === 0) {
        globalDinhPhiMauList = JSON.parse(JSON.stringify(DEFAULT_DINH_PHI_MAU));
        await saveDinhPhiMauToFirestore();
    }

    const targetMonth = currentKqkdMonth || formatMonthForInput(new Date());
    const activeTemplates = globalDinhPhiMauList.filter(t => t.isTinhKQKD !== false);

    if (activeTemplates.length === 0) {
        showModal("Không có định phí mẫu nào đang ở trạng thái kích hoạt.", "Thông báo");
        return;
    }

    const existingInMonth = globalChiPhiList.filter(cp => cp.thangNam === targetMonth);
    let msg = `Hệ thống sẽ sao chép ${activeTemplates.length} khoản định phí mẫu vào tháng [${targetMonth}].\nBạn có muốn tiếp tục?`;
    if (existingInMonth.length > 0) {
        msg = `Tháng [${targetMonth}] hiện đã có ${existingInMonth.length} khoản chi.\nBạn có muốn nạp thêm ${activeTemplates.length} khoản định phí mẫu vào tháng này không?`;
    }

    const confirmApply = confirm(msg);
    if (!confirmApply) return;

    try {
        const nowStr = new Date().toISOString();
        const defaultDateStr = `${targetMonth}-01`;

        activeTemplates.forEach((tpl) => {
            const newExpense = {
                id: 'cp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                tenChiPhi: tpl.tenChiPhi,
                nhomChiPhi: tpl.nhomChiPhi || 'mat_bang',
                soTien: Number(tpl.soTienMacDinh) || 0,
                thangNam: targetMonth,
                isTinhKQKD: true,
                ghiChu: tpl.ghiChu || 'Định phí hàng tháng',
                ngayChi: defaultDateStr,
                nguoiTaoEmail: currentUser ? currentUser.email : 'admin',
                ngayTao: nowStr
            };
            globalChiPhiList.unshift(newExpense);
        });

        await saveChiPhiToFirestore();
        calculateAndRenderKQKD();
        showModal(`Đã áp dụng thành công ${activeTemplates.length} khoản định phí vào tháng ${targetMonth}.`, "Thành công");
    } catch (error) {
        showModal(`Lỗi áp dụng định phí: ${error.message}`, "Lỗi");
    }
}

// Khởi tạo 12 định phí mẫu chuẩn cho Hồ bơi Q6
async function handleInitDefaultDinhPhiMau() {
    try {
        globalDinhPhiMauList = JSON.parse(JSON.stringify(DEFAULT_DINH_PHI_MAU));
        await saveDinhPhiMauToFirestore();
        renderTemplateListModal();
        showModal("Đã nạp thành công 12 danh mục chi phí định kỳ chuẩn của Hồ bơi Q6!", "Thành công");
    } catch (error) {
        showModal(`Lỗi khởi tạo định phí mẫu: ${error.message}`, "Lỗi");
    }
}

// Mở modal Định Phí Mẫu
function openTemplateModal() {
    const modal = document.getElementById('kqkd-template-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    renderTemplateListModal();
}

function closeTemplateModal() {
    const modal = document.getElementById('kqkd-template-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Render bảng danh mục định phí mẫu trong modal
function renderTemplateListModal() {
    const tbody = document.getElementById('tpl-table-body');
    if (!tbody) return;

    if (globalDinhPhiMauList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-6 text-center text-gray-500">
                    Danh mục định phí mẫu đang trống. Bấm nút <strong>"Nạp Danh Mục Gợi Ý Hồ Bơi Q6"</strong> ở trên để tạo nhanh.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    globalDinhPhiMauList.forEach((tpl) => {
        const isActive = tpl.isTinhKQKD !== false;
        const grp = EXPENSE_GROUPS[tpl.nhomChiPhi] || EXPENSE_GROUPS.chi_phi_khac;

        html += `
            <tr class="hover:bg-gray-50">
                <td class="py-2.5 px-3 text-center">
                    <input type="checkbox" ${isActive ? 'checked' : ''} 
                           onchange="window.handleToggleTemplateActive('${tpl.id}', ${isActive})" 
                           class="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded border-gray-300 cursor-pointer"
                           title="${isActive ? 'Đang bật mặc định' : 'Đang tắt mặc định'}">
                </td>
                <td class="py-2.5 px-3">
                    <div class="font-medium text-gray-900 ${!isActive ? 'text-gray-400 line-through' : ''}">${tpl.tenChiPhi}</div>
                    <span class="inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${grp.badgeClass} mt-0.5">
                        ${grp.label}
                    </span>
                </td>
                <td class="py-2.5 px-3 text-right font-bold text-gray-800">
                    ${formatCurrency(tpl.soTienMacDinh)} đ
                </td>
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                    <button onclick="window.handleEditTemplateAmount('${tpl.id}', ${tpl.soTienMacDinh})" class="text-indigo-600 hover:text-indigo-900 p-1 mr-1" title="Sửa số tiền">
                        ✏️
                    </button>
                    <button onclick="window.handleDeleteTemplate('${tpl.id}', '${tpl.tenChiPhi.replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900 p-1" title="Xóa">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

// Bật/tắt mặc định template
window.handleToggleTemplateActive = async (templateId, currentStatus) => {
    try {
        const tpl = globalDinhPhiMauList.find(t => t.id === templateId);
        if (tpl) {
            tpl.isTinhKQKD = !currentStatus;
            renderTemplateListModal();
            await saveDinhPhiMauToFirestore();
        }
    } catch (error) {
        showModal(`Lỗi cập nhật định phí mẫu: ${error.message}`, "Lỗi");
    }
};

// Sửa số tiền mặc định của định phí mẫu
window.handleEditTemplateAmount = async (templateId, currentAmount) => {
    const newAmountStr = prompt("Nhập số tiền mặc định mới (VNĐ):", currentAmount);
    if (newAmountStr === null) return;
    const newAmount = Number(newAmountStr);
    if (isNaN(newAmount) || newAmount < 0) {
        showModal("Số tiền không hợp lệ.", "Lỗi");
        return;
    }

    try {
        const tpl = globalDinhPhiMauList.find(t => t.id === templateId);
        if (tpl) {
            tpl.soTienMacDinh = newAmount;
            renderTemplateListModal();
            await saveDinhPhiMauToFirestore();
            showModal("Đã cập nhật số tiền định phí mẫu.", "Thành công");
        }
    } catch (error) {
        showModal(`Lỗi cập nhật: ${error.message}`, "Lỗi");
    }
};

// Xóa định phí mẫu
window.handleDeleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa định phí mẫu "${templateName}"?`)) return;
    try {
        globalDinhPhiMauList = globalDinhPhiMauList.filter(t => t.id !== templateId);
        renderTemplateListModal();
        await saveDinhPhiMauToFirestore();
        showModal(`Đã xóa "${templateName}".`, "Thành công");
    } catch (error) {
        showModal(`Lỗi xóa: ${error.message}`, "Lỗi");
    }
};

// Thêm định phí mẫu mới
const handleAddNewTemplatePrompt = async () => {
    const tenChiPhi = prompt("Nhập tên khoản chi phí mẫu mới:");
    if (!tenChiPhi || !tenChiPhi.trim()) return;

    const soTienStr = prompt("Nhập số tiền mặc định hàng tháng (VNĐ):", "1000000");
    if (soTienStr === null) return;
    const soTienMacDinh = Number(soTienStr) || 0;

    try {
        const newTpl = {
            id: 'mau_' + Date.now(),
            tenChiPhi: tenChiPhi.trim(),
            nhomChiPhi: 'chi_phi_khac',
            soTienMacDinh: soTienMacDinh,
            isTinhKQKD: true,
            isCustom: true,
            thuTu: globalDinhPhiMauList.length + 1,
            ngayTao: new Date().toISOString()
        };
        globalDinhPhiMauList.push(newTpl);
        renderTemplateListModal();
        await saveDinhPhiMauToFirestore();
        showModal(`Đã thêm định phí mẫu "${tenChiPhi}".`, "Thành công");
    } catch (error) {
        showModal(`Lỗi thêm định phí mẫu: ${error.message}`, "Lỗi");
    }
};

// =========================================================================
// --- IN BÁO CÁO KQKD & XUẤT EXCEL TÀI CHÍNH ---
// =========================================================================

// In Báo Cáo KQKD (Khổ A4 chuẩn)
const handlePrintKQKD = () => {
    if (!currentKqkdSummaryData) {
        showModal("Chưa có dữ liệu báo cáo để in.", "Lỗi");
        return;
    }

    const data = currentKqkdSummaryData;
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    let expenseRowsHtml = '';
    data.filteredExpenses.forEach((cp, idx) => {
        const isActive = cp.isTinhKQKD !== false;
        const grp = EXPENSE_GROUPS[cp.nhomChiPhi] || EXPENSE_GROUPS.chi_phi_khac;
        expenseRowsHtml += `
            <tr style="border-bottom: 1px solid #ddd; ${!isActive ? 'text-decoration: line-through; color: #999;' : ''}">
                <td style="padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="padding: 6px;">${cp.tenChiPhi}</td>
                <td style="padding: 6px; font-size: 11px;">${grp.label}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold;">${formatCurrency(cp.soTien)} đ</td>
                <td style="padding: 6px; text-align: center;">${isActive ? 'Có tính' : 'Không tính'}</td>
            </tr>
        `;
    });

    let incomeRowsHtml = '';
    if (data.filteredThuKhac && data.filteredThuKhac.length > 0) {
        data.filteredThuKhac.forEach((tk, idx) => {
            const isActive = tk.isTinhKQKD !== false;
            const ngayThuStr = tk.ngayThu ? formatDateForDisplay(tk.ngayThu) : (tk.thangNam || '');
            incomeRowsHtml += `
                <tr style="border-bottom: 1px solid #ddd; ${!isActive ? 'text-decoration: line-through; color: #999;' : ''}">
                    <td style="padding: 6px; text-align: center;">${idx + 1}</td>
                    <td style="padding: 6px;">${tk.tenKhoanThu}</td>
                    <td style="padding: 6px; text-align: right; font-weight: bold;">${formatCurrency(tk.soTien)} đ</td>
                    <td style="padding: 6px; text-align: center;">${ngayThuStr}</td>
                    <td style="padding: 6px; text-align: center;">${isActive ? 'Có tính' : 'Không tính'}</td>
                </tr>
            `;
        });
    }

    const printHtml = `
        <div style="font-family: 'Times New Roman', serif; padding: 20px; color: #000; max-width: 800px; margin: auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0; font-size: 16px; text-transform: uppercase; font-weight: bold;">TRUNG TÂM DẠY BƠI HBA - HỒ BƠI QUẬN 6</h3>
                    <p style="margin: 2px 0 0 0; font-size: 13px;">Địa chỉ: Hồ bơi Phú Lâm, Quận 6, TP.HCM</p>
                </div>
                <div style="text-align: right; font-size: 13px;">
                    <p style="margin: 0;">Ngày in: ${formatDateForDisplay(new Date())}</p>
                    <p style="margin: 2px 0 0 0;">Người lập: ${currentUser ? currentUser.email : 'Admin'}</p>
                </div>
            </div>

            <!-- Title -->
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase;">BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)</h1>
                <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: bold; font-style: italic;">Kỳ hạch toán: ${data.periodLabel}</p>
            </div>

            <!-- Bảng P&L Tổng hợp -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f2f2f2; border: 1px solid #333;">
                        <th style="padding: 8px; text-align: left; border: 1px solid #333;">CHỈ TIÊU HẠCH TOÁN</th>
                        <th style="padding: 8px; text-align: right; border: 1px solid #333; width: 180px;">SỐ TIỀN (VNĐ)</th>
                        <th style="padding: 8px; text-align: right; border: 1px solid #333; width: 110px;">% DOANH THU</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="font-weight: bold; background-color: #f9f9f9;">
                        <td style="padding: 8px; border: 1px solid #333;">1. DOANH THU THUẦN (Học phí ghi danh - ${data.studentCount} HV)</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.totalRevenue)} đ</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${data.tongDoanhThu > 0 ? ((data.totalRevenue / data.tongDoanhThu) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #333; padding-left: 20px;">(+) Thu Nhập Khác (Phiếu thu bổ sung - ${data.activeThuKhacCount} phiếu)</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.totalThuKhac)} đ</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${data.tongDoanhThu > 0 ? ((data.totalThuKhac / data.tongDoanhThu) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #f0fdfa;">
                        <td style="padding: 8px; border: 1px solid #333;">(=) TỔNG DOANH THU</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.tongDoanhThu)} đ</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">100.0%</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #333; padding-left: 20px;">(-) Chi phí trực tiếp: Hoa hồng HLV ca dạy</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.totalHlvCost)} đ</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${data.tongDoanhThu > 0 ? ((data.totalHlvCost / data.tongDoanhThu) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #eef2ff;">
                        <td style="padding: 8px; border: 1px solid #333;">(=) LỢI NHUẬN GỘP (Phần HBA giữ lại)</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.totalGrossProfit)} đ</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${data.tongDoanhThu > 0 ? ((data.totalGrossProfit / data.tongDoanhThu) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #fff1f2;">
                        <td style="padding: 8px; border: 1px solid #333;">2. CHI PHÍ CỐ ĐỊNH & VẬN HÀNH (Đã tick tính)</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.totalActiveExpense)} đ</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #333;">${data.tongDoanhThu > 0 ? ((data.totalActiveExpense / data.tongDoanhThu) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr style="font-size: 13px;">
                        <td style="padding: 4px 8px 4px 25px; border: 1px solid #333;">• Tiền thuê mặt bằng / làn bơi</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.expenseByGroup.mat_bang)} đ</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;"></td>
                    </tr>
                    <tr style="font-size: 13px;">
                        <td style="padding: 4px 8px 4px 25px; border: 1px solid #333;">• Lương nhân sự (Lễ tân, cứu hộ, tạp vụ)</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.expenseByGroup.nhan_su)} đ</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;"></td>
                    </tr>
                    <tr style="font-size: 13px;">
                        <td style="padding: 4px 8px 4px 25px; border: 1px solid #333;">• Tiện ích điện, nước sạch, internet</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.expenseByGroup.van_hanh)} đ</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;"></td>
                    </tr>
                    <tr style="font-size: 13px;">
                        <td style="padding: 4px 8px 4px 25px; border: 1px solid #333;">• Hóa chất xử lý nước hồ & bảo trì</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.expenseByGroup.hoa_chat)} đ</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;"></td>
                    </tr>
                    <tr style="font-size: 13px;">
                        <td style="padding: 4px 8px 4px 25px; border: 1px solid #333;">• Marketing & Dụng cụ dạy bơi</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.expenseByGroup.marketing)} đ</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;"></td>
                    </tr>
                    <tr style="font-size: 13px;">
                        <td style="padding: 4px 8px 4px 25px; border: 1px solid #333;">• Chi phí khác (Tùy biến)</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;">${formatCurrency(data.expenseByGroup.chi_phi_khac)} đ</td>
                        <td style="padding: 4px 8px; text-align: right; border: 1px solid #333;"></td>
                    </tr>
                    <tr style="font-weight: bold; font-size: 16px; background-color: ${data.netProfit >= 0 ? '#ecfdf5' : '#fef2f2'}; border: 2px solid #000;">
                        <td style="padding: 10px; border: 1px solid #333;">(=) LỢI NHUẬN RÒNG (EBITDA) - [${data.netProfit >= 0 ? 'LÃI' : 'LỖ'}]</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #333;">${formatCurrency(data.netProfit)} đ</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #333;">${data.profitMargin}%</td>
                    </tr>
                </tbody>
            </table>

            <!-- Điểm hòa vốn -->
            <div style="background-color: #f8fafc; border: 1px dashed #64748b; padding: 10px; margin-bottom: 20px; font-size: 13px;">
                <strong>Phân tích điểm hòa vốn kỳ này:</strong> Doanh thu hòa vốn cần đạt là <strong>${formatCurrency(data.breakEvenRevenue)} đ</strong> (tương ứng khoảng <strong>${data.breakEvenStudents} học viên</strong> đóng học phí bình quân).
            </div>

            <!-- Bảng kê chi tiết chi phí -->
            <h4 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase;">Chi tiết các khoản chi trong kỳ:</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f2f2f2; border: 1px solid #ddd;">
                        <th style="padding: 6px; border: 1px solid #ddd; width: 35px;">STT</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Khoản Chi</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Nhóm</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">Số Tiền</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: center;">Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenseRowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 10px;">Không có khoản chi</td></tr>'}
                </tbody>
            </table>

            ${incomeRowsHtml ? `
            <!-- Bảng kê chi tiết thu khác -->
            <h4 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase;">Chi tiết các khoản thu khác trong kỳ:</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px;">
                <thead>
                    <tr style="background-color: #f2f2f2; border: 1px solid #ddd;">
                        <th style="padding: 6px; border: 1px solid #ddd; width: 35px;">STT</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Khoản Thu</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">Số Tiền</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: center;">Ngày Thu</th>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: center;">Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${incomeRowsHtml}
                </tbody>
            </table>
            ` : ''}

            <!-- Chữ ký -->
            <div style="display: flex; justify-content: space-between; text-align: center; font-size: 14px; margin-top: 40px;">
                <div style="width: 30%;">
                    <p style="font-weight: bold; margin: 0;">Người Lập Báo Cáo</p>
                    <p style="font-style: italic; font-size: 12px; margin: 3px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
                </div>
                <div style="width: 30%;">
                    <p style="font-weight: bold; margin: 0;">Kế Toán Trưởng</p>
                    <p style="font-style: italic; font-size: 12px; margin: 3px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
                </div>
                <div style="width: 30%;">
                    <p style="font-weight: bold; margin: 0;">Ban Quản Lý HBA Q6</p>
                    <p style="font-style: italic; font-size: 12px; margin: 3px 0 60px 0;">(Duyệt và đóng dấu)</p>
                </div>
            </div>
        </div>
    `;

    printSection.innerHTML = printHtml;
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing');
        printSection.classList.add('hidden');
    }, 250);
};

// Xuất Excel Báo Cáo KQKD (3 Sheet: P&L, Sổ Chi Phí, Sổ Thu Khác)
const handleExportExcelKQKD = () => {
    if (!currentKqkdSummaryData) {
        showModal("Chưa có dữ liệu báo cáo để xuất Excel.", "Lỗi");
        return;
    }

    if (typeof XLSX === 'undefined') {
        showModal("Thư viện Excel (XLSX) chưa sẵn sàng.", "Lỗi");
        return;
    }

    const data = currentKqkdSummaryData;
    const wb = XLSX.utils.book_new();

    // SHEET 1: KET_QUA_KINH_DOANH
    const pnlRows = [
        ["TRUNG TÂM DẠY BƠI HBA - HỒ BƠI QUẬN 6"],
        ["BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)"],
        [`Kỳ hạch toán: ${data.periodLabel}`, "", `Ngày xuất: ${formatDateForDisplay(new Date())}`],
        [""],
        ["CHỈ TIÊU HẠCH TOÁN", "SỐ TIỀN (VNĐ)", "TỶ LỆ (%)", "GHI CHÚ"],
        ["1. DOANH THU THUẦN TỪ HỌC PHÍ", data.totalRevenue, data.tongDoanhThu > 0 ? (data.totalRevenue / data.tongDoanhThu) : 0, `${data.studentCount} học viên mới`],
        ["(+) THU NHẬP KHÁC (Phiếu thu bổ sung)", data.totalThuKhac, data.tongDoanhThu > 0 ? (data.totalThuKhac / data.tongDoanhThu) : 0, `${data.activeThuKhacCount} phiếu thu`],
        ["(=) TỔNG DOANH THU", data.tongDoanhThu, 1, "Doanh thu học phí + thu khác"],
        ["(-) Chi phí HLV (Hoa hồng ca dạy)", data.totalHlvCost, data.tongDoanhThu > 0 ? (data.totalHlvCost / data.tongDoanhThu) : 0, "Chi trả cho Huấn luyện viên"],
        ["(=) LỢI NHUẬN GỘP (HBA Nhận)", data.totalGrossProfit, data.tongDoanhThu > 0 ? (data.totalGrossProfit / data.tongDoanhThu) : 0, "Phần trung tâm giữ lại"],
        ["2. TỔNG CHI PHÍ CỐ ĐỊNH & KHÁC", data.totalActiveExpense, data.tongDoanhThu > 0 ? (data.totalActiveExpense / data.tongDoanhThu) : 0, `${data.activeExpenseCount} khoản chi đang tính`],
        ["  • Mặt bằng & Thuê hồ bơi", data.expenseByGroup.mat_bang, data.tongDoanhThu > 0 ? (data.expenseByGroup.mat_bang / data.tongDoanhThu) : 0, ""],
        ["  • Lương nhân sự (Lễ tân, cứu hộ, tạp vụ)", data.expenseByGroup.nhan_su, data.tongDoanhThu > 0 ? (data.expenseByGroup.nhan_su / data.tongDoanhThu) : 0, ""],
        ["  • Tiện ích (Điện, nước, internet)", data.expenseByGroup.van_hanh, data.tongDoanhThu > 0 ? (data.expenseByGroup.van_hanh / data.tongDoanhThu) : 0, ""],
        ["  • Hóa chất xử lý nước hồ & bảo trì", data.expenseByGroup.hoa_chat, data.tongDoanhThu > 0 ? (data.expenseByGroup.hoa_chat / data.tongDoanhThu) : 0, ""],
        ["  • Marketing & Dụng cụ dạy bơi", data.expenseByGroup.marketing, data.tongDoanhThu > 0 ? (data.expenseByGroup.marketing / data.tongDoanhThu) : 0, ""],
        ["  • Chi phí khác (Tùy biến)", data.expenseByGroup.chi_phi_khac, data.tongDoanhThu > 0 ? (data.expenseByGroup.chi_phi_khac / data.tongDoanhThu) : 0, ""],
        ["(=) LỢI NHUẬN RÒNG (EBITDA)", data.netProfit, data.tongDoanhThu > 0 ? (data.netProfit / data.tongDoanhThu) : 0, data.netProfit >= 0 ? "LÃI" : "LỖ"],
        [""],
        ["PHÂN TÍCH ĐIỂM HÒA VỐN"],
        ["Doanh thu hòa vốn cần đạt:", data.breakEvenRevenue, "", "Doanh thu tối thiểu trang trải định phí"],
        ["Số học viên tối thiểu để hòa vốn:", data.breakEvenStudents, "", "Học viên"]
    ];

    const wsPnl = XLSX.utils.aoa_to_sheet(pnlRows);
    wsPnl['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsPnl, "KetQuaKinhDoanh");

    // SHEET 2: CHI_TIET_CHI_PHI
    const expenseRows = [
        ["DANH SÁCH CHI PHÍ CHI TIẾT TRONG KỲ"],
        [`Kỳ hạch toán: ${data.periodLabel}`],
        [""],
        ["STT", "TÊN KHOẢN CHI", "NHÓM CHI PHÍ", "SỐ TIỀN (VNĐ)", "TÍNH VÀO KQKD", "NGÀY CHI", "GHI CHÚ"]
    ];

    data.filteredExpenses.forEach((cp, idx) => {
        const isActive = cp.isTinhKQKD !== false;
        const grp = EXPENSE_GROUPS[cp.nhomChiPhi] || EXPENSE_GROUPS.chi_phi_khac;
        const ngayChiStr = cp.ngayChi ? formatDateForDisplay(cp.ngayChi) : (cp.thangNam || '');
        expenseRows.push([
            idx + 1,
            cp.tenChiPhi,
            grp.label,
            Number(cp.soTien) || 0,
            isActive ? "CÓ" : "KHÔNG",
            ngayChiStr,
            cp.ghiChu || ""
        ]);
    });

    expenseRows.push(["", "TỔNG CỘNG TẤT CẢ:", "", data.filteredExpenses.reduce((s, c) => s + (Number(c.soTien) || 0), 0)]);
    expenseRows.push(["", "TỔNG CHI PHÍ THỰC TÍNH KQKD:", "", data.totalActiveExpense]);

    const wsExp = XLSX.utils.aoa_to_sheet(expenseRows);
    wsExp['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsExp, "ChiTietChiPhi");

    // SHEET 3: CHI_TIET_THU_KHAC
    if (data.filteredThuKhac && data.filteredThuKhac.length > 0) {
        const incomeRows = [
            ["DANH SÁCH THU KHÁC (PHIẾU THU BỔ SUNG) TRONG KỲ"],
            [`Kỳ hạch toán: ${data.periodLabel}`],
            [""],
            ["STT", "TÊN KHOẢN THU", "SỐ TIỀN (VNĐ)", "TÍNH VÀO KQKD", "NGÀY THU", "GHI CHÚ"]
        ];

        data.filteredThuKhac.forEach((tk, idx) => {
            const isActive = tk.isTinhKQKD !== false;
            const ngayThuStr = tk.ngayThu ? formatDateForDisplay(tk.ngayThu) : (tk.thangNam || '');
            incomeRows.push([
                idx + 1,
                tk.tenKhoanThu,
                Number(tk.soTien) || 0,
                isActive ? "CÓ" : "KHÔNG",
                ngayThuStr,
                tk.ghiChu || ""
            ]);
        });

        incomeRows.push(["", "TỔNG CỘNG TẤT CẢ:", data.filteredThuKhac.reduce((s, t) => s + (Number(t.soTien) || 0), 0)]);
        incomeRows.push(["", "TỔNG THU KHÁC THỰC TÍNH KQKD:", data.totalThuKhac]);

        const wsInc = XLSX.utils.aoa_to_sheet(incomeRows);
        wsInc['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsInc, "SoThuKhac");
    }

    // Tải file về máy
    const cleanPeriod = data.periodLabel.replace(/[\/\\?%*:|"<>]/g, '_');
    const fileName = `Bao_Cao_KQKD_HBA_Q6_${cleanPeriod}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

