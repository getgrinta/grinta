---
title: Quick Links
description: Speed up your searches with predefined and custom quick links in Grinta.
---

Grinta's Quick Links feature allows you to perform targeted searches on your favorite websites or services directly from the command palette using simple shortcuts.

## How to Use Quick Links

To use a Quick Link:

1.  Type the shortcut for the Quick Link (e.g., `g` for Google).
2.  Press the `Tab` key.
3.  Type your search query and press `Enter`.

Grinta will then open your default web browser and perform the search on the specified site.

## Predefined Quick Links

Grinta comes with a set of predefined Quick Links for popular services. Here are a few examples:

-   **G + Tab**: Search on Google.
-   **Y + Tab**: Search on YouTube.
-   **W + Tab**: Search on Wikipedia.
-   **R + Tab**: Search on Reddit.
-   **C + Tab**: Search on ChatGPT.
-   **P + Tab**: Search on Perplexity AI.
-   **F + Tab**: Search on Figma Community.
-   **J + Tab**: Search Jira (via Google site search).
-   **X + Tab**: Search on X (formerly Twitter).

You can find the full list and their shortcuts within Grinta's settings.

## Custom Quick Links

Beyond the defaults, Grinta empowers you to create your own custom Quick Links for any website or service that uses URL-based search.

### Creating a Custom Quick Link

1.  Navigate to **Settings > Search**.
2.  Scroll down to the "Quick Search" or "Custom Quick Links" section.
3.  You'll find a form to add a new link. Fill in the following fields:
    *   **Shortcut**: A short (usually 1-2 characters) prefix for your quick link (e.g., `gh` for GitHub).
    *   **Name**: A descriptive name for the quick link (e.g., "GitHub Search"). This name will appear in the settings.
    *   **URL Template**: The URL that will be used for the search. Crucially, you must use `{query}` (with curly braces) as a placeholder for where your search term should be inserted. For example, `https://github.com/search?q={query}`.
4.  Click the "Add Link" or similar button to save your custom Quick Link.

### Managing Custom Quick Links

In the same settings section, you will see a list of your custom Quick Links. You can typically:

-   **View** all your created Quick Links.
-   **Remove** Quick Links you no longer need by clicking a delete or trash icon next to the link.

By leveraging Quick Links, you can significantly streamline your search workflows and access information faster.