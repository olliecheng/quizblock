import { App, MarkdownRenderer, MarkdownView, Notice, Plugin } from "obsidian";

interface SectionInfo {
    lineStart: number;
    lineEnd: number;
    text: string;
}

type OptionState = " " | "c" | "w" | "r";

interface QuizOption {
    state: OptionState;
    text: string;
    lineIndex: number;
}

interface ParsedQuiz {
    question: string;
    options: QuizOption[];
    details?: string;
}

const OPTION_RE = /^\[([ crw])\] (.*)$/;

function parseQuiz(source: string): ParsedQuiz {
    const lines = source.split("\n");
    let question = "";
    const options: QuizOption[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;

        const match = OPTION_RE.exec(line);
        if (match) {
            options.push({
                state: match[1] as OptionState,
                text: match[2] ?? "",
                lineIndex: i,
            });
        } else if (!question && line.trim() !== "") {
            question = line.trim();
        }
    }

    const lastOptionIndex = options.length > 0 ? Math.max(...options.map(o => o.lineIndex)) : -1;
    const afterLines = lines.slice(lastOptionIndex + 1);
    let start = 0;
    while (start < afterLines.length && afterLines[start]?.trim() === "") start++;
    let end = afterLines.length - 1;
    while (end >= start && afterLines[end]?.trim() === "") end--;
    const details = start <= end ? afterLines.slice(start, end + 1).join("\n") : undefined;

    return { question, options, details };
}

function nextState(current: OptionState): OptionState {
    switch (current) {
        case " ": return "w";
        case "c": return "r";
        case "w": return " ";
        case "r": return "c";
    }
}

function stateToClass(state: OptionState): string {
    switch (state) {
        case " ": return "quiz-option--unselected";
        case "c": return "quiz-option--correct-unselected";
        case "w": return "quiz-option--wrong";
        case "r": return "quiz-option--right";
    }
}

function hashString(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
}

function mulberry32(seed: number): () => number {
    return () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffledOptions(options: QuizOption[], question: string): QuizOption[] {
    const arr = [...options];
    const rng = mulberry32(hashString(question));
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = arr[i] as QuizOption;
        arr[i] = arr[j] as QuizOption;
        arr[j] = tmp;
    }
    return arr;
}

function renderQuiz(el: HTMLElement, quiz: ParsedQuiz, isInteractive: boolean): void {
    el.empty();

    const block = el.createDiv({
        cls: isInteractive ? "quiz-block" : "quiz-block quiz-block--readonly",
    });

    block.createDiv({ cls: "quiz-question", text: quiz.question });

    const hasWrongSelection = quiz.options.some((o) => o.state === "w");
    const isAnswered = quiz.options.some((o) => o.state === "w" || o.state === "r");

    const optionsEl = block.createDiv({ cls: "quiz-options" });
    for (const option of shuffledOptions(quiz.options, quiz.question)) {
        const revealCorrect = option.state === "c" && hasWrongSelection;
        const cls = [
            "quiz-option",
            stateToClass(option.state),
            ...(revealCorrect ? ["quiz-option--revealed"] : []),
        ].join(" ");

        const optEl = optionsEl.createDiv({ cls });
        optEl.dataset["lineIndex"] = String(option.lineIndex);

        // Show [ ] for the [c] marker so the correct answer isn't revealed by the source text
        const markerText = option.state === "c" ? "[ ]" : `[${option.state}]`;
        optEl.createSpan({ cls: "quiz-option__marker", text: markerText });
        optEl.createSpan({ cls: "quiz-option__text", text: " " + option.text });
    }

    if (quiz.details !== undefined) {
        block.createDiv({
            cls: isAnswered ? "quiz-details quiz-details--visible" : "quiz-details",
        });
    }
}

function attachClickHandlers(
    el: HTMLElement,
    quiz: ParsedQuiz,
    sec: SectionInfo | null,
    app: App
): void {
    el.querySelectorAll<HTMLElement>(".quiz-option").forEach((optEl) => {
        optEl.addEventListener("click", () => {
            const view = app.workspace.getActiveViewOfType(MarkdownView);
            if (!view || view.getMode() === "preview") {
                new Notice("Switch to editing mode to interact with this quiz.");
                return;
            }
            if (!sec) return;

            const lineIndexStr = optEl.dataset["lineIndex"];
            if (lineIndexStr === undefined) return;

            const lineIndex = parseInt(lineIndexStr, 10);
            const option = quiz.options.find((o) => o.lineIndex === lineIndex);
            if (!option) return;

            const newState = nextState(option.state);
            const editor = view.editor;

            // setLine() triggers a re-render that destroys the focused element,
            // causing CodeMirror to scroll to the cursor. Save and restore position.
            const scroller = view.containerEl.querySelector<HTMLElement>(".cm-scroller");
            const savedScrollTop = scroller?.scrollTop ?? 0;

            const isSelecting = newState === "w" || newState === "r";
            if (isSelecting) {
                for (const other of quiz.options) {
                    if (other.lineIndex === lineIndex) continue;
                    if (other.state === "w") {
                        editor.setLine(sec.lineStart + 1 + other.lineIndex, `[ ] ${other.text}`);
                        other.state = " ";
                    } else if (other.state === "r") {
                        editor.setLine(sec.lineStart + 1 + other.lineIndex, `[c] ${other.text}`);
                        other.state = "c";
                    }
                }
            }

            editor.setLine(sec.lineStart + 1 + lineIndex, `[${newState}] ${option.text}`);
            option.state = newState;

            if (scroller) {
                requestAnimationFrame(() => {
                    scroller.scrollTop = savedScrollTop;
                });
            }
        });
    });
}

export function resetQuizBlocksInNote(app: App): void {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.getMode() === "preview") return;

    const editor = view.editor;
    const lineCount = editor.lineCount();
    let inQuizBlock = false;
    const changes: { line: number; text: string }[] = [];

    for (let i = 0; i < lineCount; i++) {
        const line = editor.getLine(i);
        if (!inQuizBlock && /^```quiz\s*$/.test(line)) {
            inQuizBlock = true;
            continue;
        }
        if (inQuizBlock && /^```\s*$/.test(line)) {
            inQuizBlock = false;
            continue;
        }
        if (inQuizBlock) {
            let newLine = line;
            if (line.startsWith("[w] ")) newLine = "[ ] " + line.slice(4);
            else if (line.startsWith("[r] ")) newLine = "[c] " + line.slice(4);
            if (newLine !== line) changes.push({ line: i, text: newLine });
        }
    }

    if (changes.length === 0) return;

    editor.transaction({
        changes: changes.map(({ line, text }) => ({
            from: { line, ch: 0 },
            to: { line, ch: editor.getLine(line).length },
            text,
        })),
    });
}

export function registerQuizProcessor(plugin: Plugin): void {
    plugin.registerMarkdownCodeBlockProcessor("quiz", async (source, el, ctx) => {
        const sec = ctx.getSectionInfo(el);
        const quiz = parseQuiz(source);
        renderQuiz(el, quiz, sec !== null);

        if (quiz.details !== undefined) {
            const detailsEl = el.querySelector<HTMLElement>(".quiz-details");
            if (detailsEl) {
                await MarkdownRenderer.render(plugin.app, quiz.details, detailsEl, ctx.sourcePath, plugin);
            }
        }

        attachClickHandlers(el, quiz, sec, plugin.app);
    });
}
