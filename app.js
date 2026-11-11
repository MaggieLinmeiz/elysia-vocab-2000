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
    currentMode: 'choice',
    streakDays: 1,

    init() {
        console.log("Elysia Game Initializing...");
        this.checkStreak();
        
        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : 
                   (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : 
                   (typeof vocabData !== 'undefined' ? vocabData : []));
        
        if (!Array.isArray(db) || db.length === 0) {
            console.error("警告：單字資料庫尚未正確載入！");
            return;
        }

        console.log(`成功載入單字庫，總計：${db.length} 字`);
        this.updateStats();
    },

    checkStreak() {
        const lastLoginDate = localStorage.getItem('elysia_last_login_date');
        const today = new Date().toDateString();
        let currentStreak = parseInt(localStorage.getItem('elysia_streak_days') || '1');

        if (lastLoginDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastLoginDate === yesterday.toDateString()) {
                // 昨天有登入，連續天數 +1
                currentStreak += 1;
            } else if (lastLoginDate && lastLoginDate !== today) {
                // 超過一天沒登入，重置為 1 (或保留，看您希望嚴格還是溫柔，這裡採溫柔累計)
                // 若希望斷掉重置可改為 currentStreak = 1;
            }
            localStorage.setItem('elysia_last_login_date', today);
            localStorage.setItem('elysia_streak_days', currentStreak);
        }
        this.streakDays = currentStreak;
    },

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    },

    returnMenu() {
        this.switchScreen('screen-menu');
        this.updateStats();
    },

    updateStats() {
        const totalMasteredElem = document.getElementById('total-mastered');
        if (totalMasteredElem) totalMasteredElem.innerText = this.masteredWords.length;

        const windEnergyElem = document.getElementById('wind-energy');
        if (windEnergyElem) windEnergyElem.innerText = this.windEnergy;

        const wrongCountElem = document.getElementById('wrong-count');
        if (wrongCountElem) wrongCountElem.innerText = this.wrongWords.length;

        // 動態更新頂部標語為：「目標：奇想大師・風神祝福 ｜ 🔥 奇想靈感：連續第 X 天」
        const subtitleElem = document.querySelector('.screen-menu p, .main-subtitle, header p') || document.querySelector('div[style*="font-size"]');
        // 同時我們也可以直接抓取副標題欄位進行更新
        const headerSub = document.getElementById('header-subtitle');
        if (headerSub) {
            headerSub.innerHTML = `🎯 目標：奇想大師・風神祝福 ｜ 🔥 奇想靈感：連續第 ${this.streakDays} 天`;
        }
    },

    startDailySession() {
        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : 
                   (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : 
                   (typeof vocabData !== 'undefined' ? vocabData : []));
        
        const startIdx = this.currentGroupIndex * 20;
        const endIdx = startIdx + 20;
        
        const rawBatch = db.slice(startIdx, endIdx);
        if (rawBatch.length === 0) {
            alert("🎉 太棒了！您已經征服了所有單字！將為您重置進度循環訓練。");
            this.currentGroupIndex = 0;
            this.masteredWords = [];
            localStorage.removeItem('elysia_mastered_words');
            this.startDailySession();
            return;
        }

        this.currentBatchWords = rawBatch.filter(item => !this.masteredWords.includes(item.word));

        if (this.currentBatchWords.length === 0) {
            this.currentGroupIndex++;
            this.startDailySession();
            return;
        }

        this.currentWordIndex = 0;
        this.switchScreen('screen-quiz');
        this.nextQuestion();
    },

    nextQuestion() {
        if (this.currentWordIndex >= this.currentBatchWords.length) {
            if (this.currentGroupIndex === 999) {
                alert("🎉 太棒了！錯題本特訓完畢，已成功清除所有錯題！");
                this.returnMenu();
                return;
            }

            this.prepareWritingChallenge();
            this.switchScreen('screen-writing');
            return;
        }

        this.currentQuestion = this.currentBatchWords[this.currentWordIndex];
        this.answeredCorrectlyFirstTry = true;

        const expBox = document.getElementById('explanation-box');
        if (expBox) expBox.classList.add('hidden');

        const optionsContainer = document.getElementById('options-container');
        const spellContainer = document.getElementById('spell-container');
        
        if (this.currentMode === 'choice') {
            if (optionsContainer) optionsContainer.style.display = 'grid';
            if (spellContainer) spellContainer.style.display = 'none';
        } else {
            if (optionsContainer) optionsContainer.style.display = 'none';
            if (spellContainer) {
                spellContainer.style.display = 'block';
                const promptElem = document.getElementById('spell-prompt');
                if (promptElem) promptElem.innerText = `請拼出中文涵義為：「${this.currentQuestion.meaning}」的英文單字`;
            }
            const spellInput = document.getElementById('spell-input');
            if (spellInput) {
                spellInput.value = '';
                spellInput.focus();
            }
        }

        this.updateQuizUI();
        this.speakCurrentWord();
    },

    updateQuizUI() {
        const q = this.currentQuestion;
        if (!q) return;

        const wordContainer = document.getElementById('vocab-word');
        if (this.currentMode === 'spell') {
            wordContainer.innerHTML = `✍️ 錯題拼字畢業考 <span style="font-size: 1.2rem; color: #38bdf8; font-weight: normal;">[請依中文拼字]</span>`;
        } else {
            const posText = q.pos ? ` [${q.pos}]` : '';
            wordContainer.innerHTML = `${q.word} <span style="font-size: 1.2rem; color: #38bdf8; font-weight: normal;">${posText}</span>`;
        }
        
        document.getElementById('vocab-phonetic').innerText = q.phonetic || '';
        
        const themeText = q.theme || q.category || '會考核心';
        document.getElementById('vocab-category').innerText = `📌 主題：${themeText}`;
        
        const chunkBadge = document.getElementById('vocab-chunk-badge');
        if (chunkBadge) {
            if (q.collocation) {
                let safeCollocation = q.collocation;
                if (this.currentMode === 'spell' && q.word) {
                    const regex = new RegExp(q.word, 'gi');
                    safeCollocation = safeCollocation.replace(regex, '______');
                }
                chunkBadge.innerText = `Chunk: ${safeCollocation}`;
            } else {
                chunkBadge.innerText = '';
            }
        }

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.innerText = `${this.currentWordIndex + 1} / ${this.currentBatchWords.length} (特訓進行中)`;
        }

        const hpBar = document.getElementById('monster-hp');
        if (hpBar) {
            const hpPercent = ((this.currentBatchWords.length - this.currentWordIndex) / this.currentBatchWords.length) * 100;
            hpBar.style.width = `${hpPercent}%`;
        }

        if (this.currentMode === 'choice') {
            this.generateOptions();
        }
    },

    generateOptions() {
        const container = document.getElementById('options-container');
        if (!container) return;
        container.innerHTML = '';

        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : 
                   (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : 
                   (typeof vocabData !== 'undefined' ? vocabData : []));
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

    checkChoiceAnswer(selectedMeaning) {
        const q = this.currentQuestion;

        if (selectedMeaning === q.meaning) {
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
            this.answeredCorrectlyFirstTry = false;
            if (!this.wrongWords.includes(q.word)) {
                this.wrongWords.push(q.word);
                localStorage.setItem('elysia_wrong_words', JSON.stringify(this.wrongWords));
            }
            
            this.updateStats();
            alert(`答錯囉！正確答案是：${q.meaning}`);
            this.showExplanation(false);
        }
    },

    submitSpellAnswer() {
        const input = document.getElementById('spell-input');
        if (!input) return;
        const userVal = input.value.trim().toLowerCase();
        const q = this.currentQuestion;

        if (userVal === q.word.toLowerCase()) {
            alert(`太棒了！拼寫正確：${q.word}`);

            if (this.currentGroupIndex === 999) {
                this.wrongWords = this.wrongWords.filter(w => w !== q.word);
                localStorage.setItem('elysia_wrong_words', JSON.stringify(this.wrongWords));
                this.updateStats();
            }

            this.windEnergy += 15;
            localStorage.setItem('elysia_wind_energy', this.windEnergy);

            this.showExplanation(true);
        } else {
            alert(`拼寫錯誤囉！正確單字是：${q.word}`);
            if (!this.wrongWords.includes(q.word)) {
                this.wrongWords.push(q.word);
                localStorage.setItem('elysia_wrong_words', JSON.stringify(this.wrongWords));
            }
            this.updateStats();
            this.showExplanation(false);
        }
    },

    showExplanation(isCorrect) {
        const q = this.currentQuestion;
        
        document.getElementById('exp-meaning').innerText = `${q.word} = ${q.meaning}`;
        document.getElementById('exp-collocation').innerText = q.collocation || '無';
        document.getElementById('exp-confusing').innerText = q.confusing || '無';
        document.getElementById('exp-exampoint').innerText = q.examPoint || '無';
        document.getElementById('exp-example').innerText = q.example || '無';

        const expBox = document.getElementById('explanation-box');
        if (expBox) expBox.classList.remove('hidden');

        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        const spellContainer = document.getElementById('spell-container');
        if (spellContainer) spellContainer.style.display = 'none';

        this.currentWordIndex++;
        this.updateStats();
    },

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
        this.currentGroupIndex = 0;
        this.startDailySession();
    },

    speakCurrentWord() {
        if (!this.currentQuestion) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(this.currentQuestion.word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    },

    prepareWritingChallenge() {
        const container = document.getElementById('writing-target-words');
        if (!container) return;
        container.innerHTML = '';

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

    submitWritingChallenge() {
        const input = document.getElementById('writing-user-input');
        const text = input ? input.value.trim() : '';
        const feedbackText = document.getElementById('ai-feedback-text');

        if (!text) {
            alert("請先輸入或套用句型短句！");
            return;
        }

        const feedbackBox = document.getElementById('ai-feedback-box');
        if (feedbackBox) feedbackBox.classList.remove('hidden');
        if (feedbackText) {
            feedbackText.innerHTML = `🌟 <strong>風神 AI 點評：</strong>您的造句 <em>「${text}」</em> 結構完整，文法正確！成功解鎖下一組冒險進度，風能 +20！`;
        }
        this.windEnergy += 20;
        localStorage.setItem('elysia_wind_energy', this.windEnergy);
        this.currentGroupIndex++;
        this.updateStats();
    },

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

    resetProgress() {
        if (confirm("確定要重置所有已掌握的單字與進度，展開二週目嗎？")) {
            localStorage.removeItem('elysia_mastered_words');
            localStorage.removeItem('elysia_wind_energy');
            localStorage.removeItem('elysia_wrong_words');
            localStorage.removeItem('elysia_streak_days');
            localStorage.removeItem('elysia_last_login_date');
            this.masteredWords = [];
            this.windEnergy = 0;
            this.wrongWords = [];
            this.streakDays = 1;
            this.currentGroupIndex = 0;
            this.updateStats();
            alert("已成功展開二週目！");
        }
    },

    startWrongBookSession() {
        if (this.wrongWords.length === 0) {
            alert("太棒了！目前錯題本中沒有錯題，快去挑戰日常特訓吧！");
            return;
        }

        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : 
                   (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : 
                   (typeof vocabData !== 'undefined' ? vocabData : []));
        this.currentBatchWords
