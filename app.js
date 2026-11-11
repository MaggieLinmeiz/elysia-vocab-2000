// ==========================================
// Elysia 的奇想風元素戰養成所 - 核心邏輯 (app.js)
// 邏輯設計：每組 20 字，組內不重複、組間不重複；答對即標記掌握並篩除
// ==========================================

let currentGroupIndex = 0;
let currentBatchWords = [];
let currentWordIndex = 0;
let score = 0;
let masteredWords = JSON.parse(localStorage.getItem('elysia_mastered_words') || '[]');
let wrongWords = [];
let currentQuestion = null;
let answeredCorrectlyFirstTry = false;

// 初始化遊戲
function initGame() {
    loadProgress();
    setupGroupSelector();
    
    // 綁定首頁「開始今日 20 題特訓」按鈕事件
    const startBtn = document.getElementById('start-btn') || document.querySelector('.start-btn') || document.querySelector('button');
    if (startBtn) {
        startBtn.onclick = function() {
            // 隱藏首頁遮罩或區塊，開始遊戲
            const welcomeModal = document.getElementById('welcome-modal') || document.querySelector('.welcome-screen');
            if (welcomeModal) welcomeModal.style.display = 'none';
            loadBatch(currentGroupIndex);
        };
    }
}

// 載入指定組別 (每組 20 字，排除已掌握的單字)
function loadBatch(groupIndex) {
    currentGroupIndex = groupIndex;
    
    const startIdx = groupIndex * 20;
    const endIdx = startIdx + 20;
    
    const rawBatch = (typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : []).slice(startIdx, endIdx);
    
    if (rawBatch.length === 0) {
        alert("恭喜！已經沒有更多單字了！");
        return;
    }

    currentBatchWords = rawBatch.filter(item => !masteredWords.includes(item.word));
    
    if (currentBatchWords.length === 0) {
        if ((groupIndex + 1) * 20 < VOCAB_DATA.length) {
            loadBatch(groupIndex + 1);
            return;
        } else {
            alert("太棒了！2000單全部通關完成！");
            return;
        }
    }

    currentWordIndex = 0;
    nextQuestion();
}

// 產生下一題
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
    const correctAnswer = currentQuestion.meaning;

    if (selectedMeaning === correctAnswer) {
        if (answeredCorrectlyFirstTry) {
            if (!masteredWords.includes(currentQuestion.word)) {
                masteredWords.push(currentQuestion.word);
                localStorage.setItem('elysia_mastered_words', JSON.stringify(masteredWords));
            }
        }
        
        score += 10;
        currentWordIndex++;
        setTimeout(nextQuestion, 400);
    } else {
        answeredCorrectlyFirstTry = false;
        alert(`答錯囉！正確答案是：${correctAnswer}`);
    }
}

// 畫面更新
function updateUI() {
    const wordTitle = document.getElementById('word-title');
    const wordPhonetic = document.getElementById('word-phonetic');
    const progressText = document.getElementById('progress-text');

    if (wordTitle) wordTitle.innerText = currentQuestion.word;
    if (wordPhonetic) wordPhonetic.innerText = currentQuestion.phonetic || '';
    if (progressText) progressText.innerText = `目前進度：${currentWordIndex + 1} / ${currentBatchWords.length} (第 ${currentGroupIndex + 1} 組)`;
    
    generateOptions();
}

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
        btn.style.padding = '10px 20px';
        btn.style.cursor = 'pointer';
        btn.onclick = () => checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

function loadProgress() {}
function setupGroupSelector() {}

window.onload = initGame;
