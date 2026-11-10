const Game = {
    currentIndex: 0,
    currentSessionList: [],
    wrongBook: JSON.parse(localStorage.getItem('elysia_wrong_book')) || [],
    unlockedWardrobe: JSON.parse(localStorage.getItem('elysia_wardrobe')) || [0],
    windEnergy: parseInt(localStorage.getItem('elysia_wind')) || 0,
    score: 0,
    activeQuestion: null,
    quizMode: 'choice', // 'choice' 或 'spell'

    init() {
        this.updateStats();
    },

    updateStats() {
        document.getElementById('wind-energy').innerText = this.windEnergy;
        document.getElementById('wrong-count').innerText = this.wrongBook.length;
        document.getElementById('wardrobe-count').innerText = `${this.unlockedWardrobe.length}/5`;
        
        // 💡 更新已征服單字總數統計
        const masteredWords = JSON.parse(localStorage.getItem('elysia_mastered_words')) || [];
        const masteredElem = document.getElementById('total-mastered');
        if (masteredElem) {
            masteredElem.innerText = masteredWords.length;
        }

        // 更新當前進度顯示
        const progressElem = document.getElementById('progress-text');
        if (progressElem && this.currentSessionList.length > 0) {
            progressElem.innerText = `${this.currentIndex + 1} / ${this.currentSessionList.length}`;
        }
    },

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    startDailySession() {
        // 🎯 每次挑戰精準 20 題
        this.currentSessionList = [...VOCAB_DATABASE].sort(() => 0.5 - Math.random()).slice(0, 20);
        this.currentIndex = 0;
        this.switchScreen('screen-quiz');
        this.loadQuestion();
    },

    setMode(mode) {
        this.quizMode = mode;
        document.getElementById('mode-choice-btn').classList.toggle('active', mode === 'choice');
        document.getElementById('mode-spell-btn').classList.toggle('active', mode === 'spell');
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

        document.getElementById('vocab-category').innerText = q.category;
        document.getElementById('vocab-phonetic').innerText = q.phonetic;
        document.getElementById('explanation-box').classList.add('hidden');

        const optionsContainer = document.getElementById('options-container');
        const spellContainer = document.getElementById('spell-container');
        const wordDisplay = document.getElementById('vocab-word');

        if (this.quizMode === 'choice') {
            optionsContainer.style.display = 'grid';
            spellContainer.style.display = 'none';
            wordDisplay.innerText = q.word;
            optionsContainer.innerHTML = '';

            let options = [q.meaning];
            while (options.length < 4) {
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
            optionsContainer.style.display = 'none';
            spellContainer.style.display = 'block';
            
            wordDisplay.innerText = `✍️ 請拼出中文：「${q.meaning}」`;

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
        if ('speechSynthesis' in window && this.activeQuestion) {
            const utterance = new SpeechSynthesisUtterance(this.activeQuestion.word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    },

    recordMasteredWord() {
        let masteredWords = JSON.parse(localStorage.getItem('elysia_mastered_words')) || [];
        if (!masteredWords.includes(this.activeQuestion.id)) {
            masteredWords.push(this.activeQuestion.id);
            localStorage.setItem('elysia_mastered_words', JSON.stringify(masteredWords));
        }
    },

    checkAnswer(selected, correct, btnElement) {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);

        if (selected === correct) {
            btnElement.classList.add('correct');
            this.windEnergy += 10;
            this.wrongBook = this.wrongBook.filter(id => id !== this.activeQuestion.id);
            this.recordMasteredWord(); // 記錄已征服
        } else {
            btnElement.classList.add('wrong');
            buttons.forEach(b => {
                if (b.innerText === correct) b.classList.add('correct');
            });
            if (!this.wrongBook.includes(this.activeQuestion.id)) {
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
            this.recordMasteredWord(); // 記錄已征服
        } else {
            if (!this.wrongBook.includes(this.activeQuestion.id)) {
                this.wrongBook.push(this.activeQuestion.id);
            }
        }

        this.saveAndShowExplanation();
    },

    saveAndShowExplanation() {
        localStorage.setItem('elysia_wrong_book', JSON.stringify(this.wrongBook));
        localStorage.setItem('elysia_wind', this.windEnergy);
        this.updateStats();

        const exp = this.activeQuestion;
        document.getElementById('vocab-word').innerText = exp.word;
        document.getElementById('exp-meaning').innerText = exp.meaning;
        document.getElementById('exp-collocation').innerText = exp.collocation;
        document.getElementById('exp-confusing').innerText = exp.confusing;
        document.getElementById('exp-exampoint').innerText = exp.examPoint;
        document.getElementById('exp-example').innerText = exp.example;
        document.getElementById('explanation-box').classList.remove('hidden');
    },

    nextQuestion() {
        this.currentIndex++;
        this.loadQuestion();
    },

    rewardWardrobe() {
        if (this.unlockedWardrobe.length < 5) {
            this.unlockedWardrobe.push(this.unlockedWardrobe.length);
            localStorage.setItem('elysia_wardrobe', JSON.stringify(this.unlockedWardrobe));
        }
    },

    openWardrobe() {
        this.switchScreen('screen-wardrobe');
        const container = document.getElementById('wardrobe-grid-container');
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
