const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const keypad = document.querySelector(".keypad");

let expression = "";
let justCalculated = false;
let history = [];

const historyPanel = document.createElement("section");
historyPanel.className = "history";
historyPanel.innerHTML = `
    <div class="history-heading">RECENT CALCULATIONS</div>
    <div class="history-list"></div>
`;

document.querySelector(".calculator").insertBefore(
    historyPanel,
    document.querySelector(".footer")
);

function updateDisplay() {
    expressionDisplay.textContent = expression
        .replace(/\*/g, "×")
        .replace(/\//g, "÷");

    if (!expression) {
        resultDisplay.textContent = "0";
    }
}

function formatNumber(number) {
    if (!Number.isFinite(number)) {
        throw new Error("Invalid result");
    }

    if (Object.is(number, -0)) number = 0;

    return Number(number.toPrecision(12)).toString();
}

function renderHistory() {
    const list = historyPanel.querySelector(".history-list");
    list.replaceChildren();

    history.forEach(item => {
        const row = document.createElement("div");
        row.className = "history-item";

        const calculation = document.createElement("span");
        calculation.textContent = item.expression;

        const answer = document.createElement("span");
        answer.textContent = item.result;

        row.append(calculation, answer);
        list.appendChild(row);
    });

    historyPanel.hidden = history.length === 0;
}

function addHistory(expressionText, answer) {
    history.unshift({
        expression: expressionText,
        result: answer
    });

    history = history.slice(0, 3);
    renderHistory();
}

/*
 * Convert a trailing percentage into a number.
 * For example, 200 + 10% becomes 200 + 20.
 */
function preparePercentage(text) {
    const relative = text.match(
        /(-?\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)%$/
    );

    if (relative) {
        const base = Number(relative[1]);
        const operator = relative[2];
        const percent = Number(relative[3]);

        const amount = base * percent / 100;

        return text.replace(
            /(-?\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)%$/,
            `${base}${operator}${amount}`
        );
    }

    return text.replace(
        /(\d+(?:\.\d+)?)%/g,
        "($1/100)"
    );
}

/*
 * Evaluate a mathematical expression without allowing
 * arbitrary JavaScript statements.
 */
function evaluateExpression(text) {
    const prepared = preparePercentage(text);

    if (!/^[0-9+\-*/().\s]+$/.test(prepared)) {
        throw new Error("Invalid expression");
    }

    const tokens = prepared.match(
        /\d+(?:\.\d*)?|\.\d+|[()+\-*/]/g
    );

    if (!tokens || tokens.join("") !== prepared.replace(/\s/g, "")) {
        throw new Error("Invalid expression");
    }

    let position = 0;

    function parseExpression() {
        let value = parseTerm();

        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {
            const operator = tokens[position++];

            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (
            tokens[position] === "*" ||
            tokens[position] === "/"
        ) {
            const operator = tokens[position++];

            const right = parseUnary();

            if (operator === "/" && right === 0) {
                throw new Error("Cannot divide by zero");
            }

            value = operator === "*"
                ? value * right
                : value / right;
        }

        return value;
    }

    function parseUnary() {
        if (tokens[position] === "+") {
            position++;
            return parseUnary();
        }

        if (tokens[position] === "-") {
            position++;
            return -parseUnary();
        }

        return parsePrimary();
    }

    function parsePrimary() {
        const token = tokens[position++];

        if (token === "(") {
            const value = parseExpression();

            if (tokens[position++] !== ")") {
                throw new Error("Missing closing bracket");
            }

            return value;
        }

        if (
            token === undefined ||
            !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)
        ) {
            throw new Error("Invalid expression");
        }

        return Number(token);
    }

    const result = parseExpression();

    if (position !== tokens.length || !Number.isFinite(result)) {
        throw new Error("Invalid expression");
    }

    return result;
}

function calculate() {
    if (!expression) return;

    const original = expression;

    try {
        const result = evaluateExpression(expression);
        const answer = formatNumber(result);

        expressionDisplay.textContent =
            original.replace(/\*/g, "×").replace(/\//g, "÷") + " =";

        resultDisplay.textContent = answer;

        addHistory(
            original.replace(/\*/g, "×").replace(/\//g, "÷"),
            answer
        );

        expression = answer;
        justCalculated = true;
    } catch (error) {
        resultDisplay.textContent =
            error.message === "Cannot divide by zero"
                ? "Cannot divide by zero"
                : "Error";

        expression = "";
        justCalculated = false;
    }
}

function toggleSign() {
    if (!expression) {
        expression = "-";
        updateDisplay();
        return;
    }

    if (justCalculated) {
        expression = String(-Number(expression));
        justCalculated = false;
        updateDisplay();
        return;
    }

    const match = expression.match(/(\d+(?:\.\d*)?|\.\d+)$/);

    if (!match) return;

    const start = match.index;
    const before = expression.slice(0, start);
    const number = match[0];

    const previous = before.trimEnd().slice(-1);

    if (before.endsWith("-") && (
        before.length === 1 ||
        "+-*/(".includes(before.trimEnd().slice(-2, -1))
    )) {
        expression = before.slice(0, -1) + number;
    } else if (
        start > 0 &&
        "+-*/(".includes(previous)
    ) {
        expression = before + "(-" + number + ")";
    } else {
        expression = before + "(-" + number + ")";
    }

    updateDisplay();
}

keypad.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    const value = button.dataset.value;
    const action = button.dataset.action;

    if (action === "clear") {
        expression = "";
        justCalculated = false;
        expressionDisplay.textContent = "";
        resultDisplay.textContent = "0";
        return;
    }

    if (action === "delete") {
        if (justCalculated) {
            expression = "";
            justCalculated = false;
        } else {
            expression = expression.slice(0, -1);
        }

        updateDisplay();
        return;
    }

    if (action === "sign") {
        toggleSign();
        return;
    }

    if (action === "calculate") {
        calculate();
        return;
    }

    if (value === undefined) return;

    if (justCalculated) {
        if ("+-*/".includes(value)) {
            // Continue using the previous result.
        } else {
            expression = "";
        }

        justCalculated = false;
    }

    const last = expression.slice(-1);

    if ("+-*/".includes(value)) {
        if (!expression && value !== "-") return;

        if ("+-*/".includes(last)) {
            if (value === "-" && last !== "-") {
                expression += value;
            } else {
                expression = expression.slice(0, -1) + value;
            }
        } else {
            expression += value;
        }
    } else if (value === ".") {
        const currentNumber = expression.split(/[+\-*/()]/).pop();

        if (currentNumber.includes(".")) return;

        expression += currentNumber === "" ? "0." : ".";
    } else {
        expression += value;
    }

    updateDisplay();
});

renderHistory();