---
name: quiz-writer
description: Use this skill whenever the user wants to write quiz questions or multiple-choice questions. Triggers include "multiple-choice", "quiz", "MCQ", or requests to create a test or challenge. Do NOT use when not explicitly asked to generate questions.
---

# Writing quiz questions for quizblock

This file tells you how to write quiz blocks that the Obsidian plugin can render. The files must be in Markdown format.

## Block format

Wrap each question in a fenced code block with the `quiz` language tag:

~~~
```quiz
Question text
[ ] Wrong option
[ ] Wrong option
[c] Correct option
[ ] Wrong option
```
~~~

- The first line is the question. It must be a single line of plain text.
- Each option follows immediately, one per line, with no blank lines between them.
- `[ ]` marks a wrong option. `[c]` marks the correct option.
- There must be exactly one `[c]` per block.

## Details section

You can should add an explanation that is hidden until the user answers. Put it after the options, separated by one blank line:

~~~
```quiz
What is the capital of France?
[ ] London
[ ] Berlin
[c] Paris
[ ] Madrid

Paris has been the capital of France since the 10th century. **Île de la Cité** was its historic centre.
```
~~~

The details section supports Markdown formatting. Multiple lines are fine.

## Guidelines for good questions

- Write questions that have one clearly correct answer.
- Make wrong options plausible — avoid obviously silly distractors.
- Keep option text roughly the same length and grammatical form.
- Use the details section to explain *why* the correct answer is right, not just to restate it.
- Keep the question specific enough that there is no ambiguity about what is being asked.

## What not to do

- Do not include more than one `[c]`. The plugin only supports single-answer questions.
- Do not put a blank line between the question and the options, or between options.
- Do not write a multi-line question — only the first line is used.
- Do not write `[w]` or `[r]` markers. Those are written by the plugin at runtime to record the user's answer; they should never appear in authored content.

## Example with details

~~~
```quiz
A pituitary macroadenoma classically compresses which structure to produce a visual field defect?
- [c] Optic chiasm
- [ ] Right optic radiation
- [ ] Left optic tract
- [ ] Lateral geniculate nucleus

The pituitary gland sits directly below the optic chiasm. Upward expansion compresses the decussating nasal fibres, which carry temporal visual field information from both eyes.

Left optic tract — would produce right homonymous hemianopia; not the classic pituitary presentation.
Right optic radiation — a more posterior structure in the temporal/parietal lobe; not adjacent to the pituitary.
Optic chiasm (correct) — compression of crossing nasal fibres → bitemporal hemianopia.
Lateral geniculate nucleus — thalamic relay; too far posterior and lateral to be compressed by a pituitary mass.
```
~~~