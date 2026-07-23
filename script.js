document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://xrtgfjitrusiavopel.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_BuyBRJ9kY4pWLIN6XiKXhg_BIlux0lz';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const rulesModal = document.getElementById('rules-modal');
    const mainContainer = document.getElementById('main-container');
    const stepMode = document.getElementById('step-mode');
    const stepQuestion = document.getElementById('step-question');
    const stepCast = document.getElementById('step-cast');
    
    let currentMode = '';
    let tossCount = 0; 
    let currentTossResults = []; 
    let lastUserQuestion = ""; 
    let lastResultSummary = ""; 
    let isCurrentRepeated = false; 

    const DAILY_LIMIT = 1; 
    let userEmail = localStorage.getItem('user_email') || '';
    let isVip = false;
    let vipExpireDate = '';
    let devClickCount = 0;

    const castBtn = document.getElementById('cast-btn');
    const coinMethodSelection = document.getElementById('coin-method-selection');
    const manualTossControls = document.getElementById('manual-toss-controls');
    const autoTossControls = document.getElementById('auto-toss-controls');
    const btnRestart = document.getElementById('btn-restart');
    const btnStepBack = document.getElementById('btn-step-back');
    const yaoElements = document.querySelectorAll('.yao');
    const infoCard = document.querySelector('.info-card');
    const userStatusTag = document.getElementById('user-status-tag');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');

    async function syncUserDataFromCloud() {
        if (!userEmail) {
            updateVipUIState();
            return;
        }
        try {
            const { data } = await supabaseClient
                .from('users')
                .select('*')
                .eq('email', userEmail)
                .single();

            if (data) {
                isVip = data.is_vip || false;
                vipExpireDate = data.vip_expire_date || '';
                checkVipExpirationReminder();
            } else {
                await supabaseClient.from('users').insert([{ email: userEmail, is_vip: false }]);
            }
        } catch (err) {
            console.error("同步雲端資料失敗:", err);
        }
        updateVipUIState();
        updateDailyLimitHint();
    }

    function checkVipExpirationReminder() {
        if (!isVip || !vipExpireDate) return;
        const expireTime = new Date(vipExpireDate).getTime();
        const currentTime = new Date().getTime();
        const daysLeft = (expireTime - currentTime) / (1000 * 60 * 60 * 24);

        if (daysLeft > 0 && daysLeft <= 7 && localStorage.getItem('reminder_sent') !== 'true') {
            const renewalModal = document.getElementById('renewal-modal');
            const renewalMsg = document.getElementById('renewal-msg');
            renewalMsg.innerHTML = `親愛的會員 <strong>${userEmail}</strong> 您好：<br><br>您的六爻 VIP 資格將於 <strong>${Math.ceil(daysLeft)} 天後</strong> (${vipExpireDate}) 到期。現在續訂可享 <strong>8 折優惠</strong>！`;
            renewalModal.style.display = 'flex';
            localStorage.setItem('reminder_sent', 'true');
        }
    }

    const renewalModal = document.getElementById('renewal-modal');
    document.getElementById('btn-close-renewal').addEventListener('click', () => { renewalModal.style.display = 'none'; });
    document.getElementById('btn-apply-discount').addEventListener('click', () => {
        renewalModal.style.display = 'none';
        alert("🎉 8 折優惠碼已套用！");
        document.getElementById('vip-modal').style.display = 'flex';
    });

    function updateUserStatusUI() {
        if (userEmail) {
            userStatusTag.textContent = isVip ? `👑 ${userEmail} (VIP)` : `🌱 ${userEmail}`;
            btnLogin.style.display = 'none';   // 隱藏登入按鈕
            btnLogout.style.display = 'inline-block'; // 顯示登出按鈕
        } else {
            userStatusTag.textContent = "未登入";
            btnLogin.style.display = 'inline-block';  // 顯示登入按鈕
            btnLogout.style.display = 'none';   // 隱藏登出按鈕
        }
    }

    // 登入按鈕事件
    const loginModal = document.getElementById('login-modal');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const btnSubmitLogin = document.getElementById('btn-submit-login');
    const userEmailInput = document.getElementById('user-email-input');

    btnLogin.addEventListener('click', () => { loginModal.style.display = 'flex'; });
    btnCloseLogin.addEventListener('click', () => { loginModal.style.display = 'none'; });

    // 獨立的登出按鈕事件
    btnLogout.addEventListener('click', () => {
        const confirmLogout = confirm(`目前已登入帳號：${userEmail}\n是否確定要登出？`);
        if (confirmLogout) {
            localStorage.removeItem('user_email');
            userEmail = '';
            isVip = false;
            vipExpireDate = '';
            updateVipUIState();
            alert("🔒 已成功登出帳號。");
            window.location.reload();
        }
    });

    btnSubmitLogin.addEventListener('click', async () => {
        const emailVal = userEmailInput.value.trim();
        if (emailVal === '' || !emailVal.includes('@')) {
            alert("請輸入有效的 Email 地址。");
            return;
        }
        userEmail = emailVal;
        localStorage.setItem('user_email', userEmail);
        loginModal.style.display = 'none';
        
        await syncUserDataFromCloud();
        alert(`✅ 成功綁定雲端帳號：${userEmail}`);
    });

    async function getCloudDailyUsage() {
        if (isVip) return { count: 0 };
        const todayStr = new Date().toISOString().split('T')[0];
        if (!userEmail) {
            let usage = JSON.parse(localStorage.getItem('daily_usage') || '{"date":"","count":0}');
            if (usage.date !== todayStr) { usage = { date: todayStr, count: 0 }; localStorage.setItem('daily_usage', JSON.stringify(usage)); }
            return usage;
        }

        try {
            const { data } = await supabaseClient
                .from('daily_usage')
                .select('*')
                .eq('email', userEmail)
                .eq('usage_date', todayStr)
                .single();

            if (data) {
                return data;
            } else {
                await supabaseClient.from('daily_usage').insert([{ email: userEmail, usage_date: todayStr, count: 0 }]);
                return { count: 0 };
            }
        } catch (err) {
            return { count: 0 };
        }
    }

    async function updateDailyLimitHint() {
        const hintEl = document.getElementById('daily-limit-hint');
        if (isVip) {
            hintEl.innerHTML = `👑 <strong style="color:#b89758;">VIP 雲端尊榮模式：無限次數暢用中</strong>`;
        } else {
            const usage = await getCloudDailyUsage();
            const remaining = Math.max(0, DAILY_LIMIT - usage.count);
            hintEl.textContent = `📅 雲端今日免費次數：${remaining} / ${DAILY_LIMIT} 次（次日 0 點重置）`;
        }
    }

    async function incrementDailyUsage() {
        if (isVip) return;
        const todayStr = new Date().toISOString().split('T')[0];
        if (!userEmail) {
            let usage = JSON.parse(localStorage.getItem('daily_usage') || '{"date":"","count":0}');
            usage.count++;
            localStorage.setItem('daily_usage', JSON.stringify(usage));
            updateDailyLimitHint();
            return;
        }

        try {
            const { data } = await supabaseClient
                .from('daily_usage')
                .select('*')
                .eq('email', userEmail)
                .eq('usage_date', todayStr)
                .single();

            if (data) {
                await supabaseClient
                    .from('daily_usage')
                    .update({ count: data.count + 1 })
                    .eq('id', data.id);
            }
        } catch (err) {
            console.error("更新次數失敗", err);
        }
        await updateDailyLimitHint();
    }

    const devTrigger = document.getElementById('dev-trigger');
    function updateVipUIState() {
        if (isVip) {
            devTrigger.style.color = "#b89758";
            devTrigger.title = "✨ VIP 雲端解鎖狀態";
            document.getElementById('btn-vip-upgrade').textContent = "👑 VIP 已啟用";
            document.getElementById('btn-vip-upgrade').style.background = "#7a988d";
        } else {
            devTrigger.style.color = "var(--text-dark)";
            document.getElementById('btn-vip-upgrade').textContent = "👑 VIP方案";
            document.getElementById('btn-vip-upgrade').style.background = "#b89758";
        }
        updateUserStatusUI();
        updateDailyLimitHint();
    }

    devTrigger.addEventListener('click', async () => {
        devClickCount++;
        if (devClickCount >= 5) {
            isVip = !isVip;
            if (userEmail) {
                await supabaseClient.from('users').update({ is_vip: isVip }).eq('email', userEmail);
            }
            updateVipUIState();
            alert(isVip ? "🛠️ 【雲端解鎖】：已切換為 VIP 尊榮權限！" : "🔒 【雲端鎖定】：已恢復一般免費版。");
            devClickCount = 0;
        }
    });

    const vipModal = document.getElementById('vip-modal');
    const btnVipUpgrade = document.getElementById('btn-vip-upgrade');
    const btnCloseVip = document.getElementById('btn-close-vip');
    const btnEcpayPay = document.getElementById('btn-ecpay-pay');
    let selectedPlan = 'year';

    btnVipUpgrade.addEventListener('click', () => { vipModal.style.display = 'flex'; });
    btnCloseVip.addEventListener('click', () => { vipModal.style.display = 'none'; });

    document.querySelectorAll('.vip-plan-card').forEach(card => {
        card.addEventListener('click', (e) => {
            document.querySelectorAll('.vip-plan-card').forEach(c => c.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            selectedPlan = e.currentTarget.getAttribute('data-plan');
        });
    });

    btnEcpayPay.addEventListener('click', async () => {
        if (!userEmail) {
            alert("請先點擊右上角「登入」綁定您的 Email，才能將雲端 VIP 權限對應到您的帳號！");
            vipModal.style.display = 'none';
            loginModal.style.display = 'flex';
            return;
        }

        const confirmPay = confirm(`即將引導您前往 【綠界 ECPay / 藍新 NewebPay 測試金流】 進行安全付款。\n方案：[${selectedPlan}] 測試環境訂單，是否確認付款？`);
        if (!confirmPay) return;

        const expireDate = new Date();
        if (selectedPlan === 'day') expireDate.setDate(expireDate.getDate() + 1);
        else if (selectedPlan === 'month') expireDate.setMonth(expireDate.getMonth() + 1);
        else if (selectedPlan === 'year') expireDate.setFullYear(expireDate.getFullYear() + 1);
        else expireDate.setFullYear(expireDate.getFullYear() + 99);

        isVip = true;
        vipExpireDate = expireDate.toISOString().split('T')[0];

        await supabaseClient
            .from('users')
            .update({ is_vip: true, vip_expire_date: vipExpireDate })
            .eq('email', userEmail);

        localStorage.removeItem('reminder_sent');
        updateVipUIState();
        vipModal.style.display = 'none';
        alert(`💳 綠界金流回調成功！\n🎉 雲端帳號 [${userEmail}] 已成功升級 VIP（效期至：${vipExpireDate}）。`);
    });

    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    const savedTheme = localStorage.getItem('divination_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.textContent = (savedTheme === 'dark') ? '☀️ 日間' : '🌙 深色';

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('divination_theme', newTheme);
        themeToggleBtn.textContent = (newTheme === 'dark') ? '☀️ 日間' : '🌙 深色';
    });

    const historyToggleBtn = document.getElementById('btn-history-toggle');
    const historyDrawer = document.getElementById('history-drawer');
    const closeDrawerBtn = document.getElementById('btn-close-drawer');
    const historyListEl = document.getElementById('history-list');
    const historyTierHint = document.getElementById('history-tier-hint');

    const historyModal = document.getElementById('history-modal');
    const modalHTitle = document.getElementById('modal-h-title');
    const modalHTime = document.getElementById('modal-h-time');
    const modalHContent = document.getElementById('modal-h-content');
    const modalHCopy = document.getElementById('modal-h-copy');
    const modalHClose = document.getElementById('modal-h-close');
    let selectedHistoryItem = null;

    function renderHistoryDrawer() {
        const records = JSON.parse(localStorage.getItem('guaHistory') || '[]');
        const todayStr = new Date().toISOString().split('T')[0];

        const filteredRecords = records.filter(item => {
            const itemDate = item.date.split('T')[0];
            if (isVip) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return new Date(item.date) > thirtyDaysAgo;
            } else {
                return itemDate === todayStr;
            }
        });

        historyTierHint.textContent = isVip ? "👑 VIP 權限：可回顧最近 30 天所有卦象" : "🌱 免費版權限：僅顯示今日占卜紀錄";

        if (filteredRecords.length === 0) {
            historyListEl.innerHTML = `<p style="font-size:0.85rem; color:var(--text-sub); text-align:center; margin-top:20px;">尚無符合條件的歷史紀錄</p>`;
            return;
        }

        historyListEl.innerHTML = filteredRecords.slice().reverse().map((item) => {
            const originalIndex = records.indexOf(item);
            return `
                <div class="history-item" data-index="${originalIndex}">
                    <div class="h-date">${new Date(item.date).toLocaleString()}</div>
                    <div class="h-q">問：${item.question}</div>
                    <div class="h-gua">卦象：${item.gua}</div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                const records = JSON.parse(localStorage.getItem('guaHistory') || '[]');
                selectedHistoryItem = records[idx];

                if (selectedHistoryItem) {
                    modalHTitle.textContent = `所問：${selectedHistoryItem.question}`;
                    modalHTime.textContent = `占卜時間：${new Date(selectedHistoryItem.date).toLocaleString()}`;
                    modalHContent.innerHTML = `<strong>紀錄卦象：</strong>${selectedHistoryItem.gua}<br><br><span style="color:var(--text-sub);">歷史存檔紀錄。</span>`;
                    historyModal.style.display = 'flex';
                }
            });
        });
    }

    historyToggleBtn.addEventListener('click', () => { renderHistoryDrawer(); historyDrawer.classList.add('open'); });
    closeDrawerBtn.addEventListener('click', () => { historyDrawer.classList.remove('open'); });
    modalHClose.addEventListener('click', () => { historyModal.style.display = 'none'; });

    modalHCopy.addEventListener('click', () => {
        if (selectedHistoryItem) {
            const promptCopy = `我曾在 ${new Date(selectedHistoryItem.date).toLocaleString()} 進行占卜。\n我的問題是：「${selectedHistoryItem.question}」\n得到的卦象是：【${selectedHistoryItem.gua}】`;
            navigator.clipboard.writeText(promptCopy).then(() => {
                alert("已成功複製該筆歷史解籤報告！");
                historyModal.style.display = 'none';
            });
        }
    });

    function runBreathCountdown(callback) {
        const breathDiv = document.createElement('div');
        breathDiv.className = 'breath-modal';
        breathDiv.innerHTML = `
            <div class="breath-circle" id="countdown-num">3</div>
            <div class="breath-text">請深呼吸，默念您的問題<br><span style="font-size: 0.9rem; opacity: 0.8; letter-spacing: 1px;">心誠則靈，靜心凝神</span></div>
        `;
        document.body.appendChild(breathDiv);

        let timeLeft = 3;
        const numEl = document.getElementById('countdown-num');

        const timer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                numEl.textContent = timeLeft;
            } else {
                clearInterval(timer);
                breathDiv.style.opacity = '0';
                setTimeout(() => { breathDiv.remove(); if (callback) callback(); }, 400);
            }
        }, 1000);
    }

    function checkRepeatQuestion(question) {
        const records = JSON.parse(localStorage.getItem('guaHistory') || '[]');
        const cleanKeyword = question.replace(/[會嗎？?的了我呢吧]/g, '').trim();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        for (let record of records) {
            const recordDate = new Date(record.date);
            if (recordDate > sevenDaysAgo && (record.question.includes(cleanKeyword) || cleanKeyword.includes(record.question.replace(/[會嗎？?的了我呢吧]/g, '').trim()))) {
                return record.date.split('T')[0];
            }
        }
        return null;
    }

    function saveQuestionHistoryAndConsume(question, guaName) {
        const records = JSON.parse(localStorage.getItem('guaHistory') || '[]');
        records.push({ question: question, gua: guaName, date: new Date().toISOString(), isRepeated: isCurrentRepeated });
        if (records.length > 50) records.shift();
        localStorage.setItem('guaHistory', JSON.stringify(records));
        incrementDailyUsage(); 
    }

    function updateHexagramResult() {
        let baseBinary = "";
        let changedBinary = "";
        let hasChanging = false;

        for(let i=5; i>=0; i--) {
            const val = currentTossResults[i];
            if (val === 7) { baseBinary += "1"; changedBinary += "1"; }
            else if (val === 8) { baseBinary += "0"; changedBinary += "0"; }
            else if (val === 9) { baseBinary += "1"; changedBinary += "0"; hasChanging = true; } 
            else if (val === 6) { baseBinary += "0"; changedBinary += "1"; hasChanging = true; } 
        }
        
        const baseResult = getHexagramInfo(baseBinary);
        document.getElementById('base-name').textContent = baseResult.name;
        
        saveQuestionHistoryAndConsume(lastUserQuestion, baseResult.name);

        const now = new Date();
        const hours = now.getHours();
        const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${hours}時${now.getMinutes()}分${now.getSeconds()}秒`;

        let ziShiNotice = "";
        if (hours >= 23 || hours < 1) {
            ziShiNotice = "\n【夜間提醒】：此刻正值子時（23:00-01:00）陰陽交替之際，卦象易受潛意識干擾。";
        }

        let modeName = (currentMode === 'time') ? `時間起卦（發生於 ${timeString}）` : `銅錢起卦（完成於 ${timeString}）`;
        let promptText = "";

        if (isVip) {
            promptText = `【VIP 雲端專屬解讀報告】\n問題：「${lastUserQuestion}」\n本卦：【${baseResult.name}】（${baseResult.desc}）`;
            if (hasChanging) {
                const changedResult = getHexagramInfo(changedBinary);
                document.getElementById('changed-name').textContent = changedResult.name;
                document.getElementById('changed-gua-box').style.display = 'block';
                promptText += `\n變卦：【${changedResult.name}】（${changedResult.desc}）`;
            } else {
                document.getElementById('changed-gua-box').style.display = 'none';
            }
            promptText += `\n\n請以心理學與新中式哲學角度為我深度剖析。`;
        } else {
            promptText = `問題：「${lastUserQuestion}」\n本卦：【${baseResult.name}】（${baseResult.desc}）`;
            if (hasChanging) {
                const changedResult = getHexagramInfo(changedBinary);
                document.getElementById('changed-name').textContent = changedResult.name;
                document.getElementById('changed-gua-box').style.display = 'block';
                promptText += `\n變卦：【${changedResult.name}】`;
            } else {
                document.getElementById('changed-gua-box').style.display = 'none';
            }
            promptText += `\n\n請給予精簡啟示。`;
        }

        lastResultSummary = promptText;

        let repeatWarningHtml = isCurrentRepeated ? `<div style="background: rgba(184, 151, 88, 0.15); border-left: 4px solid #b89758; padding: 12px; margin-bottom: 20px; color: #b89758;">⚠️ 七日內重複提問，建議信任第一次啟示。</div>` : '';
        document.getElementById('gua-desc').innerHTML = `${repeatWarningHtml}<strong style="color:#b89758;">【本卦】</strong><br>${baseResult.desc}`;

        renderAIActions();
    }

    function renderAIActions() {
        let aiButtonContainer = document.getElementById('ai-action-container');
        if (!aiButtonContainer) {
            aiButtonContainer = document.createElement('div');
            aiButtonContainer.id = 'ai-action-container';
            aiButtonContainer.style.marginTop = "25px";
            aiButtonContainer.style.display = "flex";
            aiButtonContainer.style.flexDirection = "column";
            aiButtonContainer.style.gap = "12px";
            infoCard.appendChild(aiButtonContainer);
        }

        const encodedPrompt = encodeURIComponent(lastResultSummary);
        aiButtonContainer.innerHTML = `
            <a href="https://chat.openai.com/?q=${encodedPrompt}" target="_blank" class="cast-btn" style="text-decoration: none; display: block; text-align: center; background: #304758; color: #fff; padding: 12px; border-radius: 30px;">✨ 前往 ChatGPT 深度解讀</a>
            <button id="btn-copy-prompt" class="cast-btn" style="padding: 10px; width: 100%;">📋 複製報告</button>
        `;

        document.getElementById('btn-copy-prompt').addEventListener('click', () => {
            navigator.clipboard.writeText(lastResultSummary).then(() => { alert("已複製解籤報告！"); });
        });
    }

    document.getElementById('agree-btn').addEventListener('click', () => {
        rulesModal.style.opacity = '0';
        setTimeout(() => { rulesModal.style.display = 'none'; mainContainer.classList.remove('blur-mode'); }, 500);
    });
    document.getElementById('reject-btn').addEventListener('click', () => {
        document.querySelector('.modal-box').innerHTML = `<p style="font-size: 1.2rem; margin: 30px 0;">若心未定，不妨改日再來。</p>`;
    });

    document.getElementById('card-time').addEventListener('click', async () => {
        const usage = await getCloudDailyUsage();
        if (!isVip && usage.count >= DAILY_LIMIT) { vipModal.style.display = 'flex'; return; }
        currentMode = 'time'; 
        document.getElementById('mode-hint-text').innerHTML = `【時間起卦】`; 
        stepMode.style.display = 'none'; stepQuestion.style.display = 'block';
    });

    document.getElementById('card-coin').addEventListener('click', async () => {
        if (!isVip) { vipModal.style.display = 'flex'; return; }
        const usage = await getCloudDailyUsage();
        if (!isVip && usage.count >= DAILY_LIMIT) { vipModal.style.display = 'flex'; return; }
        currentMode = 'coin'; 
        document.getElementById('mode-hint-text').innerHTML = `【銅錢起卦】`; 
        stepMode.style.display = 'none'; stepQuestion.style.display = 'block';
    });

    document.getElementById('btn-back-to-mode').addEventListener('click', () => {
        document.getElementById('user-question').value = '';
        stepQuestion.style.display = 'none'; stepMode.style.display = 'block';
    });

    document.getElementById('confirm-btn').addEventListener('click', () => {
        const questionText = document.getElementById('user-question').value.trim();
        if (questionText === '') { alert("請先寫下您的疑惑。"); return; }
        lastUserQuestion = questionText; 
        document.getElementById('display-question').textContent = `所問：${questionText}`;
        stepQuestion.style.display = 'none'; stepCast.style.display = 'block';
        btnStepBack.style.display = 'inline-block'; btnRestart.style.display = 'none';

        if (currentMode === 'time') {
            castBtn.style.display = 'inline-block'; castBtn.textContent = '依此刻起卦'; coinMethodSelection.style.display = 'none';
        } else {
            castBtn.style.display = 'none'; coinMethodSelection.style.display = 'flex';
        }
    });

    function handleCompletion() {
        updateHexagramResult(); 
        infoCard.classList.add('show');
        castBtn.style.display = 'none';
        manualTossControls.style.display = 'none';
        autoTossControls.style.display = 'none';
        btnStepBack.style.display = 'none'; btnRestart.style.display = 'inline-block'; 
    }

    castBtn.addEventListener('click', () => {
        runBreathCountdown(() => {
            castBtn.disabled = true; castBtn.textContent = '推算中...';
            currentTossResults = []; 
            const changingIndex = Math.floor(Math.random() * 6);
            yaoElements.forEach((yao, index) => {
                const isYang = Math.random() > 0.5;
                const isChanging = (index === changingIndex);
                let val = isYang ? (isChanging ? 9 : 7) : (isChanging ? 6 : 8);
                currentTossResults[5 - index] = val;
                yao.className = 'yao ' + (val === 7 || val === 9 ? 'yang' : 'yin') + (val === 6 || val === 9 ? ' changing' : '');
            });
            let delay = 300; 
            for (let i = yaoElements.length - 1; i >= 0; i--) {
                setTimeout(() => { yaoElements[i].classList.add('show'); }, delay); delay += 400; 
            }
            setTimeout(() => { handleCompletion(); }, delay + 200);
        });
    });

    document.getElementById('btn-manual-coin').addEventListener('click', () => { 
        coinMethodSelection.style.display = 'none'; manualTossControls.style.display = 'flex'; currentTossResults = []; tossCount = 0;
    });
    document.getElementById('btn-auto-coin').addEventListener('click', () => { 
        coinMethodSelection.style.display = 'none'; autoTossControls.style.display = 'flex'; currentTossResults = []; tossCount = 0;
    });

    function drawNextYao(val) {
        if (tossCount >= 6) return;
        currentTossResults[tossCount] = val; 
        const currentYaoEl = yaoElements[5 - tossCount];
        currentYaoEl.className = 'yao ' + (val === 7 || val === 9 ? 'yang' : 'yin') + (val === 6 || val === 9 ? ' changing' : '');
        setTimeout(() => { currentYaoEl.classList.add('show'); }, 50);
        tossCount++;

        if (tossCount < 6) {
            document.getElementById('manual-toss-status').textContent = `請記錄第 ${tossCount + 1} 爻`;
            document.getElementById('btn-auto-toss').textContent = `擲 第 ${tossCount + 1} 爻`;
        } else {
            manualTossControls.style.display = 'none'; autoTossControls.style.display = 'none';
            setTimeout(() => { handleCompletion(); }, 500);
        }
    }

    document.getElementById('btn-record-8').addEventListener('click', () => drawNextYao(8));
    document.getElementById('btn-record-7').addEventListener('click', () => drawNextYao(7));
    document.getElementById('btn-record-6').addEventListener('click', () => drawNextYao(6));
    document.getElementById('btn-record-9').addEventListener('click', () => drawNextYao(9));

    document.getElementById('btn-auto-toss').addEventListener('click', () => {
        runBreathCountdown(() => {
            let sum = 0; for(let i=0; i<3; i++) sum += (Math.random() > 0.5 ? 3 : 2);
            drawNextYao(sum);
        });
    });

    btnRestart.addEventListener('click', async () => {
        tossCount = 0; currentTossResults = []; document.getElementById('user-question').value = '';
        castBtn.disabled = false; castBtn.style.opacity = '1';
        yaoElements.forEach(yao => { yao.className = 'yao'; }); 
        infoCard.classList.remove('show');
        const aiContainer = document.getElementById('ai-action-container');
        if (aiContainer) aiContainer.innerHTML = ""; 
        btnRestart.style.display = 'none'; btnStepBack.style.display = 'none';
        manualTossControls.style.display = 'none'; autoTossControls.style.display = 'none'; coinMethodSelection.style.display = 'none'; castBtn.style.display = 'none';
        stepCast.style.display = 'none'; stepMode.style.display = 'block';
        await syncUserDataFromCloud();
    });

    await syncUserDataFromCloud();
});