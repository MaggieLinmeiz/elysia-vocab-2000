const Game = {
    currentIndex: 0,
    currentSessionList: [],
    wrongBook: [],
    unlockedWardrobe: [0],
    windEnergy: 0,
    activeQuestion: null,
    quizMode: 'choice', // 'choice' 或 'spell'

    init() {
        try {
            this.wrongBook = JSON.parse(localStorage.getItem('elysia_wrong_book')) || [];
            this.unlockedWardrobe = JSON.parse(localStorage.getItem('elysia_wardrobe')) || [0];
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
            alert('⚠️ 題庫尚未載入，請確認 vocab_data.js 是否存在！');
            return;
        }
        // 🎯 每次挑戰精準 20 題
        this.currentSessionList = [...VOCAB_DATABASE].sort(() => 0.5 - Math.random()).slice(0, 20);
        this.currentIndex = 0;
        this.switchScreen('screen-quiz');
        this.loadQuestion();
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
            this.switchScreen('screen-menu');
            this.updateStats();
            return;
        }

        this.updateStats();
        const q = this.currentSessionList[this.currentIndex];
        this.activeQuestion = q;

        const categoryElem = document.getElementById('vocab-category');
        if (categoryElem) categoryElem.innerText = q.category;

        const phoneticElem = document.getElementById('vocab-phonetic');
        if (phoneticElem) phoneticElem.innerText = q.phonetic;

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
                this.unlockedWardrobe.push(this.unlockedWardrobe.length);
                localStorage.setItem('elysia_wardrobe', JSON.stringify(this.unlockedWardrobe));
            }
        } catch (e) {
            console.log('Wardrobe error:', e);
        }
    },

    openWardrobe() {
        this.switchScreen('screen-wardrobe');
        const container = document.getElementById('wardrobe-grid-container');
        if (!container) return;
        container.innerHTML = '';

        const items = [
            { name: "流光風神之翼", icon: "🦋" },
            { name: "星空晚禮服", icon: "✨" },
            { name: "深藍魔導帽", icon: "🪄" },
            { name: "精靈風鈴靴", icon: "🥿" },
            { name: "A++ 榮譽皇冠", icon: "👑" }
        ];

        items.forEach((item, index) => {
            const isUnlocked = this.unlockedWardrobe.includes(index);
            const div = document.createElement('div');
            div.className = `wardrobe-item ${isUnlocked ? 'unlocked' : ''}`;
            div.innerHTML = `<span>${item.icon}</span><p>${item.name}</p><small>${isUnlocked ? '已解鎖' : '未解鎖'}</small>`;
            container.appendChild(div);
        });
    },

    returnMenu() {
        this.switchScreen('screen-menu');
        this.updateStats();
    }
};

window.onload = () => Game.init();
