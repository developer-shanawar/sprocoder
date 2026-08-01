import { BlogPost } from "./types";

export const INITIAL_POSTS: BlogPost[] = [
  {
    id: "curated-1",
    title: "Fun with Coding: How Computers Understand Your Commands",
    tagline: "Learn how writing simple instructions makes games, websites, and apps work!",
    category: "Coding",
    date: "July 28, 2026",
    readTime: "3 min read",
    author: "S Pro Coder",
    excerpt: "Coding is just like writing a step-by-step recipe. Discover how your computer reads code to draw pictures, play sounds, and build fun games.",
    tags: ["coding", "beginners", "kids-guide", "webdev"],
    likes: 184,
    savesCount: 52,
    thumbnailUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    content: `## What is Coding?

Imagine you are teaching a friendly robot how to make a peanut butter sandwich. You need to give it exact steps:
1. Pick up two slices of bread.
2. Open the jar.
3. Spread the peanut butter on one slice.
4. Put the slices together!

**Coding works the exact same way.** Computers are super fast, but they need human creators to give them clear instructions.

---

## The Three Main Tools of Web Coding

When you visit a website, your computer uses three main helpers:

- **HTML (The House Skeleton):** HTML holds the words, images, and buttons together.
- **CSS (The Paint & Decorations):** CSS adds colors, pretty fonts, and fun rounded corners!
- **JavaScript (The Magic Electricity):** JavaScript makes buttons click, opens popup windows, and plays sounds.

---

## Why Learning Code is Amazing!

Writing code lets you express your imagination. You can build your own video game, create an online art shop, or design a website for your school project!

> "Anyone can learn to code. It starts with curiosity and one simple step at a time!"`,
    comments: [
      {
        id: "c1",
        author: "YoungCoder",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
        content: "This makes coding so easy to understand! Thank you!",
        date: "Today at 10:14 AM"
      }
    ]
  },
  {
    id: "curated-2",
    title: "What is Artificial Intelligence? A Friendly Guide for Everyone",
    tagline: "How smart computer programs learn to draw, talk, and solve puzzles.",
    category: "Artificial Intelligence",
    date: "July 24, 2026",
    readTime: "4 min read",
    author: "AI Assistant",
    excerpt: "AI helps computer tools learn from examples just like people do. Learn how robots and smart assistants understand questions and help us every day.",
    tags: ["ai", "learning", "technology", "simple-guide"],
    likes: 210,
    savesCount: 89,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    content: `## How Does AI Work?

When you were a toddler, your parents showed you pictures of cats. After seeing a few cats, your brain learned: *"Cats have fluffy fur, whiskers, and point ears!"*

**Artificial Intelligence (AI)** learns in a very similar way!

Computers are shown thousands of photos or sentences. Over time, the AI program learns patterns and figures out how to recognize cats, translate languages, or even answer homework questions.

---

## Cool Things AI Can Do Today

- **Voice Helpers:** Smart speakers listen to your voice and answer questions or play your favorite song.
- **Art & Drawing Tools:** AI can turn words like "a flying purple superhero puppy" into a fun drawing!
- **Game Companions:** In video games, computer opponents use AI to play along with you.

---

## Staying Safe with AI

Always remember that AI is a helper tool created by humans. It is always smart to double-check facts with books, teachers, and parents!`,
    comments: []
  },
  {
    id: "curated-3",
    title: "Building Your First Website: Simple Tips for Beginners",
    tagline: "Easy steps to create colorful pages with buttons, pictures, and text.",
    category: "Web Development",
    date: "July 20, 2026",
    readTime: "3 min read",
    author: "Web Master",
    excerpt: "Websites are built using three main building blocks: HTML for structure, CSS for color and style, and JavaScript for interactive fun!",
    tags: ["webdev", "html", "css", "beginners"],
    likes: 156,
    savesCount: 44,
    thumbnailUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80",
    content: `## Start Your Website Journey

Creating a web page is fun and rewarding! Here are the 3 simple steps to get started today:

1. **Pick a Fun Topic:** What do you love? Dinosaurs, space, video games, or pets?
2. **Write Simple Text:** Put down a big headline and a short paragraph introducing your favorite thing.
3. **Add Pretty Colors:** Use light colors like soft purple, sky blue, or mint green to make reading comfortable.

---

## Helpful Design Rules

- **Use Big Text:** Make headlines bold so readers can quickly see what the page is about.
- **Add Nice Pictures:** High quality pictures make every page look colorful and exciting.
- **Keep Space Around Text:** Don't crowd your words! Give your content breathing room.`,
    comments: []
  },
  {
    id: "sample-1",
    title: "How Video Games Are Made: From Art to Real-Time Fun",
    tagline: "Behind the scenes of how developers turn ideas into playable games.",
    category: "Games",
    date: "July 16, 2026",
    readTime: "4 min read",
    author: "Game Dev",
    excerpt: "Game developers use computer code and digital art to create interactive worlds where players can run, jump, and solve fun quests.",
    tags: ["games", "gamedev", "coding", "art"],
    likes: 198,
    savesCount: 72,
    thumbnailUrl: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
    content: `## Step 1: The Fun Idea

Every great game starts with a story or a fun mechanic. Will the player jump over obstacles, solve mystery puzzles, or build a giant castle?

---

## Step 2: Drawing Characters & Worlds

Artists draw the main character, monsters, backgrounds, and items. They make 2D cartoon sprites or 3D models that come alive when moved.

---

## Step 3: Coding the Physics

Coders write rules like:
- When the player presses spacebar, make the character jump!
- When the player collects a gold coin, add +10 points to their score!

---

## Step 4: Testing & Playing

Developers test the game many times to make sure there are no bugs or broken jumps. Then the game is ready for players all around the world!`,
    comments: []
  },
  {
    id: "sample-2",
    title: "Why Design Matters: Making Apps Easy and Fun to Use",
    tagline: "Simple rules for choosing nice colors, readable text, and friendly buttons.",
    category: "AI Tools",
    date: "July 12, 2026",
    readTime: "3 min read",
    author: "Designer Sue",
    excerpt: "Good design helps people use apps without getting confused. Simple shapes, bright colors, and clear text make every app easy to explore.",
    tags: ["design", "apps", "ux", "simple"],
    likes: 142,
    savesCount: 39,
    thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    content: `## What Makes a Great App Design?

Have you ever opened an app and immediately knew what to tap? That is great design in action!

Here are 3 secrets of great app design:
1. **Clear Buttons:** Buttons should look tap-able with smooth, rounded corners.
2. **Easy Words:** Use simple, friendly words that explain what happens when you tap a link.
3. **Calm Colors:** Soft light colors keep your eyes happy even after reading for a long time.`,
    comments: []
  }
];
