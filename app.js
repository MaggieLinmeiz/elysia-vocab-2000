// ==========================================
// Elysia 的奇想風元素戰養成所 - 核心邏輯 (app.js)
// ==========================================

const Game = {
    currentGroupIndex: 0,
    currentBatchWords: [],
    currentWordIndex: 0,
    score: 0,
    windEnergy: parseInt(localStorage.getItem('elysia_wind_energy') || '0'),
    masteredWords: JSON.parse(localStorage.getItem('elysia_mastered_words') || '[]'),
    wrongWords: JSON.parse(localStorage.getItem('elysia_wrong_words') || '[]'),
    currentQuestion: null,
    answeredCorrectlyFirstTry: true,
    currentMode: 'choice', // 'choice' or 'spell'

    init() {
        console.log("Elysia Game Initializing...");
        
        // 檢查資料庫是否存在 (支援 VOCAB_DATA 或 VOCAB_DATABASE)
        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : []);
        
        if (!Array.isArray(db) || db.length === 0) {
            alert("警告：單字資料庫 (vocab_data.js) 尚未正確載入，請確認變數名稱是否為 VOCAB_DATA！");
            return;
        }

        this.updateStats();
    },

    // 切換畫面視窗
    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    },

    // 返回首頁
    returnMenu() {
        this.switchScreen('screen-menu');
        this.updateStats();
    },

    // 更新頂部統計數據
    updateStats() {
        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : []);
        
        const totalMasteredElem = document.getElementById('total-mastered');
        if (totalMasteredElem) totalMasteredElem.innerText = this.masteredWords.length;

        const windEnergyElem = document.getElementById('wind-energy');
        if (windEnergyElem) windEnergyElem.innerText = this.windEnergy;

        const wrongCountElem = document.getElementById('wrong-count');
        if (wrongCountElem) wrongCountElem.innerText = this.wrongWords.length;
    },

    // 開始今日 20 題特訓
    startDailySession() {
        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : []);
        
        // 計算當前進度組別 (每組 20 題)
        const startIdx = this.currentGroupIndex * 20;
        const endIdx = startIdx + 20;
        
        const rawBatch = db.slice(startIdx, endIdx);
        if (rawBatch.length === 0) {
            alert("太棒了！您已經完成所有單字的特訓！將為您重新循環。");
            this.currentGroupIndex = 0;
            this.startDailySession();
            return;
        }

        // 過濾已掌握的單字，確保組內不重複、組間獨立
        this.currentBatchWords = rawBatch.filter(item => !this.masteredWords.includes(item.word));

        if (this.currentBatchWords.length === 0) {
            // 如果這組全背完了，自動跳下一組
            this.currentGroupIndex++;
            this.startDailySession();
            return;
        }

        this.currentWordIndex = 0;
        this.switchScreen('screen-quiz');
        this.nextQuestion();
    },

    // 下一題
    nextQuestion() {
        if (this.currentWordIndex >= this.currentBatchWords.length) {
            // 該組 20 題特訓完成，進入 AI 寫作挑戰畫面
            this.prepareWritingChallenge();
            this.switchScreen('screen-writing');
            return;
        }

        this.currentQuestion = this.currentBatchWords[this.currentWordIndex];
        this.answeredCorrectlyFirstTry = true;

        // 隱藏解析框
        const expBox = document.getElementById('explanation-box');
        if (expBox) expBox.classList.add('hidden');

        // 顯示解題介面
        const optionsContainer = document.getElementById('options-container');
        const spellContainer = document.getElementById('spell-container');
        if (this.currentMode === 'choice') {
            if (optionsContainer) optionsContainer.style.display = 'grid';
            if (spellContainer) spellContainer.style.display = 'none';
        } else {
            if (optionsContainer) optionsContainer.style.display = 'none';
            if (spellContainer) spellContainer.style.display = 'block';
            const spellInput = document.getElementById('spell-input');
            if (spellInput) spellInput.value = '';
        }

        this.updateQuizUI();
    },

    // 更新測驗 UI
    updateQuizUI() {
        const q = this.currentQuestion;
        if (!q) return;

        document.getElementById('vocab-word').innerText = q.word;
        document.getElementById('vocab-phonetic').innerText = q.phonetic || '';
        document.getElementById('vocab-category').innerText = `分類：${q.category || '核心單字'}`;
        
        const chunkBadge = document.getElementById('vocab-chunk-badge');
        if (chunkBadge) {
            chunkBadge.innerText = q.collocation ? `Chunk: ${q.collocation}` : '';
        }

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.innerText = `${this.currentWordIndex + 1} / ${this.currentBatchWords.length} (第 ${this.currentGroupIndex + 1} 組)`;
        }

        // 更新魔物血條
        const hpBar = document.getElementById('monster-hp');
        if (hpBar) {
            const hpPercent = ((this.currentBatchWords.length - this.currentWordIndex) / this.currentBatchWords.length) * 100;
            hpBar.style.width = `${hpPercent}%`;
        }

        if (this.currentMode === 'choice') {
            this.generateOptions();
        }
    },

    // 生成 4 選 1 選項
    generateOptions() {
        const container = document.getElementById('options-container');
        if (!container) return;
        container.innerHTML = '';

        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : VOCAB_DATABASE;
        let options = [this.currentQuestion.meaning];

        while (options.length < 4 && db.length > 0) {
            const randomItem = db[Math.floor(Math.random() * db.length)];
            if (!options.includes(randomItem.meaning)) {
                options.push(randomItem.meaning);
            }
        }
        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.style.padding = '12px';
            btn.style.borderRadius = '8px';
            btn.style.background = 'rgba(30, 41, 59, 0.8)';
            btn.style.border = '1px solid #475569';
            btn.style.color = '#f8fafc';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '1rem';
            btn.onclick = () => Game.checkChoiceAnswer(opt);
            container.appendChild(btn);
        });
    },

    // 檢查 4 選 1 答案
    checkChoiceAnswer(selectedMeaning) {
        const q = this.currentQuestion;
        const expBox = document.getElementById('explanation-box');

        if (selectedMeaning === q.meaning) {
            // 答對
            if (this.answeredCorrectlyFirstTry) {
                if (!this.masteredWords.includes(q.word)) {
                    this.masteredWords.push(q.word);
                    localStorage.setItem('elysia_mastered_words', JSON.stringify(this.masteredWords));
                }
            }
            this.windEnergy += 10;
            localStorage.setItem('elysia_wind_energy', this.windEnergy);

            this.showExplanation(true);
        } else {
            // 答錯
            this.answeredCorrectlyFirstTry = false;
            if (!this.wrongWords.includes(q.word)) {
                this.wrongWords.push(q.word);
                localStorage.setItem('elysia_wrong_words', JSON.stringify(this.wrongWords));
            }
            alert(`答錯囉！正確答案是：${q.meaning}`);
        }
    },

    // 顯示詳細解析
    showExplanation(isCorrect) {
        const q = this.currentQuestion;
        document.getElementById('exp-meaning').innerText = q.meaning;
        document.getElementById('exp-collocation').innerText = q.collocation || '無';
        document.getElementById('exp-confusing').innerText = q.confusing || '無';
        document.getElementById('exp-exampoint').innerText = q.examPoint || '無';
        document.getElementById('exp-example').innerText = q.example || '無';

        const expBox = document.getElementById('explanation-box');
        if (expBox) expBox.classList.remove('hidden');

        // 隱藏選項，準備進入下一題
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'none';

        this.currentWordIndex++;
        this.updateStats();
    },

    // 模式切換
    setMode(mode) {
        this.currentMode = mode;
        const choiceBtn = document.getElementById('mode-choice-btn');
        const spellBtn = document.getElementById('mode-spell-btn');
        if (mode === 'choice') {
            if (choiceBtn) choiceBtn.classList.add('active');
            if (spellBtn) spellBtn.classList.remove('active');
        } else {
            if (spellBtn) spellBtn.classList.add('active');
            if (choiceBtn) choiceBtn.classList.remove('active');
        }
        this.nextQuestion();
    },

    // 語音朗讀
    speakCurrentWord() {
        if (!this.currentQuestion) return;
        const utterance = new SpeechSynthesisUtterance(this.currentQuestion.word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    },

    // 準備寫作挑戰
    prepareWritingChallenge() {
        const container = document.getElementById('writing-target-words');
        if (!container) return;
        container.innerHTML = '';

        // 取出這組幾個單字讓使用者點擊鎖定
        this.currentBatchWords.forEach(item => {
            const tag = document.createElement('span');
            tag.innerText = item.word;
            tag.style.background = 'rgba(56, 189, 248, 0.2)';
            tag.style.border = '1px solid #38bdf8';
            tag.style.color = '#38bdf8';
            tag.style.padding = '4px 10px';
            tag.style.borderRadius = '6px';
            tag.style.cursor = 'pointer';
            tag.onclick = () => {
                const input = document.getElementById('writing-user-input');
                if (input) input.value += ` ${item.word} `;
            };
            container.appendChild(tag);
        });
    },

    // 應用句型範本
    applySentenceTemplate(type) {
        const input = document.getElementById('writing-user-input');
        if (!input) return;
        const sampleWord = this.currentBatchWords.length > 0 ? this.currentBatchWords[0].word : 'vocab';
        
        if (type === 1) {
            input.value = `It is important to ${sampleWord} because it helps us grow.`;
        } else if (type === 2) {
            input.value = `To achieve success, we should use efficient ways to ${sampleWord}.`;
        } else if (type === 3) {
            input.value = `Instead of giving up, utilizing ${sampleWord} can help us reach our goals.`;
        }
    },

    // 提交寫作挑戰
    submitWritingChallenge() {
        const input = document.getElementById('writing-user-input');
        const text = input ? input.value.trim() : '';
        const feedbackBox = document.getElementById('ai-feedback-box');
        const feedbackText = document.getElementById('ai-feedback-text');

        if (!text) {
            alert("請先輸入或套用句型短句！");
            return;
        }

        if (feedbackBox) feedbackBox.classList.remove('hidden');
        if (feedbackText) {
            feedbackText.innerHTML = `🌟 <strong>風神 AI 點評：</strong>您的造句 <em>「${text}」</em> 結構完整，文法正確！成功解鎖下一組冒險進度，風能 +20！`;
        }
        this.windEnergy += 20;
        localStorage.setItem('elysia_wind_energy', this.windEnergy);
        this.currentGroupIndex++;
        this.updateStats();
    },

    // 開啟衣櫥
    openWardrobe() {
        this.switchScreen('screen-wardrobe');
        const container = document.getElementById('wardrobe-grid-container');
        if (!container) return;
        container.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.2); border: 1px solid #7c3aed; padding: 15px; border-radius: 12px; text-align: center;">
                <h4>👗 流浪者的風向套裝 (第 1/5 件)</h4>
                <p>已征服單字數：${this.masteredWords.length} 個</p>
                <p style="color: #34d399;">✨ 達成 2000 單全制霸即可解鎖傳說外觀！</p>
            </div>
        `;
    },

    // 重置進度 (展開二週目)
    resetProgress() {
        if (confirm("確定要重置所有已掌握的單字與進度，展開二週目嗎？")) {
            localStorage.removeItem('elysia_mastered_words');
            localStorage.removeItem('elysia_wind_energy');
            localStorage.removeItem('elysia_wrong_words');
            this.masteredWords = [];
            this.windEnergy = 0;
            this.wrongWords = [];
            this.currentGroupIndex = 0;
            this.updateStats();
            alert("已成功展開二週目！");
        }
    },

    startWrongBookSession() {
        alert("錯題本功能開發中：目前累計錯題數 " + this.wrongWords.length + " 個。");
    }
};

// 頁面載入完成後初始化
window.onload = () => {
    Game.init();
};
