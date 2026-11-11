// ==========================================
// Elysia 的奇想風元素戰養成所 - 核心邏輯 (app.js)
// ==========================================

let currentGroupIndex = 0;
let currentBatchWords = [];
let currentWordIndex = 0;
let score = 0;
let masteredWords = JSON.parse(localStorage.getItem('elysia_mastered_words') || '[]');
let currentQuestion = null;
let answeredCorrectlyFirstTry = true;

// 初始化遊戲
function initGame() {
    console.log("Game initializing...");
    
    // 檢查 VOCAB_DATA 是否存在
    if (typeof VOCAB_DATA === 'undefined' || !Array.isArray(VOCAB_DATA) || VOCAB_DATA.length === 0) {
        console.error("VOCAB_DATA 未載入！");
        alert("警告：單字資料庫 (vocab_data.js) 尚未正確載入，請確認 GitHub 上的檔案是否完整！");
        return;
    }

    updateStats();
    setupEventListeners();
}

// 設定所有按鈕事件綁定
function setupEventListeners() {
    // 開始按鈕
    const startBtn = document.getElementById('start-btn') || document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.onclick = function() {
            startTraining();
        };
    }

    // 奇想衣櫃按鈕
    const wardrobeBtn = document.getElementById('wardrobe-btn') || document.querySelector('.wardrobe-btn');
    if (wardrobeBtn) {
        wardrobeBtn.onclick = function() {
            openWardrobe();
        };
    }
}

// 開始特訓
function startTraining() {
    const welcomeScreen = document.getElementById('welcome-modal') || document.querySelector('.welcome-screen') || document.getElementById('landing-screen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    loadBatch(currentGroupIndex);
}

// 載入指定組別 (每組 20 字)
function loadBatch(groupIndex) {
    currentGroupIndex = groupIndex;
    
    let startIdx = groupIndex * 20;
    let endIdx = startIdx + 20;
    
    if (startIdx >= VOCAB_DATA.length) {
        alert("恭喜！已經完成所有 2000 單字特訓！");
        currentGroupIndex = 0;
        startIdx = 0;
        endIdx = 20;
    }
    
    const rawBatch = VOCAB_DATA.slice(startIdx, endIdx);
    
    // 過濾已掌握的單字
    currentBatchWords = rawBatch.filter(item => !masteredWords.includes(item.word));
    
    if (currentBatchWords.length === 0) {
        // 如果這一組剛好全背完了，自動跳下一組
        if ((groupIndex + 1) * 20 < VOCAB_DATA.length) {
            loadBatch(groupIndex + 1);
            return;
        } else {
            alert("太棒了！所有單字皆已掌握完畢！");
            return;
        }
    }

    currentWordIndex = 0;
    nextQuestion();
}

// 下一題
function nextQuestion() {
    if (currentWordIndex >= currentBatchWords.length) {
        alert(`恭喜完成第 ${currentGroupIndex + 1} 組特訓！`);
        if ((currentGroupIndex + 1) * 20 < VOCAB_DATA.length) {
            loadBatch(currentGroupIndex + 1);
        } else {
            alert("恭喜通關所有 2000 單字！");
        }
        return;
    }

    currentQuestion = currentBatchWords[currentWordIndex];
    answeredCorrectlyFirstTry = true;
    updateUI();
}

// 檢查答案
function checkAnswer(selectedMeaning) {
    if (!currentQuestion) return;
    
    const correctAnswer = currentQuestion.meaning;

    if (selectedMeaning === correctAnswer) {
        if (answeredCorrectlyFirstTry) {
            if (!masteredWords.includes(currentQuestion.word)) {
                masteredWords.push(currentQuestion.word);
                localStorage.setItem('elysia_mastered_words', JSON.stringify(masteredWords));
            }
        }
        score += 10;
        updateStats();
        currentWordIndex++;
        setTimeout(nextQuestion, 400);
    } else {
        answeredCorrectlyFirstTry = false;
        alert(`答錯囉！正確答案是：${correctAnswer}`);
    }
}

// 更新介面
function updateUI() {
    const wordTitle = document.getElementById('word-title');
    const wordPhonetic = document.getElementById('word-phonetic');
    const progressText = document.getElementById('progress-text');

    if (wordTitle) wordTitle.innerText = currentQuestion.word;
    if (wordPhonetic) wordPhonetic.innerText = currentQuestion.phonetic || '';
    if (progressText) progressText.innerText = `目前進度：${currentWordIndex + 1} / ${currentBatchWords.length} (第 ${currentGroupIndex + 1} 組)`;
    
    generateOptions();
}

// 生成選項
function generateOptions() {
    const optionsContainer = document.getElementById('options-container');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';

    let options = [currentQuestion.meaning];
    while (options.length < 4 && typeof VOCAB_DATA !== 'undefined') {
        const randomItem = VOCAB_DATA[Math.floor(Math.random() * VOCAB_DATA.length)];
        if (!options.includes(randomItem.meaning)) {
            options.push(randomItem.meaning);
        }
    }
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.style.margin = '8px';
        btn.style.padding = '12px 20px';
        btn.style.cursor = 'pointer';
        btn.onclick = () => checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

// 更新統計數據
function updateStats() {
    const masteredCountElem = document.getElementById('mastered-count') || document.querySelector('.mastered-count');
    if (masteredCountElem) {
        masteredCountElem.innerText = masteredWords.length;
    }
}

function openWardrobe() {
    alert("奇想衣櫃：目前已征服 " + masteredWords.length + " 個單字！繼續加油！");
}

window.onload = initGame;
