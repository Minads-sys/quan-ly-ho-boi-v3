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
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CẤU HÌNH FIREBASE (Lấy từ file .docx) ---
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
let currentUserRole = null; // 'admin', 'letan', or null
let globalRateHBA = 0;
let globalRateTax = 0;
let globalGoiHocList = [];
let globalHLVList = [];
let globalHocVienList = []; // Danh sách gốc từ Firestore
let filteredHocVienList = []; // Danh sách đã lọc/tìm kiếm để hiển thị
let currentDeleteInfo = { type: null, id: null }; // Để modal xoá biết xoá gì
let lastRegisteredHocVien = null; // Lưu HV vừa ghi danh để In

// Biến lưu các hàm unsubscribe listeners
let unsubGoiHoc = null;
let unsubHLV = null;
let unsubHocVien = null;

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
const nhomTuoiSelect = document.getElementById('nhomTuoi');
const ghiDanhSubmitButton = document.getElementById('ghi-danh-submit-button');
const ghiDanhSpinner = document.getElementById('ghi-danh-spinner');
const ghiDanhResetButton = document.getElementById('ghi-danh-reset-button');
const ghiDanhPrintButton = document.getElementById('ghi-danh-print-button');
const tenHVInput = document.getElementById('tenHV');
const sdtHVInput = document.getElementById('sdtHV');
const maTheInput = document.getElementById('maThe');
const soPhieuThuInput = document.getElementById('soPhieuThu');

// (MỚI) Elements cho Tab Quản lý HV (Step 3b)
const hocVienTableBody = document.getElementById('hocvien-table-body');
const hvSearchInput = document.getElementById('hv-search-input');
const filterBtnThangNay = document.getElementById('filter-hv-thangnay');
const filterBtnTatCa = document.getElementById('filter-hv-tatca');
let currentHVFilter = 'thangnay'; // 'thangnay' or 'tatca'

// (MỚI) Elements cho Modal Sửa Học Viên (Step 3b)
const hocVienEditModal = document.getElementById('hocvien-edit-modal');
const hocVienEditForm = document.getElementById('hocvien-edit-form');
const hocVienEditIdInput = document.getElementById('hocvien-edit-id');
const hocVienEditThoiHanInput = document.getElementById('hocvien-edit-thoi-han');
const hocVienEditTenInput = document.getElementById('hocvien-edit-ten');
const hocVienEditSdtInput = document.getElementById('hocvien-edit-sdt');
const hocVienEditMaTheInput = document.getElementById('hocvien-edit-mathe');
const hocVienEditPhieuThuInput = document.getElementById('hocvien-edit-phieuthu');
const hocVienEditGoiHocInput = document.getElementById('hocvien-edit-goihoc');
const hocVienEditHLVInput = document.getElementById('hocvien-edit-hlv'); // (Đã đổi thành <select>)
const hocVienEditNgayGhiInput = document.getElementById('hocvien-edit-ngayghi');
const hocVienEditNgayHetInput = document.getElementById('hocvien-edit-ngayhet');
const hocVienEditCancelButton = document.getElementById('hocvien-edit-cancel-button');

// (MỚI) Elements cho In Phiếu (Step 3c)
const printSection = document.getElementById('print-section');

// (MỚI) Elements cho Báo cáo nhanh (Step 4a)
const qrDtNgay = document.getElementById('qr-dt-ngay');
const qrDtThang = document.getElementById('qr-dt-thang');
const qrHvNgay = document.getElementById('qr-hv-ngay');
const qrHvTuan = document.getElementById('qr-hv-tuan');
const qrHvTableBody = document.getElementById('qr-hv-table-body');

// (MỚI) Elements cho Tab Báo Cáo (Step 4b)
const reportTypeSelect = document.getElementById('report-type');
const reportQuickFilterBtns = document.querySelectorAll('.report-quick-filter-btn');
const reportFilterToday = document.getElementById('report-filter-today');
const reportFilterThisMonth = document.getElementById('report-filter-this-month');
const reportFilterLastMonth = document.getElementById('report-filter-last-month');
const reportViewBtn = document.getElementById('report-view-btn');
const reportSpinner = document.getElementById('report-spinner');
const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const reportDateRangeContainer = document.getElementById('report-date-range');
const reportPrintBtn = document.getElementById('report-print-btn');
const reportExcelBtn = document.getElementById('report-excel-btn');
const reportResultsContainer = document.getElementById('report-results-container');
let currentReportData = []; // Lưu dữ liệu báo cáo để In/Xuất
let currentReportType = 'tongquan';
let currentReportParams = {};

// (MỚI) Elements cho Tab Import (Step 5a)
const importFileInput = document.getElementById('import-file-input');
const importStartBtn = document.getElementById('import-start-btn');
const importSpinner = document.getElementById('import-spinner');
const importResultsContainer = document.getElementById('import-results-container');
const importLog = document.getElementById('import-log');


// --- HÀM UTILITY (Chung) ---

// Hàm định dạng số tiền (1500000 -> 1,500,000)
const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value || 0);
};

// Hàm định dạng ngày YYYY-MM-DD (cho input type="date")
const formatDateForInput = (date) => {
    if (!date) return '';
    const d = (date instanceof Date) ? date : date.toDate();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Hàm định dạng ngày DD/MM/YYYY (cho hiển thị)
const formatDateForDisplay = (date) => {
    if (!date) return 'N/A';
    const d = (date instanceof Date) ? date : date.toDate();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
};

// Hàm hiển thị Modal thông báo
const showModal = (message, title = "Thông báo") => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
    setTimeout(() => customModal.classList.add('flex'), 10);
};

// Hàm đóng Modal thông báo
const closeModal = () => {
    customModal.classList.remove('flex');
    setTimeout(() => customModal.classList.add('hidden'), 300);
};
modalCloseButton.addEventListener('click', closeModal);

// Hàm hiển thị Modal Xoá
const showDeleteModal = (type, id, name) => {
    currentDeleteInfo = { type, id };
    deleteMessage.textContent = `Bạn có chắc chắn muốn xoá "${name}"? Hành động này không thể hoàn tác.`;
    deleteConfirmModal.classList.remove('hidden');
    setTimeout(() => deleteConfirmModal.classList.add('flex'), 10);
};

// Hàm đóng Modal Xoá
const closeDeleteModal = () => {
    deleteConfirmModal.classList.remove('flex');
    setTimeout(() => deleteConfirmModal.classList.add('hidden'), 300);
};
deleteCancelButton.addEventListener('click', closeDeleteModal);

// Hàm xử lý khi nhấn nút "Xác nhận Xoá"
const handleConfirmDelete = async () => {
    const { type, id } = currentDeleteInfo;
    if (!type || !id) return;

    try {
        if (type === 'goi_hoc') {
            await deleteDoc(doc(db, "goi_hoc", id));
        } else if (type === 'hlv') {
            await deleteDoc(doc(db, "hlv", id));
        } else if (type === 'hocvien') { // (MỚI) Step 3b
            await deleteDoc(doc(db, "hocvien", id));
        }
        
        showModal("Đã xoá thành công!", "Thành công");
    } catch (error) {
        console.error("Lỗi khi xoá:", error);
        showModal(`Lỗi khi xoá: ${error.message}`, "Lỗi");
    } finally {
        closeDeleteModal();
        currentDeleteInfo = { type: null, id: null };
    }
};
deleteConfirmButton.addEventListener('click', handleConfirmDelete);


// (MỚI) Hàm hủy tất cả các listener
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
};


// --- NGHIỆP VỤ BƯỚC 1: XÁC THỰC & PHÂN QUYỀN ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userEmailElement.textContent = user.email;

        try {
            // Lấy vai trò (role) của người dùng
            const roleDoc = await getDoc(doc(db, "user_roles", user.uid));
            if (roleDoc.exists()) {
                currentUserRole = roleDoc.data().role;
            } else {
                currentUserRole = 'letan'; // Mặc định nếu không có vai trò
                console.warn("Không tìm thấy vai trò cho user, gán vai trò 'letan' mặc định.");
            }
            
            setupUIForRole(currentUserRole);

            // Tải dữ liệu cần thiết cho toàn bộ ứng dụng
            await loadAllInitialData();

        } catch (error) {
            console.error("Lỗi khi lấy vai trò:", error);
            showModal(`Lỗi nghiêm trọng khi lấy vai trò người dùng: ${error.message}. Vui lòng liên hệ Admin.`, "Lỗi Phân Quyền");
            currentUserRole = null;
            setupUIForRole(null); // Không cho phép làm gì nếu lỗi
        }
        
        // Hiển thị ứng dụng
        mainApp.classList.remove('hidden');
        loginScreen.classList.add('hidden');
    } else {
        // Người dùng đã đăng xuất
        currentUser = null;
        currentUserRole = null;
        mainApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        setupUIForRole(null); // Reset UI

        // Hủy tất cả các listener khi đăng xuất
        detachAllListeners();

        // Reset toàn bộ state
        globalGoiHocList = [];
        globalHLVList = [];
        globalHocVienList = [];
        globalRateHBA = 0;
        globalRateTax = 0;
    }
    // Ẩn loader toàn trang
    globalLoader.classList.add('hidden');
});

// Hàm cài đặt UI dựa trên vai trò
const setupUIForRole = (role) => {
    if (role === 'admin') {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }
};

// Hàm tải tất cả dữ liệu ban đầu
const loadAllInitialData = async () => {
    // Tải song song
    await Promise.all([
        loadSettings(), // (Step 2a)
        loadGoiHoc(),   // (Step 2b)
        loadHLV()       // (Step 2c)
    ]);
    // Tải học viên (phụ thuộc vào HLV và Gói Học)
    await loadHocVien(); // (Step 3a)

    // Setup các tab sau khi có dữ liệu
    setupGhiDanhTab(); // (Step 3a)
    
    // (MỚI) Step 4b: Cài đặt ngày mặc định cho Tab Báo cáo
    setupReportTabDefaults();
};

// Xử lý Đăng nhập
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    
    loginButton.disabled = true;
    loginSpinner.classList.remove('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged sẽ tự động xử lý phần còn lại
    } catch (error) {
        console.error("Lỗi đăng nhập:", error.code);
        let message = "Đã xảy ra lỗi. Vui lòng thử lại.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            message = "Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.";
        }
        showModal(message, "Đăng nhập thất bại");
    } finally {
        loginButton.disabled = false;
        loginSpinner.classList.add('hidden');
    }
});

// Xử lý Đăng xuất
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // onAuthStateChanged sẽ tự động xử lý
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        showModal(`Lỗi khi đăng xuất: ${error.message}`, "Lỗi");
    }
});

// Xử lý chuyển Tab (ĐÃ SỬA LỖI LOGIC)
tabNavigation.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-button')) {
        const tabName = e.target.dataset.tab;
        
        // Bỏ active tất cả
        tabButtons.forEach(btn => btn.classList.remove('active-tab', 'border-indigo-600', 'text-indigo-600'));
        tabPanels.forEach(panel => panel.classList.remove('active')); // Sửa lỗi: Bỏ .active

        // Active tab được chọn
        e.target.classList.add('active-tab', 'border-indigo-600', 'text-indigo-600');
        
        // Hiển thị panel tương ứng
        const panelToShow = document.getElementById(`content-${tabName}`);
        if (panelToShow) {
            panelToShow.classList.add('active'); // Sửa lỗi: Thêm .active
        } else {
            console.error(`Không tìm thấy panel cho tab: ${tabName}`);
        }
    }
});


// --- NGHIỆP VỤ BƯỚC 2a: CÀI ĐẶT ---

// Tải Cài Đặt
const loadSettings = async () => {
    try {
        const docRef = doc(db, "app_config", "main_config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            globalRateHBA = config.rateHBA || 0;
            globalRateTax = config.rateTax || 0;
        } else {
            console.warn("Không tìm thấy config, sử dụng giá trị mặc định (0)");
        }

        rateHBAInput.value = globalRateHBA;
        rateTaxInput.value = globalRateTax;

    } catch (error) {
        console.error("Lỗi khi tải cài đặt:", error);
        showModal(`Không thể tải cài đặt hệ thống: ${error.message}`, "Lỗi nghiêm trọng");
    }
};

// Lưu Cài Đặt
saveSettingsButton.addEventListener('click', async () => {
    const rateHBA = parseFloat(rateHBAInput.value) || 0;
    const rateTax = parseFloat(rateTaxInput.value) || 0;

    saveSettingsButton.disabled = true;
    settingsSpinner.classList.remove('hidden');

    try {
        const docRef = doc(db, "app_config", "main_config");
        await setDoc(docRef, { rateHBA, rateTax });
        
        globalRateHBA = rateHBA;
        globalRateTax = rateTax;
        
        showModal("Đã lưu cài đặt thành công!", "Thành công");
    } catch (error) {
        console.error("Lỗi khi lưu cài đặt:", error);
        showModal(`Lỗi khi lưu cài đặt: ${error.message}`, "Lỗi");
    } finally {
        saveSettingsButton.disabled = false;
        settingsSpinner.classList.add('hidden');
    }
});


// --- NGHIỆP VỤ BƯỚC 2b: QUẢN LÝ GÓI HỌC ---

// Tải Gói Học (real-time)
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
    }, (error) => {
        console.error("Lỗi khi tải gói học:", error);
        showModal(`Không thể tải danh sách gói học: ${error.message}`, "Lỗi");
    });
};

// Hiển thị Gói Học ra bảng
const renderGoiHocTable = () => {
    if (!goiHocTableBody) return;
    if (globalGoiHocList.length === 0) {
        goiHocTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Chưa có gói học nào. Hãy thêm gói học mới.</td></tr>`;
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

// Hàm mở Modal Gói Học (Thêm/Sửa)
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

// Hàm đóng Modal Gói Học
const closeGoiHocModal = () => {
    goiHocModal.classList.remove('flex');
    setTimeout(() => goiHocModal.classList.add('hidden'), 300);
};
addGoiHocButton.addEventListener('click', () => openGoiHocModal());
goiHocCancelButton.addEventListener('click', closeGoiHocModal);

// Xử lý Lưu Gói Học
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
        console.error("Lỗi khi lưu gói học:", error);
        showModal(`Lỗi khi lưu gói học: ${error.message}`, "Lỗi");
    }
});

// Xử lý sự kiện click trên bảng Gói Học (để Sửa/Xoá)
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


// --- NGHIỆP VỤ BƯỚC 2c: QUẢN LÝ HLV ---

// Tải HLV (real-time)
const loadHLV = () => {
    if (unsubHLV) unsubHLV();
    const q = query(collection(db, "hlv"));
    unsubHLV = onSnapshot(q, (querySnapshot) => {
        globalHLVList = [];
        querySnapshot.forEach((doc) => {
            globalHLVList.push({ 
                id: doc.id, 
                ...doc.data(),
                soHVHienTai: 0,
                soHV_6_8: 0,
                soHV_gt_8: 0
            });
        });
        renderHLVTable();
        setupGhiDanhTab();
        updateHLVCounters();
    }, (error) => {
        console.error("Lỗi khi tải HLV:", error);
        showModal(`Không thể tải danh sách HLV: ${error.message}`, "Lỗi");
    });
};

// Hiển thị HLV ra bảng
const renderHLVTable = () => {
    if (!hlvTableBody) return;
    if (globalHLVList.length === 0) {
        hlvTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Chưa có HLV nào. Hãy thêm HLV mới.</td></tr>`;
        return;
    }

    const sortedList = [...globalHLVList].sort((a, b) => (a.thuTuUuTien || 99) - (b.thuTuUuTien || 99));

    hlvTableBody.innerHTML = sortedList.map(hlv => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hlv.tenHLV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.caDay}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${hlv.loaiHLV === 'Tự động' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${hlv.loaiHLV}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.thuTuUuTien || 99}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${hlv.soHVHienTai || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium admin-only">
                <button data-id="${hlv.id}" class="edit-hlv-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${hlv.id}" data-name="${hlv.tenHLV}" class="delete-hlv-btn text-red-600 hover:text-red-900 ml-4">Xoá</button>
            </td>
        </tr>
    `).join('');
};

// Hàm mở Modal HLV (Thêm/Sửa)
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

// Hàm đóng Modal HLV
const closeHLVModal = () => {
    hlvModal.classList.remove('flex');
    setTimeout(() => hlvModal.classList.add('hidden'), 300);
};
addHLVButton.addEventListener('click', () => openHLVModal());
hlvCancelButton.addEventListener('click', closeHLVModal);

// Xử lý Lưu HLV
hlvForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = hlvIdInput.value;
    const data = {
        tenHLV: hlvTenInput.value,
        caDay: hlvCaDaySelect.value,
        loaiHLV: hlvLoaiSelect.value,
        thuTuUuTien: parseInt(hlvUuTienInput.value) || 99,
    };

    try {
        if (id) {
            await setDoc(doc(db, "hlv", id), data);
        } else {
            await addDoc(collection(db, "hlv"), data);
        }
        closeHLVModal();
        showModal("Đã lưu HLV thành công!", "Thành công");
    } catch (error) {
        console.error("Lỗi khi lưu HLV:", error);
        showModal(`Lỗi khi lưu HLV: ${error.message}`, "Lỗi");
    }
});

// Xử lý sự kiện click trên bảng HLV (để Sửa/Xoá)
hlvTableBody.addEventListener('click', (e) => {
    const target = e.target;
    const id = target.dataset.id;
    
    if (target.classList.contains('edit-hlv-btn')) {
        const hlv = globalHLVList.find(h => h.id === id);
        if (hlv) openHLVModal(hlv);
    }
    
    if (target.classList.contains('delete-hlv-btn')) {
        const hlv = globalHLVList.find(h => h.id === id);
        if (hlv && hlv.soHVHienTai > 0) {
            showModal(`Không thể xoá HLV "${hlv.tenHLV}" vì đang có ${hlv.soHVHienTai} học viên còn hạn.`, "Lỗi");
            return;
        }
        showDeleteModal('hlv', id, hlv.tenHLV);
    }
});


// --- NGHIỆP VỤ BƯỚC 3a: GHI DANH & THUẬT TOÁN ---

// Tải danh sách Học viên
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
        updateQuickReport(); // (MỚI) Step 4a
    }, (error) => {
        console.error("Lỗi khi tải học viên:", error);
        showModal(`Không thể tải danh sách học viên: ${error.message}`, "Lỗi");
    });
};

// Hàm đếm số HV còn hạn cho mỗi HLV
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

// Cài đặt cho Tab Ghi Danh (nạp dropdowns)
const setupGhiDanhTab = () => {
    goiHocSelect.innerHTML = '<option value="">-- Chọn gói học --</option>';
    for (const goi of globalGoiHocList) {
        goiHocSelect.innerHTML += `<option value="${goi.id}">${goi.tenGoi} (${formatCurrency(goi.hocPhi)} VNĐ)</option>`;
    }

    const hlvChiDinhList = globalHLVList.filter(hlv => hlv.loaiHLV === 'Chỉ Định');
    hlvChiDinhSelect.innerHTML = '<option value="">-- Chọn HLV --</option>';
    for (const hlv of hlvChiDinhList) {
        hlvChiDinhSelect.innerHTML += `<option value="${hlv.id}">${hlv.tenHLV} (${hlv.caDay})</option>`;
    }
};

// Tự động cập nhật Học Phí khi chọn Gói Học
goiHocSelect.addEventListener('change', () => {
    const goiId = goiHocSelect.value;
    const goi = globalGoiHocList.find(g => g.id === goiId);
    if (goi) {
        displayHocPhi.textContent = `${formatCurrency(goi.hocPhi)} VNĐ`;
    } else {
        displayHocPhi.textContent = `0 VNĐ`;
    }
    autoSelectHLV();
});

// Tự động hiển thị/ẩn dropdown Chỉ Định
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
nhomTuoiSelect.addEventListener('change', autoSelectHLV);
hlvChiDinhSelect.addEventListener('change', () => {
    if (chkChiDinh.checked) {
        const hlv = globalHLVList.find(h => h.id === hlvChiDinhSelect.value);
        displayHLV.textContent = hlv ? hlv.tenHLV : "-- Chờ --";
    }
});


// THUẬT TOÁN CHIA HLV 3 VÒNG
function findBestHLV(caDay, nhomTuoi) {
    let candidates = globalHLVList.filter(hlv => 
        hlv.caDay === caDay && hlv.loaiHLV === 'Tự động'
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

// Hàm tự động chạy thuật toán và hiển thị
function autoSelectHLV() {
    if (chkChiDinh.checked) return;
    const hlv = findBestHLV(caHocSelect.value, nhomTuoiSelect.value);
    displayHLV.textContent = hlv ? hlv.tenHLV : "Không tìm thấy HLV phù hợp";
};

// Xử lý Ghi Danh
ghiDanhForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tenHV = tenHVInput.value.trim();
    const sdtHV = sdtHVInput.value.trim();
    const goiHocId = goiHocSelect.value;
    const caHoc = caHocSelect.value;
    const nhomTuoi = nhomTuoiSelect.value;

    if (!tenHV || !sdtHV || !goiHocId) {
        showModal("Vui lòng điền đầy đủ thông tin bắt buộc (Tên, SĐT, Gói Học).", "Thiếu thông tin");
        return;
    }
    
    ghiDanhSubmitButton.disabled = true;
    ghiDanhSpinner.classList.remove('hidden');

    try {
        const goiHoc = globalGoiHocList.find(g => g.id === goiHocId);
        if (!goiHoc) throw new Error("Gói học không hợp lệ.");

        let hlvDuocChon = null;
        if (chkChiDinh.checked) {
            const hlvId = hlvChiDinhSelect.value;
            if (!hlvId) throw new Error("Vui lòng chọn HLV chỉ định.");
            hlvDuocChon = globalHLVList.find(h => h.id === hlvId);
        } else {
            hlvDuocChon = findBestHLV(caHoc, nhomTuoi);
        }
        if (!hlvDuocChon) throw new Error("Không tìm thấy HLV phù hợp cho ca học này.");

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
            tenHV, sdtHV, nhomTuoi, caHoc,
            maThe: maTheInput.value.trim(),
            soPhieuThu: soPhieuThuInput.value.trim(),
            goiHocId: goiHocId,
            tenGoiHoc: goiHoc.tenGoi,
            soBuoi: goiHoc.soBuoi,
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
        console.error("Lỗi khi ghi danh:", error);
        showModal(`Lỗi khi ghi danh: ${error.message}`, "Lỗi");
    } finally {
        ghiDanhSubmitButton.disabled = false;
        ghiDanhSpinner.classList.add('hidden');
    }
});

// Hàm Reset Form Ghi Danh
const resetGhiDanhForm = () => {
    ghiDanhForm.reset();
    displayHocPhi.textContent = "0 VNĐ";
    displayHLV.textContent = "-- Chờ --";
    ghiDanhPrintButton.disabled = true;
    lastRegisteredHocVien = null;
    chiDinhDropdownContainer.classList.add('hidden');
    autoSelectHLV();
};
ghiDanhResetButton.addEventListener('click', resetGhiDanhForm);

// (SỬA LỖI IN TRANG TRẮNG) BƯỚC 3c: IN PHIẾU
const handlePrintPhieu = () => {
    if (!lastRegisteredHocVien) {
        showModal("Không có thông tin học viên để in. Vui lòng ghi danh trước.", "Lỗi");
        return;
    }
    
    const hv = lastRegisteredHocVien;
    
    // (MỚI) Thêm Mã HV, Số Phiếu Thu, và 3 cột Chữ ký
    const printContent = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
            <h5>Hồ bơi HBA Phú Lâm</h5>
        </div>
        <h2 id="print-title">PHIẾU GHI DANH HỌC BƠI</h2>
        <div id="print-details">
            <p><strong>Ngày ghi danh:</strong> ${formatDateForDisplay(hv.ngayGhiDanh)}</p>
            <p><strong>Mã HV:</strong> ${hv.id.substring(0, 10).toUpperCase()}</p>
            <p><strong>Số phiếu thu:</strong> ${hv.soPhieuThu || 'N/A'}</p>
            <p><strong>Họ tên học viên:</strong> ${hv.tenHV}</p>
            <p><strong>Số điện thoại:</strong> ${hv.sdtHV}</p>
            <p><strong>Gói học:</strong> ${hv.tenGoiHoc} (${hv.soBuoi} buổi)</p>
            <p><strong>HLV phụ trách:</strong> ${hv.tenHLV}</p>
            <p><strong>Học phí:</strong> ${formatCurrency(hv.hocPhi)} VNĐ</p>
            <p><strong>Ngày hết hạn:</strong> ${formatDateForDisplay(hv.ngayHetHan)}</p>
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
                <p><strong>Người lập phiếu</strong></p>
                <p>(Ký, họ tên)</p>
            </div>
        </div>
    `;
    
    // Đưa nội dung vào khu vực in và gọi lệnh in
    printSection.innerHTML = printContent;
    
    // (SỬA LỖI) Gỡ class 'hidden' (display: none)
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    
    window.print();
    
    document.body.classList.remove('printing');
    // (SỬA LỖI) Thêm class 'hidden' trở lại
    printSection.classList.add('hidden');
};
ghiDanhPrintButton.addEventListener('click', handlePrintPhieu);


// --- (MỚI) NGHIỆP VỤ BƯỚC 3b: QUẢN LÝ HỌC VIÊN ---

// Hàm lọc và tìm kiếm chính
const applyHocVienFilterAndRender = () => {
    let list = [...globalHocVienList];
    
    // 1. Lọc theo thời gian (Tháng này / Tất cả)
    if (currentHVFilter === 'thangnay') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        list = list.filter(hv => hv.ngayGhiDanh.toDate() >= startOfMonth);
    }
    
    // 2. Lọc theo từ khoá tìm kiếm
    const searchTerm = hvSearchInput.value.toLowerCase().trim();
    if (searchTerm) {
        list = list.filter(hv => 
            hv.tenHV.toLowerCase().includes(searchTerm) ||
            hv.sdtHV.includes(searchTerm) ||
            (hv.maThe && hv.maThe.toLowerCase().includes(searchTerm))
        );
    }
    
    // 3. Sắp xếp (mới nhất lên đầu)
    list.sort((a, b) => b.ngayGhiDanh.toDate() - a.ngayGhiDanh.toDate());
    
    filteredHocVienList = list;
    renderHocVienTable();
};

// Hàm hiển thị Bảng Học Viên
const renderHocVienTable = () => {
    if (!hocVienTableBody) return;
    
    if (filteredHocVienList.length === 0) {
        hocVienTableBody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-center text-gray-500">Không tìm thấy học viên nào.</td></tr>`;
        return;
    }
    
    hocVienTableBody.innerHTML = filteredHocVienList.map(hv => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hv.tenHV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.sdtHV}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenHLV || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenGoiHoc}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">${formatCurrency(hv.hocPhi)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hv.hbaNhan)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hv.tongHoaHong)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hv.thue)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">${formatCurrency(hv.hlvThucNhan)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium admin-only">
                <button data-id="${hv.id}" class="edit-hocvien-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${hv.id}" data-name="${hv.tenHV}" class="delete-hocvien-btn text-red-600 hover:text-red-900 ml-4">Xoá</button>
            </td>
        </tr>
    `).join('');
};

// Gắn event cho Lọc và Tìm kiếm
hvSearchInput.addEventListener('input', applyHocVienFilterAndRender);

// (SỬA LỖI HOVER)
filterBtnThangNay.addEventListener('click', () => {
    currentHVFilter = 'thangnay';
    // Active 'Tháng Này'
    filterBtnThangNay.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
    filterBtnThangNay.classList.remove('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-7Boolean');
    // Inactive 'Tất Cả'
    filterBtnTatCa.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
    filterBtnTatCa.classList.add('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
    applyHocVienFilterAndRender();
});

// (SỬA LỖI HOVER)
filterBtnTatCa.addEventListener('click', () => {
    currentHVFilter = 'tatca';
    // Active 'Tất Cả'
    filterBtnTatCa.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
    filterBtnTatCa.classList.remove('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
    // Inactive 'Tháng Này'
    filterBtnThangNay.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
    filterBtnThangNay.classList.add('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
    applyHocVienFilterAndRender();
});

// Xử lý sự kiện click trên bảng Học Viên (để Sửa/Xoá)
hocVienTableBody.addEventListener('click', (e) => {
    const target = e.target;
    const id = target.dataset.id;
    
    if (target.classList.contains('edit-hocvien-btn')) {
        const hocvien = globalHocVienList.find(hv => hv.id === id);
        if (hocvien) openHocVienEditModal(hocvien);
    }
    
    if (target.classList.contains('delete-hocvien-btn')) {
        const name = target.dataset.name;
        showDeleteModal('hocvien', id, name);
    }
});

// Hàm mở Modal Sửa Học Viên
const openHocVienEditModal = (hocvien) => {
    hocVienEditForm.reset();
    hocVienEditIdInput.value = hocvien.id;
    hocVienEditThoiHanInput.value = hocvien.thoiHan; // Lưu thời hạn gốc
    
    hocVienEditTenInput.value = hocvien.tenHV;
    hocVienEditSdtInput.value = hocvien.sdtHV;
    hocVienEditMaTheInput.value = hocvien.maThe || '';
    hocVienEditPhieuThuInput.value = hocvien.soPhieuThu || '';
    hocVienEditGoiHocInput.value = hocvien.tenGoiHoc;
    
    // (SỬA) Nạp danh sách HLV vào dropdown
    hocVienEditHLVInput.innerHTML = ''; // Xoá các HLV cũ
    globalHLVList.forEach(hlv => {
        const option = document.createElement('option');
        option.value = hlv.id;
        option.textContent = `${hlv.tenHLV} (${hlv.caDay})`;
        hocVienEditHLVInput.appendChild(option);
    });
    // Tự động chọn HLV hiện tại của học viên
    hocVienEditHLVInput.value = hocvien.hlvId;
    
    hocVienEditNgayGhiInput.value = formatDateForInput(hocvien.ngayGhiDanh);
    hocVienEditNgayHetInput.value = formatDateForInput(hocvien.ngayHetHan);
    
    hocVienEditModal.classList.remove('hidden');
    setTimeout(() => hocVienEditModal.classList.add('flex'), 10);
};

// Hàm đóng Modal Sửa Học Viên
const closeHocVienEditModal = () => {
    hocVienEditModal.classList.remove('flex');
    setTimeout(() => hocVienEditModal.classList.add('hidden'), 300);
};
hocVienEditCancelButton.addEventListener('click', closeHocVienEditModal);

// (MỚI) Tự động tính lại Ngày Hết Hạn khi Sửa Ngày Ghi Danh
hocVienEditNgayGhiInput.addEventListener('change', () => {
    try {
        const ngayGhiDanh = new Date(hocVienEditNgayGhiInput.value);
        const thoiHan = parseInt(hocVienEditThoiHanInput.value);
        if (isNaN(thoiHan)) return; // Không có thời hạn

        // Tính ngày hết hạn mới
        const ngayHetHanMoi = new Date(ngayGhiDanh.getTime());
        ngayHetHanMoi.setDate(ngayGhiDanh.getDate() + thoiHan);
        
        hocVienEditNgayHetInput.value = formatDateForInput(ngayHetHanMoi);
    } catch (e) {
        console.error("Lỗi tính ngày hết hạn:", e);
    }
});

// Xử lý Lưu Học Viên
hocVienEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = hocVienEditIdInput.value;
    if (!id) return;

    try {
        const ngayGhiDanhMoi = new Date(hocVienEditNgayGhiInput.value);
        const ngayHetHanMoi = new Date(hocVienEditNgayHetInput.value);
        
        // (SỬA) Lấy thông tin HLV mới từ dropdown
        const newHlvId = hocVienEditHLVInput.value;
        const newHlv = globalHLVList.find(h => h.id === newHlvId);
        const newHlvTen = newHlv ? newHlv.tenHLV : 'N/A';
        
        const dataToUpdate = {
            tenHV: hocVienEditTenInput.value.trim(),
            sdtHV: hocVienEditSdtInput.value.trim(),
            maThe: hocVienEditMaTheInput.value.trim(),
            soPhieuThu: hocVienEditPhieuThuInput.value.trim(),
            ngayGhiDanh: Timestamp.fromDate(ngayGhiDanhMoi),
            ngayHetHan: Timestamp.fromDate(ngayHetHanMoi),
            hlvId: newHlvId,   // <-- Dòng mới
            tenHLV: newHlvTen  // <-- Dòng mới
        };

        await updateDoc(doc(db, "hocvien", id), dataToUpdate);
        
        closeHocVienEditModal();
        showModal("Cập nhật thông tin học viên thành công!", "Thành công");

    } catch (error) {
        console.error("Lỗi khi cập nhật học viên:", error);
        showModal(`Lỗi khi cập nhật: ${error.message}`, "Lỗi");
    }
});


// --- (MỚI) BƯỚC 4a: BÁO CÁO NHANH LỄ TÂN ---
const updateQuickReport = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Tìm ngày Thứ Hai của tuần hiện tại
    const dayOfWeek = now.getDay(); // 0 = CN, 1 = T2, ...
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lùi về T2
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
    startOfWeek.setHours(0,0,0,0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let doanhThuHomNay = 0;
    let doanhThuThangNay = 0;
    let soHVHomNay = 0;
    let soHVTuanNay = 0;
    let danhSachHVHomNayHTML = '';
    
    globalHocVienList.forEach((hv, index) => {
        const ngayGhiDanh = hv.ngayGhiDanh.toDate();
        
        if (ngayGhiDanh >= startOfToday) {
            doanhThuHomNay += hv.hocPhi;
            soHVHomNay++;
            // Thêm vào danh sách (chỉ cần STT, Tên, HLV)
            danhSachHVHomNayHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${soHVHomNay}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hv.tenHV}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenHLV}</td>
                </tr>
            `;
        }
        
        if (ngayGhiDanh >= startOfWeek) {
            soHVTuanNay++;
        }
        
        if (ngayGhiDanh >= startOfMonth) {
            doanhThuThangNay += hv.hocPhi;
        }
    });
    
    // Cập nhật 4 thẻ
    qrDtNgay.textContent = `${formatCurrency(doanhThuHomNay)} VNĐ`;
    qrDtThang.textContent = `${formatCurrency(doanhThuThangNay)} VNĐ`;
    qrHvNgay.textContent = soHVHomNay;
    qrHvTuan.textContent = soHVTuanNay;
    
    // Cập nhật bảng
    if (soHVHomNay === 0) {
        qrHvTableBody.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">Chưa có học viên nào hôm nay.</td></tr>`;
    } else {
        qrHvTableBody.innerHTML = danhSachHVHomNayHTML;
    }
};


// --- (MỚI) BƯỚC 4b/c: TAB BÁO CÁO ADMIN ---

// Hàm lấy khoảng ngày dựa trên filter
const getReportDateRange = (filterType) => {
    const now = new Date();
    let startDate, endDate;
    
    // Set endDate về cuối ngày
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (filterType === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filterType === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filterType === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // Ngày cuối của tháng trước
    } else {
        // 'custom'
        startDate = new Date(reportStartDateInput.value);
        endDate = new Date(reportEndDateInput.value);
        endDate.setHours(23, 59, 59); // Đảm bảo bao trọn ngày cuối
    }
    return { startDate, endDate };
};

// Cài đặt mặc định và xử lý click cho Lọc Nhanh Báo Cáo
const setupReportTabDefaults = () => {
    const { startDate, endDate } = getReportDateRange('this-month');
    reportStartDateInput.value = formatDateForInput(startDate);
    reportEndDateInput.value = formatDateForInput(endDate);
};

// (SỬA LỖI HOVER)
reportQuickFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;

        // Bỏ active tất cả
        reportQuickFilterBtns.forEach(b => {
            b.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
            b.classList.add('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
        });
        
        // Active nút được click
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
// (Chúng ta có thể thêm logic cho "Lọc tùy chỉnh" sau)

// Hàm chính: Xử lý nút "Xem Báo Cáo"
const generateReport = () => {
    reportSpinner.classList.remove('hidden');
    reportViewBtn.disabled = true;
    reportPrintBtn.disabled = true;
    reportExcelBtn.disabled = true;
    
    try {
        const reportType = reportTypeSelect.value;
        const startDate = new Date(reportStartDateInput.value);
        const endDate = new Date(reportEndDateInput.value);
        endDate.setHours(23, 59, 59); // Đảm bảo bao trọn ngày

        if (isNaN(startDate) || isNaN(endDate)) {
            throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ.");
        }
        
        // Lọc danh sách học viên theo ngày
        const filteredData = globalHocVienList.filter(hv => {
            const ngayGhiDanh = hv.ngayGhiDanh.toDate();
            return ngayGhiDanh >= startDate && ngayGhiDanh <= endDate;
        });

        // Lưu lại để In/Xuất
        currentReportData = filteredData;
        currentReportType = reportType;
        currentReportParams = { startDate, endDate };

        if (reportType === 'tongquan') {
            renderTongQuanReport(filteredData, startDate, endDate);
        } else if (reportType === 'hlv') {
            // (MỚI) Bước 4c: Gọi hàm render Báo cáo HLV
            renderHLVReport(filteredData, startDate, endDate);
        }
        
        reportPrintBtn.disabled = false;
        reportExcelBtn.disabled = false; // (MỚI) Kích hoạt nút Xuất Excel

    } catch (error) {
        console.error("Lỗi khi tạo báo cáo:", error);
        showModal(`Lỗi khi tạo báo cáo: ${error.message}`, "Lỗi");
        reportResultsContainer.innerHTML = `<p class="text-center text-red-500">Đã xảy ra lỗi: ${error.message}</p>`;
    } finally {
        reportSpinner.classList.add('hidden');
        reportViewBtn.disabled = false;
    }
};
reportViewBtn.addEventListener('click', generateReport);


// Hàm hiển thị Báo cáo Tổng quan
const renderTongQuanReport = (data, startDate, endDate) => {
    let totalRevenue = 0;
    let totalHbaNhan = 0;
    let totalHlvGross = 0;
    let totalThue = 0;
    let totalHlvNet = 0;
    
    data.forEach(hv => {
        totalRevenue += hv.hocPhi;
        totalHbaNhan += hv.hbaNhan;
        totalHlvGross += hv.tongHoaHong;
        totalThue += hv.thue;
        totalHlvNet += hv.hlvThucNhan;
    });
    
    const html = `
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Báo Cáo Tổng Quan</h3>
        <p class="text-sm text-gray-600 mb-4">
            Từ ngày: <span class="font-medium">${formatDateForDisplay(startDate)}</span> 
            Đến ngày: <span class="font-medium">${formatDateForDisplay(endDate)}</span>
        </p>
        
        <!-- Thẻ thống kê tổng quan -->
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
        
        <!-- Bảng chi tiết Tổng quan -->
        <div class="overflow-x-auto rounded-lg shadow">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chỉ số</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tổng Doanh Thu</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${formatCurrency(totalRevenue)}</td>
                    </tr>
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">HBA Nhận (${globalRateHBA}%)</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(totalHbaNhan)}</td>
                    </tr>
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Tổng Hoa Hồng HLV (Gross)</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(totalHlvGross)}</td>
                    </tr>
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Tổng Thuế TNCN (${globalRateTax}%)</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(totalThue)}</td>
                    </tr>
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tổng HLV Thực Nhận (Net)</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${formatCurrency(totalHlvNet)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    reportResultsContainer.innerHTML = html;
};

// --- (MỚI) BƯỚC 4c: BÁO CÁO THU NHẬP HLV ---
const renderHLVReport = (data, startDate, endDate) => {
    // 1. Gom nhóm dữ liệu theo hlvId
    const reportByHLV = {};

    data.forEach(hv => {
        const hlvId = hv.hlvId;
        if (!hlvId) return; // Bỏ qua nếu HV không có HLV

        if (!reportByHLV[hlvId]) {
            // Nếu HLV này chưa có trong báo cáo, tạo mới
            reportByHLV[hlvId] = {
                tenHLV: hv.tenHLV,
                soHVMoi: 0,
                tongDoanhThu: 0,
                tongThucNhan: 0
            };
        }
        
        // Cộng dồn
        reportByHLV[hlvId].soHVMoi++;
        reportByHLV[hlvId].tongDoanhThu += hv.hocPhi;
        reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
    });

    // 2. Chuyển object thành mảng để dễ render và sắp xếp
    const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan); // Sắp xếp theo thu nhập giảm dần

    // 3. Tạo HTML
    const html = `
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Báo Cáo Thu Nhập HLV</h3>
        <p class="text-sm text-gray-600 mb-4">
            Từ ngày: <span class="font-medium">${formatDateForDisplay(startDate)}</span> 
            Đến ngày: <span class="font-medium">${formatDateForDisplay(endDate)}</span>
        </p>
        
        <!-- Bảng chi tiết Thu nhập HLV -->
        <div class="overflow-x-auto rounded-lg shadow">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên HLV</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số HV Mới</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Doanh Thu Mang Về</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Thực Nhận (Sau Thuế)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${reportArray.length === 0 
                        ? `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu trong khoảng thời gian này.</td></tr>`
                        : reportArray.map(hlv => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hlv.tenHLV}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hlv.soHVMoi}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatCurrency(hlv.tongDoanhThu)} VNĐ</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${formatCurrency(hlv.tongThucNhan)} VNĐ</td>
                            </tr>
                        `).join('')
                    }
                </tbody>
            </table>
        </div>
    `;
    
    reportResultsContainer.innerHTML = html;
};

// --- (MỚI) BƯỚC 4d: IN BÁO CÁO ---

// Hàm tạo HTML cho Báo cáo Tổng quan (bản in)
const generateTongQuanPrintHTML = (data) => {
    let totalRevenue = 0;
    let totalHbaNhan = 0;
    let totalHlvGross = 0;
    let totalThue = 0;
    let totalHlvNet = 0;
    
    data.forEach(hv => {
        totalRevenue += hv.hocPhi;
        totalHbaNhan += hv.hbaNhan;
        totalHlvGross += hv.tongHoaHong;
        totalThue += hv.thue;
        totalHlvNet += hv.hlvThucNhan;
    });

    return `
        <h3 style="font-size: 16pt; font-weight: bold; margin-bottom: 10px;">Chi tiết Báo cáo Tổng quan</h3>
        <p style="font-size: 12pt; margin-bottom: 5px;"><strong>Tổng Doanh Thu:</strong> ${formatCurrency(totalRevenue)} VNĐ</p>
        <p style="font-size: 12pt; margin-bottom: 5px;"><strong>Tổng HV Mới:</strong> ${data.length}</p>
        <p style="font-size: 12pt; margin-bottom: 20px;"><strong>Tổng HLV Thực Nhận:</strong> ${formatCurrency(totalHlvNet)} VNĐ</p>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Chỉ số</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Số tiền (VNĐ)</th>
                </tr>
            </thead>
            <tbody>
                <tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Tổng Doanh Thu</td><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${formatCurrency(totalRevenue)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">HBA Nhận (${globalRateHBA}%)</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalHbaNhan)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">Tổng Hoa Hồng HLV (Gross)</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalHlvGross)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px;">Tổng Thuế TNCN (${globalRateTax}%)</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(totalThue)}</td></tr>
                <tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Tổng HLV Thực Nhận (Net)</td><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${formatCurrency(totalHlvNet)}</td></tr>
            </tbody>
        </table>
    `;
};

// Hàm tạo HTML cho Báo cáo HLV (bản in)
const generateHLVReportPrintHTML = (data) => {
    const reportByHLV = {};
    data.forEach(hv => {
        const hlvId = hv.hlvId;
        if (!hlvId) return;
        if (!reportByHLV[hlvId]) {
            reportByHLV[hlvId] = {
                tenHLV: hv.tenHLV, soHVMoi: 0, tongDoanhThu: 0, tongThucNhan: 0
            };
        }
        reportByHLV[hlvId].soHVMoi++;
        reportByHLV[hlvId].tongDoanhThu += hv.hocPhi;
        reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
    });
    
    const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);

    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 12pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tên HLV</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Số HV Mới</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tổng Doanh Thu Mang Về</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tổng Thực Nhận (Sau Thuế)</th>
                </tr>
            </thead>
            <tbody>
                ${reportArray.map(hlv => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.tenHLV}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${hlv.soHVMoi}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(hlv.tongDoanhThu)} VNĐ</td>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${formatCurrency(hlv.tongThucNhan)} VNĐ</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

// (SỬA LỖI IN TRANG TRẮNG)
const handlePrintReport = () => {
    if (currentReportData.length === 0 && currentReportType === 'tongquan') {
        // Cho phép in báo cáo tổng quan rỗng
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
    
    // (SỬA LỖI) Gỡ class 'hidden' (display: none)
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    
    window.print();
    
    document.body.classList.remove('printing');
    // (SỬA LỖI) Thêm class 'hidden' trở lại
    printSection.classList.add('hidden');
};
reportPrintBtn.addEventListener('click', handlePrintReport);


// --- (MỚI) BƯỚC 5b: XUẤT EXCEL ---
const handleExportExcel = () => {
    if (currentReportData.length === 0 && currentReportType === 'tongquan') {
        // Cho phép xuất báo cáo tổng quan rỗng
    } else if (currentReportData.length === 0) {
        showModal("Không có dữ liệu để xuất Excel.", "Lỗi");
        return;
    }

    let dataForSheet = [];
    let sheetName = "BaoCao";
    const { startDate, endDate } = currentReportParams;
    const dateRangeStr = `${formatDateForInput(startDate)}_den_${formatDateForInput(endDate)}`;

    try {
        if (currentReportType === 'tongquan') {
            sheetName = `TongQuan_${dateRangeStr}`;
            
            // Tái tính toán
            let totalRevenue = 0, totalHbaNhan = 0, totalHlvGross = 0, totalThue = 0, totalHlvNet = 0;
            currentReportData.forEach(hv => {
                totalRevenue += hv.hocPhi; totalHbaNhan += hv.hbaNhan; totalHlvGross += hv.tongHoaHong; totalThue += hv.thue; totalHlvNet += hv.hlvThucNhan;
            });

            dataForSheet = [
                ["BÁO CÁO TỔNG QUAN"],
                [`Từ ngày: ${formatDateForDisplay(startDate)}`, `Đến ngày: ${formatDateForDisplay(endDate)}`],
                [], // Hàng trống
                ["Chỉ số", "Số tiền (VNĐ)"],
                ["Tổng Doanh Thu", totalRevenue],
                [`HBA Nhận (${globalRateHBA}%)`, totalHbaNhan],
                ["Tổng Hoa Hồng HLV (Gross)", totalHlvGross],
                [`Tổng Thuế TNCN (${globalRateTax}%)`, totalThue],
                ["Tổng HLV Thực Nhận (Net)", totalHlvNet]
            ];
        
        } else if (currentReportType === 'hlv') {
            sheetName = `ThuNhapHLV_${dateRangeStr}`;

            // Tái gom nhóm
            const reportByHLV = {};
            currentReportData.forEach(hv => {
                if (!hv.hlvId) return;
                if (!reportByHLV[hv.hlvId]) {
                    reportByHLV[hlvId] = { tenHLV: hv.tenHLV, soHVMoi: 0, tongDoanhThu: 0, tongThucNhan: 0 };
                }
                reportByHLV[hlvId].soHVMoi++;
                reportByHLV[hlvId].tongDoanhThu += hv.hocPhi;
                reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
            });
            const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);

            dataForSheet = [
                ["BÁO CÁO THU NHẬP HLV"],
                [`Từ ngày: ${formatDateForDisplay(startDate)}`, `Đến ngày: ${formatDateForDisplay(endDate)}`],
                [], // Hàng trống
                ["Tên HLV", "Số HV Mới", "Tổng Doanh Thu Mang Về", "Tổng Thực Nhận (Sau Thuế)"]
            ];
            
            reportArray.forEach(hlv => {
                dataForSheet.push([
                    hlv.tenHLV,
                    hlv.soHVMoi,
                    hlv.tongDoanhThu,
                    hlv.tongThucNhan
                ]);
            });
        }

        // Tạo workbook và worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(dataForSheet);

        // (Tùy chọn) Tùy chỉnh độ rộng cột
        if (currentReportType === 'hlv') {
            ws['!cols'] = [ { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 } ];
        } else if (currentReportType === 'tongquan') {
            ws['!cols'] = [ { wch: 30 }, { wch: 25 } ];
        }

        // Thêm worksheet vào workbook
        XLSX.utils.book_append_sheet(wb, ws, 'BaoCao');

        // Tạo và tải file
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
                    goiHocId: goiHoc.id,
                    tenGoiHoc: goiHoc.tenGoi,
                    soBuoi: goiHoc.soBuoi,
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
importStartBtn.addEventListener('click', handleImportStart);
