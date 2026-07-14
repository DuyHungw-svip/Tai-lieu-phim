/**
 * Script độc lập nhận thưởng DramaWave
 * Chạy: node claim_rewards.js <oauth_token> <oauth_signature>
 */

const https = require('https');

// ===================== CẤU HÌNH MẶC ĐỊNH =====================
const CONFIG = {
    host: 'api.mydramawave.com',
    oauthToken: process.argv[2] || 'DSwPIfwYH1j3MlazeoDxnS2Va1a7K6Dk',
    oauthSignature: process.argv[3] || '4a7eb6b6e263ab109102b19b6b339aed',
    headers: {
        'session-id': '228EF915-81FD-4E73-A37F-D0C047E9C612',
        'language': 'vi-VN',
        'User-Agent': 'DramaWave/1.8.91 (iPhone; iOS 18.1.1; Scale/3.00)',
        'country': 'VN',
        'device-language': 'vi-VN',
        'x-device-model': 'iPhone',
        'screen-width': '414',
        'device-id': '190F8882-BBB7-45BE-AF95-3B4EF5497A34',
        'screen-height': '896',
        'appsflyer-id': '1782989076983-5260087',
        'timezone': '+7',
        'device-country': 'VN',
        'Accept-Language': 'vi-VN;q=1',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'app-name': 'com.dramabuzz.app',
        'app-version': '1.8.91',
        'device': 'ios'
    },
    freezeDelay: 6500
};

let detailsLog = [];

// ===================== HÀM GỌI API =====================
function callApi(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const ts = Date.now();
        const auth = `oauth_signature=${CONFIG.oauthSignature},oauth_token=${CONFIG.oauthToken},ts=${ts}`;

        const options = {
            hostname: CONFIG.host,
            path: path,
            method: method,
            headers: { ...CONFIG.headers, 'Authorization': auth }
        };

        let postData = null;
        if (body) {
            postData = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { reject(new Error(`Không parse được JSON: ${data.substring(0, 200)}`)); }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
        if (postData) req.write(postData);
        req.end();
    });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function log(msg) {
    const time = new Date().toLocaleTimeString('vi-VN');
    console.log(`[${time}] ${msg}`);
}

function addDetailLog(msg) {
    const time = new Date().toLocaleTimeString('vi-VN');
    detailsLog.push(`[${time}] ${msg}`);
}

// ===================== ĐIỂM DANH HÀNG NGÀY =====================
async function claimDailyCheckins() {
    try {
        const res = await callApi('/dm-api/task/daily-checkins');
        if (res.code !== 200 || !res.data) {
            addDetailLog(`❌ Không lấy được thông tin điểm danh từ server: ${res.message || 'Lỗi không xác định'}`);
            return;
        }

        const { task_list } = res.data;
        addDetailLog(`━━━ ĐIỂM DANH HÀNG NGÀY ━━━`);

        for (const task of task_list) {
            // Trường hợp 1: Đã nhận điểm danh rồi
            if (task.task_status === 2 && task.reward_status === 2) {
                addDetailLog(`📅 Ngày ${task.day_num} (${task.reward_amount} xu): Đã nhận rồi ✅`);
                continue;
            }
            
            // Trường hợp 2: Chưa đến ngày điểm danh
            if (task.task_status === 1) {
                addDetailLog(`📅 Ngày ${task.day_num} (${task.reward_amount} xu): Chưa đến lượt ⏳`);
                continue;
            }

            // Trường hợp 3: Sẵn sàng nhận (chưa nhận thưởng hôm nay)
            try {
                addDetailLog(`📅 Ngày ${task.day_num} (${task.reward_amount} xu): Đang tiến hành điểm danh...`);
                const balBefore = await getWalletBalance() || 0;

                const doRes = await callApi('/dm-api/task/do-task', 'POST', {
                    task_id: task.task_id,
                    task_code: task.task_code,
                    task_type: task.task_type
                });

                if (doRes.code === 200) {
                    const balAfter = await getWalletBalance() || 0;
                    const diff = balAfter - balBefore;

                    if (diff > 0) {
                        addDetailLog(`🎉 Điểm danh ngày ${task.day_num} THÀNH CÔNG: +${diff} xu! ✅`);
                    } else {
                        addDetailLog(`⚠️ Điểm danh ngày ${task.day_num} hoàn tất nhưng ví không tăng xu.`);
                    }
                } else {
                    addDetailLog(`❌ Điểm danh ngày ${task.day_num} thất bại: ${doRes.message || 'Lỗi server'}`);
                }
            } catch (e) {
                addDetailLog(`❌ Lỗi kết nối khi điểm danh ngày ${task.day_num}: ${e.message}`);
            }
        }
    } catch (e) {
        addDetailLog(`❌ Lỗi hệ thống điểm danh: ${e.message}`);
    }
}

// ===================== QC BONUS ĐIỂM DANH =====================
async function claimCheckinBonusAds() {
    try {
        const res = await callApi('/dm-api/task/daily-checkins');
        if (res.code !== 200 || !res.data || !res.data.new_extra_ad) return;

        const extra = res.data.new_extra_ad;
        const { id, finished, all } = extra;
        const remain = all - finished;

        addDetailLog(`━━━ QUẢNG CÁO BONUS ĐIỂM DANH ━━━`);
        addDetailLog(`📺 Trạng thái xem: Đã xem ${finished}/${all} video quảng cáo bonus.`);

        if (remain <= 0) {
            addDetailLog(`✅ Đã nhận hết toàn bộ quảng cáo bonus điểm danh hôm nay.`);
            return;
        }

        addDetailLog(`🔄 Đang tiến hành nhận xu cho ${remain} quảng cáo bonus còn lại...`);
        for (let i = 1; i <= remain; i++) {
            try {
                const balBefore = await getWalletBalance() || 0;

                const doRes = await callApi('/dm-api/task/do-task', 'POST', {
                    task_id: id,
                    task_type: 4
                });

                if (doRes.code === 200) {
                    const balAfter = await getWalletBalance() || 0;
                    const diff = balAfter - balBefore;

                    if (diff > 0) {
                        addDetailLog(`🎉 Nhận xu ad bonus (${finished + i}/${all}) thành công: +${diff} xu! ✅`);
                    } else if (doRes.data && doRes.data.task_status === 7) {
                        addDetailLog(`❌ Dừng nhận: Server yêu cầu xem quảng cáo thật trên app di động.`);
                        break;
                    } else {
                        addDetailLog(`⚠️ Nhận ad bonus (${finished + i}/${all}) hoàn tất nhưng ví không tăng xu.`);
                    }
                } else {
                    addDetailLog(`❌ Nhận ad bonus (${finished + i}/${all}) thất bại: ${doRes.message || 'Lỗi server'}`);
                }
            } catch (e) {
                addDetailLog(`❌ Lỗi kết nối khi nhận ad bonus: ${e.message}`);
            }

            if (i < remain) {
                await sleep(CONFIG.freezeDelay);
            }
        }
    } catch (e) {
        addDetailLog(`❌ Lỗi hệ thống ad bonus: ${e.message}`);
    }
}

// ===================== TỰ ĐỘNG ĐẶT TRƯỚC PHIM =====================
async function claimReserveDrama() {
    try {
        const listRes = await callApi('/dm-api/coming-soon/list?next=');
        if (listRes.code !== 200 || !listRes.data || !Array.isArray(listRes.data.items)) {
            addDetailLog(`❌ Lỗi lấy danh sách phim sắp chiếu: ${listRes.message || 'Lỗi không xác định'}`);
            return;
        }

        let keys = [];
        listRes.data.items.forEach(module => {
            if (module.items && Array.isArray(module.items)) {
                module.items.forEach(item => {
                    if (item.key) keys.push(item.key);
                });
            }
        });

        addDetailLog(`━━━ ĐẶT TRƯỚC PHIM SẮP CHIẾU (Task 2104) ━━━`);
        if (keys.length < 3) {
            addDetailLog(`ℹ️ Không có đủ phim sắp chiếu để thực hiện đặt trước (yêu cầu 3 phim, hiện có: ${keys.length}).`);
            return;
        }

        // Đặt trước 3 phim đầu tiên
        let successCount = 0;
        for (let i = 0; i < 3; i++) {
            const key = keys[i];
            await callApi('/dm-api/drama/booking', 'POST', { series_key: key });
            const completeRes = await callApi('/dm-api/task/reserve-drama-complete', 'POST', { series_key: key });
            if (completeRes.code === 200) successCount++;
        }
        addDetailLog(`🔄 Đã đặt trước thành công ${successCount}/3 phim.`);

        const body = { task_id: 2104, task_code: 'reserve_drama', task_type: 17 };
        await callApi('/dm-api/task/do-task', 'POST', body);

        const balBefore = await getWalletBalance() || 0;
        let rewardRes = await callApi('/dm-api/task/reward-to-claim', 'POST', body);
        
        if (rewardRes.code === 200) {
            const balAfter = await getWalletBalance() || 0;
            const diff = balAfter - balBefore;
            if (diff > 0) {
                addDetailLog(`🎉 Nhận xu nhiệm vụ đặt trước phim thành công: +${diff} xu! ✅`);
            } else {
                addDetailLog(`ℹ️ Nhiệm vụ đặt trước phim đã hoàn thành nhưng ví không tăng xu (có thể đã nhận trước đó).`);
            }
        } else {
            addDetailLog(`ℹ️ Không thể nhận xu đặt trước phim: ${rewardRes.message || 'Chưa đủ điều kiện hoặc đã nhận rồi'}`);
        }
    } catch (e) {
        addDetailLog(`❌ Lỗi nhiệm vụ đặt trước phim: ${e.message}`);
    }
}

// ===================== NHẬN XU TỪ REWARD LIST (Đăng nhập, MXH, Xem phim theo phút...) =====================
async function claimAllTasksFromRewardList() {
    try {
        const listRes = await callApi('/dm-api/task/reward-list/v2');
        if (listRes.code !== 200 || !listRes.data || !listRes.data.task_list) {
            addDetailLog(`❌ Không lấy được danh sách nhiệm vụ từ server.`);
            return;
        }

        const taskList = listRes.data.task_list;
        const blacklistedTaskIds = [3001];
        
        let eligibleTasks = taskList.filter(t => t.task_status === 2 && !blacklistedTaskIds.includes(t.task_id));

        if (eligibleTasks.length > 0) {
            addDetailLog(`━━━ NHẬN XU CÁC NHIỆM VỤ KHÁC ━━━`);
            for (const task of eligibleTasks) {
                const body = { task_id: task.task_id, task_code: task.task_code, task_type: task.task_type };
                try {
                    const balBefore = await getWalletBalance() || 0;
                    let rewardRes = await callApi('/dm-api/task/reward-to-claim', 'POST', body);
                    
                    if (rewardRes.code === 200) {
                        const balAfter = await getWalletBalance() || 0;
                        const diff = balAfter - balBefore;
                        if (diff > 0) {
                            addDetailLog(`🎉 Nhiệm vụ [${task.task_name || task.task_code}] thành công: +${diff} xu! ✅`);
                        }
                    } else {
                        addDetailLog(`❌ Nhiệm vụ [${task.task_name || task.task_code}] thất bại: ${rewardRes.message}`);
                    }
                } catch(e) {
                    addDetailLog(`⚠️ Lỗi khi nhận nhiệm vụ [${task.task_name || task.task_code}]: ${e.message}`);
                }
            }
        }
    } catch (e) {
        addDetailLog(`❌ Lỗi quét danh sách nhiệm vụ: ${e.message}`);
    }
}

// ===================== KIỂM TRA SỐ DƯ =====================
async function getWalletBalance() {
    try {
        const res = await callApi('/dm-api/wallet/my');
        if (res.code === 200 && res.data) {
            return res.data.bonus_balance;
        }
    } catch {}
    return null;
}

// ===================== CHẠY TẤT CẢ =====================
async function main() {
    // 1. Lấy số dư trước khi chạy
    const balanceBefore = await getWalletBalance() || 0;

    log('🚀 BẮT ĐẦU NHẬN THƯỞNG DRAMAWAVE');
    console.log('═'.repeat(50));

    // 2. Chạy các nhiệm vụ ngầm
    await claimDailyCheckins();
    await claimReserveDrama();
    await claimAllTasksFromRewardList();
    await claimCheckinBonusAds();

    // 3. Lấy số dư ví sau khi chạy xong
    const balanceAfter = await getWalletBalance() || 0;
    const earnedCoinsTotal = balanceAfter - balanceBefore;

    // 4. Xuất log chi tiết
    detailsLog.forEach(line => console.log(line));
    console.log('═'.repeat(50));
    
    if (earnedCoinsTotal > 0) {
        log(`📈 Tổng kết: Nhận thành công +${earnedCoinsTotal} xu! Số dư hiện tại: ${balanceAfter} xu.`);
    } else {
        log(`📈 Tổng kết: Không có xu nào mới được cộng thêm. Số dư ví: ${balanceAfter} xu. (+0 xu)`);
        log(`💡 Gợi ý: Nếu hôm nay là ngày mới của bạn nhưng chưa nhận được xu, có thể server DramaWave chưa reset ngày mới (do lệch múi giờ Mỹ/UTC). Hãy thử lại sau!`);
    }
    log('✅ HOÀN TẤT!');
}

main().catch(e => {
    log(`❌ LỖI: ${e.message}`);
    process.exit(1);
});
