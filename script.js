const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');

let electionData = {};

// State management for conversational flows (like eligibility checker)
let appState = {
    mode: 'normal', // 'normal' | 'checking_first_time' | 'checking_age' | 'checking_citizenship',
    isFirstTime: false,
    userAge: null,
    followUpContext: null
};

// Load intents data
async function loadData() {
    try {
        const response = await fetch('./data/election_data.json');
        electionData = await response.json();
    } catch (error) {
        console.error("Error loading election data:", error);
    }
}
loadData();

// --- UI Functions ---

function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `<div class="msg-content">${text}</div>`;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'message bot-message typing-id';
    indicatorDiv.id = 'typingIndicator';
    indicatorDiv.innerHTML = `
        <div class="typing-indicator">
            <div style="font-size: 0.85rem; color: var(--primary-light); font-weight: 600; margin-right: 6px;">Typing</div>
            <span></span><span></span><span></span>
        </div>
    `;
    chatBox.appendChild(indicatorDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// Helper to convert markdown bold syntax to HTML for bot messages
function parseMarkdown(text) {
    let parsedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    parsedText = parsedText.replace(/\n/g, "<br>");
    return parsedText;
}

function appendBotMessage(text) {
    showTypingIndicator();
    
    // Simulate network/thinking delay
    setTimeout(() => {
        removeTypingIndicator();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot-message';
        msgDiv.innerHTML = `<div class="msg-content">${parseMarkdown(text)}</div>`;
        chatBox.appendChild(msgDiv);
        scrollToBottom();
    }, 500 + Math.random() * 500); // 500-1000ms delay
}

function appendBotMessageWithButtons(text, buttonsHtml) {
    showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot-message';
        msgDiv.innerHTML = `
            <div class="msg-content">
                ${parseMarkdown(text)}
                <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        chatBox.appendChild(msgDiv);
        scrollToBottom();
    }, 500 + Math.random() * 500);
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Bot Logic ---

function handleMessage(message) {
    if (!message.trim()) return;

    appendUserMessage(message);
    userInput.value = '';

    // Route message based on state
    if (appState.mode === 'checking_first_time') {
        processFirstTimeCheck(message);
    } else if (appState.mode === 'checking_age') {
        processEligibilityAge(message);
    } else if (appState.mode === 'checking_citizenship') {
        processEligibilityCitizenship(message);
    } else if (appState.mode.startsWith('scenario_')) {
        processScenarioFlow(message);
    } else {
        processNormalQuery(message);
    }
}

function processNormalQuery(message) {
    let lowerMsg = message.toLowerCase();

    // Check for follow-up answers
    if ((lowerMsg === 'yes' || lowerMsg === 'yup' || lowerMsg === 'yeah' || lowerMsg === 'sure') && appState.followUpContext) {
        if (appState.followUpContext === 'registration') {
            lowerMsg = 'how to register';
        } else if (appState.followUpContext === 'download_id') {
            lowerMsg = 'download voter id';
        } else if (appState.followUpContext === 'voting_guide') {
            lowerMsg = 'explain voting basics';
        }
        appState.followUpContext = null;
    } else if (lowerMsg !== 'what should i do now?' && !lowerMsg.includes('next step')) {
        // Only reset if they answer no or ask a completely different standard question
        if (lowerMsg === 'no' || lowerMsg === 'nope') appState.followUpContext = null; 
    }

    // Interactive Flow: Step 1 buttons click handler
    if (appState.mode === 'interactive_age_check') {
        if (lowerMsg === 'yes' || lowerMsg === 'yes, i am 18+') {
            appState.mode = 'normal';
            appendBotMessage("**Next Step Guidance:**\n👉 1. Find your polling booth online.\n👉 2. Carry your Voter ID or Aadhaar.\n\n**Document Checklist:**\n✅ Voter ID (EPIC) OR Aadhaar/PAN Card\n\n**Common Mistakes:**\n⚠️ Do not take your mobile phone inside the booth.\n⚠️ Do not forget to verify your name on the voter list beforehand.\n\n👉 **In short:** Verify your name on the list, grab your ID, and vote early!");
            return;
        } else if (lowerMsg === 'no' || lowerMsg === 'no, under 18') {
             appState.mode = 'normal';
             appendBotMessage("**Next Step Guidance:**\nSince you are under 18, your next step is to wait until you turn 18.\n\n**Common Mistakes:**\n⚠️ Don't fall for fake voter ID agents. Only apply once you are officially 18.\n\n👉 **In short:** Learn about the process now, and register via Form 6 once you turn 18!");
             return;
        }
    }

    // Scenario Trigger
    if (lowerMsg.includes('guide me') || lowerMsg.includes('step-by-step') || lowerMsg.includes('scenario')) {
        appState.mode = 'scenario_select';
        appendBotMessageWithButtons(
            "I'm here to help you step-by-step! Please select your current situation:",
            `<button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('Scenario: First-time voter')">First-time voter</button>
             <button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('Scenario: Lost voter ID')">Lost voter ID</button>
             <button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('Scenario: Want to vote but unsure')">Want to vote but unsure</button>`
        );
        return;
    }

    // Quick Action: Next Steps, Checklist, Common Mistakes, Summary
    if (lowerMsg.includes('what should i do now') || lowerMsg.includes('next step') || lowerMsg.includes('action')) {
        appState.mode = 'interactive_age_check';
        appendBotMessageWithButtons(
            "To give you the best guidance, let's start with a quick question:<br><br><strong>Are you 18 years old or above?</strong>",
            `<button onclick="triggerAction('Yes, I am 18+')" class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);">Yes</button>
             <button onclick="triggerAction('No, under 18')" class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);">No</button>`
        );
        return;
    }

    // Check specifically for eligibility trigger
    if (lowerMsg.includes('eligible') || lowerMsg.includes('can i vote') || lowerMsg.includes('am i allowed to vote')) {
        if (appState.userAge) {
            if (appState.userAge < 18) {
                appendBotMessage(`As you mentioned earlier that you are ${appState.userAge}, you are currently **Not Eligible** to vote yet.`);
            } else {
                appendBotMessage(`As you mentioned you are ${appState.userAge}, you meet the age criteria! ✅\n\nEnsure you are an Indian citizen and registered to vote.`);
            }
            return;
        }

        appState.mode = 'checking_first_time';
        appendBotMessage("Let's check your eligibility! Before we start, are you a **first-time voter**? (Yes/No)");
        return;
    }

    // Keyword matching logic
    let matchedIntent = null;

    if (electionData.intents) {
        for (const intent of electionData.intents) {
            for (const keyword of intent.keywords) {
                if (lowerMsg.includes(keyword)) {
                    matchedIntent = intent;
                    break;
                }
            }
            if (matchedIntent) break;
        }
    }

    if (matchedIntent) {
        // Pick a random response from the matched intent
        let responses = matchedIntent.responses;
        if (appState.isFirstTime && matchedIntent.beginner_responses && matchedIntent.beginner_responses.length > 0) {
            responses = matchedIntent.beginner_responses;
        }
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Set follow up context if it exists
        if (matchedIntent.follow_up_context) {
            appState.followUpContext = matchedIntent.follow_up_context;
        }

        appendBotMessage(randomResponse);
    } else {
        // Fallback
        const fallbackResponses = electionData.fallback || ["I didn't understand that."];
        const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        appendBotMessage(randomFallback);
    }
}

// --- Eligibility Flow Logic ---

function processFirstTimeCheck(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('yes') || lowerMsg.includes('yup') || lowerMsg.includes('yeah')) {
        appState.isFirstTime = true;
        appState.mode = 'checking_age';
        appendBotMessage("Awesome! Welcome to democracy! 🌟\n\nTo check if you can vote, what is your current age?");
    } else if (lowerMsg.includes('no') || lowerMsg.includes('nope')) {
        appState.isFirstTime = false;
        appState.mode = 'checking_age';
        appendBotMessage("Great, an experienced voter! Let's check. What is your current age?");
    } else {
        appendBotMessage("Please answer with 'Yes' or 'No'. Are you a first-time voter?");
    }
}

function processEligibilityAge(message) {
    // Extract number from message
    const ageMatch = message.match(/\d+/);
    
    if (ageMatch) {
        const age = parseInt(ageMatch[0]);
        appState.userAge = age; // Remember age
        if (age < 18) {
            appState.mode = 'normal'; // Reset state
            appState.followUpContext = 'registration';
            appendBotMessage(`❌ Since you are **${age}** years old, you are currently **Not Eligible** to vote. The minimum voting age in India is 18.\n\n👉 Do you want to know how to register in advance if you are 17+?`);
        } else {
            appState.mode = 'checking_citizenship';
            appendBotMessage("✅ Great! You meet the age criteria. Are you an Indian Citizen? (Yes/No)");
        }
    } else {
        appendBotMessage("I didn't catch a number. Could you please tell me your age in years? (e.g., '22')");
    }
}

function processEligibilityCitizenship(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('yes') || lowerMsg.includes('yup') || lowerMsg.includes('yeah')) {
        appState.mode = 'normal';
        appState.followUpContext = 'registration';
        appendBotMessage("✅ **You are Eligible!** \n\nSince you are 18+ and an Indian citizen, you can vote. Ensure you are registered on the Electoral Roll.\n\n👉 Would you like to know how to register?");
    } else if (lowerMsg.includes('no') || lowerMsg.includes('nope')) {
        appState.mode = 'normal';
        appendBotMessage("❌ Ah, only Indian citizens are eligible to vote in Indian elections. If you acquire citizenship in the future, you can apply then.");
    } else {
        appendBotMessage("Please answer with 'Yes' or 'No'. Are you an Indian citizen?");
    }
}

// --- Scenario Flow Logic ---

function processScenarioFlow(message) {
    const lowerMsg = message.toLowerCase();
    
    if (appState.mode === 'scenario_select') {
        if (lowerMsg.includes('first-time')) {
            appState.mode = 'scenario_first_time_step1';
            appendBotMessageWithButtons(
                "Great! Welcome to the democratic process. Let's get you registered.\n\nFirst, do you have your Aadhaar Card or 10th marksheet ready for age proof?",
                `<button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('Yes, I have it')">Yes, I have it</button>
                 <button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('No, I need time')">No, not yet</button>`
            );
        } else if (lowerMsg.includes('lost')) {
             appState.mode = 'scenario_lost_id_step1';
             appendBotMessageWithButtons(
                 "Oh no! Don't worry, replacing it is easy. Have you already filed a police FIR for your lost ID?",
                 `<button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('Yes, FIR is filed')">Yes, FIR is filed</button>
                  <button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('No, not yet')">No, not yet</button>`
             );
        } else if (lowerMsg.includes('unsure')) {
             appState.mode = 'scenario_unsure_step1';
             appendBotMessageWithButtons(
                 "I'll help you out! The first step is knowing if you are registered. Have you ever applied for a Voter ID before?",
                 `<button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('Yes, I have applied')">Yes, I have applied</button>
                  <button class="action-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bot-bg);" onclick="triggerAction('No, never applied')">No, never applied</button>`
             );
        } else {
             appendBotMessage("Please select one of the options provided above.");
        }
        return;
    }

    if (appState.mode === 'scenario_first_time_step1') {
        appState.mode = 'normal'; 
        if (lowerMsg.includes('yes')) {
            appendBotMessage("Perfect! ✅\n\n**Next Step:**\n👉 Visit voters.eci.gov.in and fill out **Form 6** online.\n👉 Upload your proof and a passport photo.\n👉 Submit it, and you will get a tracking ID!");
        } else {
            appendBotMessage("No problem. Take your time!\n\n**Next Step:**\n👉 Gather your Age Proof (Aadhaar/PAN) and Address Proof (Electricity bill).\n👉 Once you have them, you can apply using **Form 6** on voters.eci.gov.in.");
        }
        return;
    }

    if (appState.mode === 'scenario_lost_id_step1') {
        appState.mode = 'normal';
        if (lowerMsg.includes('yes')) {
            appendBotMessage("Great work! ✅\n\n**Next Step:**\n👉 Go to voters.eci.gov.in and select **Form 8**.\n👉 Choose 'Issue of Replacement EPIC'.\n👉 Submit it, and your duplicate ID will be mailed to your address.");
        } else {
            appendBotMessage("That is perfectly fine. Here is what to do:\n\n**Next Step:**\n👉 1. File a police FIR online or at your local station (keep the copy).\n👉 2. Then, visit voters.eci.gov.in, fill **Form 8**, and request a replacement EPIC.");
        }
        return;
    }

    if (appState.mode === 'scenario_unsure_step1') {
        appState.mode = 'normal';
        if (lowerMsg.includes('yes')) {
            appendBotMessage("Awesome! ✅\n\n**Next Step:**\n👉 Visit electoralsearch.eci.gov.in and search your name to confirm you are on the Voter List.\n👉 If your name is there, you are ready to vote! Just take your ID to the booth on election day.");
        } else {
            appendBotMessage("Let's get you started from scratch! ✅\n\n**Next Step:**\n👉 You need to register as a new voter.\n👉 Collect your Aadhaar and a photo, go to voters.eci.gov.in, and submit **Form 6**.");
        }
        return;
    }
}

// --- Event Listeners ---

sendBtn.addEventListener('click', () => {
    handleMessage(userInput.value);
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleMessage(userInput.value);
    }
});

function triggerAction(text) {
    handleMessage(text);
}

// --- Speech to Text (Bonus Feature) ---

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Defaulting to Indian English

    recognition.onstart = function() {
        voiceBtn.classList.add('recording');
        userInput.placeholder = "Listening...";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        handleMessage(transcript);
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        voiceBtn.classList.remove('recording');
        userInput.placeholder = "Type your question here...";
        appendBotMessage("Sorry, I couldn't hear that properly. Could you type it out?");
    };

    recognition.onend = function() {
        voiceBtn.classList.remove('recording');
        userInput.placeholder = "Type your question here...";
    };

    voiceBtn.addEventListener('click', () => {
        recognition.start();
    });
} else {
    // Hide mic button if not supported by browser
    voiceBtn.style.display = 'none';
}

// --- Did You Know? Facts Logic ---

const factDisplay = document.getElementById('factDisplay');
let currentFactIndex = 0;

const facts = [
    "<strong>High Participation:</strong> In the 2019 General Elections, India saw a historic voter turnout of <strong>67.4%</strong>.",
    "<strong>Youth Power:</strong> In 2024, approximately <strong>1.8 Crore</strong> first-time voters (aged 18-19) were registered.",
    "<strong>Women Voters:</strong> Recent elections have recorded the highest ever participation of women, almost bridging the gender gap.",
    "<strong>EVM Usage:</strong> India uses <strong>100%</strong> Electronic Voting Machines (EVMs) with VVPAT for absolute transparency.",
    "<strong>Home Voting:</strong> The ECI now provides a 'Home Voting' facility for senior citizens (85+ years) and PwDs."
];

function cycleFact() {
    if (!factDisplay) return;
    currentFactIndex = (currentFactIndex + 1) % facts.length;
    factDisplay.innerHTML = facts[currentFactIndex];
}

// Initialize first fact
if (factDisplay) {
    factDisplay.innerHTML = facts[0];
}
