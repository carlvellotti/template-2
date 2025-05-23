# Meme Creation Flow V2 - Overall Plan

## 1. Goals

*   Implement a new meme creation flow on a separate page/component.
*   Make the user's meme concept/prompt optional.
*   Select 3 initial meme templates either randomly (if no prompt) or via vector search (if prompt provided).
*   Generate captions for **each** of the 3 selected templates using **multiple** AI models (e.g., Anthropic, Google, Groq) in parallel via the unified `/api/ai/chat` endpoint.
*   Design a UI to effectively display results from multiple models for multiple templates.
*   Integrate the final selection with the existing `MemeGenerator` component.
*   Ensure the new flow is testable and can eventually replace the V1 flow.

## 2. Key Changes from V1

*   **Prompt:** Optional vs. Required.
*   **Template Selection:** Random or Vector Search (Top 3) vs. Vector Search (Top 5) -> AI Selection (Top 2).
*   **Caption Generation:** Dedicated multi-model calls per template vs. Single model selects templates *and* writes captions.
*   **API Usage:** Parallel calls to unified `/api/ai/chat` vs. Sequential calls to `/api/meme-selection` and model-specific endpoints.
*   **UI:** Needs to handle 3 templates with multi-model captions vs. 2 templates with single-model captions.

## 3. Implementation Chunks

1.  **Chunk 1: Backend Template Fetching API**
    *   Create or modify an API endpoint to return 3 meme templates based on either random selection or vector search from an optional prompt.
2.  **Chunk 2: Frontend Component Setup**
    *   Create a new page/route and a new React component (e.g., `MemeSelectorV2.tsx`) for the V2 flow.
    *   Set up basic state management for user inputs (audience, optional prompt), loading status, and results.
3.  **Chunk 3: Frontend Logic - Template Fetching**
    *   Implement the frontend logic to call the new backend API (from Chunk 1) based on whether the user provided a prompt.
    *   Handle loading states and errors for template fetching.
4.  **Chunk 4: Frontend Logic - Multi-Model Caption Generation**
    *   Implement logic to trigger parallel calls to the unified `/api/ai/chat` endpoint for each of the 3 fetched templates, targeting multiple AI models.
    *   Use the `getCaptionGenerationTestPrompt` for these calls.
    *   Aggregate results, handling potential errors or timeouts for individual model calls.
5.  **Chunk 5: Frontend UI - Displaying Results**
    *   Design and implement the UI to display the 3 selected templates.
    *   For each template, display the captions generated by the different AI models in a clear and usable way (e.g., tabs, grouped lists).
    *   Allow the user to select a specific template/caption combination.
6.  **Chunk 6: Integration with `MemeGenerator`**
    *   Update the `MemeGenerator` component or the way it's invoked to accept the new data structure representing the 3 templates and their multi-model captions (for the "Other Options" section).
    *   Ensure selecting a caption correctly passes the chosen `MemeTemplate` and `caption` string to `MemeGenerator`.
7.  **Chunk 7: Testing & Refinement**
    *   Thoroughly test the end-to-end flow with and without a prompt.
    *   Test error handling for API calls (template fetching, caption generation).
    *   Refine UI/UX based on testing.
    *   Add basic logging/observability if needed.

## 4. Success Metrics

*   [x] User can successfully generate meme options with or without providing a specific prompt idea.
*   [x] Captions are generated by multiple specified AI models for each template.
*   [x] Results are displayed clearly, allowing comparison between models/captions.
*   [x] Selecting an option correctly transitions the user to the `MemeGenerator` with the right template and caption.
*   [x] The new flow operates independently of the V1 flow initially. 