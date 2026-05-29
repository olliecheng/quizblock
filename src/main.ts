import { Plugin } from "obsidian";
import { registerQuizProcessor, resetQuizBlocksInNote } from "./quiz-processor";

export default class ObsidiQuizPlugin extends Plugin {
    async onload() {
        registerQuizProcessor(this);
        this.addCommand({
            id: "reset-quiz-block-attempts",
            name: "Reset quiz block attempts in note",
            editorCallback: () => resetQuizBlocksInNote(this.app),
        });
    }

    onunload() {}
}
