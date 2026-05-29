import { Plugin } from "obsidian";
import { registerQuizProcessor } from "./quiz-processor";

export default class ObsidiQuizPlugin extends Plugin {
    async onload() {
        registerQuizProcessor(this);
    }

    onunload() {}
}
