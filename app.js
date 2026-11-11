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
        
        // 💡 升級版安全防護：同時相容 VOCAB_DATA、VOCAB_DATABASE 與 vocabData，確保 1850 單字庫完美讀取
        const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : 
                   (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : 
                   (typeof vocabData !== 'undefined' ? vocabData : []));
        
        if (!Array.isArray(db) || db.length === 0) {
            console.error("警告：單字資料庫尚未正確載入！");
            alert("警告：單字資料庫 (vocab_data.js) 尚未正確載入！請檢查 GitHub 上的檔案。");
            return;
        }

        console.log(`成功載入單字庫，總計：${db.length} 字`); this.updateStats(); },  switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); const target = document.getElementById(screenId); if (target) target.classList.add('active'); },  returnMenu() { this.switchScreen('screen-menu'); this.updateStats(); },  updateStats() { const totalMasteredElem = document.getElementById('total-mastered'); if (totalMasteredElem) totalMasteredElem.innerText = this.masteredWords.length;  const windEnergyElem = document.getElementById('wind-energy'); if (windEnergyElem) windEnergyElem.innerText = this.windEnergy;  const wrongCountElem = document.getElementById('wrong-count'); if (wrongCountElem) wrongCountElem.innerText = this.wrongWords.length; },  startDailySession() { this.currentGroupIndex = 0; // 日常特訓從第 0 組開始 const db = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : (typeof VOCAB_DATABASE !== 'undefined' ? VOCAB_DATABASE : (typeof vocabData !== 'undefined' ? vocabData : []));  const startIdx = this.currentGroupIndex * 20; const endIdx = startIdx + 20;  const rawBatch = db.slice(startIdx, endIdx); if (rawBatch.length === 0) { alert("太棒了！您已經完成所有單字的特訓！將為您重新循環。"); this.currentGroupIndex = 0; this.startDailySession(); return; }  this.currentBatchWords = rawBatch.filter(item => !this.masteredWords.includes(item.word));  if (this.currentBatchWords.length === 0) { this.currentGroupIndex++; this.startDailySession(); return; }  this.currentWordIndex = 0; this.switchScreen('screen-quiz'); this.nextQuestion(); },  nextQuestion() { if (this.currentWordIndex >= this.currentBatchWords.length) { // 💡 關鍵修復：如果是錯題本特訓模式 (999)，結束時直接跳出提示並回首頁，絕不進入寫作關卡！ if (this.currentGroupIndex === 999) { alert("🎉 太棒了！錯題本特訓完畢，已成功清除所有錯題！"); this.returnMenu(); return; }  // 一般日常 20 題特訓完成，才進入寫作挑戰 this.prepareWritingChallenge(); this.switchScreen('screen-writing'); return; }  this.currentQuestion = this.currentBatchWords[this.currentWordIndex]; this.answeredCorrectlyFirstTry = true;  const expBox = document.getElementById('explanation-box'); if (expBox) expBox.classList.add('hidden');  const optionsContainer = document.getElementById('options-container'); const spellContainer = document.getElementById('spell-container');  if (this.currentMode === 'choice') { if (optionsContainer) optionsContainer.style.display = 'grid'; if (spellContainer) spellContainer.style.display = 'none'; } else { // 拼字模式 (包含錯題本特訓) if (optionsContainer) optionsContainer.style.display = 'none'; if (spellContainer) { spellContainer.style.display = 'block'; // 顯示拼字提示（中文解釋） const promptElem = document.getElementById('spell-prompt'); if (promptElem) promptElem.innerText = `請拼出中文涵義為：「${this.currentQuestion.meaning}」的英文單字`;
            }
            const spellInput = document.getElementById('spell-input');
            if (spellInput) {
                spellInput.value = '';
                spellInput.focus();
            }
        }

        this.updateQuizUI();

        // 題目一出現自動發音
        this.speakCurrentWord();
    },

    updateQuizUI() {
        const q = this.currentQuestion;
        if (!q) return;

        const wordContainer = document.getElementById('vocab-word');
        if (this.currentMode === 'spell') {
            wordContainer.innerHTML = `✍️ 錯題拼字畢業考 <span style="font-size: 1.2rem; color: #38bdf8; font-weight: normal;">[請依中文拼字]</span>`;
        } else {
            const posText = q.pos ? ` [${q.pos}]` : ''; wordContainer.innerHTML = `${q.word} <span style="font-size: 1.2rem; color: #38bdf8; font-weight: normal;">${posText}</span>`; }  document.getElementById('vocab-phonetic').innerText = q.phonetic \vert{}\vert{} '';  const themeText = q.theme \vert{}\vert{} q.category \vert{}\vert{} '會考核心'; document.getElementById('vocab-category').innerText = `📌 主題：${themeText}`;
        
        // 💡 智慧遮蔽 Chunk 內的答案，防止拼字測驗直接露餡
        const chunkBadge = document.getElementById('vocab-chunk-badge');
        if (chunkBadge) {
            if (q.collocation) {
                let safeCollocation = q.collocation;
                if (this.currentMode === 'spell' && q.word) {
                    const regex = new RegExp(q.word, 'gi');
                    safeCollocation = safeCollocation.replace(regex, '______');
                }
                chunkBadge.innerText = `Chunk: ${safeCollocation}`; } else { chunkBadge.innerText = ''; } }  const progressText = document.getElementById('progress-text'); if (progressText) { progressText.innerText = `${this.currentWordIndex + 1} / ${this.currentBatchWords.length} (錯題特訓)`; }  const hpBar = document.getElementById('monster-hp'); if (hpBar) { const hpPercent = ((this.currentBatchWords.length - this.currentWordIndex) / this.currentBatchWords.length) * 100; hpBar.style.width = `${hpPercent}%`;
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
            alert(`答錯囉！正確答案是：${q.meaning}`); this.showExplanation(false); } },  submitSpellAnswer() { const input = document.getElementById('spell-input'); if (!input) return; const userVal = input.value.trim().toLowerCase(); const q = this.currentQuestion;  if (userVal === q.word.toLowerCase()) { alert(`太棒了！拼寫正確：${q.word}`);

            if (this.currentGroupIndex === 999) {
                this.wrongWords = this.wrongWords.filter(w => w !== q.word);
                localStorage.setItem('elysia_wrong_words', JSON.stringify(this.wrongWords));
                this.updateStats();
            }

            this.windEnergy += 15;
            localStorage.setItem('elysia_wind_energy', this.windEnergy);

            this.showExplanation(true);
        } else {
            alert(`拼寫錯誤囉！正確單字是：${q.word}`); if (!this.wrongWords.includes(q.word)) { this.wrongWords.push(q.word); localStorage.setItem('elysia_wrong_words', JSON.stringify(this.wrongWords)); } this.updateStats(); this.showExplanation(false); } },  showExplanation(isCorrect) { const q = this.currentQuestion;  document.getElementById('exp-meaning').innerText = `${q.word} = ${q.meaning}`; document.getElementById('exp-collocation').innerText = q.collocation \vert{}\vert{} '無'; document.getElementById('exp-confusing').innerText = q.confusing \vert{}\vert{} '無'; document.getElementById('exp-exampoint').innerText = q.examPoint \vert{}\vert{} '無'; document.getElementById('exp-example').innerText = q.example \vert{}\vert{} '無';  const expBox = document.getElementById('explanation-box'); if (expBox) expBox.classList.remove('hidden');  const optionsContainer = document.getElementById('options-container'); if (optionsContainer) optionsContainer.style.display = 'none';  const spellContainer = document.getElementById('spell-container'); if (spellContainer) spellContainer.style.display = 'none';  this.currentWordIndex++; this.updateStats(); },  setMode(mode) { this.currentMode = mode; const choiceBtn = document.getElementById('mode-choice-btn'); const spellBtn = document.getElementById('mode-spell-btn'); if (mode === 'choice') { if (choiceBtn) choiceBtn.classList.add('active'); if (spellBtn) spellBtn.classList.remove('active'); } else { if (spellBtn) spellBtn.classList.add('active'); if (choiceBtn) choiceBtn.classList.remove('active'); } this.currentGroupIndex = 0; this.startDailySession(); },  speakCurrentWord() { if (!this.currentQuestion) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(this.currentQuestion.word); utterance.lang = 'en-US'; window.speechSynthesis.speak(utterance); },  prepareWritingChallenge() { const container = document.getElementById('writing-target-words'); if (!container) return; container.innerHTML = '';  this.currentBatchWords.forEach(item => { const tag = document.createElement('span'); tag.innerText = item.word; tag.style.background = 'rgba(56, 189, 248, 0.2)'; tag.style.border = '1px solid #38bdf8'; tag.style.color = '#38bdf8'; tag.style.padding = '4px 10px'; tag.style.borderRadius = '6px'; tag.style.cursor = 'pointer'; tag.onclick = () => { const input = document.getElementById('writing-user-input'); if (input) input.value += ` ${item.word} `;
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
            feedbackText.innerHTML = `🌟 <strong>風神 AI 點評：</strong>
