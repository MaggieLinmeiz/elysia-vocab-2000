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
    loadBatch(currentGroupIndex);
}

// 載入指定組別 (每組 20 字，排除已掌握的單字)
function loadBatch(groupIndex) {
    currentGroupIndex = groupIndex;
    
    // 計算每組 20 個單字的範圍
    const startIdx = groupIndex * 20;
    const endIdx = startIdx + 20;
    
    // 從 VOCAB_DATA 取出該區間的單字
    const rawBatch = VOCAB_DATA.slice(startIdx, endIdx);
    
    if (rawBatch.length === 0) {
        alert("恭喜！已經沒有更多單字了！");
        return;
    }

    // 過濾掉已經掌握的單字，但確保每一組的基礎 20 字池是固定且不重複的
    currentBatchWords = rawBatch.filter(item => !masteredWords.includes(item.word));
    
    if (currentBatchWords.length === 0) {
        // 如果這一組都背完了，自動跳下一組
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
        // 該組結算
        alert(`恭喜完成第 ${currentGroupIndex + 1} 組特訓！`);
        // 自動進下一組
        if ((currentGroupIndex + 1) * 20 < VOCAB_DATA.length) {
            loadBatch(currentGroupIndex + 1);
        } else {
            alert("恭喜通關所有 2000 單字！");
        }
        return;
    }

    currentQuestion = currentBatchWords[currentWordIndex];
    answeredCorrectlyFirstTry = true; // 預設第一次答題

    updateUI();
}

// 檢查答案
function checkAnswer(selectedMeaning) {
    const correctAnswer = currentQuestion.meaning;

    if (selectedMeaning === correctAnswer) {
        if (answeredCorrectlyFirstTry) {
            // 第一次就答對：直接加入已掌握清單，不再重複出現
            if (!masteredWords.includes(currentQuestion.word)) {
                masteredWords.push(currentQuestion.word);
                localStorage.setItem('elysia_mastered_words', JSON.stringify(masteredWords));
            }
        }
        
        score += 10;
        playAudioFeedback(true);
        
        // 進入下一題
        currentWordIndex++;
        setTimeout(nextQuestion, 500);
    } else {
        // 答錯了：標記為非第一次答對，留在本組稍後或重新練習
        answeredCorrectlyFirstTry = false;
        playAudioFeedback(false);
        alert(`答錯囉！正確答案是：${correctAnswer}`);
    }
}

// 畫面更新
function updateUI() {
    document.getElementById('word-title').innerText = currentQuestion.word;
    document.getElementById('word-phonetic').innerText = currentQuestion.phonetic;
    document.getElementById('progress-text').innerText = `目前進度：${currentWordIndex + 1} / ${currentBatchWords.length} (第 ${currentGroupIndex + 1} 組)`;
    
    // 生成 4 選 1 選項
    generateOptions();
}

function generateOptions() {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    // 隨機選出 3 個錯誤選項 + 1個正確答案
    let options = [currentQuestion.meaning];
    while (options.length < 4) {
        const randomItem = VOCAB_DATA[Math.floor(Math.random() * VOCAB_DATA.length)];
        if (!options.includes(randomItem.meaning)) {
            options.push(randomItem.meaning);
        }
    }
    // 隨機打散選項順序
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

function playAudioFeedback(isCorrect) {
    // 簡易音效或視覺回饋
}

function loadProgress() {
    // 載入進度
}

function setupGroupSelector() {
    // 設定組別選單
}

window.onload = initGame;
