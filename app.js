const Game = {
    currentIndex: 0,
    currentSessionList: [],
    sessionAnsweredWords: [],
    wrongBook: [],
    unlockedWardrobe: [0],
    equippedItems: [0], // 當前穿戴的配件
    windEnergy: 0,
    activeQuestion: null,
    quizMode: 'choice',
    selectedWritingWord: '',

    init() {
        try {
            this.wrongBook = JSON.parse(localStorage.getItem('elysia_wrong_book')) || [];
            this.unlockedWardrobe = JSON.parse(localStorage.getItem('elysia_wardrobe')) || [0];
            this.equippedItems = JSON.parse(localStorage.getItem('elysia_equipped')) || [0];
            this.windEnergy = parseInt(localStorage.getItem('elysia_wind')) || 0;
        } catch (e) {
            console.log('Storage init error:', e);
        }
        this.updateStats();
    },

    updateStats() {
        try {
            const windElem = document.getElementById('wind-energy');
            if (windElem) windElem.innerText = this.windEnergy;

            const wrongElem = document.getElementById('wrong-count');
            if (wrongElem) wrongElem.innerText = this.wrongBook.length;

            const wardrobeElem = document.getElementById('wardrobe-count');
            if (wardrobeElem) wardrobeElem.innerText = `${this.unlockedWardrobe.length}/5`;
            
            const masteredWords = JSON.parse(localStorage.getItem('elysia_mastered_words')) || [];
            const masteredElem = document.getElementById('total-mastered');
            if (masteredElem) {
                masteredElem.innerText = masteredWords.length;
            }

            const progressElem = document.getElementById('progress-text');
            if (progressElem && this.currentSessionList && this.currentSessionList.length > 0) {
                progressElem.innerText = `${this.currentIndex + 1} / ${this.currentSessionList.length}`;
            }
        } catch (e) {
            console.log('Update stats error:', e);
        }
    },

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    },

    startDailySession() {
        if (typeof VOCAB_DATABASE === 'undefined' || !VOCAB_DATABASE.length) {
            alert('⚠️ 題庫尚未載入！');
            return;
        }
        this.currentSessionList = [...VOCAB_DATABASE].sort(() => 0.5 - Math.random()).slice(0, 20);
        this.sessionAnsweredWords = [];
        this.currentIndex = 0;
        this.switchScreen('screen-quiz');
        this.loadQuestion();
    },

    startWrongBookSession() {
        if (!this.wrongBook || this.wrongBook.length === 0) {
            alert('🎉 目前沒有錯題紀錄！太厲害了，繼續保持！');
            return;
        }
        const wrongQuestions = VOCAB_DATABASE.filter(q => this.wrongBook.includes(q.id));
        this.currentSessionList = wrongQuestions.sort(() => 0.5 - Math.random());
        this.sessionAnsweredWords = [];
        this.currentIndex = 0;
        this.switchScreen('screen-quiz');
        this.loadQuestion();
    },

    resetProgress() {
        if (confirm('確定要展開二週目嗎？這將會重置「已征服單字數」，重新開啟 2000 字的挑戰旅程！（風能與衣櫥裝備會保留喔）')) {
            localStorage.setItem('elysia_mastered_words', JSON.stringify([]));
            this.updateStats();
            alert('✨ 二週目挑戰已啟動！繼續衝刺 A++！');
        }
    },

    setMode(mode) {
        this.quizMode = mode;
        const choiceBtn = document.getElementById('mode-choice-btn');
        const spellBtn = document.getElementById('mode-spell-btn');
        if (choiceBtn) choiceBtn.classList.toggle('active', mode === 'choice');
        if (spellBtn) spellBtn.classList.toggle('active', mode === 'spell');
        this.loadQuestion();
    },

    loadQuestion() {
        if (this.currentIndex >= this.currentSessionList.length) {
            this.rewardWardrobe();
            this.openWritingChallenge();
            return;
        }

        this.updateStats();
        const q = this.currentSessionList[this.currentIndex];
        this.activeQuestion = q;
        
        if (!this.sessionAnsweredWords.includes(q.word)) {
            this.sessionAnsweredWords.push(q.word);
        }

        const categoryElem = document.getElementById('vocab-category');
        if (categoryElem) categoryElem.innerText = q.category;

        const phoneticElem = document.getElementById('vocab-phonetic');
        if (phoneticElem) phoneticElem.innerText = q.phonetic;

        const chunkBadge = document.getElementById('vocab-chunk-badge');
        if (chunkBadge) {
            const rawCollab = q.collocation || q.word;
            const pureEnglishChunk = rawCollab.split('(')[0].trim();
            chunkBadge.innerText = `💬 Chunk: ${pureEnglishChunk}`;
        }

        const expBox = document.getElementById('explanation-box');
        if (expBox) expBox.classList.add('hidden');

        const optionsContainer = document.getElementById('options-container');
        const spellContainer = document.getElementById('spell-container');
        const wordDisplay = document.getElementById('vocab-word');

        if (this.quizMode === 'choice') {
            if (optionsContainer) optionsContainer.style.display = 'grid';
            if (spellContainer) spellContainer.style.display = 'none';
            if (wordDisplay) wordDisplay.innerText = q.word;
            if (optionsContainer) optionsContainer.innerHTML = '';

            let options = [q.meaning];
            while (options.length < 4 && VOCAB_DATABASE.length >= 4) {
                let randomOpt = VOCAB_DATABASE[Math.floor(Math.random() * VOCAB_DATABASE.length)].meaning;
                if (!options.includes(randomOpt)) options.push(randomOpt);
            }
            options.sort(() => 0.5 - Math.random());

            options.forEach(optText => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerText = optText;
                btn.onclick = () => this.checkAnswer(optText, q.meaning, btn);
                optionsContainer.appendChild(btn);
            });
        } else {
            if (optionsContainer) optionsContainer.style.display = 'none';
            if (spellContainer) spellContainer.style.display = 'block';
            
            if (wordDisplay) wordDisplay.innerText = `✍️ 請拼出中文：「${q.meaning}」`;

            const input = document.getElementById('spell-input');
            if (input) {
                input.value = '';
                input.disabled = false;
                input.focus();
                
                input.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        this.checkSpellAnswer();
                    }
                };
            }
        }

        this.speakCurrentWord();
    },

    speakCurrentWord() {
        try {
            if ('speechSynthesis' in window && this.activeQuestion) {
                const utterance = new SpeechSynthesisUtterance(this.activeQuestion.word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.log('Speech error:', e);
        }
    },

    recordMasteredWord() {
        try {
            let masteredWords = JSON.parse(localStorage.getItem('elysia_mastered_words')) || [];
            if (this.activeQuestion && !masteredWords.includes(this.activeQuestion.id)) {
                masteredWords.push(this.activeQuestion.id);
                localStorage.setItem('elysia_mastered_words', JSON.stringify(masteredWords));
            }
        } catch (e) {
            console.log('Record error:', e);
        }
    },

    checkAnswer(selected, correct, btnElement) {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);

        if (selected === correct) {
            btnElement.classList.add('correct');
            this.windEnergy += 10;
            this.wrongBook = this.wrongBook.filter(id => id !== this.activeQuestion.id);
            this.recordMasteredWord();
        } else {
            btnElement.classList.add('wrong');
            buttons.forEach(b => {
                if (b.innerText === correct) b.classList.add('correct');
            });
            if (this.activeQuestion && !this.wrongBook.includes(this.activeQuestion.id)) {
                this.wrongBook.push(this.activeQuestion.id);
            }
        }

        this.saveAndShowExplanation();
    },

    checkSpellAnswer() {
        const inputElem = document.getElementById('spell-input');
        if (!inputElem || inputElem.disabled) return;
        
        const userWord = inputElem.value.trim().toLowerCase();
        const correctWord = this.activeQuestion.word.trim().toLowerCase();
        
        inputElem.disabled = true;

        if (userWord === correctWord) {
            this.windEnergy += 15;
            this.wrongBook = this.wrongBook.filter(id => id !== this.activeQuestion.id);
            this.recordMasteredWord();
        } else {
            if (this.activeQuestion && !this.wrongBook.includes(this.activeQuestion.id)) {
                this.wrongBook.push(this.activeQuestion.id);
            }
        }

        this.saveAndShowExplanation();
    },

    saveAndShowExplanation() {
        try {
            localStorage.setItem('elysia_wrong_book', JSON.stringify(this.wrongBook));
            localStorage.setItem('elysia_wind', this.windEnergy);
        } catch (e) {
            console.log('Save error:', e);
        }
        this.updateStats();

        const exp = this.activeQuestion;
        if (exp) {
            const wordElem = document.getElementById('vocab-word');
            if (wordElem) wordElem.innerText = exp.word;

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerText = val || '';
            };
            setVal('exp-meaning', exp.meaning);
            setVal('exp-collocation', exp.collocation);
            setVal('exp-confusing', exp.confusing);
            setVal('exp-exampoint', exp.examPoint);
            setVal('exp-example', exp.example);

            const expBox = document.getElementById('explanation-box');
            if (expBox) expBox.classList.remove('hidden');
        }
    },

    nextQuestion() {
        this.currentIndex++;
        this.loadQuestion();
    },

    rewardWardrobe() {
        try {
            if (this.unlockedWardrobe.length < 5) {
                const newItemIndex = this.unlockedWardrobe.length;
                this.unlockedWardrobe.push(newItemIndex);
                if (!this.equippedItems.includes(newItemIndex)) {
                    this.equippedItems.push(newItemIndex);
                }
                localStorage.setItem('elysia_wardrobe', JSON.stringify(this.unlockedWardrobe));
                localStorage.setItem('elysia_equipped', JSON.stringify(this.equippedItems));
            }
        } catch (e) {
            console.log('Wardrobe error:', e);
        }
    },

    openWritingChallenge() {
        this.switchScreen('screen-writing');
        let shuffled = [...this.sessionAnsweredWords].sort(() => 0.5 - Math.random());
        let targets = shuffled.slice(0, 4);
        if (targets.length === 0) targets = ['efficient', 'protect', 'success', 'diligent'];

        this.selectedWritingWord = targets[0];

        const container = document.getElementById('writing-target-words');
        container.innerHTML = '';
        targets.forEach((word, idx) => {
            const btn = document.createElement('button');
            btn.className = `secondary-btn ${idx === 0 ? 'active-target' : ''}`;
            btn.style.cssText = `padding: 6px 12px; font-size: 0.9rem; border-radius: 8px; cursor: pointer; border: 1px solid ${idx === 0 ? '#38bdf8' : '#7c3aed'}; background: ${idx === 0 ? 'rgba(56, 189, 248, 0.3)' : 'transparent'}; color: #fff;`;
            btn.innerText = `🛡️ ${word}`;
            btn.onclick = () => {
                document.querySelectorAll('#writing-target-words button').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.borderColor = '#7c3aed';
                });
                btn.style.background = 'rgba(56, 189, 248, 0.3)';
                btn.style.borderColor = '#38bdf8';
                this.selectedWritingWord = word;
            };
            container.appendChild(btn);
        });

        document.getElementById('writing-user-input').value = '';
        document.getElementById('ai-feedback-box').classList.add('hidden');
    },

    applySentenceTemplate(type) {
        const word = this.selectedWritingWord || 'efficient';
        let sentence = '';
        if (type === 1) {
            sentence = `It is important to ${word} because it brings a better future.`;
        } else if (type === 2) {
            sentence = `To achieve success, we should use ${word} ways to solve problems.`;
        } else if (type === 3) {
            sentence = `Instead of giving up, utilizing ${word} can help us overcome difficulties.`;
        }
        document.getElementById('writing-user-input').value = sentence;
    },

    submitWritingChallenge() {
        const inputVal = document.getElementById('writing-user-input').value.trim();
        if (!inputVal) {
            alert('請先點擊戰術卡生成骨架，或輸入一句英文短句再提交喔！');
            return;
        }

        this.windEnergy += 50;
        localStorage.setItem('elysia_wind', this.windEnergy);
        this.updateStats();

        const feedbackText = `✨ 句型合成成功！風神 AI 給予高度肯定：成功運用關鍵單字與高級句構，句意流暢、邏輯清晰！額外獲得 ⚡ +50 風能與「寫作達人」榮譽！`;
        
        document.getElementById('ai-feedback-text').innerText = feedbackText;
        document.getElementById('ai-feedback-box').classList.remove('hidden');
    },

    toggleEquip(index) {
        if (!this.unlockedWardrobe.includes(index)) return;

        if (this.equippedItems.includes(index)) {
            this.equippedItems = this.equippedItems.filter(i => i !== index);
        } else {
            this.equippedItems.push(index);
        }
        localStorage.setItem('elysia_equipped', JSON.stringify(this.equippedItems));
        this.renderAvatarStage();
        this.openWardrobe();
    },

    renderAvatarStage() {
        const layerIds = {
            0: 'layer-wing',
            1: 'layer-dress',
            2: 'layer-hat',
            3: 'layer-shoes',
            4: 'layer-crown'
        };

        Object.keys(layerIds).forEach(idxStr => {
            const idx = parseInt(idxStr);
            const elem = document.getElementById(layerIds[idx]);
            if (elem) {
                if (this.equippedItems.includes(idx)) {
                    elem.classList.remove('layer-hidden');
                    elem.classList.add('layer-visible');
                } else {
                    elem.classList.remove('layer-visible');
                    elem.classList.add('layer-hidden');
                }
            }
        });

        const titleElem = document.getElementById('avatar-active-title');
        if (titleElem) {
            if (this.equippedItems.length === 5) {
                titleElem.innerText = '👑 奇想風神全套大滿貫姿態！';
            } else if (this.equippedItems.length > 0) {
                titleElem.innerText = `✨ 已穿搭 ${this.equippedItems.length} 件奇想部件`;
            } else {
                titleElem.innerText = '🌸 預設冒險者姿態';
            }
        }
    },

    openWardrobe() {
        this.switchScreen('screen-wardrobe');

        // 渲染夢幻 SVG 暖暖人物底圖
        const stageElem = document.querySelector('.avatar-stage');
        if (stageElem && !document.getElementById('svg-avatar-box')) {
            stageElem.innerHTML = `
                <div id="svg-avatar-box" class="svg-avatar-box">
                    <!-- SVG 層 0: 流光風神之翼 -->
                    <svg id="layer-wing" class="avatar-layer layer-hidden" viewBox="0 0 200 240">
                        <path d="M 30,80 Q 0,20 80,60 Q 20,110 50,140 Z" fill="url(#wingGrad1)" opacity="0.85"/>
                        <path d="M 170,80 Q 200,20 120,60 Q 180,110 150,140 Z" fill="url(#wingGrad1)" opacity="0.85"/>
                        <defs>
                            <linearGradient id="wingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
                                <stop offset="100%" stop-color="#c084fc" stop-opacity="0.4"/>
                            </linearGradient>
                        </defs>
                    </svg>

                    <!-- SVG 層: 少女長髮與身體 -->
                    <svg class="avatar-layer" viewBox="0 0 200 240">
                        <!-- 金粉色浪漫長髮 (底層) -->
                        <path d="M 65,50 Q 40,100 55,170 Q 75,190 90,160 Z" fill="#fef08a"/>
                        <path d="M 135,50 Q 160,100 145,170 Q 125,190 110,160 Z" fill="#fef08a"/>
                        <!-- 肌膚/臉部/雙眼 -->
                        <ellipse cx="100" cy="70" rx="25" ry="30" fill="#ffedd5"/>
                        <ellipse cx="92" cy="72" rx="3.5" ry="5" fill="#3b82f6"/>
                        <ellipse cx="108" cy="72" rx="3.5" ry="5" fill="#3b82f6"/>
                        <path d="M 96,83 Q 100,86 104,83" stroke="#f43f5e" stroke-width="2" fill="none"/>
                        <!-- 預設便服內搭 -->
                        <path d="M 82,98 L 118,98 L 110,150 L 90,150 Z" fill="#e2e8f0"/>
                    </svg>

                    <!-- SVG 層 1: 純真奇想連身裙 -->
                    <svg id="layer-dress" class="avatar-layer layer-hidden" viewBox="0 0 200 240">
                        <path d="M 80,95 Q 100,105 120,95 L 140,175 Q 100,195 60,175 Z" fill="url(#dressGrad)"/>
                        <path d="M 75,160 Q 100,175 125,160 Q 100,185 75,160" fill="#ffffff" opacity="0.6"/>
                        <defs>
                            <linearGradient id="dressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#c084fc"/>
                                <stop offset="100%" stop-color="#38bdf8"/>
                            </linearGradient>
                        </defs>
                    </svg>

                    <!-- SVG 層 3: 輕盈踏風靴 -->
                    <svg id="layer-shoes" class="avatar-layer layer-hidden" viewBox="0 0 200 240">
                        <path d="M 83,185 L 94,185 L 94,208 L 80,208 Z" fill="#38bdf8"/>
                        <path d="M 106,185 L 117,185 L 120,208 L 106,208 Z" fill="#38bdf8"/>
                    </svg>

                    <!-- SVG 層 2: 星海魔導帽 -->
                    <svg id="layer-hat" class="avatar-layer layer-hidden" viewBox="0 0 200 240">
                        <path d="M 60,48 Q 100,35 140,48 L 100,5 Z" fill="#6d28d9"/>
                        <ellipse cx="100" cy="48" rx="42" ry="8" fill="#4c1d95"/>
                        <polygon points="100,20 104,28 112,28 106,33 108,41 100,36 92,41 94,33 88,28 96,28" fill="#fef08a"/>
                    </svg>

                    <!-- SVG 層 4: 奇蹟願望榮譽皇冠 -->
                    <svg id="layer-crown" class="avatar-layer layer-hidden" viewBox="0 0 200 240">
                        <polygon points="78,42 85,25 93,38 100,18 107,38 115,25 122,42" fill="#fbbf24"/>
                        <circle cx="100" cy="28" r="3" fill="#ef4444"/>
                    </svg>
                </div>
                <div class="avatar-title" id="avatar-active-title">🌸 預設冒險者姿態</div>
            `;
        }

        this.renderAvatarStage();

        const container = document.getElementById('wardrobe-grid-container');
        if (!container) return;
        container.innerHTML = '';

        const items = [
            { name: "風能漂浮之翼", icon: "🦋", desc: "寫作靈感飛躍" },
            { name: "純真奇想套裝", icon: "👗", desc: "單字淨化力" },
            { name: "星海探索魔導帽", icon: "🪄", desc: "文法陷阱破解" },
            { name: "輕盈踏風靴", icon: "🥿", desc: "刷題極速加速" },
            { name: "奇蹟願望榮譽皇冠", icon: "👑", desc: "A++ 終極解鎖" }
        ];

        items.forEach((item, index) => {
            const isUnlocked = this.unlockedWardrobe.includes(index);
            const isEquipped = this.equippedItems.includes(index);
            const div = document.createElement('div');
            div.className = `wardrobe-item ${isUnlocked ? 'unlocked' : ''} ${isEquipped ? 'equipped' : ''}`;
            div.onclick = () => this.toggleEquip(index);
            div.innerHTML = `
                <span>${item.icon}</span>
                <div>
                    <p>${item.name}</p>
                    <small style="color: #67e8f9;">✨ ${item.desc}</small>
                </div>
                <small>${!isUnlocked ? '未解鎖' : (isEquipped ? '穿戴中 ✅' : '點擊穿上')} </small>
            `;
            container.appendChild(div);
        });
    },

    returnMenu() {
        this.switchScreen('screen-menu');
        this.updateStats();
    }
};

window.onload = () => Game.init();
