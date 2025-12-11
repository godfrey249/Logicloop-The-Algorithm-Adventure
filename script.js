// Current Player
let currentPlayer = null;

// Game State
let gameState = {
    currentCategory: '',
    currentLevel: 0,
    currentQuestionIndex: 0,
    score: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    piecesCollected: 0,
    questions: [],
    puzzleComplete: false
};

// ✅ ADD THIS - Prevent Enter key spam
let isSubmitting = false;

// Custom Modal Functions
function showCustomAlert(icon, title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        const iconEl = document.getElementById('customAlertIcon');
        const titleEl = document.getElementById('customAlertTitle');
        const messageEl = document.getElementById('customAlertMessage');
        const btn = document.getElementById('customAlertBtn');
        
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        modal.classList.add('show');
        
        btn.onclick = () => {
            modal.classList.remove('show');
            resolve(true);
        };
    });
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').classList.remove('show');
}

function showCustomConfirm(icon, title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const iconEl = document.getElementById('customConfirmIcon');
        const titleEl = document.getElementById('customConfirmTitle');
        const messageEl = document.getElementById('customConfirmMessage');
        const okBtn = document.getElementById('customConfirmOkBtn');
        const cancelBtn = document.getElementById('customConfirmCancelBtn');
        
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        modal.classList.add('show');
        
        okBtn.onclick = () => {
            modal.classList.remove('show');
            resolve(true);
        };
        
        cancelBtn.onclick = () => {
            modal.classList.remove('show');
            resolve(false);
        };
    });
}

function showCustomPrompt(icon, title, message, inputType = 'password') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customPromptModal');
        const iconEl = document.getElementById('customPromptIcon');
        const titleEl = document.getElementById('customPromptTitle');
        const messageEl = document.getElementById('customPromptMessage');
        const input = document.getElementById('customPromptInput');
        const okBtn = document.getElementById('customPromptOkBtn');
        const cancelBtn = document.getElementById('customPromptCancelBtn');
        
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
        input.type = inputType;
        input.value = '';
        
        modal.classList.add('show');
        
        setTimeout(() => input.focus(), 100);
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                modal.classList.remove('show');
                resolve(input.value);
            }
        };
        
        okBtn.onclick = () => {
            modal.classList.remove('show');
            resolve(input.value);
        };
        
        cancelBtn.onclick = () => {
            modal.classList.remove('show');
            resolve(null);
        };
    });
}

// Player Profile Structure with Password
function createPlayerProfile(name, password) {
    return {
        name: name,
        password: password,
        totalScore: 0,
        createdDate: Date.now(),
        lastPlayed: Date.now(),
        progress: {
            beginner: {
                unlockedLevel: 1,
                completedLevels: [],
                totalScore: 0
            },
            advanced: {
                unlockedLevel: 1,
                completedLevels: [],
                totalScore: 0
            }
        }
    };
}

// Load all players from localStorage
function loadAllPlayers() {
    const saved = localStorage.getItem('codePuzzlePlayers');
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

// Save all players to localStorage
function saveAllPlayers(players) {
    localStorage.setItem('codePuzzlePlayers', JSON.stringify(players));
}

// Migrate old players without passwords
function migrateOldPlayers() {
    const players = loadAllPlayers();
    let updated = false;
    
    players.forEach(player => {
        if (!player.password) {
            player.password = 'default123';
            updated = true;
        }
    });
    
    if (updated) {
        saveAllPlayers(players);
    }
}

// Get current player's progress
function getCurrentPlayerProgress() {
    if (!currentPlayer) return null;
    const players = loadAllPlayers();
    const player = players.find(p => p.name === currentPlayer);
    return player ? player.progress : null;
}

// Save current player's progress
function savePlayerProgress() {
    if (!currentPlayer) return;
    
    const players = loadAllPlayers();
    const playerIndex = players.findIndex(p => p.name === currentPlayer);
    
    if (playerIndex !== -1) {
        players[playerIndex].progress = {
            beginner: {
                unlockedLevel: levelProgress.beginner.unlockedLevel,
                completedLevels: [...levelProgress.beginner.completedLevels],
                totalScore: levelProgress.beginner.totalScore || 0
            },
            advanced: {
                unlockedLevel: levelProgress.advanced.unlockedLevel,
                completedLevels: [...levelProgress.advanced.completedLevels],
                totalScore: levelProgress.advanced.totalScore || 0
            }
        };
        players[playerIndex].totalScore = 
            (levelProgress.beginner.totalScore || 0) + 
            (levelProgress.advanced.totalScore || 0);
        players[playerIndex].lastPlayed = Date.now();
        
        saveAllPlayers(players);
        updatePlayerInfoDisplay();
    }
}

// Level Progress
let levelProgress = {
    beginner: {
        unlockedLevel: 1,
        completedLevels: [],
        totalScore: 0
    },
    advanced: {
        unlockedLevel: 1,
        completedLevels: [],
        totalScore: 0
    }
};

// Save current game state during gameplay
function saveGameState() {
    if (!currentPlayer) return;
    
    const currentGameState = {
        player: currentPlayer,
        category: gameState.currentCategory,
        level: gameState.currentLevel,
        questionIndex: gameState.currentQuestionIndex,
        score: gameState.score,
        questionsAnswered: gameState.questionsAnswered,
        correctAnswers: gameState.correctAnswers,
        wrongAnswers: gameState.wrongAnswers,
        piecesCollected: gameState.piecesCollected,
        revealedPieces: Array.from(document.querySelectorAll('.puzzle-piece.revealed')).map(p => p.dataset.piece),
        timestamp: Date.now()
    };
    
    const storageKey = `currentGameProgress_${currentPlayer}_${gameState.currentCategory}`;
    localStorage.setItem(storageKey, JSON.stringify(currentGameState));
}

// Load saved game state
function loadGameState(category) {
    if (!currentPlayer) return null;
    
    const storageKey = `currentGameProgress_${currentPlayer}_${category}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
        const savedState = JSON.parse(saved);
        
        const hoursSinceLastPlay = (Date.now() - savedState.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastPlay > 24) {
            localStorage.removeItem(storageKey);
            return null;
        }
        
        return savedState;
    }
    return null;
}

// Clear game state
function clearGameState(category) {
    if (!currentPlayer) return;
    
    const storageKey = `currentGameProgress_${currentPlayer}_${category}`;
    localStorage.removeItem(storageKey);
}

// Puzzle Images
const puzzleImages = {
    beginner: {
        level1: 'image/beginner1.jpg',
        level2: 'image/beginner2.jpg',
        level3: 'image/beginner3.jpg',
        level4: 'image/beginner4.jpg',
        level5: 'image/beginner5.jpg'
    },
    advanced: {
        level1: 'image/advance1.png',
        level2: 'image/advance2.jpg',
        level3: 'image/advance3.jpg',
        level4: 'image/advance4.jpg',
        level5: 'image/advance5.jpg'
    }
};

// Trivia facts
const triviaFacts = {
    beginner: {
        level1: "The First Computer – ENIAC, built in 1946, was the world's first general-purpose electronic computer.",
        level2: "The Father of Computers – Charles Babbage designed the Analytical Engine in the 1830s.",
        level3: "First Programmer – Ada Lovelace wrote the first algorithm intended for a machine.",
        level4: "The Birth of the Internet – ARPANET, launched in 1969, connected four U.S. universities.",
        level5: "World's First Mouse – Invented by Douglas Engelbart in 1964, made of wood!"
    },
    advanced: {
        level1: "First Hard Drive – IBM's 305 RAMAC (1956) could store only 5MB and weighed over a ton!",
        level2: "First Laptop – The Osborne 1 (1981) weighed 24 pounds and cost nearly $2,000.",
        level3: "Floppy Disk Origin – IBM introduced it in 1971 with a massive 80KB capacity.",
        level4: "Python's Name Origin – Named after the British comedy show Monty Python's Flying Circus.",
        level5: "World's First Computer Game – Spacewar! developed in 1962 at MIT."
    }
};

// Questions Database
const questionBank = {
    beginner: {
        level1: [
            { 
                question: "Fill in the blank: The HTML tag used to create a paragraph is ______.",
                answer: "<p>",
                hint: "HTML paragraph tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property used to change text color is ______.",
                answer: "color",
                hint: "CSS property for text color",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: The HTML tag used to create a heading is ______.",
                answer: "<h1>",
                hint: "Heading tag (can be h1-h6)",
                type: "fillblank"
            },
            { 
                question: "Write HTML code to create a paragraph",
                instructions: "Create a paragraph element with the text 'Hello World':",
                answer: "<p>Hello World</p>",
                hint: "Use <p> tags",
                type: "code"
            },
            { 
                question: "Write CSS code to change text color",
                instructions: "Write CSS to make text color red:",
                answer: "color: red;",
                hint: "Use color property",
                type: "code"
            }
        ],
        level2: [
            { 
                question: "Fill in the blank: In HTML, the tag used to create a hyperlink is ______.",
                answer: "<a>",
                hint: "Anchor tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property to make text bold is ______.",
                answer: "font-weight",
                hint: "CSS property for text weight",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: The HTML attribute used in links to specify URL is ______.",
                answer: "href",
                hint: "Link destination attribute",
                type: "fillblank"
            },
            { 
                question: "Write HTML code to create a link",
                instructions: "Create a link with text 'Click Here' that goes to 'https://example.com':",
                answer: "<a href='https://example.com'>Click Here</a>",
                hint: "Use <a> tag with href attribute",
                type: "code"
            },
            { 
                question: "Write CSS code to make text bold",
                instructions: "Write CSS to make text bold:",
                answer: "font-weight: bold;",
                hint: "Use font-weight property",
                type: "code"
            }
        ],
        level3: [
            { 
                question: "Fill in the blank: In HTML, the tag to display an image is ______.",
                answer: "<img>",
                hint: "Image tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property to set background color is ______.",
                answer: "background-color",
                hint: "CSS background property",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: The HTML attribute used to specify image source is ______.",
                answer: "src",
                hint: "Image source attribute",
                type: "fillblank"
            },
            { 
                question: "Write HTML code to display an image",
                instructions: "Create an image tag with source 'logo.png' and alt text 'Logo':",
                answer: "<img src='logo.png' alt='Logo'>",
                hint: "Use <img> tag with src and alt attributes",
                type: "code"
            },
            { 
                question: "Write CSS code to set background color",
                instructions: "Write CSS to set background color to blue:",
                answer: "background-color: blue;",
                hint: "Use background-color property",
                type: "code"
            }
        ],
        level4: [
            { 
                question: "Fill in the blank: In HTML, the tag used to create a list item is ______.",
                answer: "<li>",
                hint: "List item tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property to control text alignment is ______.",
                answer: "text-align",
                hint: "CSS alignment property",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: The HTML tag for unordered list is ______.",
                answer: "<ul>",
                hint: "Unordered list tag",
                type: "fillblank"
            },
            { 
                question: "Write HTML code to create an unordered list",
                instructions: "Create an unordered list with two items: 'Apple' and 'Banana':",
                answer: "<ul><li>Apple</li><li>Banana</li></ul>",
                hint: "Use <ul> and <li> tags",
                type: "code"
            },
            { 
                question: "Write CSS code to center text",
                instructions: "Write CSS to center align text:",
                answer: "text-align: center;",
                hint: "Use text-align property",
                type: "code"
            }
        ],
        level5: [
            { 
                question: "Fill in the blank: In HTML, the tag used to create a table is ______.",
                answer: "<table>",
                hint: "Table tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property to set element width is ______.",
                answer: "width",
                hint: "CSS dimension property",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: The HTML tag for table row is ______.",
                answer: "<tr>",
                hint: "Table row tag",
                type: "fillblank"
            },
            { 
                question: "Write HTML code to create a div",
                instructions: "Create a div element with id 'container':",
                answer: "<div id='container'></div>",
                hint: "Use <div> tag with id attribute",
                type: "code"
            },
            { 
                question: "Write CSS code to set width",
                instructions: "Write CSS to set width to 100 pixels:",
                answer: "width: 100px;",
                hint: "Use width property with px unit",
                type: "code"
            }
        ]
    },
    advanced: {
        level1: [
            { 
                question: "Fill in the blank: In HTML5, the tag used for semantic header section is ______.",
                answer: "<header>",
                hint: "HTML5 semantic tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the pseudo-class for hover effect is ______.",
                answer: ":hover",
                hint: "CSS hover state",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In JavaScript, the keyword to declare a block-scoped variable is ______.",
                answer: "let",
                hint: "ES6 variable declaration",
                type: "fillblank"
            },
            { 
                question: "Write JavaScript code to declare a variable",
                instructions: "Declare a variable 'name' with value 'John' using let:",
                answer: "let name = 'John';",
                hint: "Use let keyword",
                type: "code"
            },
            { 
                question: "Write CSS code for hover effect",
                instructions: "Write CSS to change color to red on hover for class 'btn':",
                answer: ".btn:hover { color: red; }",
                hint: "Use :hover pseudo-class",
                type: "code"
            }
        ],
        level2: [
            { 
                question: "Fill in the blank: In HTML, the attribute to make input field required is ______.",
                answer: "required",
                hint: "Form validation attribute",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In JavaScript, the keyword to define a function is ______.",
                answer: "function",
                hint: "Function declaration keyword",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the display value to create flexbox is ______.",
                answer: "flex",
                hint: "Flexbox layout",
                type: "fillblank"
            },
            { 
                question: "Write JavaScript code to create a function",
                instructions: "Create a function named 'greet' that returns 'Hello':",
                answer: "function greet() { return 'Hello'; }",
                hint: "Use function keyword with return",
                type: "code"
            },
            { 
                question: "Write CSS code for flexbox",
                instructions: "Write CSS to make a container display as flex:",
                answer: "display: flex;",
                hint: "Use display property",
                type: "code"
            }
        ],
        level3: [
            { 
                question: "Fill in the blank: In HTML, the tag for embedding video is ______.",
                answer: "<video>",
                hint: "HTML5 video tag",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property to create rounded corners is ______.",
                answer: "border-radius",
                hint: "CSS border property",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In JavaScript, the method to add an element to the end of an array is ______.",
                answer: "push",
                hint: "Array method",
                type: "fillblank"
            },
            { 
                question: "Write JavaScript code to add to array",
                instructions: "Create array [1, 2] and use push to add 3:",
                answer: "let arr = [1, 2]; arr.push(3);",
                hint: "Use .push() method",
                type: "code"
            },
            { 
                question: "Write CSS code for rounded corners",
                instructions: "Write CSS to set border radius to 10 pixels:",
                answer: "border-radius: 10px;",
                hint: "Use border-radius property",
                type: "code"
            }
        ],
        level4: [
            { 
                question: "Fill in the blank: In HTML, the attribute to specify CSS class is ______.",
                answer: "class",
                hint: "Class attribute",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In JavaScript, the method to convert string to integer is ______.",
                answer: "parseInt",
                hint: "Type conversion method",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the position value to fix element to viewport is ______.",
                answer: "fixed",
                hint: "CSS positioning",
                type: "fillblank"
            },
            { 
                question: "Write JavaScript code for string to number",
                instructions: "Convert string '123' to integer using parseInt:",
                answer: "let num = parseInt('123');",
                hint: "Use parseInt() function",
                type: "code"
            },
            { 
                question: "Write CSS code for fixed positioning",
                instructions: "Write CSS to set position as fixed:",
                answer: "position: fixed;",
                hint: "Use position property",
                type: "code"
            }
        ],
        level5: [
            { 
                question: "Fill in the blank: In HTML, the attribute to store custom data is ______.",
                answer: "data-",
                hint: "Custom data attribute prefix",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In CSS, the property to control stacking order is ______.",
                answer: "z-index",
                hint: "Layer ordering property",
                type: "fillblank"
            },
            { 
                question: "Fill in the blank: In JavaScript, the method to iterate over array elements is ______.",
                answer: "forEach",
                hint: "Array iteration method",
                type: "fillblank"
            },
            { 
                question: "Write JavaScript code for forEach loop",
                instructions: "Create array [1, 2, 3] and use forEach to log each element:",
                answer: "let arr = [1, 2, 3]; arr.forEach(x => console.log(x));",
                hint: "Use .forEach() with arrow function",
                type: "code"
            },
            { 
                question: "Write CSS code for z-index",
                instructions: "Write CSS to set z-index to 100:",
                answer: "z-index: 100;",
                hint: "Use z-index property",
                type: "code"
            }
        ]
    }
};

// Player Management Functions with Custom Modals
async function createNewPlayer() {
    const nameInput = document.getElementById('newPlayerName');
    const passwordInput = document.getElementById('newPlayerPassword');
    
    if (!nameInput) {
        await showCustomAlert('⚠️', 'ERROR', 'Name input field not found!\n\nPlease refresh the page and try again.');
        return;
    }
    
    const name = nameInput.value.trim();
    
    if (!name) {
        await showCustomAlert('📝', 'NAME REQUIRED', 'Please enter your name to create an account.\n\nYour name will be displayed on the leaderboard!');
        return;
    }
    
    if (!passwordInput) {
        await showCustomAlert('⚠️', 'ERROR', 'Password input field not found!\n\nPlease refresh the page and try again.');
        return;
    }
    
    const password = passwordInput.value.trim();
    
    if (!password) {
        await showCustomAlert('🔒', 'PASSWORD REQUIRED', 'Please create a password to protect your account.\n\nYour password keeps your progress safe!');
        return;
    }
    
    if (password.length < 4) {
        await showCustomAlert('⚠️', 'PASSWORD TOO SHORT', 'Password must be at least 4 characters long.\n\nPlease create a stronger password!');
        return;
    }
    
    const players = loadAllPlayers();
    
    if (players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        await showCustomAlert('❌', 'NAME ALREADY EXISTS', `The name "${name}" is already taken!\n\nPlease choose a different name or load your existing account.`);
        return;
    }
    
    const newPlayer = createPlayerProfile(name, password);
    players.push(newPlayer);
    saveAllPlayers(players);
    
    nameInput.value = '';
    passwordInput.value = '';
    
    currentPlayer = name;
    
    levelProgress = {
        beginner: {
            unlockedLevel: 1,
            completedLevels: [],
            totalScore: 0
        },
        advanced: {
            unlockedLevel: 1,
            completedLevels: [],
            totalScore: 0
        }
    };
    
    updatePlayerInfoDisplay();
    showScreen('categoryScreen');
}

async function loadPlayer(playerName) {
    const players = loadAllPlayers();
    const player = players.find(p => p.name === playerName);
    
    if (!player) {
        await showCustomAlert('⚠️', 'PLAYER NOT FOUND', 'This player account does not exist.\n\nPlease check the name and try again.');
        return;
    }
    
    const enteredPassword = await showCustomPrompt('🔒', 'PASSWORD REQUIRED', `Enter password for "${playerName}":`, 'password');
    
    if (!enteredPassword) {
        return;
    }
    
    if (player.password !== enteredPassword) {
        await showCustomAlert('❌', 'INCORRECT PASSWORD', 'The password you entered is incorrect.\n\nPlease try again or contact the account owner.');
        return;
    }
    
    currentPlayer = playerName;
    
    levelProgress = {
        beginner: {
            unlockedLevel: player.progress.beginner.unlockedLevel,
            completedLevels: [...player.progress.beginner.completedLevels],
            totalScore: player.progress.beginner.totalScore || 0
        },
        advanced: {
            unlockedLevel: player.progress.advanced.unlockedLevel,
            completedLevels: [...player.progress.advanced.completedLevels],
            totalScore: player.progress.advanced.totalScore || 0
        }
    };
    
    updatePlayerInfoDisplay();
    showScreen('categoryScreen');
}

async function changePassword() {
    if (!currentPlayer) {
        await showCustomAlert('⚠️', 'NOT LOGGED IN', 'You must be logged in to change your password.\n\nPlease log in first!');
        return;
    }
    
    const players = loadAllPlayers();
    const player = players.find(p => p.name === currentPlayer);
    
    if (!player) {
        await showCustomAlert('⚠️', 'PLAYER NOT FOUND', 'Your account could not be found.\n\nPlease log in again.');
        return;
    }
    
    const currentPassword = await showCustomPrompt('🔒', 'VERIFY IDENTITY', 'Enter your current password to continue:', 'password');
    
    if (!currentPassword) {
        return;
    }
    
    if (player.password !== currentPassword) {
        await showCustomAlert('❌', 'INCORRECT PASSWORD', 'The current password you entered is incorrect.\n\nPassword change cancelled for security reasons.');
        return;
    }
    
    const newPassword = await showCustomPrompt('🔑', 'CREATE NEW PASSWORD', 'Enter your new password (minimum 4 characters):', 'password');
    
    if (!newPassword) {
        return;
    }
    
    if (newPassword.length < 4) {
        await showCustomAlert('⚠️', 'PASSWORD TOO SHORT', 'Your new password must be at least 4 characters long.\n\nPassword change cancelled.');
        return;
    }
    
    const confirmPassword = await showCustomPrompt('✅', 'CONFIRM NEW PASSWORD', 'Please re-enter your new password:', 'password');
    
    if (confirmPassword !== newPassword) {
        await showCustomAlert('❌', 'PASSWORDS DO NOT MATCH', 'The passwords you entered do not match.\n\nPassword change cancelled. Please try again.');
        return;
    }
    
    const playerIndex = players.findIndex(p => p.name === currentPlayer);
    players[playerIndex].password = newPassword;
    saveAllPlayers(players);
    
    await showCustomAlert('✅', 'SUCCESS', 'Your password has been updated successfully!\n\nPlease remember your new password.');
}

async function deleteMyAccount() {
    if (!currentPlayer) {
        await showCustomAlert('⚠️', 'NOT LOGGED IN', 'You must be logged in to delete your account.\n\nPlease log in first!');
        return;
    }
    
    const players = loadAllPlayers();
    const player = players.find(p => p.name === currentPlayer);
    
    if (!player) {
        await showCustomAlert('⚠️', 'PLAYER NOT FOUND', 'Your account could not be found.\n\nPlease try logging in again.');
        return;
    }
    
    const enteredPassword = await showCustomPrompt('⚠️', 'DANGER ZONE!', `WARNING: This will PERMANENTLY delete your account!\n\nAll your progress will be LOST FOREVER!\nThis action CANNOT be undone!\n\nEnter your password to confirm deletion:`, 'password');
    
    if (!enteredPassword) {
        return;
    }
    
    if (player.password !== enteredPassword) {
        await showCustomAlert('❌', 'INCORRECT PASSWORD', 'The password you entered is incorrect.\n\nAccount deletion cancelled for security reasons.');
        return;
    }
    
    const finalConfirm = await showCustomConfirm('🚨', 'FINAL WARNING!', `Are you absolutely sure you want to delete "${currentPlayer}"?\n\nALL PROGRESS WILL BE LOST!\nTHIS CANNOT BE UNDONE!\n\nClick OK to permanently delete, or Cancel to keep your account.`);
    
    if (!finalConfirm) {
        await showCustomAlert('✅', 'DELETION CANCELLED', 'Your account is safe!\n\nNo changes have been made.');
        return;
    }
    
    const deletedPlayerName = currentPlayer;
    
    const updatedPlayers = players.filter(p => p.name !== currentPlayer);
    saveAllPlayers(updatedPlayers);
    
    const category1Key = `currentGameProgress_${currentPlayer}_beginner`;
    const category2Key = `currentGameProgress_${currentPlayer}_advanced`;
    localStorage.removeItem(category1Key);
    localStorage.removeItem(category2Key);
    
    currentPlayer = null;
    
    levelProgress = {
        beginner: {
            unlockedLevel: 1,
            completedLevels: [],
            totalScore: 0
        },
        advanced: {
            unlockedLevel: 1,
            completedLevels: [],
            totalScore: 0
        }
    };
    
    showScreen('playerScreen');
    
    const loadGameSection = document.getElementById('loadGameSection');
    if (loadGameSection && loadGameSection.classList.contains('expanded')) {
        loadPlayerList();
    }
    
    setTimeout(async () => {
        await showCustomAlert('✅', 'ACCOUNT DELETED', `Account "${deletedPlayerName}" has been permanently deleted.\n\nAll progress has been removed from this device.`);
    }, 100);
}

function toggleLoadGame() {
    const section = document.getElementById('loadGameSection');
    const icon = document.getElementById('loadGameIcon');
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        section.classList.add('expanded');
        icon.textContent = '▼';
        loadPlayerList();
    } else {
        section.classList.add('collapsed');
        section.classList.remove('expanded');
        icon.textContent = '▶';
    }
}

function loadPlayerList() {
    const players = loadAllPlayers();
    const playerList = document.getElementById('playerList');

    if (players.length === 0) {
        playerList.innerHTML = '<p class="no-players">No saved players yet. Create a new player to start!</p>';
        return;
    }

    players.sort((a, b) => b.lastPlayed - a.lastPlayed);
    
    const recentPlayers = players.slice(0, 10);
    const totalPlayers = players.length;

    playerList.innerHTML = recentPlayers.map(player => {
        const isCurrentPlayer = currentPlayer && currentPlayer === player.name;
        
        return `
        <div class="player-card ${isCurrentPlayer ? 'current' : ''}">
            <div class="player-card-info">
                <h4>🔒 ${player.name} ${isCurrentPlayer ? '(Current)' : ''}</h4>
                <p>Total Score: ${player.totalScore}</p>
                <p class="last-played">Last Played: ${getTimeSince(player.lastPlayed)}</p>
            </div>
            <div class="player-card-actions">
                <button class="load-btn" onclick="loadPlayer('${player.name}')">
                    ${isCurrentPlayer ? 'Reload' : 'Load'}
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    if (totalPlayers > 10) {
        playerList.innerHTML += `
            <p class="player-limit-message" style="text-align: center; color: rgba(255,255,255,0.6); margin-top: 15px; font-size: 0.9em;">
                Showing 10 most recent players out of ${totalPlayers} total
            </p>
        `;
    }
}

function deletePlayer(playerName) {
    return;
}

function getTimeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

async function switchPlayer() {
    const confirmation = await showCustomConfirm('🔄', 'SWITCH PLAYER', 'Are you sure you want to switch to a different player?\n\nAny unsaved progress in the current session may be lost.');
    if (confirmation) {
        currentPlayer = null;
        showScreen('playerScreen');
        loadPlayerList();
    }
}

function updatePlayerInfoDisplay() {
    const playerNameEl = document.getElementById('currentPlayerName');
    const totalScoreEl = document.getElementById('totalScore');
    
    if (playerNameEl && currentPlayer) {
        playerNameEl.textContent = currentPlayer;
    }
    
    if (totalScoreEl) {
        const totalScore = (levelProgress.beginner.totalScore || 0) + (levelProgress.advanced.totalScore || 0);
        totalScoreEl.textContent = totalScore;
    }
}

function showLeaderboard() {
    showScreen('leaderboardScreen');
    showLeaderboardCategory('beginner');
}

function showLeaderboardCategory(category) {
    const players = loadAllPlayers();
    const content = document.getElementById('leaderboardContent');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    let sortedPlayers = players.sort((a, b) => 
        (b.progress[category].totalScore || 0) - (a.progress[category].totalScore || 0)
    );
    
    if (sortedPlayers.length === 0) {
        content.innerHTML = '<p class="no-data">No players yet. Start playing to appear on the leaderboard!</p>';
        return;
    }
    
    const topPlayers = sortedPlayers.slice(0, 5);
    const totalPlayers = sortedPlayers.length;
    
    content.innerHTML = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Levels Completed</th>
                </tr>
            </thead>
            <tbody>
                ${topPlayers.map((player, index) => {
                    const score = player.progress[category].totalScore || 0;
                    const levels = player.progress[category].completedLevels.length;
                    
                    const hasProgress = score > 0 || levels > 0;
                    
                    const rankClass = hasProgress && index === 0 ? 'gold' : hasProgress && index === 1 ? 'silver' : hasProgress && index === 2 ? 'bronze' : '';
                    const medal = hasProgress && index === 0 ? '🥇 ' : hasProgress && index === 1 ? '🥈 ' : hasProgress && index === 2 ? '🥉 ' : '';
                    
                    return `
                        <tr class="${rankClass}">
                            <td>${medal}${index + 1}</td>
                            <td>${player.name}</td>
                            <td>${score}</td>
                            <td>${levels}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        ${totalPlayers > 5 ? `
            <p class="leaderboard-limit-message" style="text-align: center; color: rgba(255,255,255,0.6); margin-top: 20px; font-size: 0.95em;">
                Showing top 5 players out of ${totalPlayers} total
            </p>
        ` : ''}
    `;
}

function backToPlayerSelect() {
    showScreen('playerScreen');
    loadPlayerList();
}

function backToPlayerSelectFromMenu() {
    showScreen('playerScreen');
    loadPlayerList();
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

function selectCategory(category) {
    gameState.currentCategory = category;
    document.getElementById('categoryTitle').textContent = 
        category.charAt(0).toUpperCase() + category.slice(1) + ' Category';
    
    const levelButtons = document.getElementById('levelButtons');
    levelButtons.innerHTML = '';
    
    const categoryProgress = levelProgress[category];
    
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        
        const isUnlocked = i <= categoryProgress.unlockedLevel;
        const isCompleted = categoryProgress.completedLevels.includes(i);
        
        if (isCompleted) {
            btn.classList.add('completed');
        } else if (!isUnlocked) {
            btn.classList.add('locked');
        }
        
        btn.textContent = `Level ${i}`;
        
        if (isUnlocked) {
            btn.onclick = () => startLevel(i);
        } else {
            btn.onclick = async () => {
                await showCustomAlert('🔒', 'LEVEL LOCKED', 'This level is currently locked.\n\nComplete the previous level to unlock it!');
            };
        }
        
        levelButtons.appendChild(btn);
    }
    
    updateContinueButtonStatus();
    
    showScreen('levelScreen');
}

function startLevel(level) {
    clearGameState(gameState.currentCategory);
    
    gameState.currentLevel = level;
    gameState.currentQuestionIndex = 0;
    gameState.questionsAnswered = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;
    gameState.piecesCollected = 0;
    gameState.score = 0;
    gameState.puzzleComplete = false;
    
    gameState.questions = [...questionBank[gameState.currentCategory][`level${level}`]];
    
    const imageUrl = puzzleImages[gameState.currentCategory][`level${level}`];
    setPuzzleImage(imageUrl);
    
    resetPuzzle();
    
    showScreen('gameScreen');
    updateGameUI();
    loadQuestion();
}

function setPuzzleImage(imageUrl) {
    const pieces = document.querySelectorAll('.puzzle-piece');
    pieces.forEach(piece => {
        piece.style.backgroundImage = `url('${imageUrl}')`;
    });
}

function resetPuzzle() {
    const pieces = document.querySelectorAll('.puzzle-piece');
    pieces.forEach(piece => {
        piece.classList.remove('revealed');
    });
    
    document.getElementById('answerInput').disabled = false;
    document.querySelectorAll('.answer-input button').forEach(btn => {
        btn.disabled = false;
    });
}

function revealPuzzlePiece() {
    const pieces = document.querySelectorAll('.puzzle-piece');
    for (let piece of pieces) {
        if (!piece.classList.contains('revealed')) {
            piece.classList.add('revealed');
            gameState.piecesCollected++;
            
            saveGameState();
            
            if (gameState.piecesCollected === 5) {
                gameState.puzzleComplete = true;
                
                clearGameState(gameState.currentCategory);
                
                const category = gameState.currentCategory;
                const level = gameState.currentLevel;
                
                if (!levelProgress[category].completedLevels.includes(level)) {
                    levelProgress[category].completedLevels.push(level);
                }
                
                if (level < 5 && levelProgress[category].unlockedLevel === level) {
                    levelProgress[category].unlockedLevel = level + 1;
                }
                
                levelProgress[category].totalScore = (levelProgress[category].totalScore || 0) + gameState.score;
                
                savePlayerProgress();
                
                setTimeout(() => {
                    showTrivia();
                }, 800);
            }
            break;
        }
    }
}

function showTrivia() {
    const trivia = triviaFacts[gameState.currentCategory][`level${gameState.currentLevel}`];
    document.getElementById('triviaText').textContent = trivia;
    
    const proceedBtn = document.getElementById('proceedBtn');
    if (gameState.currentLevel < 5) {
        proceedBtn.classList.remove('hidden');
    } else {
        proceedBtn.classList.add('hidden');
    }
    
    document.getElementById('triviaModal').classList.add('show');
    
    document.getElementById('answerInput').disabled = true;
    document.querySelectorAll('.answer-input button').forEach(btn => {
        btn.disabled = true;
    });
    
    document.getElementById('feedback').style.display = 'none';
}

function proceedToNextLevel() {
    document.getElementById('triviaModal').classList.remove('show');
    
    const nextLevel = gameState.currentLevel + 1;
    if (nextLevel <= 5) {
        startLevel(nextLevel);
    }
}

function backToLevelsFromTrivia() {
    document.getElementById('triviaModal').classList.remove('show');
    selectCategory(gameState.currentCategory);
}

function closeTrivia() {
    backToLevelsFromTrivia();
}

function loadQuestion() {
    if (gameState.puzzleComplete) {
        return;
    }
    
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        gameState.currentQuestionIndex = 0;
    }
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    document.getElementById('questionNumber').textContent = 
        `${gameState.currentQuestionIndex + 1}`;
    document.getElementById('questionText').textContent = question.question;
    
    if (question.type === 'code') {
        const instructionsEl = document.getElementById('instructionsText');
        if (instructionsEl) {
            instructionsEl.textContent = question.instructions;
            instructionsEl.style.display = 'block';
        }
        
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.value = '';
            codeEditor.disabled = false;
            codeEditor.style.display = 'block';
        }
        
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.style.display = 'none';
        }
        
        const codeBlock = document.getElementById('codeBlock');
        if (codeBlock) {
            codeBlock.style.display = 'none';
        }
    } else {
        const instructionsEl = document.getElementById('instructionsText');
        if (instructionsEl) {
            instructionsEl.style.display = 'none';
        }
        
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.style.display = 'none';
        }
        
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.value = '';
            answerInput.disabled = false;
            answerInput.style.display = 'block';
        }
        
        const codeBlock = document.getElementById('codeBlock');
        if (codeBlock && question.code) {
            codeBlock.textContent = question.code;
            codeBlock.style.display = 'block';
        } else if (codeBlock) {
            codeBlock.style.display = 'none';
        }
    }
    
    document.getElementById('feedback').classList.remove('correct', 'wrong');
    document.getElementById('feedback').style.display = 'none';
    
    const hintBox = document.getElementById('hintText');
    const hintBtn = document.getElementById('hintBtn');
    if (hintBox && hintBtn) {
        hintBox.classList.remove('show');
        hintBox.textContent = '';
        hintBtn.disabled = false;
        hintBtn.style.display = 'inline-block';
    }
}

function showHint() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    const hintBox = document.getElementById('hintText');
    const hintBtn = document.getElementById('hintBtn');
    
    if (question.hint) {
        hintBox.textContent = question.hint;
        hintBox.classList.add('show');
        hintBtn.disabled = true;
        hintBtn.style.display = 'none';
    }
}

function updateGameUI() {
    document.getElementById('currentLevel').textContent = gameState.currentLevel;
    document.getElementById('currentCategory').textContent = 
        gameState.currentCategory.charAt(0).toUpperCase() + gameState.currentCategory.slice(1);
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('questionsAnswered').textContent = gameState.questionsAnswered;
    document.getElementById('correctAnswers').textContent = gameState.correctAnswers;
    document.getElementById('wrongAnswers').textContent = gameState.wrongAnswers;
    document.getElementById('piecesCollected').textContent = gameState.piecesCollected;
}

// ✅ FIXED SUBMIT ANSWER - Case Sensitive + Prevents Enter Spam
async function submitAnswer() {
    // Prevent multiple rapid submissions
    if (isSubmitting) return;
    if (gameState.puzzleComplete) return;
    
    isSubmitting = true; // Lock submissions
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    let userAnswer;
    
    if (question.type === 'code') {
        const codeEditor = document.getElementById('codeEditor');
        userAnswer = codeEditor ? codeEditor.value.trim() : '';
    } else {
        const answerInput = document.getElementById('answerInput');
        userAnswer = answerInput ? answerInput.value.trim() : '';
    }
    
    if (!userAnswer) {
        isSubmitting = false; // Unlock for retry
        await showCustomAlert('⚠️', 'ANSWER REQUIRED', 
            question.type === 'code' 
                ? 'Please write your code before submitting!\n\nEnter your answer in the code editor.' 
                : 'Please enter your answer before submitting!\n\nType your answer in the input field.'
        );
        return;
    }
    
    // ===== CASE SENSITIVE COMPARISON =====
    const normalizeAnswer = (str) => {
        return str
            .trim()
            .replace(/\s+/g, '')
            .replace(/;+/g, '');
    };
    
    const correctAnswer = normalizeAnswer(question.answer);
    const userCode = normalizeAnswer(userAnswer);
    
    const feedback = document.getElementById('feedback');
    gameState.questionsAnswered++;
    
    const isCorrect = userCode === correctAnswer;
    
    if (isCorrect) {
        gameState.correctAnswers++;
        gameState.score += 10;
        feedback.textContent = '✅ Correct! +10 points! Puzzle piece revealed!';
        feedback.classList.add('correct');
        feedback.classList.remove('wrong');
        revealPuzzlePiece();
        
        setTimeout(() => {
            gameState.currentQuestionIndex++;
            
            if (gameState.currentQuestionIndex >= gameState.questions.length) {
                gameState.currentQuestionIndex = 0;
            }
            
            loadQuestion();
            saveGameState();
            isSubmitting = false; // Unlock after loading next question
        }, 2000);
        
    } else {
        gameState.wrongAnswers++;
        gameState.score -= 5;
        
        if (gameState.score < 0) {
            gameState.score = 0;
        }
        
        feedback.innerHTML = `❌ Wrong! -5 points!<br><small style="font-size: 0.9em; margin-top: 8px; display: block;">Expected: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${question.answer}</code></small>`;
        feedback.classList.add('wrong');
        feedback.classList.remove('correct');
        
        const wrongQuestion = gameState.questions.splice(gameState.currentQuestionIndex, 1)[0];
        gameState.questions.push(wrongQuestion);
        
        setTimeout(() => {
            if (gameState.currentQuestionIndex >= gameState.questions.length) {
                gameState.currentQuestionIndex = 0;
            }
            
            loadQuestion();
            saveGameState();
            isSubmitting = false; // Unlock after loading next question
        }, 3000);
    }
    
    feedback.style.display = 'block';
    updateGameUI();
    saveGameState();
}

function skipQuestion() {
    if (gameState.puzzleComplete) {
        return;
    }
    
    gameState.currentQuestionIndex++;
    loadQuestion();
    
    saveGameState();
}

function backToLevels() {
    if (!gameState.puzzleComplete && gameState.piecesCollected > 0) {
        saveGameState();
    }
    
    selectCategory(gameState.currentCategory);
}

function backToCategories() {
    showScreen('categoryScreen');
}

// ✅ FIXED HANDLE ENTER KEY - Prevents spam
function handleEnterKey(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        
        // Don't allow submission if already processing
        if (isSubmitting) return;
        
        submitAnswer();
    }
}

function resumeGame(savedState) {
    gameState.currentCategory = savedState.category;
    gameState.currentLevel = savedState.level;
    gameState.currentQuestionIndex = savedState.questionIndex;
    gameState.score = savedState.score;
    gameState.questionsAnswered = savedState.questionsAnswered;
    gameState.correctAnswers = savedState.correctAnswers;
    gameState.wrongAnswers = savedState.wrongAnswers;
    gameState.piecesCollected = savedState.piecesCollected;
    gameState.puzzleComplete = false;
    
    gameState.questions = questionBank[gameState.currentCategory][`level${gameState.currentLevel}`];
    
    const imageUrl = puzzleImages[gameState.currentCategory][`level${gameState.currentLevel}`];
    setPuzzleImage(imageUrl);
    
    showScreen('gameScreen');
    
    const pieces = document.querySelectorAll('.puzzle-piece');
    pieces.forEach(piece => {
        piece.classList.remove('revealed');
        if (savedState.revealedPieces.includes(piece.dataset.piece)) {
            piece.classList.add('revealed');
        }
    });
    
    updateGameUI();
    loadQuestion();
    
    document.getElementById('answerInput').disabled = false;
    document.querySelectorAll('.answer-input button').forEach(btn => {
        btn.disabled = false;
    });
}

async function continueFromCurrentCategory() {
    const category = gameState.currentCategory;
    
    const categoryProgress = levelProgress[category];
    const hasAnyProgress = categoryProgress.completedLevels.length > 0 || 
                          categoryProgress.unlockedLevel > 1;
    
    const savedGame = loadGameState(category);
    
    if (!hasAnyProgress && !savedGame) {
        await showCustomAlert('🎮', 'NO PROGRESS YET', 'You haven\'t started this category yet!\n\nPlease click on "Level 1" to begin your journey.');
        return;
    }
    
    if (savedGame && savedGame.category === category) {
        resumeGame(savedGame);
    } else {
        const categoryProgress = levelProgress[category];
        let levelToStart = categoryProgress.unlockedLevel;
        
        if (categoryProgress.completedLevels.length === 5) {
            await showCustomAlert('🎉', 'ALL LEVELS COMPLETED!', 'Congratulations! You have completed all 5 levels in this category.\n\nSelect a level to replay or try the other category!');
            return;
        }
        
        startLevel(levelToStart);
    }
}

async function startNewGameFromCurrentCategory() {
    const category = gameState.currentCategory;
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    const categoryProgress = levelProgress[category];
    const hasAnyProgress = categoryProgress.completedLevels.length > 0 || categoryProgress.unlockedLevel > 1;
    
    if (!hasAnyProgress) {
        await showCustomAlert('⚠️', 'NO PROGRESS TO RESET', `You cannot start a "New Game" without any progress!\n\nYou haven't played anything in ${categoryName} yet.\n\nClick on Level 1 to start playing first!`);
        return;
    }
    
    const confirmation = await showCustomConfirm('⚠️', 'RESET PROGRESS?', `This will reset ALL your progress in ${categoryName} category!\n\n• All completed levels will be locked again\n• ${categoryName} score will be reset to 0\n\nAre you sure you want to continue?`);
    
    if (confirmation) {
        clearGameState(category);
        levelProgress[category] = {
            unlockedLevel: 1,
            completedLevels: [],
            totalScore: 0
        };
        savePlayerProgress();
        gameState.score = 0;
        
        await showCustomAlert('✅', 'PROGRESS RESET', `${categoryName} category has been reset!\n\nYou can now start fresh from Level 1.`);
        selectCategory(category);
        updateContinueButtonStatus();
    }
}

function updateContinueButtonStatus() {
    const savedGame = loadGameState(gameState.currentCategory);
    const continueBtn = document.querySelector('.continue-btn');
    const continueBtnText = document.querySelector('.continue-btn .btn-text');
    
    if (!continueBtn || !continueBtnText) return;
    
    const categoryProgress = levelProgress[gameState.currentCategory];
    const hasAnyProgress = categoryProgress.completedLevels.length > 0 || 
                          categoryProgress.unlockedLevel > 1;
    
    if (!hasAnyProgress && !savedGame) {
        continueBtn.classList.add('disabled');
        continueBtn.disabled = true;
        continueBtn.style.opacity = '0.5';
        continueBtn.style.cursor = 'not-allowed';
        continueBtnText.innerHTML = 'Continue<br><small style="font-size: 0.75em; opacity: 0.8;">No progress yet</small>';
    } 
    else if (savedGame && savedGame.category === gameState.currentCategory) {
        continueBtn.classList.remove('disabled');
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
        continueBtnText.innerHTML = `Continue<br><small style="font-size: 0.75em; opacity: 0.8;">Lv.${savedGame.level} - ${savedGame.piecesCollected}/5 pieces</small>`;
    } 
    else if (hasAnyProgress) {
        continueBtn.classList.remove('disabled');
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
        continueBtnText.innerHTML = `Continue<br><small style="font-size: 0.75em; opacity: 0.8;">Level ${categoryProgress.unlockedLevel}</small>`;
    }
}

function exitToHomepage() {
    window.location.href = 'home.html';
}

window.addEventListener('DOMContentLoaded', () => {
    migrateOldPlayers();
    showScreen('playerScreen');
});
