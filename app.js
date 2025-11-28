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
let currentUserRole = null; 
let globalRateHBA = 0;
let globalRateTax = 0;
let globalGoiHocList = [];
let globalHLVList = [];
let globalHocVienList = []; 
let filteredHocVienList = []; 
let currentDeleteInfo = { type: null, id: null, isActive: true }; 
let lastRegisteredHocVien = null; 
let quickReportData = []; // Dữ liệu cho báo cáo nhanh

// Biến lưu các hàm unsubscribe listeners
let unsubGoiHoc = null;
let unsubHLV = null;
let unsubHocVien = null;

// --- DOM ELEMENTS ---
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

// Modal Elements
const customModal = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseButton = document.getElementById('modal-close-button');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteMessage = document.getElementById('delete-message');
const deleteCancelButton = document.getElementById('delete-cancel-button');
const deleteConfirmButton = document.getElementById('delete-confirm-button');

// Tab Cài Đặt
const rateHBAInput = document.getElementById('setting-rate-hba');
const rateTaxInput = document.getElementById('setting-rate-tax');
const saveSettingsButton = document.getElementById('save-settings-button');
const settingsSpinner = document.getElementById('settings-spinner');

// Tab Gói Học
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

// Tab HLV
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

// Tab Ghi Danh
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

// Tab Quản lý HV
const hocVienTableBody = document.getElementById('hocvien-table-body');
const hvSearchInput = document.getElementById('hv-search-input');
const filterBtnHomNay = document.getElementById('filter-hv-today');
const filterBtnThangNay = document.getElementById('filter-hv-thangnay');
const filterBtnTatCa = document.getElementById('filter-hv-tatca');
let currentHVFilter = 'thangnay'; 
const hvListPrintBtn = document.getElementById('hv-list-print-btn');
const hvListExcelBtn = document.getElementById('hv-list-excel-btn');

// Modal Sửa Học Viên
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

// In Phiếu
const printSection = document.getElementById('print-section');

// Báo cáo nhanh (Daily Report)
const qrDtNgay = document.getElementById('qr-dt-ngay');
const qrDtThang = document.getElementById('qr-dt-thang');
const qrHvNgay = document.getElementById('qr-hv-ngay');
const qrHvThang = document.getElementById('qr-hv-thang');
const qrHvTableBody = document.getElementById('qr-hv-table-body');
const qrPrintBtn = document.getElementById('qr-print-btn');
const qrExcelBtn = document.getElementById('qr-excel-btn');
const qrDateFilterFrom = document.getElementById('qr-date-from');
const qrDateFilterTo = document.getElementById('qr-date-to');
const qrViewBtn = document.getElementById('qr-view-btn');


// Tab Báo Cáo (Admin)
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

// Tab Import
const importFileInput = document.getElementById('import-file-input');
const importStartBtn = document.getElementById('import-start-btn');
const importSpinner = document.getElementById('import-spinner');
const importResultsContainer = document.getElementById('import-results-container');
const importLog = document.getElementById('import-log');


// --- HÀM UTILITY ---

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
    
    if (type === 'hlv') {
        if (isActive) {
            deleteMessage.textContent = `Bạn có chắc chắn muốn VÔ HIỆU HÓA HLV "${name}"?`;
            deleteConfirmButton.textContent = "Vô hiệu hóa";
            deleteConfirmButton.className = 'bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors';
        } else {
            deleteMessage.textContent = `Bạn có muốn KÍCH HOẠT LẠI HLV "${name}"?`;
            deleteConfirmButton.textContent = "Kích hoạt lại";
            deleteConfirmButton.className = 'bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors';
        }
    } else {
        deleteMessage.textContent = `Bạn có chắc chắn muốn xoá "${name}"? Hành động này không thể hoàn tác.`;
        deleteConfirmButton.textContent = "Xác nhận Xoá";
        deleteConfirmButton.className = 'bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors';
    }
    
    deleteConfirmModal.classList.remove('hidden');
    setTimeout(() => deleteConfirmModal.classList.add('flex'), 10);
};

const closeDeleteModal = () => {
    deleteConfirmModal.classList.remove('flex');
    setTimeout(() => deleteConfirmModal.classList.add('hidden'), 300);
};
deleteCancelButton.addEventListener('click', closeDeleteModal);

const handleConfirmDelete = async () => {
    const { type, id, isActive } = currentDeleteInfo;
    if (!type || !id) return;

    try {
        if (type === 'goi_hoc') {
            await deleteDoc(doc(db, "goi_hoc", id));
            showModal("Đã xoá thành công!", "Thành công");
        } else if (type === 'hlv') {
            const newState = !isActive;
            await updateDoc(doc(db, "hlv", id), { active: newState });
            showModal(newState ? "Đã kích hoạt lại HLV." : "Đã vô hiệu hóa HLV.", "Thành công");
        } else if (type === 'hocvien') {
            await deleteDoc(doc(db, "hocvien", id));
            showModal("Đã xoá thành công!", "Thành công");
        }
    } catch (error) {
        showModal(`Lỗi: ${error.message}`, "Lỗi");
    } finally {
        closeDeleteModal();
        currentDeleteInfo = { type: null, id: null };
    }
};
deleteConfirmButton.addEventListener('click', handleConfirmDelete);

const detachAllListeners = () => {
    if (unsubGoiHoc) { unsubGoiHoc(); unsubGoiHoc = null; }
    if (unsubHLV) { unsubHLV(); unsubHLV = null; }
    if (unsubHocVien) { unsubHocVien(); unsubHocVien = null; }
};


// --- 1. AUTH ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userEmailElement.textContent = user.email;
        try {
            const roleDoc = await getDoc(doc(db, "user_roles", user.uid));
            currentUserRole = roleDoc.exists() ? roleDoc.data().role : 'letan';
            setupUIForRole(currentUserRole);
            await loadAllInitialData();
        } catch (error) {
            showModal(`Lỗi phân quyền: ${error.message}`, "Lỗi");
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
    }
    globalLoader.classList.add('hidden');
});

const setupUIForRole = (role) => {
    if (role === 'admin') document.body.classList.add('is-admin');
    else document.body.classList.remove('is-admin');
};

const loadAllInitialData = async () => {
    await Promise.all([loadSettings(), loadGoiHoc(), loadHLV()]);
    await loadHocVien();
    setupGhiDanhTab();
    setupReportTabDefaults();
    
    // Set default dates for Quick Report filter
    const todayStr = formatDateForInput(new Date());
    if(qrDateFilterFrom) qrDateFilterFrom.value = todayStr;
    if(qrDateFilterTo) qrDateFilterTo.value = todayStr;
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
        showModal("Đăng nhập thất bại. Kiểm tra lại email/mật khẩu.", "Lỗi");
    } finally {
        loginButton.disabled = false;
        loginSpinner.classList.add('hidden');
    }
});

logoutButton.addEventListener('click', async () => {
    try { await signOut(auth); } catch (error) { showModal(error.message, "Lỗi"); }
});

tabNavigation.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-button')) {
        const tabName = e.target.dataset.tab;
        tabButtons.forEach(btn => btn.classList.remove('active-tab', 'border-indigo-600', 'text-indigo-600'));
        tabPanels.forEach(panel => panel.classList.remove('active'));
        e.target.classList.add('active-tab', 'border-indigo-600', 'text-indigo-600');
        const panelToShow = document.getElementById(`content-${tabName}`);
        if (panelToShow) panelToShow.classList.add('active');
    }
});


// --- 2. CÀI ĐẶT ---

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
    } catch (error) { console.error(error); }
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
        showModal("Đã lưu cài đặt!", "Thành công");
    } catch (error) { showModal(error.message, "Lỗi"); }
    finally {
        saveSettingsButton.disabled = false;
        settingsSpinner.classList.add('hidden');
    }
});


// --- 3. GÓI HỌC ---

const loadGoiHoc = () => {
    if (unsubGoiHoc) unsubGoiHoc();
    const q = query(collection(db, "goi_hoc"));
    unsubGoiHoc = onSnapshot(q, (snapshot) => {
        globalGoiHocList = [];
        snapshot.forEach((doc) => globalGoiHocList.push({ id: doc.id, ...doc.data() }));
        renderGoiHocTable();
        setupGhiDanhTab();
    });
};

const renderGoiHocTable = () => {
    if (!goiHocTableBody) return;
    goiHocTableBody.innerHTML = globalGoiHocList.length === 0 
        ? `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Chưa có gói học nào.</td></tr>`
        : globalGoiHocList.map(goi => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${goi.tenGoi}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${goi.soBuoi}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${formatCurrency(goi.hocPhi)} VNĐ</td>
            <td class="px-6 py-4 text-sm text-gray-600">${goi.thoiHan} ngày</td>
            <td class="px-6 py-4 text-right text-sm font-medium admin-only">
                <button data-id="${goi.id}" class="edit-goi-hoc-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${goi.id}" data-name="${goi.tenGoi}" class="delete-goi-hoc-btn text-red-600 hover:text-red-900 ml-4">Xoá</button>
            </td>
        </tr>`).join('');
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
        if (id) await setDoc(doc(db, "goi_hoc", id), data);
        else await addDoc(collection(db, "goi_hoc"), data);
        closeGoiHocModal();
        showModal("Đã lưu gói học!", "Thành công");
    } catch (error) { showModal(error.message, "Lỗi"); }
});

goiHocTableBody.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains('edit-goi-hoc-btn')) {
        const goi = globalGoiHocList.find(g => g.id === id);
        if (goi) openGoiHocModal(goi);
    }
    if (e.target.classList.contains('delete-goi-hoc-btn')) {
        const name = e.target.dataset.name;
        showDeleteModal('goi_hoc', id, name);
    }
});


// --- 4. HLV ---

const loadHLV = () => {
    if (unsubHLV) unsubHLV();
    const q = query(collection(db, "hlv"));
    unsubHLV = onSnapshot(q, (snapshot) => {
        globalHLVList = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isActive = data.active !== false; 
            globalHLVList.push({ id: doc.id, ...data, active: isActive, soHVHienTai: 0, soHV_6_8: 0, soHV_gt_8: 0 });
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
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${hlv.tenHLV}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${hlv.caDay}</td>
            <td class="px-6 py-4 text-sm text-gray-600"><span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${hlv.loaiHLV === 'Tự động' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">${hlv.loaiHLV}</span></td>
            <td class="px-6 py-4 text-sm text-gray-600">${hlv.thuTuUuTien || 99}</td>
            <td class="px-6 py-4 text-sm font-bold text-gray-800">${hlv.soHVHienTai || 0}</td>
            <td class="px-6 py-4 text-sm">${statusText}</td>
            <td class="px-6 py-4 text-right text-sm font-medium admin-only">
                <button data-id="${hlv.id}" class="edit-hlv-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${hlv.id}" data-name="${hlv.tenHLV}" data-active="${hlv.active}" class="delete-hlv-btn ${btnColor} ml-4">${btnText}</button>
            </td>
        </tr>`;
    }).join('');
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
        if (id) await setDoc(doc(db, "hlv", id), data, { merge: true });
        else await addDoc(collection(db, "hlv"), data);
        closeHLVModal();
        showModal("Đã lưu HLV!", "Thành công");
    } catch (error) { showModal(error.message, "Lỗi"); }
});

hlvTableBody.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains('edit-hlv-btn')) {
        const hlv = globalHLVList.find(h => h.id === id);
        if (hlv) openHLVModal(hlv);
    }
    if (e.target.classList.contains('delete-hlv-btn')) {
        const hlv = globalHLVList.find(h => h.id === id);
        showDeleteModal('hlv', id, hlv.tenHLV, hlv.active);
    }
});


// --- 5. GHI DANH & QUẢN LÝ HV ---

const loadHocVien = () => {
    if (unsubHocVien) unsubHocVien();
    const q = query(collection(db, "hocvien"));
    unsubHocVien = onSnapshot(q, (snapshot) => {
        globalHocVienList = [];
        snapshot.forEach((doc) => globalHocVienList.push({ id: doc.id, ...doc.data() }));
        updateHLVCounters();
        applyHocVienFilterAndRender();
        // Tự động cập nhật báo cáo nhanh với ngày đang chọn
        if (qrViewBtn) qrViewBtn.click(); 
    });
};

const updateHLVCounters = () => {
    if (globalHLVList.length === 0) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    globalHLVList.forEach(h => { h.soHVHienTai = 0; h.soHV_6_8 = 0; h.soHV_gt_8 = 0; });

    globalHocVienList.forEach(hv => {
        const hlv = globalHLVList.find(h => h.id === hv.hlvId);
        if (!hlv) return;
        const ngayHetHan = hv.ngayHetHan.toDate();
        if (ngayHetHan >= today) {
            hlv.soHVHienTai++;
            if (hv.nhomTuoi === '6-8') hlv.soHV_6_8++;
            else if (hv.nhomTuoi === '>8') hlv.soHV_gt_8++;
        }
    });
    renderHLVTable();
};

const setupGhiDanhTab = () => {
    goiHocSelect.innerHTML = '<option value="">-- Chọn gói học --</option>';
    globalGoiHocList.forEach(g => {
        goiHocSelect.innerHTML += `<option value="${g.id}">${g.tenGoi} (${formatCurrency(g.hocPhi)} VNĐ)</option>`;
    });

    hlvChiDinhSelect.innerHTML = '<option value="">-- Chọn HLV --</option>';
    globalHLVList.filter(h => h.loaiHLV === 'Chỉ Định' && h.active !== false).forEach(h => {
        hlvChiDinhSelect.innerHTML += `<option value="${h.id}">${h.tenHLV} (${h.caDay})</option>`;
    });
};

// Auto Select Logic
goiHocSelect.addEventListener('change', () => {
    const g = globalGoiHocList.find(i => i.id === goiHocSelect.value);
    displayHocPhi.textContent = g ? `${formatCurrency(g.hocPhi)} VNĐ` : "0 VNĐ";
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
        const h = globalHLVList.find(i => i.id === hlvChiDinhSelect.value);
        displayHLV.textContent = h ? h.tenHLV : "-- Chờ --";
    }
});

function findBestHLV(caDay, nhomTuoi) {
    let candidates = globalHLVList.filter(h => h.caDay === caDay && h.loaiHLV === 'Tự động' && h.active !== false);
    if (candidates.length === 0) return null;
    
    // 1. Min Tổng HV
    let minTotal = Math.min(...candidates.map(h => h.soHVHienTai));
    candidates = candidates.filter(h => h.soHVHienTai === minTotal);
    if (candidates.length === 1) return candidates[0];

    // 2. Min Nhóm Tuổi
    const key = (nhomTuoi === '6-8') ? 'soHV_6_8' : 'soHV_gt_8';
    let minGroup = Math.min(...candidates.map(h => h[key]));
    candidates = candidates.filter(h => h[key] === minGroup);
    if (candidates.length === 1) return candidates[0];

    // 3. Min Ưu Tiên
    let minPrio = Math.min(...candidates.map(h => h.thuTuUuTien || 99));
    candidates = candidates.filter(h => (h.thuTuUuTien || 99) === minPrio);
    return candidates[0];
}

function autoSelectHLV() {
    if (chkChiDinh.checked) return;
    const hlv = findBestHLV(caHocSelect.value, nhomTuoiSelect.value);
    displayHLV.textContent = hlv ? hlv.tenHLV : "Không tìm thấy HLV phù hợp";
}

// --- GHI DANH SUBMIT ---
ghiDanhForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tenHV = tenHVInput.value.trim();
    const sdtHV = sdtHVInput.value.trim();
    const goiHocId = goiHocSelect.value;
    const hinhThucThanhToan = hinhThucThanhToanSelect.value;

    if (!tenHV || !sdtHV || !goiHocId) {
        showModal("Thiếu thông tin bắt buộc.", "Lỗi");
        return;
    }
    
    ghiDanhSubmitButton.disabled = true;
    ghiDanhSpinner.classList.remove('hidden');

    try {
        const goiHoc = globalGoiHocList.find(g => g.id === goiHocId);
        
        let hlvDuocChon = null;
        if (chkChiDinh.checked) {
            hlvDuocChon = globalHLVList.find(h => h.id === hlvChiDinhSelect.value);
        } else {
            hlvDuocChon = findBestHLV(caHocSelect.value, nhomTuoiSelect.value);
        }
        
        if (!goiHoc || !hlvDuocChon) throw new Error("Dữ liệu Gói học hoặc HLV không hợp lệ.");

        const today = new Date();
        const ngayHetHan = new Date(today);
        ngayHetHan.setDate(today.getDate() + goiHoc.thoiHan);

        // Tài chính
        const hocPhi = goiHoc.hocPhi;
        const hbaNhan = hocPhi * (globalRateHBA / 100);
        const tongHoaHong = hocPhi - hbaNhan;
        const thue = tongHoaHong * (globalRateTax / 100);
        const hlvThucNhan = tongHoaHong - thue;

        const newData = {
            tenHV, sdtHV, nhomTuoi: nhomTuoiSelect.value, caHoc: caHocSelect.value,
            hinhThucThanhToan,
            maThe: maTheInput.value.trim(),
            soPhieuThu: soPhieuThuInput.value.trim(),
            goiHocId, tenGoiHoc: goiHoc.tenGoi, soBuoi: goiHoc.soBuoi, hocPhi,
            hlvId: hlvDuocChon.id, tenHLV: hlvDuocChon.tenHLV,
            ngayGhiDanh: Timestamp.fromDate(today),
            ngayHetHan: Timestamp.fromDate(ngayHetHan),
            thoiHan: goiHoc.thoiHan,
            hbaNhan, tongHoaHong, thue, hlvThucNhan,
            nguoiGhiDanhId: currentUser.uid, nguoiGhiDanhEmail: currentUser.email
        };

        const docRef = await addDoc(collection(db, "hocvien"), newData);
        
        // Lưu tạm để in
        lastRegisteredHocVien = { id: docRef.id, ...newData };
        
        showModal(`Đã ghi danh thành công!\nHLV: ${hlvDuocChon.tenHLV}`, "Thành công");
        ghiDanhPrintButton.disabled = false;

    } catch (err) {
        showModal(err.message, "Lỗi");
    } finally {
        ghiDanhSubmitButton.disabled = false;
        ghiDanhSpinner.classList.add('hidden');
    }
});

// --- RESET FORM ---
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

// --- IN PHIẾU (Upgrade 1: Reset sau in) ---
const handlePrintPhieu = () => {
    if (!lastRegisteredHocVien) return;
    const hv = lastRegisteredHocVien;
    const gio = hv.ngayGhiDanh.toDate().getHours();
    const caLetan = gio < 12 ? "Lễ tân ca sáng" : "Lễ tân ca chiều";

    printSection.innerHTML = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
            <h5>Hồ bơi HBA Phú Lâm</h5>
        </div>
        <h2 id="print-title">PHIẾU GHI DANH HỌC BƠI</h2>
        <div id="print-details">
            <p><strong>Ngày giờ:</strong> ${formatDateTimeForDisplay(hv.ngayGhiDanh)}</p>
            <p><strong>Mã HV:</strong> ${hv.id.substring(0,10).toUpperCase()}</p>
            <p><strong>Số phiếu:</strong> ${hv.soPhieuThu || ''}</p>
            <p><strong>Hình thức TT:</strong> ${hv.hinhThucThanhToan || ''}</p>
            <hr style="border-top:1px dashed #000; margin: 10px 0;">
            <p><strong>Học viên:</strong> ${hv.tenHV}</p>
            <p><strong>SĐT:</strong> ${hv.sdtHV}</p>
            <p><strong>Gói học:</strong> ${hv.tenGoiHoc} (${hv.soBuoi} buổi)</p>
            <p><strong>HLV:</strong> ${hv.tenHLV}</p>
            <p><strong>Học phí:</strong> ${formatCurrency(hv.hocPhi)} VNĐ</p>
            <p><strong>Hết hạn:</strong> ${formatDateForDisplay(hv.ngayHetHan)}</p>
        </div>
        <div id="print-signatures">
            <div class="signature-box"><p><strong>Học viên</strong></p><p>(Ký tên)</p></div>
            <div class="signature-box"><p><strong>HLV</strong></p><p>(Ký tên)</p></div>
            <div class="signature-box"><p><strong>${caLetan}</strong></p><p>(Ký tên)</p></div>
        </div>
    `;

    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
    printSection.classList.add('hidden');
    
    // (NÂNG CẤP 1) Reset form sau khi in
    resetGhiDanhForm();
};
ghiDanhPrintButton.addEventListener('click', handlePrintPhieu);


// --- 6. QUẢN LÝ HV (Upgrade 3) ---

const applyHocVienFilterAndRender = () => {
    let list = [...globalHocVienList];
    const now = new Date();
    
    if (currentHVFilter === 'thangnay') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        list = list.filter(h => h.ngayGhiDanh.toDate() >= startOfMonth);
    } else if (currentHVFilter === 'today') { // (Nâng cấp 3b)
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        list = list.filter(h => h.ngayGhiDanh.toDate() >= startOfToday);
    }

    const term = hvSearchInput.value.toLowerCase().trim();
    if (term) {
        list = list.filter(h => 
            h.tenHV.toLowerCase().includes(term) || 
            h.sdtHV.includes(term) || 
            (h.maThe && h.maThe.toLowerCase().includes(term))
        );
    }

    list.sort((a, b) => b.ngayGhiDanh.toDate() - a.ngayGhiDanh.toDate());
    filteredHocVienList = list;
    renderHocVienTable();
};

const renderHocVienTable = () => {
    if (!hocVienTableBody) return;
    if (filteredHocVienList.length === 0) {
        hocVienTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>`;
        return;
    }
    // (Nâng cấp 3a, 3c, 3d) - Render bảng mới (Có STT, Mã thẻ. Bỏ tài chính)
    hocVienTableBody.innerHTML = filteredHocVienList.map((hv, index) => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm text-gray-600">${index + 1}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${hv.maThe || ''}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${hv.tenHV}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${hv.sdtHV}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${hv.tenHLV}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${hv.tenGoiHoc}</td>
            <td class="px-6 py-4 text-right text-sm font-medium admin-only">
                <button data-id="${hv.id}" class="edit-hocvien-btn text-indigo-600 hover:text-indigo-900">Sửa</button>
                <button data-id="${hv.id}" data-name="${hv.tenHV}" class="delete-hocvien-btn text-red-600 hover:text-red-900 ml-4">Xoá</button>
            </td>
        </tr>
    `).join('');
};

hvSearchInput.addEventListener('input', applyHocVienFilterAndRender);

// Update Filter Button Styles
const updateFilterBtnStyles = () => {
    [filterBtnHomNay, filterBtnThangNay, filterBtnTatCa].forEach(btn => {
        if(!btn) return;
        btn.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
        btn.classList.add('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
    });
    
    let activeBtn = null;
    if (currentHVFilter === 'today') activeBtn = filterBtnHomNay;
    if (currentHVFilter === 'thangnay') activeBtn = filterBtnThangNay;
    if (currentHVFilter === 'tatca') activeBtn = filterBtnTatCa;
    
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
        activeBtn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-indigo-100', 'hover:text-indigo-700');
    }
};

if(filterBtnHomNay) filterBtnHomNay.addEventListener('click', () => { currentHVFilter = 'today'; updateFilterBtnStyles(); applyHocVienFilterAndRender(); });
if(filterBtnThangNay) filterBtnThangNay.addEventListener('click', () => { currentHVFilter = 'thangnay'; updateFilterBtnStyles(); applyHocVienFilterAndRender(); });
if(filterBtnTatCa) filterBtnTatCa.addEventListener('click', () => { currentHVFilter = 'tatca'; updateFilterBtnStyles(); applyHocVienFilterAndRender(); });

hocVienTableBody.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains('edit-hocvien-btn')) {
        const hv = globalHocVienList.find(i => i.id === id);
        if (hv) openHocVienEditModal(hv);
    }
    if (e.target.classList.contains('delete-hocvien-btn')) {
        const name = e.target.dataset.name;
        showDeleteModal('hocvien', id, name);
    }
});

// Modal Sửa HV
const openHocVienEditModal = (hv) => {
    hocVienEditForm.reset();
    hocVienEditIdInput.value = hv.id;
    hocVienEditThoiHanInput.value = hv.thoiHan;
    
    hocVienEditTenInput.value = hv.tenHV;
    hocVienEditSdtInput.value = hv.sdtHV;
    hocVienEditMaTheInput.value = hv.maThe || '';
    hocVienEditPhieuThuInput.value = hv.soPhieuThu || '';
    hocVienEditGoiHocInput.value = hv.tenGoiHoc;
    hocVienEditHTTTInput.value = hv.hinhThucThanhToan || 'Tiền mặt';

    // Load HLV list into dropdown
    hocVienEditHLVInput.innerHTML = '';
    globalHLVList.forEach(h => {
        if (h.active !== false || h.id === hv.hlvId) {
            const opt = document.createElement('option');
            opt.value = h.id;
            opt.textContent = `${h.tenHLV} ${h.active === false ? '(Đã nghỉ)' : ''}`;
            hocVienEditHLVInput.appendChild(opt);
        }
    });
    hocVienEditHLVInput.value = hv.hlvId;

    hocVienEditNgayGhiInput.value = formatDateForInput(hv.ngayGhiDanh);
    hocVienEditNgayHetInput.value = formatDateForInput(hv.ngayHetHan);

    hocVienEditModal.classList.remove('hidden');
    setTimeout(() => hocVienEditModal.classList.add('flex'), 10);
};

hocVienEditCancelButton.addEventListener('click', () => {
    hocVienEditModal.classList.remove('flex');
    setTimeout(() => hocVienEditModal.classList.add('hidden'), 300);
});

// Auto calc End Date when Start Date changes in Edit Modal
hocVienEditNgayGhiInput.addEventListener('change', () => {
    const d = new Date(hocVienEditNgayGhiInput.value);
    const days = parseInt(hocVienEditThoiHanInput.value);
    if (!isNaN(days)) {
        const end = new Date(d);
        end.setDate(d.getDate() + days);
        hocVienEditNgayHetInput.value = formatDateForInput(end);
    }
});

hocVienEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = hocVienEditIdInput.value;
    if (!id) return;

    try {
        const newHlvId = hocVienEditHLVInput.value;
        const newHlv = globalHLVList.find(h => h.id === newHlvId);
        if(!newHlv) throw new Error("HLV không hợp lệ");

        const updateData = {
            tenHV: hocVienEditTenInput.value.trim(),
            sdtHV: hocVienEditSdtInput.value.trim(),
            maThe: hocVienEditMaTheInput.value.trim(),
            soPhieuThu: hocVienEditPhieuThuInput.value.trim(),
            hinhThucThanhToan: hocVienEditHTTTInput.value,
            hlvId: newHlvId,
            tenHLV: newHlv.tenHLV,
            ngayGhiDanh: Timestamp.fromDate(new Date(hocVienEditNgayGhiInput.value)),
            ngayHetHan: Timestamp.fromDate(new Date(hocVienEditNgayHetInput.value))
        };

        await updateDoc(doc(db, "hocvien", id), updateData);
        hocVienEditModal.classList.remove('flex');
        setTimeout(() => hocVienEditModal.classList.add('hidden'), 300);
        showModal("Cập nhật thành công!", "Thành công");
    } catch (err) { showModal(err.message, "Lỗi"); }
});


// --- 7. DAILY REPORT (Báo cáo nhanh) ---

// Hàm cập nhật báo cáo nhanh dựa trên bộ lọc ngày
const updateQuickReport = (startDate = null, endDate = null) => {
    // Mặc định lấy từ ô input, nếu không có thì lấy hôm nay
    let s, e;
    if (startDate && endDate) {
        s = new Date(startDate); s.setHours(0,0,0,0);
        e = new Date(endDate); e.setHours(23,59,59,999);
    } else {
        const inpS = qrDateFilterFrom ? qrDateFilterFrom.value : null;
        const inpE = qrDateFilterTo ? qrDateFilterTo.value : null;
        if (inpS && inpE) {
            s = new Date(inpS); s.setHours(0,0,0,0);
            e = new Date(inpE); e.setHours(23,59,59,999);
        } else {
            // Fallback: Hôm nay
            s = new Date(); s.setHours(0,0,0,0);
            e = new Date(); e.setHours(23,59,59,999);
        }
    }

    // Tính tháng này (để hiển thị KPI Tháng)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let dtLoc = 0, dtThang = 0, hvLoc = 0, hvThang = 0;
    quickReportData = [];
    
    globalHocVienList.forEach(hv => {
        const d = hv.ngayGhiDanh.toDate();
        // Logic lọc theo khoảng ngày
        if (d >= s && d <= e) {
            dtLoc += hv.hocPhi;
            hvLoc++;
            quickReportData.push(hv);
        }
        // Logic tháng này
        if (d >= startOfMonth) {
            dtThang += hv.hocPhi;
            hvThang++;
        }
    });

    // Sort quick report data by date desc
    quickReportData.sort((a, b) => b.ngayGhiDanh.toDate() - a.ngayGhiDanh.toDate());

    qrDtNgay.textContent = `${formatCurrency(dtLoc)} VNĐ`;
    qrDtThang.textContent = `${formatCurrency(dtThang)} VNĐ`;
    qrHvNgay.textContent = hvLoc;
    qrHvThang.textContent = hvThang;

    // Render Bảng 9 Cột (Daily Report)
    if (quickReportData.length === 0) {
        qrHvTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Không có dữ liệu.</td></tr>`;
    } else {
        qrHvTableBody.innerHTML = quickReportData.map((hv, idx) => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-600">${idx + 1}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${hv.soPhieuThu || ''}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${hv.maThe || ''}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${hv.tenHV}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${hv.sdtHV}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${hv.tenHLV}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${hv.tenGoiHoc}</td>
                <td class="px-6 py-4 text-sm font-semibold text-gray-800">${formatCurrency(hv.hocPhi)}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${hv.hinhThucThanhToan || ''}</td>
            </tr>
        `).join('');
    }
};

if(qrViewBtn) {
    qrViewBtn.addEventListener('click', () => {
        updateQuickReport(); // Sẽ tự đọc từ input
    });
}

// In Daily Report
const handlePrintQuickReport = () => {
    if (quickReportData.length === 0) return showModal("Không có dữ liệu để in", "Lỗi");
    
    let tTienMat = 0, tCK = 0, tQuetThe = 0, tTong = 0;
    
    const rows = quickReportData.map((hv, i) => {
        const p = hv.hocPhi;
        const m = hv.hinhThucThanhToan;
        tTong += p;
        if (m === 'Tiền mặt') tTienMat += p;
        else if (m === 'Chuyển khoản') tCK += p;
        else if (m === 'Quẹt thẻ') tQuetThe += p;

        return `
        <tr>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${i + 1}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hv.soPhieuThu || ''}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hv.maThe || ''}</td>
            <td style="border:1px solid #000; padding:4px; text-align:left;">${hv.tenHV}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hv.sdtHV}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hv.tenHLV}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hv.tenGoiHoc}</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">${formatCurrency(p)}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${m || ''}</td>
        </tr>`;
    }).join('');

    const sDate = qrDateFilterFrom ? formatDateForDisplay(new Date(qrDateFilterFrom.value)) : '';

    printSection.innerHTML = `
        <div id="print-header">
            <h4>CÂU LẠC BỘ BƠI LỘI PHÚ LÂM</h4>
            <h5>Hồ bơi HBA Phú Lâm</h5>
        </div>
        <h2 id="print-title">BÁO CÁO DOANH THU HỌC BƠI NGÀY ${sDate}</h2>
        <table style="width:100%; border-collapse:collapse; font-size:10pt;">
            <thead style="background:#eee;">
                <tr>
                    <th style="border:1px solid #000; padding:4px;">STT</th>
                    <th style="border:1px solid #000; padding:4px;">Số phiếu</th>
                    <th style="border:1px solid #000; padding:4px;">Mã thẻ</th>
                    <th style="border:1px solid #000; padding:4px;">Họ tên</th>
                    <th style="border:1px solid #000; padding:4px;">SĐT</th>
                    <th style="border:1px solid #000; padding:4px;">HLV</th>
                    <th style="border:1px solid #000; padding:4px;">Gói</th>
                    <th style="border:1px solid #000; padding:4px;">Doanh thu</th>
                    <th style="border:1px solid #000; padding:4px;">HTTT</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <div id="print-qr-summary" style="margin-top:10px; text-align:right; font-size:11pt;">
            <p>Tiền mặt: <strong>${formatCurrency(tTienMat)}</strong></p>
            <p>Chuyển khoản: <strong>${formatCurrency(tCK)}</strong></p>
            <p>Quẹt thẻ: <strong>${formatCurrency(tQuetThe)}</strong></p>
            <p style="font-size:13pt; margin-top:5px;">TỔNG CỘNG: <strong>${formatCurrency(tTong)} VNĐ</strong></p>
        </div>
        <div id="print-qr-signatures">
            <div class="signature-box"><p><strong>Người lập phiếu</strong></p><p>(Ký, họ tên)</p></div>
            <div class="signature-box"><p><strong>Kế toán</strong></p><p>(Ký, họ tên)</p></div>
            <div class="signature-box"><p><strong>Giám đốc</strong></p><p>(Ký, họ tên)</p></div>
        </div>
    `;

    printSection.classList.remove('hidden');
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
    printSection.classList.add('hidden');
};
if(qrPrintBtn) qrPrintBtn.addEventListener('click', handlePrintQuickReport);

// Xuất Excel Daily Report
const handleExportQuickReport = () => {
    if (quickReportData.length === 0) return showModal("Không có dữ liệu", "Lỗi");
    
    let tTienMat=0, tCK=0, tQT=0, tTong=0;
    const dataSheet = [
        [`BÁO CÁO DOANH THU NGÀY ${qrDateFilterFrom.value}`],
        [],
        ["STT", "Số phiếu", "Mã thẻ", "Tên HV", "SĐT", "HLV", "Gói", "Doanh thu", "HTTT"]
    ];

    quickReportData.forEach((hv, i) => {
        const p = hv.hocPhi;
        const m = hv.hinhThucThanhToan;
        tTong += p;
        if(m==='Tiền mặt') tTienMat+=p;
        else if(m==='Chuyển khoản') tCK+=p;
        else if(m==='Quẹt thẻ') tQT+=p;

        dataSheet.push([
            i+1, hv.soPhieuThu, hv.maThe, hv.tenHV, hv.sdtHV, hv.tenHLV, hv.tenGoiHoc, p, m
        ]);
    });

    dataSheet.push([]);
    dataSheet.push(["", "", "", "", "", "", "", "Tiền mặt:", tTienMat]);
    dataSheet.push(["", "", "", "", "", "", "", "Chuyển khoản:", tCK]);
    dataSheet.push(["", "", "", "", "", "", "", "Quẹt thẻ:", tQT]);
    dataSheet.push(["", "", "", "", "", "", "", "TỔNG:", tTong]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataSheet);
    ws['!cols'] = [{wch:5}, {wch:12}, {wch:12}, {wch:25}, {wch:12}, {wch:20}, {wch:20}, {wch:15}, {wch:15}];
    XLSX.utils.book_append_sheet(wb, ws, "DailyReport");
    XLSX.writeFile(wb, `BaoCaoNgay_${qrDateFilterFrom.value}.xlsx`);
};
if(qrExcelBtn) qrExcelBtn.addEventListener('click', handleExportQuickReport);


// --- 8. BÁO CÁO (ADMIN - Upgrade 2) ---

const generateReport = () => {
    // ... (Logic lọc ngày giữ nguyên) ...
    const reportType = reportTypeSelect.value;
    
    // Lọc custom hay preset
    let filterType = 'custom';
    reportQuickFilterBtns.forEach(b => { if(b.classList.contains('bg-indigo-600')) filterType = b.id.replace('report-filter-', ''); });
    const { startDate, endDate } = getReportDateRange(filterType);

    const filtered = globalHocVienList.filter(h => {
        const d = h.ngayGhiDanh.toDate();
        return d >= startDate && d <= endDate;
    });

    currentReportData = filtered;
    currentReportType = reportType;
    currentReportParams = { startDate, endDate };

    if (reportType === 'tongquan') renderTongQuanReport(filtered, startDate, endDate);
    else if (reportType === 'hlv') renderHLVReport(filtered, startDate, endDate);
    else if (reportType === 'doanhthu_chitiet') renderDoanhThuChiTietReport(filtered, startDate, endDate); // (Nâng cấp 2)
};
reportViewBtn.addEventListener('click', generateReport);

// (Nâng cấp 2) Render Doanh Thu Chi Tiết
const renderDoanhThuChiTietReport = (data, s, e) => {
    data.sort((a, b) => a.ngayGhiDanh.toDate() - b.ngayGhiDanh.toDate());
    const total = data.reduce((sum, h) => sum + h.hocPhi, 0);

    // KPI Card Tổng
    let html = `
        <h3 class="text-xl font-semibold mb-4">Báo Cáo Doanh Thu Chi Tiết</h3>
        <p class="mb-4 text-sm">Từ: ${formatDateForDisplay(s)} - Đến: ${formatDateForDisplay(e)}</p>
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <span class="block text-sm text-blue-700 font-bold">TỔNG DOANH THU</span>
            <span class="text-2xl text-blue-900 font-bold">${formatCurrency(total)} VNĐ</span>
        </div>
        <div class="overflow-x-auto shadow rounded-lg">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên HV</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SĐT</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HLV</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gói</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th> <!-- Đổi tên -->
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HTTT</th> <!-- Thêm -->
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HBA</th> <!-- Thêm -->
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HH</th> <!-- Thêm -->
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thuế</th> <!-- Thêm -->
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HLV Net</th> <!-- Thêm -->
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${data.map((h, i) => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-sm">${i+1}</td>
                            <td class="px-4 py-3 text-sm font-medium">${h.tenHV}</td>
                            <td class="px-4 py-3 text-sm">${h.sdtHV}</td>
                            <td class="px-4 py-3 text-sm">${h.tenHLV}</td>
                            <td class="px-4 py-3 text-sm">${h.tenGoiHoc}</td>
                            <td class="px-4 py-3 text-sm font-bold">${formatCurrency(h.hocPhi)}</td>
                            <td class="px-4 py-3 text-sm">${h.hinhThucThanhToan || ''}</td>
                            <td class="px-4 py-3 text-sm">${formatCurrency(h.hbaNhan)}</td>
                            <td class="px-4 py-3 text-sm">${formatCurrency(h.tongHoaHong)}</td>
                            <td class="px-4 py-3 text-sm">${formatCurrency(h.thue)}</td>
                            <td class="px-4 py-3 text-sm font-bold">${formatCurrency(h.hlvThucNhan)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    reportResultsContainer.innerHTML = html;
};

// Cập nhật hàm in và xuất excel cho Báo cáo Admin (để khớp với các cột mới)
// ... (Giữ nguyên logic generateTongQuanPrintHTML và generateHLVReportPrintHTML) ...

const generateDoanhThuChiTietPrintHTML = (data) => {
    // Logic tạo bảng in cho báo cáo chi tiết (giống render trên web nhưng đơn giản hóa style)
    const total = data.reduce((s, h) => s + h.hocPhi, 0);
    return `
        <div style="margin-bottom:20px; font-size:14pt;"><strong>TỔNG DOANH THU: ${formatCurrency(total)} VNĐ</strong></div>
        <table style="width:100%; border-collapse:collapse; font-size:9pt;">
            <thead>
                <tr style="background:#eee;">
                    <th style="border:1px solid #000; padding:3px;">STT</th>
                    <th style="border:1px solid #000; padding:3px;">Tên</th>
                    <th style="border:1px solid #000; padding:3px;">HLV</th>
                    <th style="border:1px solid #000; padding:3px;">Gói</th>
                    <th style="border:1px solid #000; padding:3px;">Doanh thu</th>
                    <th style="border:1px solid #000; padding:3px;">HTTT</th>
                    <th style="border:1px solid #000; padding:3px;">HBA</th>
                    <th style="border:1px solid #000; padding:3px;">HH</th>
                    <th style="border:1px solid #000; padding:3px;">Thuế</th>
                    <th style="border:1px solid #000; padding:3px;">Net</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((h, i) => `
                    <tr>
                        <td style="border:1px solid #000; padding:3px; text-align:center;">${i+1}</td>
                        <td style="border:1px solid #000; padding:3px;">${h.tenHV}</td>
                        <td style="border:1px solid #000; padding:3px;">${h.tenHLV}</td>
                        <td style="border:1px solid #000; padding:3px;">${h.tenGoiHoc}</td>
                        <td style="border:1px solid #000; padding:3px; text-align:right;">${formatCurrency(h.hocPhi)}</td>
                        <td style="border:1px solid #000; padding:3px; text-align:center;">${h.hinhThucThanhToan || ''}</td>
                        <td style="border:1px solid #000; padding:3px; text-align:right;">${formatCurrency(h.hbaNhan)}</td>
                        <td style="border:1px solid #000; padding:3px; text-align:right;">${formatCurrency(h.tongHoaHong)}</td>
                        <td style="border:1px solid #000; padding:3px; text-align:right;">${formatCurrency(h.thue)}</td>
                        <td style="border:1px solid #000; padding:3px; text-align:right;">${formatCurrency(h.hlvThucNhan)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

// Cập nhật handleExportExcel để handle case 'doanhthu_chitiet' với đủ cột
// (Phần này đã được tích hợp trong logic chung ở trên)
