document.addEventListener('DOMContentLoaded', () => {
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

    // --- 帳號與 VIP 狀態管理 ---
    const DAILY_LIMIT = 1; 
    let userEmail = localStorage.getItem('user_email') || '';
    let isVip = localStorage.getItem('is_vip') === 'true';
    let vipExpireDate = localStorage.getItem('vip_expire_date') || '';
    let devClickCount = 0;

    const castBtn = document.getElementById('cast-btn');
    const coinMethodSelection = document.getElementById('coin-method-selection');
    const manualTossControls = document.getElementById('manual-toss-controls');
    const autoTossControls = document.getElementById('auto-toss-controls');
    const btnRestart = document.getElementById('btn-restart');
    const btnStepBack = document.getElementById('btn-step-back');
    const yaoElements = document.querySelectorAll('.yao');
    const infoCard = document.querySelector('.info-card');

    // --- 檢查 7 天內到期並發送 Email 提醒模擬 ---
    function checkVipExpirationReminder() {
        if (!isVip || !vipExpireDate) return;
        const expireTime = new Date(vipExpireDate).getTime();
        const currentTime = new Date().getTime();
        const daysLeft = (expireTime - currentTime) / (1000 * 60 * 60 * 24);

        // 如果剩下不到 7 天且還沒提醒過
        if (daysLeft > 0 && daysLeft <= 7 && localStorage.getItem('reminder_sent') !== 'true') {
            const renewalModal = document.getElementById('renewal-modal');
            const renewalMsg = document.getElementById('renewal-msg');
            renewalMsg.innerHTML = `親愛的會員 <strong>${userEmail}</strong> 您好：<br><br>您的六爻 VIP 資格將於 <strong>${Math.ceil(daysLeft)} 天後</strong> (${vipExpireDate}) 到期。<br><br>感謝您的支持！系統為您準備了專屬續訂優惠，現在續訂即可享有 <strong>8 折優惠</strong>！`;
            renewalModal.style.display = 'flex';
            localStorage.setItem('reminder_sent', 'true');
        }
    }
    checkVipExpirationReminder();

    const renewalModal = document.getElementById('renewal-modal');
    document.getElementById('btn-close-renewal').addEventListener('click', () => { renewalModal.style.display = 'none'; });
    document.getElementById('btn-apply-discount').addEventListener('click', () => {
        renewalModal.style.display = 'none';
        alert("🎉 8 折優惠碼已套用！");
        document.getElementById('vip-modal').style.display = 'flex';
    });

    // 更新頂部帳號狀態標籤
    const userStatusTag = document.getElementById('user-status-tag');
    function updateUserStatusUI() {
        if (userEmail) {
            userStatusTag.textContent = isVip ? `👑 ${userEmail} (VIP)` : `🌱 ${userEmail}`;
            document.getElementById('btn-login').textContent = "🔒 切換帳號";
        } else {
            userStatusTag.textContent = "未登入";
            document.getElementById('btn-login').textContent = "🔑 登入";
        }
    }
    updateUserStatusUI();

    // --- Email 登入彈窗互動 ---
    const loginModal = document.getElementById('login-modal');
    const btnLogin = document.getElementById('btn-login');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const btnSubmitLogin = document.getElementById('btn-submit-login');
    const userEmailInput = document.getElementById('user-email-input');

    btnLogin.addEventListener('click', () => { loginModal.style.display = 'flex'; });
    btnCloseLogin.addEventListener('click', () => { loginModal.style.display = 'none'; });

    btnSubmitLogin.addEventListener('click', () => {
        const emailVal = userEmailInput.value.trim();
        if (emailVal === '' || !emailVal.includes('@')) {
            alert("請輸入有效的 Email 地址。");
            return;
        }
        userEmail = emailVal;
        localStorage.setItem('user_email', userEmail);
        updateUserStatusUI();
        loginModal.style.display = 'none';
        alert(`✅ 成功綁定帳號：${userEmail}`);
    });

    function checkDailyLimit() {
        const todayStr = new Date().toISOString().split('T')[0];
        let usage = JSON.parse(localStorage.getItem('daily_usage') || '{"date":"","count":0}');
        if (usage.date !== todayStr) {
            usage = { date: todayStr, count: 0 };
            localStorage.setItem('daily_usage', JSON.stringify(usage));
        }
        return usage;
    }

    function updateDailyLimitHint() {
        const hintEl = document.getElementById('daily-limit-hint');
        if (isVip) {
            hintEl.innerHTML = `👑 <strong style="color:#b89758;">VIP 尊榮模式：無限次數暢用中</strong>`;
        } else {
            const usage = checkDailyLimit();
            const remaining = Math.max(0, DAILY_LIMIT - usage.count);
            hintEl.textContent = `📅 今日免費次數：${remaining} / ${DAILY_LIMIT} 次（次日 0 點重置）`;
        }
    }

    function incrementDailyUsage() {
        if (isVip) return;
        const usage = checkDailyLimit();
        usage.count++;
        localStorage.setItem('daily_usage', JSON.stringify(usage));
        updateDailyLimitHint();
    }

    // 標題點擊 5 下解鎖開發者模式
    const devTrigger = document.getElementById('dev-trigger');
    function updateVipUIState() {
        if (isVip) {
            devTrigger.style.color = "#b89758";
            devTrigger.title = "✨ VIP 尊榮解鎖狀態（無限次數 + 銅錢起卦 + 30日歷史）";
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
    updateVipUIState();

    devTrigger.addEventListener('click', () => {
        devClickCount++;
        if (devClickCount >= 5) {
            isVip = !isVip;
            localStorage.setItem('is_vip', isVip);
            updateVipUIState();
            if (isVip) {
                alert("🛠️ 【開發者解鎖】：已切換為 VIP 尊榮權限！");
            } else {
                alert("🔒 【開發者鎖定】：已恢復一般免費版權限。");
            }
            devClickCount = 0;
        }
    });

    // --- VIP 方案訂閱與綠界/藍新測試金流模擬 ---
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

    btnEcpayPay.addEventListener('click', () => {
        if (!userEmail) {
            alert("請先點擊右上角「登入」綁定您的 Email，才能將 VIP 權限對應到您的帳號！");
            vipModal.style.display = 'none';
            loginModal.style.display = 'flex';
            return;
        }

        // 模擬串接綠界 ECPay / 藍新 NewebPay 測試金流跳轉
        const confirmPay = confirm(`即將引導您前往 【綠界 ECPay / 藍新 NewebPay 測試金流】 進行安全付款。\n方案：[${selectedPlan}] 測試環境訂單，是否確認付款？`);
        if (!confirmPay) return;

        // 計算到期日
        const expireDate = new Date();
        if (selectedPlan === 'day') expireDate.setDate(expireDate.getDate() + 1);
        else if (selectedPlan === 'month') expireDate.setMonth(expireDate.getMonth() + 1);
        else if (selectedPlan === 'year') expireDate.setFullYear(expireDate.getFullYear() + 1);
        else expireDate.setFullYear(expireDate.getFullYear() + 99); // 永久

        isVip = true;
        vipExpireDate = expireDate.toISOString().split('T')[0];
        localStorage.setItem('is_vip', 'true');
        localStorage.setItem('vip_expire_date', vipExpireDate);
        localStorage.removeItem('reminder_sent'); // 重置提醒狀態

        updateVipUIState();
        vipModal.style.display = 'none';
        alert(`💳 綠界金流回調成功！\n🎉 帳號 [${userEmail}] 已成功升級 VIP（效期至：${vipExpireDate}）。`);
    });

    // --- 深色模式切換 ---
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

    // --- 歷史紀錄側邊抽屜與權限控制 ---
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

        historyTierHint.textContent = isVip ? "👑 VIP 權限：可回顧最近 30 天所有卦象" : "🌱 免費版權限：僅顯示今日占卜紀錄（升級 VIP 解鎖 30 天）";

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
                    modalHContent.innerHTML = `<strong>紀錄卦象：</strong>${selectedHistoryItem.gua}<br><br><span style="color:var(--text-sub);">這是一則歷史存檔紀錄，您可直接複製當時的完整報告給 AI 進行複盤與追蹤。</span>`;
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
            const promptCopy = `我曾在 ${new Date(selectedHistoryItem.date).toLocaleString()} 進行占卜。\n我的問題是：「${selectedHistoryItem.question}」\n得到的卦象是：【${selectedHistoryItem.gua}】\n\n請以心理學與新中式哲學的角度，協助我複盤與深入追蹤這個問題的後續發展與心態調適。`;
            navigator.clipboard.writeText(promptCopy).then(() => {
                alert("已成功複製該筆歷史解籤報告！");
                historyModal.style.display = 'none';
            });
        }
    });

    // --- 3秒呼吸倒數緩衝 ---
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

    // --- 解析卦象並打包 AI 提示詞 ---
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
            ziShiNotice = "\n【夜間提醒】：此刻正值子時（23:00-01:00）陰陽交替之際，卦象易受潛意識干擾，結果請僅作睡前反思，重大決定留待明日。";
        }

        let modeName = (currentMode === 'time') 
            ? `時間起卦（梅花易數法 - 發生於 ${timeString}）` 
            : `銅錢起卦（傳統六爻納甲法 - 完成於 ${timeString}）`;

        let promptText = "";

        if (isVip) {
            promptText = `【VIP 專屬進階深度解讀報告】\n我剛剛在六爻解籤系統中，透過【${modeName}】進行了專業占卜。\n我的核心問題是：「${lastUserQuestion}」\n得到的本卦是：【${baseResult.name}】（${baseResult.desc}）`;
            if (hasChanging) {
                const changedResult = getHexagramInfo(changedBinary);
                document.getElementById('changed-name').textContent = changedResult.name;
                document.getElementById('changed-gua-box').style.display = 'block';
                promptText += `\n變卦是：【${changedResult.name}】（${changedResult.desc}）`;
            } else {
                document.getElementById('changed-gua-box').style.display = 'none';
            }
            promptText += `${ziShiNotice}\n\n身為一位精通榮格潛意識共時性、心理防衛機制與新中式美學哲學的智者，請為我進行 500 字以上的深度剖析。`;
        } else {
            promptText = `我剛剛在六爻系統中進行簡易占卜。\n問題：「${lastUserQuestion}」\n本卦：【${baseResult.name}】（${baseResult.desc}）`;
            if (hasChanging) {
                const changedResult = getHexagramInfo(changedBinary);
                document.getElementById('changed-name').textContent = changedResult.name;
                document.getElementById('changed-gua-box').style.display = 'block';
                promptText += `\n變卦：【${changedResult.name}】（${changedResult.desc}）`;
            } else {
                document.getElementById('changed-gua-box').style.display = 'none';
            }
            promptText += `\n\n請以心理學與新中式哲學角度，給我 100 字以內的精簡啟示與建議。`;
        }

        lastResultSummary = promptText;

        let repeatWarningHtml = "";
        if (isCurrentRepeated) {
            repeatWarningHtml = `
                <div style="background: rgba(184, 151, 88, 0.15); border-left: 4px solid #b89758; padding: 12px 15px; margin-bottom: 20px; border-radius: 4px; text-align: left;">
                    <p style="font-size: 0.9rem; color: #b89758; line-height: 1.6; margin: 0;">
                        ⚠️ <strong>此為七日內重複提問：</strong>卦象易受心念焦慮干擾。建議以第一次結果為主，本次結果與 AI 建議僅供情緒沉澱與參考。
                    </p>
                </div>
            `;
        }

        const baseDescHtml = `
            ${repeatWarningHtml}
            <strong style="color:#b89758;">【本卦解析】</strong><br>${baseResult.desc}<br><br>
            ${hasChanging ? `<strong style="color:#8b2626;">【變卦指引】</strong><br>${getHexagramInfo(changedBinary).desc}<br><br>` : ''}
            <span style="color:var(--text-sub);">${hasChanging ? '' : '此卦無動爻，請深思本卦之涵義。'}</span>
            ${ziShiNotice ? `<br><br><span style="color:var(--text-sub); font-size:0.9rem;">🌙 ${ziShiNotice}</span>` : ''}
        `;
        document.getElementById('gua-desc').innerHTML = baseDescHtml;

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
        const chatgptUrl = `https://chat.openai.com/?q=${encodedPrompt}`;

        aiButtonContainer.innerHTML = `
            <a href="${chatgptUrl}" target="_blank" class="cast-btn" style="text-decoration: none; display: block; text-align: center; background: #304758; color: #fff; font-size: 1.05rem; padding: 12px 20px; border-radius: 30px;">
                ✨ 前往 ChatGPT 深度解讀
            </a>
            <button id="btn-copy-prompt" class="cast-btn" style="font-size: 1rem; padding: 10px 20px; width: 100%;">
                📋 複製完整解籤報告
            </button>
            <p style="font-size: 0.8rem; color: var(--text-sub); margin-top: 10px; line-height: 1.5;">
                守則提醒：同一事七日內勿重複問，請信任第一次的啟示並付諸實踐。
            </p>
        `;

        document.getElementById('btn-copy-prompt').addEventListener('click', () => {
            navigator.clipboard.writeText(lastResultSummary).then(() => {
                alert("已成功複製解籤報告！可直接貼至任意 AI 對話框。");
            });
        });
    }

    // --- 三誡彈窗按鈕事件 ---
    document.getElementById('agree-btn').addEventListener('click', () => {
        rulesModal.style.opacity = '0';
        setTimeout(() => { rulesModal.style.display = 'none'; mainContainer.classList.remove('blur-mode'); }, 500);
    });
    document.getElementById('reject-btn').addEventListener('click', () => {
        document.querySelector('.modal-box').innerHTML = `<p style="font-size: 1.2rem; color: var(--text-dark); letter-spacing: 2px; margin: 30px 0;">若心未定，不妨改日再來。<br>祝您平靜安好。</p>`;
    });

    // --- 選擇起卦模式 ---
    document.getElementById('card-time').addEventListener('click', () => {
        const usage = checkDailyLimit();
        if (!isVip && usage.count >= DAILY_LIMIT) {
            vipModal.style.display = 'flex';
            return;
        }
        currentMode = 'time'; 
        document.getElementById('mode-hint-text').innerHTML = `【時間起卦】將以當下時辰起卦，<br>適合問大方向。請填寫今天最想釐清的一個具體情境。`; 
        stepMode.style.display = 'none'; 
        stepQuestion.style.display = 'block';
    });

    document.getElementById('card-coin').addEventListener('click', () => {
        if (!isVip) {
            vipModal.style.display = 'flex';
            return;
        }

        const usage = checkDailyLimit();
        if (!isVip && usage.count >= DAILY_LIMIT) {
            vipModal.style.display = 'flex';
            return;
        }

        currentMode = 'coin'; 
        document.getElementById('mode-hint-text').innerHTML = `【銅錢起卦】需連續擲幣六次，<br>適合問具體決策。請填寫今天最想釐清的一個具體情境。`; 
        stepMode.style.display = 'none'; 
        stepQuestion.style.display = 'block';
    });

    document.getElementById('btn-back-to-mode').addEventListener('click', () => {
        document.getElementById('user-question').value = '';
        stepQuestion.style.display = 'none';
        stepMode.style.display = 'block';
    });

    // 確認問題
    document.getElementById('confirm-btn').addEventListener('click', () => {
        const questionText = document.getElementById('user-question').value.trim();
        if (questionText === '') { alert("心念未定，請先寫下您的疑惑。"); return; }

        const lastDate = checkRepeatQuestion(questionText);
        if (lastDate) {
            const userChoice = confirm(
                `💡【溫馨提醒】\n您已於 ${lastDate} 問過類似的題目。\n\n` +
                `根據傳統守則，同一事七日內重複占問容易因焦慮而失準。\n\n` +
                `【建議換個角度思考】：\n` +
                `• 與其問「結果如何」，不如問「目前有哪些盲點需要調整？」\n\n` +
                `【按「確定」】繼續起卦（系統將轉為情緒安撫與深度反思模式）。\n` +
                `【按「取消」】返回修改問題。`
            );
            if (!userChoice) return;
            isCurrentRepeated = true;
        } else {
            isCurrentRepeated = false;
        }

        lastUserQuestion = questionText; 
        document.getElementById('display-question').textContent = `所問：${questionText}`;
        stepQuestion.style.display = 'none'; 
        stepCast.style.display = 'block';

        btnStepBack.style.display = 'inline-block';
        btnRestart.style.display = 'none';

        if (currentMode === 'time') {
            castBtn.style.display = 'inline-block'; 
            castBtn.textContent = '依此刻起卦'; 
            coinMethodSelection.style.display = 'none';
        } else if (currentMode === 'coin') {
            castBtn.style.display = 'none'; 
            coinMethodSelection.style.display = 'flex';
        }
    });

    function handleCompletion() {
        updateHexagramResult(); 
        infoCard.classList.add('show');
        castBtn.style.display = 'none';
        manualTossControls.style.display = 'none';
        autoTossControls.style.display = 'none';
        btnStepBack.style.display = 'none'; 
        btnRestart.style.display = 'inline-block'; 
    }

    castBtn.addEventListener('click', () => {
        runBreathCountdown(() => {
            castBtn.disabled = true; castBtn.textContent = '時辰推算中...'; castBtn.style.opacity = '0.7';
            currentTossResults = []; 

            const changingIndex = Math.floor(Math.random() * 6);
            yaoElements.forEach((yao, index) => {
                const isYang = Math.random() > 0.5;
                const isChanging = (index === changingIndex);
                
                let val;
                if (isYang) val = isChanging ? 9 : 7;
                else val = isChanging ? 6 : 8;

                currentTossResults[5 - index] = val;

                yao.className = 'yao'; 
                if (val === 7 || val === 9) yao.classList.add('yang'); else yao.classList.add('yin');
                if (val === 6 || val === 9) yao.classList.add('changing');
            });

            let delay = 300; 
            for (let i = yaoElements.length - 1; i >= 0; i--) {
                setTimeout(() => { yaoElements[i].classList.add('show'); }, delay); delay += 600; 
            }
            setTimeout(() => { handleCompletion(); }, delay + 400);
        });
    });

    document.getElementById('btn-manual-coin').addEventListener('click', () => { 
        coinMethodSelection.style.display = 'none'; 
        manualTossControls.style.display = 'flex'; 
        currentTossResults = []; 
        tossCount = 0;
    });
    
    document.getElementById('btn-auto-coin').addEventListener('click', () => { 
        coinMethodSelection.style.display = 'none'; 
        autoTossControls.style.display = 'flex'; 
        currentTossResults = []; 
        tossCount = 0;
    });

    function drawNextYao(val) {
        if (tossCount >= 6) return;
        currentTossResults[tossCount] = val; 

        const currentYaoIndex = 5 - tossCount; 
        const currentYaoEl = yaoElements[currentYaoIndex];
        
        currentYaoEl.className = 'yao'; 
        if (val === 7 || val === 9) currentYaoEl.classList.add('yang'); else currentYaoEl.classList.add('yin');
        if (val === 6 || val === 9) currentYaoEl.classList.add('changing');
        
        setTimeout(() => { currentYaoEl.classList.add('show'); }, 50);
        tossCount++;

        if (tossCount < 6) {
            document.getElementById('manual-toss-status').textContent = `請擲出硬幣，並記錄第 ${tossCount + 1} 爻`;
            document.getElementById('btn-auto-toss').textContent = `擲 第 ${tossCount + 1} 爻`;
        } else {
            manualTossControls.style.display = 'none'; autoTossControls.style.display = 'none';
            setTimeout(() => { handleCompletion(); }, 800);
        }
    }

    document.getElementById('btn-record-8').addEventListener('click', () => drawNextYao(8));
    document.getElementById('btn-record-7').addEventListener('click', () => drawNextYao(7));
    document.getElementById('btn-record-6').addEventListener('click', () => drawNextYao(6));
    document.getElementById('btn-record-9').addEventListener('click', () => drawNextYao(9));

    document.getElementById('btn-auto-toss').addEventListener('click', () => {
        runBreathCountdown(() => {
            let sum = 0;
            for(let i=0; i<3; i++) sum += (Math.random() > 0.5 ? 3 : 2);
            drawNextYao(sum);
        });
    });

    btnStepBack.addEventListener('click', () => {
        if (currentMode === 'coin' && (manualTossControls.style.display === 'flex' || autoTossControls.style.display === 'flex') && tossCount > 0 && tossCount < 6) {
            tossCount--;
            const resetYaoIndex = 5 - tossCount;
            yaoElements[resetYaoIndex].className = 'yao';
            currentTossResults.pop();

            if (manualTossControls.style.display === 'flex') {
                document.getElementById('manual-toss-status').textContent = `已撤回，請重新記錄第 ${tossCount + 1} 爻`;
            } else {
                document.getElementById('btn-auto-toss').textContent = `擲 第 ${tossCount + 1} 爻`;
            }
            return;
        }

        if (currentMode === 'coin' && (manualTossControls.style.display === 'flex' || autoTossControls.style.display === 'flex' || coinMethodSelection.style.display === 'flex')) {
            coinMethodSelection.style.display = 'none';
            manualTossControls.style.display = 'none';
            autoTossControls.style.display = 'none';
            coinMethodSelection.style.display = 'flex'; 
            tossCount = 0;
            currentTossResults = [];
            yaoElements.forEach(y => y.className = 'yao');
            return;
        }

        stepCast.style.display = 'none';
        stepQuestion.style.display = 'block';
        btnStepBack.style.display = 'none';
        tossCount = 0;
        currentTossResults = [];
        yaoElements.forEach(yao => { yao.className = 'yao'; });
        castBtn.style.display = 'none';
        coinMethodSelection.style.display = 'none';
        manualTossControls.style.display = 'none';
        autoTossControls.style.display = 'none';
    });

    btnRestart.addEventListener('click', () => {
        tossCount = 0; currentTossResults = []; document.getElementById('user-question').value = '';
        castBtn.disabled = false; castBtn.style.opacity = '1';
        document.getElementById('manual-toss-status').textContent = `請擲出硬幣，並記錄第 1 爻`; 
        document.getElementById('btn-auto-toss').textContent = `擲 第 1 爻`;
        
        yaoElements.forEach(yao => { yao.className = 'yao'; }); 
        infoCard.classList.remove('show');
        
        const aiButtonContainer = document.getElementById('ai-action-container');
        if (aiButtonContainer) aiButtonContainer.innerHTML = ""; 

        btnRestart.style.display = 'none'; 
        btnStepBack.style.display = 'none';
        manualTossControls.style.display = 'none'; 
        autoTossControls.style.display = 'none'; 
        coinMethodSelection.style.display = 'none'; 
        castBtn.style.display = 'none';
        
        stepCast.style.display = 'none'; 
        stepMode.style.display = 'block';
        updateDailyLimitHint(); 
    });
});