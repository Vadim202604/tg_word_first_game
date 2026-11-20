const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();
}

let wordsDB = []; // База слов загрузится сюда из файла words.json

const keyboardRows = [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
    ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
    ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "Ё"]
];

let currentLevel = Number(localStorage.getItem("tg_word_level")) || 0;
let score = localStorage.getItem("tg_word_score") !== null ? Number(localStorage.getItem("tg_word_score")) : 30;

let mistakes = 0;
let guessedLetters = [];
let targetWord = "";
let isLevelWon = false;

function saveProgress() {
    localStorage.setItem("tg_word_level", currentLevel);
    localStorage.setItem("tg_word_score", score);
}

// Функция случайного перемешивания массива (алгоритм Фишера — Йетса)
function shuffleWords(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startLevel() {
    const currentItem = wordsDB[currentLevel % wordsDB.length];
    targetWord = currentItem.word.toUpperCase();
    mistakes = 0;
    guessedLetters = [];
    isLevelWon = false;

    document.getElementById("riddle-text").innerText = currentItem.desc;
    renderKeyboard();
    updateScreen();
}

function renderKeyboard() {
    const keyboard = document.getElementById("keyboard");
    keyboard.innerHTML = "";

    keyboardRows.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "keyboard-row";

        row.forEach(letter => {
            const btn = document.createElement("button");
            btn.innerText = letter;
            btn.id = "btn-" + letter;
            btn.onclick = function() {
                checkLetter(letter, btn);
            };
            rowDiv.appendChild(btn);
        });

        keyboard.appendChild(rowDiv);
    });
}

function checkLetter(letter, btn) {
    if (guessedLetters.includes(letter) || mistakes >= 5) return;

    guessedLetters.push(letter);
    btn.disabled = true;

    if (targetWord.includes(letter)) {
        btn.classList.add("correct");
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light"); // Лёгкий стук при успехе
    } else {
        btn.classList.add("wrong");
        mistakes++;
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("error"); // Вибрация ошибки
    }

    updateScreen();
}


function useHint() {
    if (score < 15) return;

    const hiddenLetters = targetWord.split("").filter(char => !guessedLetters.includes(char));
    if (hiddenLetters.length === 0) return;

    const randomLetter = hiddenLetters[Math.floor(Math.random() * hiddenLetters.length)];
    
    score -= 15;
    saveProgress();

    const btn = document.getElementById("btn-" + randomLetter);
    checkLetter(randomLetter, btn);
}

function updateScreen() {
    document.getElementById("level-display").innerText = `Уровень: ${currentLevel + 1}`;
    document.getElementById("lives").innerText = `❤️ ${mistakes} / 5`;
    document.getElementById("score").innerText = `⭐ ${score}`;
    document.getElementById("hint-btn").disabled = score < 15;

    const wordContainer = document.getElementById("word-container");
    wordContainer.innerHTML = "";
    let isWordGuessed = true;

    for (let char of targetWord) {
        const span = document.createElement("span");
        if (guessedLetters.includes(char)) {
            span.innerText = char;
        } else {
            span.innerText = "_";
            isWordGuessed = false;
        }
        wordContainer.appendChild(span);
    }

    setTimeout(() => {
        if (isWordGuessed) {
            isLevelWon = true;
            score += 20;
            document.getElementById("score").innerText = `⭐ ${score}`;
            showModal("🎉 Победа!", `Вы отгадали слово «${targetWord}» и заработали +20 очков!`, "Следующее слово");
        } else if (mistakes >= 5) {
            isLevelWon = false;
            showModal("💔 Попытки кончились", `Загаданное слово было: «${targetWord}». Попробуйте ещё раз!`, "Повторить");
        }
    }, 250);
}

function showModal(title, text, buttonText) {
    document.getElementById("modal-title").innerText = title;
    document.getElementById("modal-text").innerText = text;
    document.getElementById("modal-btn").innerText = buttonText;
    document.getElementById("modal-overlay").classList.add("active");
}

function closeModalAndContinue() {
    document.getElementById("modal-overlay").classList.remove("active");
    if (isLevelWon) {
        currentLevel++;
        saveProgress();
    }
    startLevel();
}

// Загрузка базы слов из JSON и запуск игры
async function initApp() {
    try {
        const response = await fetch("words.json");
        wordsDB = await response.json();
        shuffleWords(wordsDB); // Перемешиваем слова при запуске
        startLevel();
    } catch (error) {
        document.getElementById("riddle-text").innerText = "Ошибка загрузки базы слов. Проверьте файл words.json!";
    }
}

initApp();
