import { BlogPost } from "./types";

export const INITIAL_POSTS: BlogPost[] = [
  {
    id: "curated-1",
    title: "How to Learn Modern HTML and Web Development for Beginners in 2026",
    tagline: "A practical, step-by-step foundational guide to understanding semantic HTML, browser engines, and code structure.",
    category: "Coding",
    date: "August 15, 2026",
    readTime: "10 min read",
    author: "Shanawar Ali",
    excerpt: "Learn how the modern web works from scratch. This hands-on masterclass covers essential semantic tags, code syntax, browser rendering, and official documentation resources.",
    tags: ["coding", "html", "webdev", "beginners", "programming"],
    likes: 184,
    savesCount: 52,
    thumbnailUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    visibility: "public",
    content: `## Introduction to Modern Web Development

Every modern website you visit on your phone, tablet, or laptop is assembled using foundational building blocks. At the very core of this digital infrastructure sits <mark>HTML</mark> (HyperText Markup Language). HTML provides the structural skeleton for text, images, multimedia, forms, and interactive navigation elements.

When you write HTML code, you are not writing complex mathematical logic; instead, you are structuring your ideas into a format that web browsers like Google Chrome, Mozilla Firefox, and Apple Safari can parse and present to human readers.

To verify how the official open web standards operate, you can always explore the comprehensive [MDN Web Docs Guide to HTML](https://developer.mozilla.org/en-US/docs/Learn/HTML) and the official [W3C HTML Standards](https://www.w3.org/standards/webdesign/htmlcss).

---

## Step 1: Setting Up Your Free Development Workspace

Before writing your first HTML tag, you need two fundamental tools: a lightweight code editor and a modern web browser.

1. **Download Visual Studio Code:** VS Code is a free, industry-standard code editor created for developers of all skill levels.
2. **Create a Dedicated Project Folder:** On your computer desktop, create a new folder named \`my-first-website\`.
3. **Create the Index File:** Inside VS Code, create a new file named \`index.html\`.

---

## Step 2: The Core Anatomy of an HTML Document

Every valid HTML document starts with a standard declaration that tells the browser which rendering engine specification to use.

Here is the essential boiler-plate code:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My First Web Page</title>
  </head>
  <body>
    <h1>Welcome to Web Development!</h1>
    <p>This is my first hands-on web page built with semantic structure.</p>
  </body>
</html>
\`\`\`

### Output Breakdown:
- **\`<!DOCTYPE html>\`:** Tells the browser that this file is modern HTML5.
- **\`<html lang="en">\`:** The root container encompassing all page elements and declaring the human language.
- **\`<head>\`:** Houses metadata, character encoding, responsive viewport configurations, and stylesheets.
- **\`<body>\`:** The visible stage containing headings, paragraphs, images, and buttons seen by users.

---

## Step 3: Mastering Semantic Elements for Accessibility & SEO

Modern development prioritizes <mark>semantic HTML</mark>. Semantic tags clearly describe their meaning to both the browser and the developer.

Key semantic structural containers include:
- **\`<header>\`:** Houses the website brand logo, top navigation bar, and primary intro headings.
- **\`<nav>\`:** Contains unordered lists of hyperlinks linking to internal sections or external documentation.
- **\`<main>\`:** Encapsulates the unique, central topic of the current page.
- **\`<article>\`:** Represents an independent, self-contained piece of content such as a blog post or news story.
- **\`<section>\`:** Groups thematic content units together.
- **\`<footer>\`:** Sits at the bottom of the page with copyright details, social media handles, and legal policies.

---

## Step 4: Adding Hyperlinks and External References

Links are the fabric of the World Wide Web. Using the \`<a>\` anchor tag with proper attributes allows visitors to navigate between pages safely.

\`\`\`html
<p>
  Explore the official documentation on 
  <a href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer">MDN Web Docs</a> 
  for additional interactive tutorials.
</p>
\`\`\`

When linking to external resources, always specify \`target="_blank"\` and \`rel="noopener noreferrer"\` to maintain tab privacy and security standards.

---

## Frequently Asked Questions (FAQs)

### 1. Is HTML a programming language?
No, HTML is a markup language used to structure content on the web. Programming languages like JavaScript or Python handle algorithmic logic and data manipulation.

### 2. Can I build a website with only HTML?
Yes! HTML provides all necessary text, images, and clickable links. Adding CSS will allow you to customize colors and layouts, while JavaScript introduces dynamic interactivity.

### 3. How long does it take to learn HTML?
Most students can master the fundamentals of semantic HTML within a few days of hands-on practice.

### 4. Where can I find official documentation?
You can reference the [MDN Web Docs](https://developer.mozilla.org) and [W3C Standards](https://www.w3.org) for reliable, up-to-date documentation.`,
    comments: [
      {
        id: "c1",
        author: "YoungCoder",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
        content: "This guide makes semantic HTML and browser setups crystal clear! Thank you!",
        date: "August 16, 2026"
      }
    ]
  },
  {
    id: "curated-2",
    title: "Understanding Artificial Intelligence & Neural Networks: A Practical Overview",
    tagline: "Explore how machine learning models, training algorithms, and neural networks process human requests.",
    category: "Artificial Intelligence",
    date: "August 12, 2026",
    readTime: "12 min read",
    author: "Shanawar Ali",
    excerpt: "Discover the mathematical and architectural foundations behind modern AI tools. Learn how neural networks learn patterns, process natural language, and generate code.",
    tags: ["ai", "machine-learning", "neural-networks", "technology", "python"],
    likes: 210,
    savesCount: 89,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    visibility: "public",
    content: `## What is Artificial Intelligence?

Artificial Intelligence (<mark>AI</mark>) refers to computer software systems engineered to perform complex tasks that historically required human cognition. These capabilities include pattern recognition, natural language comprehension, decision-making, visual computer vision, and code synthesis.

Rather than relying on rigid, pre-programmed if-else rules, modern AI relies on <mark>Machine Learning</mark> (ML) algorithms that discover mathematical patterns by training on massive datasets.

To dive deeper into open-source machine learning research, visit the official [Python Machine Learning Foundation](https://docs.python.org/3/) and the [TensorFlow Documentation](https://www.tensorflow.org).

---

## How Neural Networks Process Information

At the heart of modern AI systems are artificial neural networks inspired by biological neurons in the human brain.

A typical neural network is organized into mathematical computational layers:
1. **Input Layer:** Receives raw numerical tensors (e.g., pixel matrices from photos or tokenized words from text).
2. **Hidden Layers:** Multiply inputs by adjustable mathematical variables called *weights* and add *biases*, passing the values through mathematical activation functions.
3. **Output Layer:** Produces a statistical probability distribution (e.g., 98% likelihood that an image contains a cat).

\`\`\`python
# Simple Python tensor demonstration
import math

def sigmoid_activation(x):
    """Computes standard logistic sigmoid activation."""
    return 1.0 / (1.0 + math.exp(-x))

# Test neuron activation
neuron_input = 2.4
print(f"Activated output: {sigmoid_activation(neuron_input):.4f}")
\`\`\`

### Output Demonstration:
\`Activated output: 0.9168\`

The mathematical activation compresses any arbitrary real number into a clean probability scale between 0.0 and 1.0.

---

## The Rise of Large Language Models (LLMs)

In recent years, the AI landscape was revolutionized by the **Transformer Architecture**. Transformers leverage <mark>self-attention mechanisms</mark> to evaluate relationships between words in a sequence simultaneously, rather than processing words one at a time.

Key applications include:
- **Code Assistance:** Generating syntax snippets, debugging edge cases, and explaining legacy codebases.
- **Content Synthesis:** Drafting tutorials, translating between hundreds of human languages, and summarizing dense technical papers.
- **Multimodal Intelligence:** Simultaneously reasoning across voice audio, visual diagrams, and tabular data.

---

## Frequently Asked Questions (FAQs)

### 1. Does AI truly think or understand?
No. Current AI models compute statistical correlations and probability distributions across data tokens. They do not possess consciousness or independent intent.

### 2. Which programming language is best for AI development?
Python is the industry standard for artificial intelligence, supported by rich scientific libraries such as PyTorch, NumPy, and TensorFlow.

### 3. How do AI models improve over time?
Models improve through iterative backpropagation during training and Reinforcement Learning from Human Feedback (RLHF) during fine-tuning.`,
    comments: []
  },
  {
    id: "curated-3",
    title: "Mastering CSS Grid and Flexbox: Building Modern Responsive Layouts",
    tagline: "A comprehensive guide to creating clean, flexible web layouts that look stunning on any screen size.",
    category: "Coding",
    date: "August 10, 2026",
    readTime: "11 min read",
    author: "Shanawar Ali",
    excerpt: "Say goodbye to broken layouts. Master CSS Flexbox for one-dimensional alignment and CSS Grid for two-dimensional architectures with practical real-world examples.",
    tags: ["css", "flexbox", "cssgrid", "webdev", "frontend"],
    likes: 156,
    savesCount: 44,
    thumbnailUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80",
    visibility: "public",
    content: `## The Evolution of Web Layouts

In the early days of web development, developers arranged web pages using HTML tables and float hacks. Today, modern CSS offers two purpose-built layout engines: <mark>CSS Flexbox</mark> and <mark>CSS Grid</mark>.

By mastering these layout systems, you can build responsive, elegant interfaces that adapt seamlessly to mobile phones, tablets, and ultra-wide desktop monitors without brittle calculations.

Check out the official documentation on [MDN Web Docs CSS Grid Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) and [MDN CSS Flexbox](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Flexbox).

---

## When to Use Flexbox vs. CSS Grid

- **Flexbox (1-Dimensional):** Designed for laying out items in a single direction (either in a single row or in a single column). Perfect for navigation bars, button clusters, and card headers.
- **CSS Grid (2-Dimensional):** Designed for simultaneous control over both rows AND columns. Ideal for full-page dashboards, photo galleries, and multi-column article grids.

---

## Practical Flexbox Code Example

Here is how you can create a perfectly aligned, responsive navigation bar:

\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #ffffff;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
}
\`\`\`

### Output Breakdown:
- **\`display: flex\`:** Activates the flex formatting context for direct child elements.
- **\`justify-content: space-between\`:** Pushes the logo to the left edge and the navigation links to the right edge.
- **\`align-items: center\`:** Centers all items along the vertical axis.
- **\`gap: 1.5rem\`:** Applies uniform spacing between navigation links without manual margins.

---

## Practical CSS Grid Code Example

\`\`\`css
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: 2rem;
}
\`\`\`

### Output Breakdown:
This single declaration creates an auto-responsive layout where cards expand to fill available width and automatically stack into multiple columns on wider screens.

---

## Frequently Asked Questions (FAQs)

### 1. Can I combine CSS Grid and Flexbox in the same project?
Yes! In fact, modern frontend architecture uses CSS Grid for outer page layouts and Flexbox for inner component elements.

### 2. Are CSS Grid and Flexbox supported across all browsers?
Yes, every modern web browser (Chrome, Safari, Firefox, Edge) provides 100% native support for Grid and Flexbox.`,
    comments: []
  }
];
