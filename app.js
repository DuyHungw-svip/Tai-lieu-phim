// Bắt lỗi hệ thống trình duyệt toàn cục để debug trực quan
window.onerror = function(message, source, lineno, colno, error) {
    const debugConsole = document.getElementById('debug_console');
    const debugText = document.getElementById('debug_error_text');
    if (debugConsole && debugText) {
        debugConsole.style.display = 'block';
        debugText.innerText += `\nError: ${message}\nSource: ${source} (Line: ${lineno})\nStack: ${error ? error.stack : 'N/A'}\n`;
    }
    return false;
};
window.onunhandledrejection = function(event) {
    const debugConsole = document.getElementById('debug_console');
    const debugText = document.getElementById('debug_error_text');
    if (debugConsole && debugText) {
        debugConsole.style.display = 'block';
        debugText.innerText += `\nUnhandled Rejection: ${event.reason ? (event.reason.stack || event.reason) : event}\n`;
    }
};

// --------------------------------------------------
// CẤU HỊNH MẶC ĐỊNH & BIẾN TOÀN CỤC
// --------------------------------------------------
let oauthToken = localStorage.getItem('dw_oauth_token') || 'DSwPIfwYH1j3MlazeoDxnS2Va1a7K6Dk';
let oauthSignature = localStorage.getItem('dw_oauth_signature') || '4a7eb6b6e263ab109102b19b6b339aed';
let currentBalance = 0;
let allDramas = []; // Danh sách toàn bộ phim
let activeTabKey = '125'; // Tab hiện tại (mặc định: 125 - Đề xuất)
let selectedDrama = null; // Bộ phim đang được chọn
let selectedEpisodeToUnlock = null; // Tập phim đang chờ mở khóa
let adSupported = false; // Drama hiện tại có hỗ trợ unlock bằng QC không
let adQuotaRemaining = 0; // Số lượt QC còn lại trong ngày
let adChecked = false; // Đã kiểm tra QC cho drama này chưa
let adAvailabilityCache = {}; // Cache { episodeId: { supported, adKey } }
let dramaAdCache = {}; // Cache ad support cho từng bộ phim { seriesId: { adSupported, adQuotaRemaining, adAvailabilityCache } }
let invalidAdGroups = new Set(); // Danh sách đen các nhóm QC đã đạt giới hạn xem trong ngày (max times)
let homepageNextCursor = ""; // Cursor phân trang tiếp theo của trang chủ
let homepageHasMore = true; // Trạng thái còn phim để tải thêm hay không
let isLoadingMore = false; // Trạng thái đang tải thêm phim

const DEFAULT_HEADERS = {
    'session-id': '228EF915-81FD-4E73-A37F-D0C047E9C612',
    'language': 'vi-VN',
    'User-Agent': 'DramaWave/1.8.91 (iPhone; iOS 18.1.1; Scale/3.00)',
    'country': 'VN',
    'device-language': 'vi-VN',
    'x-device-model': 'iPhone',
    'screen-width': '414',
    'device-id': '190F8882-BBB7-45BE-AF95-3B4EF5497A34',
    'screen-height': '896',
    'appsflyer-id': '1782977089935-4481649',
    'timezone': '+7',
    'device-country': 'VN',
    'Accept-Language': 'vi-VN;q=1',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'app-name': 'com.dramabuzz.app',
    'app-version': '1.8.91',
    'device': 'ios'
};

// DOM Elements
const inputToken = document.getElementById('oauth_token');
const inputSignature = document.getElementById('oauth_signature');
const btnSaveConfig = document.getElementById('btn_save_config');
const textBalance = document.getElementById('text_balance');
const btnRefreshBalance = document.getElementById('btn_refresh_balance');
const btnClaimCoins = document.getElementById('btn_claim_coins');
const consoleContainer = document.getElementById('console_container');
const claimProgressBar = document.getElementById('claim_progress');
const consoleLog = document.getElementById('console_log');
const inputSearch = document.getElementById('input_search');
const btnSearch = document.getElementById('btn_search');
const btnRefreshLibrary = document.getElementById('btn_refresh_library');
const tabsContainer = document.getElementById('tabs_container');
const dramaListContainer = document.getElementById('drama_list_container');
const episodesPanel = document.getElementById('episodes_panel');
const btnBackToList = document.getElementById('btn_back_to_list');
const dramaCover = document.getElementById('drama_cover');
const dramaTitle = document.getElementById('drama_title');
const dramaDesc = document.getElementById('drama_desc');
const episodesGridContainer = document.getElementById('episodes_grid_container');
const confirmModal = document.getElementById('confirm_modal');
const btnModalCancel = document.getElementById('btn_modal_cancel');
const btnModalConfirm = document.getElementById('btn_modal_confirm');
const toastNotification = document.getElementById('toast_notification');
const inputWatermarkFile = document.getElementById('input_watermark_file');
const textWatermarkStatus = document.getElementById('text_watermark_status');
const checkUseWatermark = document.getElementById('check_use_watermark');
const imgWatermarkPreview = document.getElementById('img_watermark_preview');
const rangeWatermarkOpacity = document.getElementById('range_watermark_opacity');
const textOpacityVal = document.getElementById('text_opacity_val');
const btnClaimAllAccounts = document.getElementById('btn_claim_all_accounts');
const btnDownloadPoster = document.getElementById('btn_download_poster');

// Hàm ghi log ra khung console của trang web
function addLog(message) {
    if (!consoleLog) return;
    consoleLog.innerText += `\n[${new Date().toLocaleTimeString()}] ${message}`;
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Khởi chạy ban đầu
init();

function init() {
    if (inputToken) inputToken.value = oauthToken;
    if (inputSignature) inputSignature.value = oauthSignature;

    btnSaveConfig.addEventListener('click', saveConfig);
    btnRefreshBalance.addEventListener('click', () => fetchWallet(true));
    btnClaimCoins.addEventListener('click', startClaimingProcess);
    btnBackToList.addEventListener('click', showDramaLibrary);
    btnSearch.addEventListener('click', searchDramas);
    
    // Gán sự kiện cho các tab
    if (tabsContainer) {
        const tabItems = tabsContainer.querySelectorAll('.tab-item');
        tabItems.forEach(tab => {
            tab.addEventListener('click', () => {
                tabItems.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeTabKey = tab.getAttribute('data-tab') || '125';
                
                // Reset ô tìm kiếm khi đổi tab
                if (inputSearch) inputSearch.value = "";
                
                // Tải dữ liệu của tab được chọn
                loadDramasFromHomepage(false);
            });
        });
    }

    if (btnRefreshLibrary) {
        btnRefreshLibrary.addEventListener('click', refreshLibrary);
    }
    if (btnDownloadPoster) btnDownloadPoster.addEventListener('click', downloadPoster);
    inputSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchDramas();
    });

    btnModalCancel.addEventListener('click', () => confirmModal.style.display = 'none');
    btnModalConfirm.addEventListener('click', confirmUnlockEpisode);

    // Cài đặt Watermark checkbox từ localStorage
    if (checkUseWatermark) {
        checkUseWatermark.checked = localStorage.getItem('dw_use_watermark') === 'true';
        checkUseWatermark.addEventListener('change', () => {
            localStorage.setItem('dw_use_watermark', checkUseWatermark.checked);
        });
    }

    // Cấu hình thanh trượt Opacity
    if (rangeWatermarkOpacity && textOpacityVal) {
        const savedOpacity = localStorage.getItem('dw_watermark_opacity') || '80';
        rangeWatermarkOpacity.value = savedOpacity;
        textOpacityVal.innerText = savedOpacity + '%';
        if (imgWatermarkPreview) {
            imgWatermarkPreview.style.opacity = savedOpacity / 100;
        }

        rangeWatermarkOpacity.addEventListener('input', (e) => {
            const val = e.target.value;
            textOpacityVal.innerText = val + '%';
            if (imgWatermarkPreview) {
                imgWatermarkPreview.style.opacity = val / 100;
            }
        });

        rangeWatermarkOpacity.addEventListener('change', (e) => {
            localStorage.setItem('dw_watermark_opacity', e.target.value);
        });
    }

    // Xử lý upload file watermark
    if (inputWatermarkFile) {
        inputWatermarkFile.addEventListener('change', handleWatermarkUpload);
    }

    // Kiểm tra xem watermark đã được cấu hình trên server chưa để hiển thị ảnh xem trước
    if (imgWatermarkPreview) {
        const testImg = new Image();
        testImg.onload = function() {
            imgWatermarkPreview.src = "/watermark.png?t=" + Date.now();
            imgWatermarkPreview.style.display = "block";
            if (textWatermarkStatus) textWatermarkStatus.innerText = "✅ Đã cấu hình logo";
        };
        testImg.onerror = function() {
            imgWatermarkPreview.style.display = "none";
        };
        testImg.src = "/watermark.png";
    }

    if (oauthToken && oauthSignature) {
        fetchWallet(false);
    }

    loadDramasFromHomepage();
    
    // Xử lý back/forward bằng hash
    window.addEventListener('hashchange', onHashChange);
    // Xử lý hash khi load trang
    const initHash = window.location.hash.slice(1);
    if (initHash.startsWith('/drama/')) {
        const id = initHash.replace('/drama/', '');
        if (id) viewDramaDetail(id);
    }
}

// Xử lý upload ảnh watermark lên server
async function handleWatermarkUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    textWatermarkStatus.innerText = "Đang tải ảnh lên...";
    
    const reader = new FileReader();
    reader.onload = async function(evt) {
        const base64 = evt.target.result;
        try {
            const res = await fetch('/upload-watermark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64 })
            });
            const data = await res.json();
            if (data.code === 200) {
                textWatermarkStatus.innerText = "✅ Đã tải: " + file.name;
                showToast("Đã lưu ảnh Watermark thành công!");
                
                // Hiển thị ảnh xem trước ngay lập tức
                if (imgWatermarkPreview) {
                    imgWatermarkPreview.src = base64;
                    imgWatermarkPreview.style.display = "block";
                }
                
                if (checkUseWatermark) {
                    checkUseWatermark.checked = true;
                    localStorage.setItem('dw_use_watermark', 'true');
                }
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            textWatermarkStatus.innerText = "❌ Lỗi: " + err.message;
            showToast("Lỗi upload: " + err.message);
        }
    };
    reader.readAsDataURL(file);
}

function onHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    if ((hash === '/' || hash === '') && episodesPanel && episodesPanel.style.display !== 'none') {
        showDramaLibrary();
    }
}

// --------------------------------------------------
// LOGIC THÔNG BÁO (TOAST)
// --------------------------------------------------
function showToast(message) {
    toastNotification.innerText = message;
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

function triggerBrowserDownload(downloadUrl, filename) {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function getSelectedDramaPosterUrl() {
    if (!selectedDrama) return "";

    return selectedDrama.cover ||
        selectedDrama.poster ||
        selectedDrama.image ||
        selectedDrama.thumbnail ||
        selectedDrama.cover_url ||
        selectedDrama.poster_url ||
        selectedDrama.image_url ||
        selectedDrama.thumbnail_url ||
        selectedDrama.pic ||
        selectedDrama.pic_url ||
        "";
}

async function downloadPoster() {
    if (!selectedDrama) {
        showToast("Chưa chọn phim để tải poster.");
        return;
    }

    const imageUrl = getSelectedDramaPosterUrl();
    if (!imageUrl) {
        showToast("Không tìm thấy ảnh poster trong API phim này.");
        addLog(`⚠️ Không tìm thấy poster cho phim: ${selectedDrama.name || selectedDrama.id}`);
        return;
    }

    const originalText = btnDownloadPoster ? btnDownloadPoster.innerHTML : "";
    if (btnDownloadPoster) {
        btnDownloadPoster.disabled = true;
        btnDownloadPoster.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tải ảnh...`;
    }

    try {
        const res = await fetch('/download-poster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageUrl,
                dramaName: selectedDrama.name || selectedDrama.title || selectedDrama.id || 'poster'
            })
        });
        const data = await res.json();

        if (data.code !== 200) {
            throw new Error(data.message || "Lỗi tải poster");
        }

        showToast(`Đã lưu ảnh poster vào thư mục Gợi Ý Phim hay.`);
        addLog(`🖼️ Đã tải poster: ${data.filename}`);
        if (data.savedDir) addLog(`📁 Đã lưu tại: ${data.savedDir}`);
    } catch (e) {
        showToast("Lỗi tải poster: " + e.message);
        addLog(`❌ Lỗi tải poster: ${e.message}`);
    } finally {
        if (btnDownloadPoster) {
            btnDownloadPoster.disabled = false;
            btnDownloadPoster.innerHTML = originalText;
        }
    }
}

// --------------------------------------------------
// LOGIC CÀI ĐẶT CẤU HÌNH XÁC THỰC TÀI KHOẢN
// --------------------------------------------------
function saveConfig() {
    const token = inputToken.value.trim();
    const signature = inputSignature.value.trim();

    if (!token || !signature) {
        showToast("Vui lòng điền oauth_token và oauth_signature!");
        return;
    }

    oauthToken = token;
    oauthSignature = signature;

    localStorage.setItem('dw_oauth_token', oauthToken);
    localStorage.setItem('dw_oauth_signature', oauthSignature);
    
    // Xóa cache phim cũ để load phim mới của tài khoản này
    localStorage.removeItem('dw_cached_dramas');

    showToast("Đã lưu cấu hình tài khoản thành công!");
    fetchWallet(true);
    loadDramasFromHomepage();
}

// --------------------------------------------------
// GỌI API DRAMAWAVE CHUNG (CÓ KÝ TIMESTAMP)
// --------------------------------------------------
async function callApi(endpoint, method = 'GET', body = null) {
    if (!oauthToken || !oauthSignature) {
        throw new Error("Chưa cấu hình Token hoặc Signature!");
    }

    const ts = Date.now();
    const authHeader = `oauth_signature=${oauthSignature},oauth_token=${oauthToken},ts=${ts}`;

    const headers = {
        ...DEFAULT_HEADERS,
        'Authorization': authHeader
    };

    const config = {
        method,
        headers
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const url = `/api${endpoint}`;
    const res = await fetch(url, config);
    if (!res.ok) {
        throw new Error(`Server phản hồi lỗi: ${res.status}`);
    }
    return await res.json();
}

// --------------------------------------------------
// LẤY SỐ DƯ VÍ
// --------------------------------------------------
async function fetchWallet(alertSuccess = false) {
    try {
        const data = await callApi('/dm-api/wallet/my');
        if (data.code === 200 && data.data) {
            currentBalance = data.data.bonus_balance || 0;
            textBalance.innerText = `${currentBalance} Xu`;

            if (alertSuccess) {
                showToast("Cập nhật số dư ví thành công!");
            }
        } else {
            textBalance.innerText = "0 Xu";
            showToast("Lỗi lấy thông tin ví: " + (data.message || "Không xác định"));
        }
    } catch (e) {
        textBalance.innerText = "Lỗi kết nối";
        showToast("Lỗi kết nối ví: " + e.message);
    }
}

// --------------------------------------------------
// LOGIC AUTO-CLAIM ALL COINS (NHẬN XU NHIỆM VỤ)
// --------------------------------------------------
async function startClaimingProcess() {
    if (!oauthToken || !oauthSignature) {
        showToast("Vui lòng cấu hình tài khoản trước!");
        return;
    }

    consoleContainer.style.display = 'block';
    consoleLog.innerText = "Đang gửi yêu cầu và chạy script nhận xu trên server (quá trình này có thể mất 10-30 giây)...";
    claimProgressBar.style.width = '30%';
    btnClaimCoins.disabled = true;
    if (btnClaimAllAccounts) btnClaimAllAccounts.disabled = true;

    try {
        const res = await fetch('/claim-rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oauthToken, oauthSignature })
        });
        const data = await res.json();

        claimProgressBar.style.width = '100%';
        if (data.code === 200) {
            showToast("Hoàn tất tiến trình nhận thưởng!");
            consoleLog.innerText = data.log || "Không có log trả về.";
        } else {
            showToast("Có lỗi xảy ra khi chạy script: " + data.message);
            consoleLog.innerText = `❌ LỖI:\n${data.message}\n\n=== LOG TIẾN TRÌNH ===\n${data.log || ''}`;
        }
        await fetchWallet(false);
    } catch (e) {
        showToast("Lỗi kết nối server: " + e.message);
        consoleLog.innerText = `❌ Lỗi kết nối đến server: ${e.message}`;
    } finally {
        btnClaimCoins.disabled = false;
        if (btnClaimAllAccounts) btnClaimAllAccounts.disabled = false;
    }
}


// --------------------------------------------------
// LOGIC LẤY & HIỂN THỊ DANH SÁCH PHIM
// --------------------------------------------------
// Hàm reload mới (Đồng bộ lại tab hiện tại)
async function refreshLibrary() {
    if (btnRefreshLibrary) {
        btnRefreshLibrary.disabled = true;
        btnRefreshLibrary.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...`;
    }
    
    // Xóa cache cũ của tab hiện tại để buộc tải mới
    localStorage.removeItem('dw_cached_dramas_' + activeTabKey);
    
    try {
        await loadDramasFromHomepage(true);
        showToast("Đồng bộ phim mới thành công!");
    } catch(e) {
        showToast("Lỗi đồng bộ phim: " + e.message);
    } finally {
        if (btnRefreshLibrary) {
            btnRefreshLibrary.disabled = false;
            btnRefreshLibrary.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Đồng bộ phim mới`;
        }
    }
}

async function loadDramasFromHomepage(forceRefresh = false) {
    if (!oauthToken || !oauthSignature) {
        dramaListContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;"><i class="fa-solid fa-circle-info" style="font-size: 24px; margin-bottom: 8px; color: var(--accent-neon);"></i><p>Vui lòng điền oauth_token và oauth_signature ở trên, sau đó nhấn "Lưu Cấu Hình" để tải danh sách phim!</p></div>`;
        return;
    }

    try {
        // Nạp từ cache localStorage của tab hiện tại nếu có sẵn để hiển thị tức thì
        const cacheKey = 'dw_cached_dramas_' + activeTabKey;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                allDramas = JSON.parse(cached);
                allDramas.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                renderDramas(allDramas);
                
                // Nếu không ép buộc tải lại (forceRefresh === false), ta DỪNG lại ở đây để danh sách phim cố định
                if (!forceRefresh) {
                    return;
                }
            } catch (_) {
                allDramas = [];
            }
        }
        
        // Nếu không có cache hoặc bắt buộc refresh
        if (allDramas.length === 0 || forceRefresh) {
            dramaListContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 10px;"></i><p>Đang đồng bộ danh mục từ DramaWave...</p></div>`;
            if (forceRefresh) {
                allDramas = [];
            }
        }

        homepageNextCursor = "";
        homepageHasMore = true;
        
        // Tải trước 8 trang đầu để xây dựng thư viện phim ban đầu thật đầy đủ
        let pagesToLoad = 8;
        while (pagesToLoad > 0 && homepageHasMore) {
            await fetchHomepagePage();
            pagesToLoad--;
        }
        
        // Sắp xếp Alphabetical theo bảng chữ cái tiếng Việt để giữ cố định vị trí phim
        allDramas.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        
        // Lưu cache riêng cho tab hiện tại
        localStorage.setItem(cacheKey, JSON.stringify(allDramas));
        
        renderDramas(allDramas);
    } catch (e) {
        if (allDramas.length === 0) {
            dramaListContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--accent-red);">Lỗi kết nối server: ${e.message}</div>`;
        } else {
            showToast("Không thể tải thêm danh sách phim mới: " + e.message);
        }
    }
}

// Hàm fetch một trang phim của DramaWave theo tab hiện tại
async function fetchHomepagePage() {
    try {
        const url = `/dm-api/homepage/v2/tab/index?next=${encodeURIComponent(homepageNextCursor)}&position_index=10&tab_key=${activeTabKey}`;
        const data = await callApi(url);
        if (data.code === 200 && data.data) {
            const items = data.data.items || [];
            items.forEach(module => {
                if (module.items && Array.isArray(module.items)) {
                    module.items.forEach(d => {
                        const dramaId = d.key || d.id;
                        const dramaTitle = d.title || d.name;
                        if (dramaId && dramaTitle && d.cover) {
                            if (!allDramas.some(existing => existing.id === dramaId)) {
                                allDramas.push({
                                    id: dramaId,
                                    name: dramaTitle,
                                    cover: d.cover,
                                    update_count: d.update_count || d.episode_count || 0,
                                    tags: d.tag || d.tags || []
                                });
                            }
                        }
                    });
                }
            });
            
            const pageInfo = data.data.page_info;
            if (pageInfo) {
                homepageNextCursor = pageInfo.next || "";
                homepageHasMore = !!pageInfo.has_more;
            } else {
                homepageHasMore = false;
            }
        } else {
            homepageHasMore = false;
        }
    } catch (e) {
        homepageHasMore = false;
        throw e;
    }
}

function renderDramas(list) {
    if (list.length === 0) {
        dramaListContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Không tìm thấy phim phù hợp.</div>`;
        return;
    }

    let html = list.map(d => `
        <div class="drama-card" onclick="navigateToDrama('${d.id}')">
            <img src="${d.cover}" alt="${d.name}">
            <div class="drama-card-info">
                <div class="drama-title">${d.name}</div>
                <div class="drama-ep-count">${d.update_count || d.episode_count || 0} tập</div>
            </div>
        </div>
    `).join('');

    dramaListContainer.innerHTML = html;
}

function navigateToDrama(seriesId) {
    window.location.hash = `#/drama/${seriesId}`;
    viewDramaDetail(seriesId);
}

function searchDramas() {
    const keyword = inputSearch.value.trim().toLowerCase();
    if (!keyword) {
        renderDramas(allDramas);
        return;
    }
    const filtered = allDramas.filter(d => d.name.toLowerCase().includes(keyword));
    renderDramas(filtered);
}

// --------------------------------------------------
// KIỂM TRA HỖ TRỢ QC CHO DRAMA
// --------------------------------------------------
// --------------------------------------------------
// TIẾN TRÌNH TỰ ĐỘNG MỞ KHÓA TOÀN BỘ PHIM BẰNG QC
// --------------------------------------------------
let autoUnlockActive = false;

async function autoUnlockDramaViaAds(episodes) {
    // Dừng tiến trình cũ nếu đang chạy
    autoUnlockActive = false;
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const lockedEps = episodes.filter(ep => !(ep.external_audio_h264_m3u8 && ep.external_audio_h264_m3u8.trim().length > 0));
    if (lockedEps.length === 0) return;
    
    // Cập nhật số lượt QC còn lại
    try {
        const adListRes = await callApi('/dm-api/task/ad-list');
        if (adListRes.code === 200 && adListRes.data && adListRes.data.task_list) {
            adQuotaRemaining = adListRes.data.task_list.filter(t => t.task_status === 1).length;
        }
    } catch (e) {}
    
    if (adQuotaRemaining <= 0) return;
    
    autoUnlockActive = true;
    addLog(`🤖 Bắt đầu tự động mở khóa ngầm ${lockedEps.length} tập bằng QC...`);
    
    let consecFailures = 0;
    for (const ep of lockedEps) {
        if (!autoUnlockActive) break;
        
        addLog(`🤖 [QC] Đang mở khóa ngầm Tập ${ep.index}...`);
        const adResult = await tryAdUnlock(selectedDrama.id, ep.id);
        
        if (adResult.success) {
            consecFailures = 0;
            adQuotaRemaining = Math.max(0, adQuotaRemaining - 1);
            
            // Cập nhật local state của tập phim
            ep.unlock = true;
            ep.user_unlocked = true;
            ep.video_type = 'free';
            ep.episode_price = 0;
            if (adResult.m3u8Url) ep.external_audio_h264_m3u8 = adResult.m3u8Url;
            
            // Render lại danh sách tập phim để hiển thị nút Tải cho tập vừa unlock
            renderEpisodes(selectedDrama.episode_list);
            addLog(`🤖 [QC] Mở khóa ngầm thành công Tập ${ep.index}!`);
            
            if (adQuotaRemaining <= 0) {
                addLog(`🤖 Đã dừng tự động mở khóa: Hết lượt QC.`);
                break;
            }
            
            // Trễ 1.5 giây giữa các lần để tránh spam server
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            consecFailures++;
            addLog(`🤖 [QC] Mở khóa Tập ${ep.index} thất bại.`);
            
            if (consecFailures >= 2) {
                addLog(`🤖 Đã dừng tự động mở khóa: 2 lần QC thất bại liên tiếp (có thể đã đạt giới hạn nhóm QC).`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    autoUnlockActive = false;
}

async function viewDramaDetail(seriesId) {
    // Cập nhật hash để hỗ trợ back/forward
    if (window.location.hash !== `#/drama/${seriesId}`) {
        window.location.hash = `#/drama/${seriesId}`;
    }
    
    dramaListContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 10px;"></i><p>Đang lấy thông tin tập phim...</p></div>`;
    
    try {
        const res = await callApi(`/dm-api/drama/info_v2?campaign=&series_id=${seriesId}`);
        console.log('[info_v2 response]', JSON.stringify(res).substring(0,500));
        if (res.code === 200 && res.data && res.data.info) {
            selectedDrama = res.data.info;
            
            dramaCover.src = selectedDrama.cover;
            dramaTitle.innerText = selectedDrama.name;
            dramaDesc.innerText = selectedDrama.desc || "Không có mô tả.";

            const episodes = selectedDrama.episode_list || [];
            
            // Render danh sách tập phim lập tức
            renderEpisodes(episodes);
            
            document.querySelector('.search-container').style.display = 'none';
            dramaListContainer.style.display = 'none';
            episodesPanel.style.display = 'block';
            
            // Kích hoạt tự động check/finish QC mở khóa tuần tự ở background
            autoUnlockDramaViaAds(episodes);
        } else {
            showToast("Không lấy được thông tin chi tiết phim!");
            showDramaLibrary();
        }
    } catch (e) {
        showToast("Lỗi kết nối: " + e.message);
        showDramaLibrary();
    }
}

function showDramaLibrary() {
    autoUnlockActive = false; // Dừng tiến trình tự động mở khóa QC
    
    if (window.location.hash !== '#/') {
        window.location.hash = '#/';
    }
    episodesPanel.style.display = 'none';
    document.querySelector('.search-container').style.display = 'flex';
    dramaListContainer.style.display = 'grid';
    renderDramas(allDramas);
}

function renderEpisodes(episodes) {
    if (episodes.length === 0) {
        episodesGridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Không có tập phim nào.</div>`;
        return;
    }

    episodesGridContainer.innerHTML = episodes.map(ep => {
        const isUnlocked = ep.external_audio_h264_m3u8 && ep.external_audio_h264_m3u8.trim().length > 0;
        const canDownload = isUnlocked;
        
        return `
            <div class="episode-item" id="ep_item_${ep.id}">
                <div class="episode-name">
                    <span>Tập ${ep.index}</span>
                    <span class="episode-meta">${ep.duration ? Math.floor(ep.duration / 60) + 'm ' + (ep.duration % 60) + 's' : ''} • ${ep.episode_price} Xu</span>
                    <span class="download-status" id="dl_status_${ep.id}"></span>
                </div>
                <div class="ep-actions" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${canDownload ? 
                        `<button class="btn btn-neon" style="padding: 8px 15px;" onclick="downloadEpisode('${ep.id}', '${ep.external_audio_h264_m3u8}')"><i class="fa-solid fa-cloud-arrow-down"></i> Tải</button>` : 
                        `<button class="btn" style="padding: 8px 15px; background: #6f42c1; box-shadow: none;" onclick="triggerUnlockEpisode('${ep.id}', ${ep.episode_price}, ${ep.index}, true)"><i class="fa-solid fa-lock"></i> ${ep.episode_price} Xu</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// --------------------------------------------------
// LOGIC MỞ KHÓA TẬP PHIM (UNLOCK EPISODE)
// --------------------------------------------------
let episodesToUnlockList = [];

function triggerUnlockEpisode(episodeId, price, index, useCoins) {
    if (!selectedDrama || !selectedDrama.episode_list) {
        showToast("❌ Không có dữ liệu danh sách tập!");
        return;
    }
    
    const episodes = selectedDrama.episode_list;
    // Chỉ chọn tập được click, không gom các tập trước đó
    const targetEp = episodes.find(ep => ep.id === episodeId);
    if (!targetEp) {
        showToast("❌ Không tìm thấy tập phim!");
        return;
    }

    const isUnlocked = targetEp.external_audio_h264_m3u8 && targetEp.external_audio_h264_m3u8.trim().length > 0;
    if (isUnlocked) {
        showToast("ℹ️ Tập này đã được mở khóa rồi!");
        return;
    }

    episodesToUnlockList = [targetEp];
    selectedEpisodeToUnlock = { episodeId, price, index, useCoins: !!useCoins };

    if (useCoins) {
        document.getElementById('modal_title').innerText = `Mở khóa Tập ${index} bằng Xu?`;
        document.getElementById('modal_desc').innerText = `Bạn có muốn dùng ${price} xu thật từ ví để mở khóa và tải xuống không?`;
    } else {
        document.getElementById('modal_title').innerText = `Mở Free Tập ${index} bằng QC?`;
        document.getElementById('modal_desc').innerText = `Bạn còn ${adQuotaRemaining} lượt QC hôm nay. Xem QC để mở khóa miễn phí tập này?`;
    }
    confirmModal.style.display = 'flex';
}

async function confirmUnlockEpisode() {
    confirmModal.style.display = 'none';
    if (!selectedEpisodeToUnlock || episodesToUnlockList.length === 0) return;

    const { episodeId, index, price, useCoins } = selectedEpisodeToUnlock;
    const seriesId = selectedDrama.id;
    const ep = episodesToUnlockList[0];
    const epName = `Tập ${ep.index}`;
    
    consoleContainer.style.display = 'block';
    addLog(`Bắt đầu mở khóa Tập ${index}...`);

    try {
        let m3u8Url = null;
        
        if (useCoins) {
            if (currentBalance < price) {
                showToast(`❌ Không đủ xu (${currentBalance}/${price})!`);
                addLog(`❌ Số dư: ${currentBalance} Xu, cần: ${price} Xu`);
                return;
            }
            addLog(`Dùng ${price} Xu để mở khóa Tập ${index}...`);
            const result = await unlockWithCoins(seriesId, episodeId, index);
            m3u8Url = result;
        } else {
            addLog(`Kiểm tra QC cho Tập ${index}...`);
            let adResult = await tryAdUnlock(seriesId, episodeId);
            
            if (adResult.success) {
                showToast(`🎉 Mở khóa Tập ${index} miễn phí bằng QC!`);
                addLog(`✅ Mở khóa QC thành công!`);
                adQuotaRemaining = Math.max(0, adQuotaRemaining - 1);
                m3u8Url = adResult.m3u8Url;
            } else {
                showToast(`❌ Không thể mở khóa bằng QC. Vui lòng thử lại hoặc dùng xu!`);
                addLog(`❌ Thất bại: QC không khả dụng.`);
                return;
            }
        }
        
        // Cập nhật local state ngay lập tức để hiện nút Tải
        if (selectedDrama && selectedDrama.episode_list) {
            const unlockedEp = selectedDrama.episode_list.find(e => e.id === episodeId);
            if (unlockedEp) {
                unlockedEp.unlock = true;
                unlockedEp.user_unlocked = true;
                unlockedEp.video_type = 'free';
                unlockedEp.episode_price = 0;
                if (m3u8Url) unlockedEp.external_audio_h264_m3u8 = m3u8Url;
            }
            renderEpisodes(selectedDrama.episode_list);
        }
        
        await fetchWallet(false);
        showToast(`✅ Tập ${index} đã mở khóa! Bấm Tải để tải về.`);
    } catch (e) {
        showToast("❌ Lỗi: " + e.message);
        addLog(`❌ ${e.message}`);
    }
}

// Thử unlock bằng quảng cáo (miễn phí)
async function tryAdUnlock(seriesId, episodeId) {
    try {
        // Luôn fetch ad/get cho đúng episode được click, không dùng cache
        const adInfo = await callApi(`/dm-api/ad/get?episode_key=${episodeId}&pay_mode=IAP&scene=purchase&series_key=${seriesId}`);
        if (adInfo.code !== 200 || !adInfo.data || !adInfo.data.ad_info) {
            addLog(`ℹ️ Không có quảng cáo cho tập này.`);
            return { success: false };
        }
        const { ad_key } = adInfo.data.ad_info;
        const adGroup = adInfo.data.ad_group && adInfo.data.ad_group[0];
        const groupAdKey = adGroup ? adGroup.ad_key : (ad_key + '_group');
        
        addLog(`📺 Gửi yêu cầu mở free bằng QC...`);
        const finishRes = await callApi('/dm-api/ad/finish', 'POST', {
            series_key: seriesId,
            episode_key: episodeId,
            ad_key: groupAdKey
        });
        
        if (finishRes.code === 200 && finishRes.data && finishRes.data.unlock_episodes) {
            const unlocked = finishRes.data.unlock_episodes[0];
            const m3u8Url = unlocked && unlocked.external_audio_h264_m3u8;
            addLog(`✅ Ad/finish thành công!${m3u8Url ? ' Đã có link video.' : ''}`);
            
            try {
                await callApi('/dm-api/drama/unlock_episode', 'POST', {
                    episode_id: episodeId, series_id: seriesId,
                    check_auto_unlock: 0, auto_unlock: 0,
                    diamondUnlock: 0, diamondCheckUnlock: 0
                });
            } catch (_) {}
            
            return { success: true, m3u8Url: m3u8Url };
        }
        
        const errMsg = finishRes.message || 'cần QC thật';
        if (errMsg.includes('max times') || errMsg.includes('illegal') || errMsg.includes('limit')) {
            invalidAdGroups.add(groupAdKey);
            // Cập nhật lại giao diện ngay để ẩn nút Mở Free của các tập liên quan
            if (selectedDrama && selectedDrama.episode_list) {
                renderEpisodes(selectedDrama.episode_list);
            }
        }
        addLog(`ℹ️ Ad/finish không khả dụng (${errMsg}).`);
        return { success: false };
    } catch (e) {
        addLog(`ℹ️ QC không khả dụng: ${e.message}`);
        return { success: false };
    }
}

// Unlock bằng xu với fallback tuần tự, trả về m3u8 URL nếu có
async function unlockWithCoins(seriesId, episodeId, index) {
    // Thử check_auto_unlock=0 trước
    let res = await callApi('/dm-api/drama/unlock_episode', 'POST', {
        episode_id: episodeId, series_id: seriesId,
        check_auto_unlock: 0, auto_unlock: 0,
        diamondUnlock: 0, diamondCheckUnlock: 0
    });
    
    if (res.code === 200) {
        addLog(`✅ Unlock Tập ${index} bằng xu thành công!`);
        return res.data && res.data.external_audio_h264_m3u8;
    }
    
    if (res.code === 1018) {
        addLog(`ℹ️ Server yêu cầu unlock tuần tự, thử auto_unlock=1...`);
        res = await callApi('/dm-api/drama/unlock_episode', 'POST', {
            episode_id: episodeId, series_id: seriesId,
            check_auto_unlock: 1, auto_unlock: 1,
            diamondUnlock: 0, diamondCheckUnlock: 0
        });
        if (res.code === 200) {
            addLog(`✅ Auto unlock thành công!`);
            return res.data && res.data.external_audio_h264_m3u8;
        }
        
        // Fallback: unlock từng tập một
        addLog(`ℹ️ Đang unlock thủ công từng tập đến Tập ${index}...`);
        const allEps = selectedDrama.episode_list;
        const startEp = selectedDrama.start_episode || 1;
        const needToUnlock = allEps
            .filter(ep => ep.index <= index && ep.index >= startEp && !(ep.external_audio_h264_m3u8 && ep.external_audio_h264_m3u8.trim().length > 0))
            .sort((a, b) => a.index - b.index);
        
        let lastUrl = null;
        for (let i = 0; i < needToUnlock.length; i++) {
            const ep = needToUnlock[i];
            addLog(`  [${i+1}/${needToUnlock.length}] Unlock Tập ${ep.index}...`);
            const r = await callApi('/dm-api/drama/unlock_episode', 'POST', {
                episode_id: ep.id, series_id: seriesId,
                check_auto_unlock: 0, auto_unlock: 0,
                diamondUnlock: 0, diamondCheckUnlock: 0
            });
            if (r.code === 200) {
                addLog(`  ✅ Tập ${ep.index} thành công!`);
                if (r.data && r.data.external_audio_h264_m3u8) lastUrl = r.data.external_audio_h264_m3u8;
            } else {
                addLog(`  ❌ Tập ${ep.index} thất bại: ${r.message}`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return lastUrl;
    }
    
    throw new Error(res.message || 'Lỗi unlock');
}

// Helper tải video trực tiếp
async function downloadDirect(episodeId, m3u8Url, epName) {
    try {
        const dlRes = await fetch('/download-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ m3u8Url, dramaName: selectedDrama.name, episodeName: epName })
        });
        const dlData = await dlRes.json();
        if (dlData.code === 200) {
            addLog(`🎉 Tải phim thành công: ${dlData.filename}`);
        }
    } catch (e) {
        addLog(`⚠️ Lỗi tải video: ${e.message}`);
    }
}

// --------------------------------------------------
// CƠ CHẾ TẢI VIDEO DIRECT HLS (NỐI MP4 BLOB QUA JS)
// --------------------------------------------------
async function downloadEpisode(episodeId, m3u8Url) {
    const statusText = document.getElementById(`dl_status_${episodeId}`);
    if (!m3u8Url || m3u8Url === "null" || m3u8Url === "undefined") {
        showToast("❌ Tập phim này không có link video trên server!");
        return;
    }

    const episodeName = episodesGridContainer.querySelector(`#ep_item_${episodeId} .episode-name span`).innerText;
    
    // Tìm phụ đề tiếng Việt của tập phim
    let subtitleUrl = "";
    if (selectedDrama && selectedDrama.episode_list) {
        const ep = selectedDrama.episode_list.find(e => e.id === episodeId);
        if (ep && ep.subtitle_list) {
            const viSub = ep.subtitle_list.find(s => s.language === 'vi-VN' || s.display_name === 'Việt');
            if (viSub) subtitleUrl = viSub.subtitle;
        }
    }
    
    statusText.innerText = "Đang tải về máy...";
    showToast(`Đang gửi yêu cầu tải ${episodeName} chất lượng cao nhất...`);

    const useWatermark = checkUseWatermark ? checkUseWatermark.checked : false;
    const watermarkOpacity = rangeWatermarkOpacity ? parseFloat(rangeWatermarkOpacity.value) / 100 : 0.8;

    try {
        const res = await fetch('/download-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                m3u8Url: m3u8Url,
                dramaName: selectedDrama.name,
                episodeName: episodeName,
                subtitleUrl: subtitleUrl,
                useWatermark: useWatermark,
                watermarkOpacity: watermarkOpacity
            })
        });

        const data = await res.json();
        if (data.code === 200) {
            statusText.innerText = "🎉 Tải thành công!";
            showToast(`Đã lưu vào thư mục Gợi Ý Phim hay.`);
            addLog(`🎉 Tải phim thành công: ${data.filename}`);
            if (data.savedDir) addLog(`📁 Đã lưu tại: ${data.savedDir}`);
        } else {
            throw new Error(data.message || "Lỗi tải phim từ Local Server");
        }
    } catch (e) {
        statusText.innerText = "❌ Lỗi tải video";
        showToast("Lỗi tải video: " + e.message);
        addLog(`❌ Lỗi tải video: ${e.message}`);
    }
}

