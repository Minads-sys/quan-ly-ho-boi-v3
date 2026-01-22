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
let currentUserRole = null; // 'admin', 'letan', or null
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
const hinhThucThanhToanSelect = document.getElementById('hinhThucThanhToan');

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
const hocVienEditMaTheInput = document.getElementById('hocvien-edit-mathe');
const hocVienEditPhieuThuInput = document.getElementById('hocvien-edit-phieuthu');
const hocVienEditGoiHocInput = document.getElementById('hocvien-edit-goihoc');
const hocVienEditHLVInput = document.getElementById('hocvien-edit-hlv');
const hocVienEditHTTTInput = document.getElementById('hocvien-edit-httt');
const hocVienEditNgayGhiInput = document.getElementById('hocvien-edit-ngayghi');
const hocVienEditNgayHetInput = document.getElementById('hocvien-edit-ngayhet');
const hocVienEditCancelButton = document.getElementById('hocvien-edit-cancel-button');

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
};


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
            showModal(`Lỗi phân quyền: ${error.message}`, "Lỗi");
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
        
        tabButtons.forEach(btn => btn.classList.remove('active-tab', 'border-indigo-600', 'text-indigo-600'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        e.target.classList.add('active-tab', 'border-indigo-600', 'text-indigo-600');
        
        const panelToShow = document.getElementById(`content-${tabName}`);
        if (panelToShow) {
            panelToShow.classList.add('active');
        }
    }
});


// --- NGHIỆP VỤ BƯỚC 2a: CÀI ĐẶT ---

const loadSettings = async () => {
    try {
        const docSnap = await getDoc(doc(db, "app_config", "main_config"));
        if (docSnap.exists()) {
            const config = docSnap.data();
            globalRateHBA = config.rateHBA || 0;
            globalRateTax = config.rateTax || 0;
        }
        rateHBAInput.value = globalRateHBA;
        rateTaxInput.value = globalRateTax;
    } catch (error) {
        console.error("Lỗi load settings:", error);
    }
};

saveSettingsButton.addEventListener('click', async () => {
    const rateHBA = parseFloat(rateHBAInput.value) || 0;
    const rateTax = parseFloat(rateTaxInput.value) || 0;

    saveSettingsButton.disabled = true;
    settingsSpinner.classList.remove('hidden');

    try {
        await setDoc(doc(db, "app_config", "main_config"), { rateHBA, rateTax });
        globalRateHBA = rateHBA;
        globalRateTax = rateTax;
        showModal("Đã lưu cài đặt thành công!", "Thành công");
    } catch (error) {
        showModal(`Lỗi lưu cài đặt: ${error.message}`, "Lỗi");
    } finally {
        saveSettingsButton.disabled = false;
        settingsSpinner.classList.add('hidden');
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
    } else {
        displayHocPhi.textContent = `0 VNĐ`;
    }
    autoSelectHLV();
});

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
    const hlv = findBestHLV(caHocSelect.value, nhomTuoiSelect.value);
    displayHLV.textContent = hlv ? hlv.tenHLV : "Không tìm thấy HLV phù hợp";
};

ghiDanhForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tenHV = tenHVInput.value.trim();
    const sdtHV = sdtHVInput.value.trim();
    const goiHocId = goiHocSelect.value;
    const caHoc = caHocSelect.value;
    const nhomTuoi = nhomTuoiSelect.value;
    const hinhThucThanhToan = hinhThucThanhToanSelect.value;

    if (!tenHV || !sdtHV || !goiHocId) {
        showModal("Vui lòng điền đầy đủ thông tin bắt buộc.", "Thiếu thông tin");
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
            tenHV, sdtHV, nhomTuoi, caHoc,
            hinhThucThanhToan,
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
            <p><strong>Hình thức TT:</strong> ${hv.hinhThucThanhToan || 'N/A'}</p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
            <p><strong>Họ tên học viên:</strong> ${hv.tenHV}</p>
            <p><strong>Số điện thoại:</strong> ${hv.sdtHV}</p>
            <p><strong>Gói học:</strong> ${hv.tenGoiHoc} (${hv.soBuoi} buổi)</p>
            <p><strong>HLV phụ trách:</strong> ${hv.tenHLV}</p>
            <p><strong>Học phí:</strong> ${formatCurrency(hv.hocPhi)} VNĐ</p>
            <p><strong>Ngày hết hạn:</strong> ${formatDateForDisplay(ngayHetHan)}</p>
        </div>
        <div style="border: 2px solid #000000; padding: 10px; margin-top: 20px; text-align: center; color: #000000;">
    <p style="margin-bottom: 5px; font-size: 14px;">
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
    window.print();
    document.body.classList.remove('printing');
    printSection.classList.add('hidden');
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenHLV}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.tenGoiHoc}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${formatCurrency(hv.hocPhi)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.hinhThucThanhToan || 'N/A'}</td>
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
                    <th style="border: 1px solid #ddd; padding: 6px;">HLV</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Gói Học</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">Doanh thu</th>
                    <th style="border: 1px solid #ddd; padding: 6px;">HTTT</th>
                </tr>
            </thead>
            <tbody>
                ${quickReportData.map((hv, index) => {
                    if (hv.hinhThucThanhToan === 'Tiền mặt') totalTienMat += hv.hocPhi;
                    else if (hv.hinhThucThanhToan === 'Chuyển khoản') totalChuyenKhoan += hv.hocPhi;
                    else if (hv.hinhThucThanhToan === 'Quẹt thẻ') totalQuetThe += hv.hocPhi; // MỚI
                    
                    totalDoanhThu += hv.hocPhi;
                    
                    return `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 6px;">${index + 1}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.soPhieuThu || ''}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.maThe || ''}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHV}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.sdtHV}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenHLV}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.tenGoiHoc}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${formatCurrency(hv.hocPhi)}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">${hv.hinhThucThanhToan || ''}</td>
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
            <div style="text-align: center;"><p><strong>Người lập phiếu</strong></p><p style="margin-top: 60px;">(Ký, họ tên)</p></div>
            <div style="text-align: center;"><p><strong>Kế toán</strong></p><p style="margin-top: 60px;">(Ký, họ tên)</p></div>
            <div style="text-align: center;"><p><strong>Giám đốc</strong></p><p style="margin-top: 60px;">(Ký, họ tên)</p></div>
        </div>
    `;
    
    printSection.innerHTML = printContent;
    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
    printSection.classList.add('hidden');
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
            ["STT", "Số phiếu thu", "Mã thẻ", "Tên Học Viên", "SĐT", "HLV Phụ Trách", "Gói Học", "Doanh thu", "Hình thức TT"]
        ];

        quickReportData.forEach((hv, index) => {
            if (hv.hinhThucThanhToan === 'Tiền mặt') totalTienMat += hv.hocPhi;
            else if (hv.hinhThucThanhToan === 'Chuyển khoản') totalChuyenKhoan += hv.hocPhi;
            else if (hv.hinhThucThanhToan === 'Quẹt thẻ') totalQuetThe += hv.hocPhi; // MỚI
            
            totalDoanhThu += hv.hocPhi;

            dataForSheet.push([
                index + 1, hv.soPhieuThu, hv.maThe, hv.tenHV, hv.sdtHV, hv.tenHLV, hv.tenGoiHoc, hv.hocPhi, hv.hinhThucThanhToan
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
    hocVienEditMaTheInput.value = hocvien.maThe || '';
    hocVienEditPhieuThuInput.value = hocvien.soPhieuThu || '';
    hocVienEditGoiHocInput.value = hocvien.tenGoiHoc;
    hocVienEditHTTTInput.value = hocvien.hinhThucThanhToan || 'Tiền mặt'; 
    
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

    try {
        const ngayGhiDanhMoi = new Date(hocVienEditNgayGhiInput.value);
        const ngayHetHanMoi = new Date(hocVienEditNgayHetInput.value);
        
        const newHlvId = hocVienEditHLVInput.value;
        const newHlv = globalHLVList.find(h => h.id === newHlvId);
        if (!newHlv) throw new Error("HLV được chọn không hợp lệ.");
        const newHlvTen = newHlv.tenHLV;
        
        const dataToUpdate = {
            tenHV: hocVienEditTenInput.value.trim(),
            sdtHV: hocVienEditSdtInput.value.trim(),
            maThe: hocVienEditMaTheInput.value.trim(),
            soPhieuThu: hocVienEditPhieuThuInput.value.trim(),
            hinhThucThanhToan: hocVienEditHTTTInput.value, 
            ngayGhiDanh: Timestamp.fromDate(ngayGhiDanhMoi),
            ngayHetHan: Timestamp.fromDate(ngayHetHanMoi),
            hlvId: newHlvId,   
            tenHLV: newHlvTen  
        };

        await updateDoc(doc(db, "hocvien", id), dataToUpdate);
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
const renderHLVReport = (data, startDate, endDate) => {
    const reportByHLV = {};
    data.forEach(hv => {
        const hlvId = hv.hlvId;
        if (!hlvId) return;
        if (!reportByHLV[hlvId]) {
            reportByHLV[hlvId] = { tenHLV: hv.tenHLV, soHVMoi: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 };
        }
        reportByHLV[hlvId].soHVMoi++;
        reportByHLV[hlvId].tongDoanhThu += hv.hocPhi;
        reportByHLV[hlvId].tongHoaHong += hv.tongHoaHong; // CẬP NHẬT: Cộng dồn hoa hồng từ DB
        reportByHLV[hlvId].tongThue += hv.thue;
        reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
    });

    const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);

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
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên HLV</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số HV Mới</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Doanh Thu</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Hoa Hồng (Gross)</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thuế Phải Nộp</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thực Nhận (Net)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${reportArray.length === 0 
                        ? `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu.</td></tr>`
                        : reportArray.map(hlv => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${hlv.tenHLV}</td>
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
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hv.hinhThucThanhToan || 'N/A'}</td>
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
            reportByHLV[hlvId] = { tenHLV: hv.tenHLV, soHVMoi: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 };
        }
        reportByHLV[hlvId].soHVMoi++; 
        reportByHLV[hlvId].tongDoanhThu += hv.hocPhi; 
        reportByHLV[hlvId].tongHoaHong += hv.tongHoaHong; // CẬP NHẬT
        reportByHLV[hlvId].tongThue += hv.thue; 
        reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
    });
    const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);

    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 11pt;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Tên HLV</th>
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
                        <td style="border: 1px solid #ddd; padding: 4px;">${hv.hinhThucThanhToan || ''}</td>
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
    window.print();
    document.body.classList.remove('printing');
    printSection.classList.add('hidden');
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
                    reportByHLV[hlvId] = { tenHLV: hv.tenHLV, soHVMoi: 0, tongDoanhThu: 0, tongHoaHong: 0, tongThue: 0, tongThucNhan: 0 }; 
                }
                reportByHLV[hlvId].soHVMoi++; 
                reportByHLV[hlvId].tongDoanhThu += hv.hocPhi; 
                reportByHLV[hlvId].tongHoaHong += hv.tongHoaHong;
                reportByHLV[hlvId].tongThue += hv.thue; 
                reportByHLV[hlvId].tongThucNhan += hv.hlvThucNhan;
            });
            const reportArray = Object.values(reportByHLV).sort((a, b) => b.tongThucNhan - a.tongThucNhan);
            
            dataForSheet = [
                ["BÁO CÁO THU NHẬP HLV"], [`Từ ngày: ${formatDateForDisplay(startDate)}`, `Đến ngày: ${formatDateForDisplay(endDate)}`], [],
                ["Tên HLV", "Số HV Mới", "Tổng Doanh Thu", "Tổng Hoa Hồng (Gross)", "Thuế Phải Nộp", "Thực Nhận (Net)"]
            ];
            reportArray.forEach(hlv => {
                dataForSheet.push([hlv.tenHLV, hlv.soHVMoi, hlv.tongDoanhThu, hlv.tongHoaHong, hlv.tongThue, hlv.tongThucNhan]);
            });
            
            // Cấu hình độ rộng cột cho HLV
            colWidths = [ { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 } ];
        
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
                    hv.hinhThucThanhToan || 'N/A', hv.hbaNhan, hv.tongHoaHong, hv.thue, hv.hlvThucNhan
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
    window.print();
    document.body.classList.remove('printing');
    printSection.classList.add('hidden');
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




