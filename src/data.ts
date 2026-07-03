import { BlogPost } from "./types";

export const INITIAL_POSTS: BlogPost[] = [
  {
    id: "curated-1",
    title: "The Poetics of Purple Light: Designing for Ambient Emotion",
    tagline: "How color-temperature and floating neon hues alter our digital circadian rhythm.",
    category: "Design",
    date: "July 2, 2026",
    readTime: "5 min read",
    author: "Luminous Scholar",
    excerpt: "Light purple and colored neon hues are more than mere aesthetic choices—they represent a profound shift in how we craft virtual sanctuaries for night-dwellers.",
    tags: ["aesthetics", "color-theory", "ux-design", "ambient"],
    likes: 124,
    savesCount: 42,
    thumbnailUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    content: `## The Chromatic Shift

In the early decades of the web, default user interfaces were sterile. Pure white backgrounds stood in stark contrast with sharp blue hyperlinks. We built screens that mirrored the office: spreadsheets, white sheets of paper, and fluorescent overhead lights.

But the modern web has evolved from a utility terminal into an emotional companion. As our screen hours extend deep into the quiet hours of midnight, the design of virtual interfaces demands a softer, more protective atmosphere. 

Here enters the magic of **light purple** and ambient **chroma glows**.

### Why Light Purple?

Physiologically, light purple (lavender, orchid, soft violet) lies at the absolute boundaries of our visual spectrum. It merges the cooling tranquility of deep indigo with a subtle, electric warmth of rose. 
- **Reduced Eye Strain:** Under low-ambient conditions, soft violet tones emit fewer high-energy wavelengths compared to pure white or stark ice-blue, reducing sleep interruption.
- **Emotional Resonance:** Indigo and purple are universally associated with mystery, cosmic reflection, and premium craftsmanship. It signals that you are in a quiet workspace or an artistic sanctuary rather than a cold enterprise folder.

> "To design with ambient light is to acknowledge that every screen is a lamp, and every user is a creature seeking comfort."

---

## The Concept of Aura Aesthetics

When we integrate glowing lights (or *auras*) behind interface cards, we break the boundaries of the flat screen. It creates depth—a soft volumetric scattering effect that mimics fog, smoke, or neon signs shining through a mist.

### Implementing Volumetric Shadows in Web Design

Traditionally, we used box-shadows to signify physical elevation (the z-axis). Today, we use glowing shadows to signify *energy*. By styling container backdrops with a high-blur gradient and mixing in a blend-mode like \`mix-blend-mode: screen\` or soft opacity overlays, we achieve a modern "Glow Card" which appears to float over its canvas.

Here is a simple example of how color layers can create this magic:

\`\`\`css
/* The Ambient Glow Base */
.glowing-aura {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(0,0,0,0) 70%);
  filter: blur(40px);
}
\`\`\`

By coupling these backdrops with responsive transitions, cards seem to breathe when the cursor glides over them, transforming static layouts into dynamic, tactile landscapes.`,
    comments: [
      {
        id: "c1",
        author: "ChromaEnthusiast",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
        content: "This is stunning. The analysis of light purple wavelengths perfectly validates why my eyes feel so relaxed browsing here!",
        date: "Today at 10:14 AM"
      },
      {
        id: "c2",
        author: "ScribeDev",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
        content: "The concept of 'volumetric shadows' is brilliant. It makes total sense.",
        date: "Today at 12:45 PM"
      }
    ]
  },
  {
    id: "curated-2",
    title: "The Floating Menu: Crafting the Horizon of Modern Navigation",
    tagline: "An exploration into screen real-estate, touch targets, and the art of physical isolation.",
    category: "Technology",
    date: "June 28, 2026",
    readTime: "4 min read",
    author: "Tactile Voyager",
    excerpt: "By lifting the menu off the screen boundaries and letting it float with a frosted glass backdrop, we create a spatial experience that feels responsive to the touch.",
    tags: ["navigation", "floating-ui", "ux-patterns", "glassmorphism"],
    likes: 98,
    savesCount: 19,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    content: `## Breaking the Grid

For decades, websites locked their navigation systems into hard headers—cemented to the very top, absolute and rigid. While this established a standard, it also created a static, 'web-as-document' layout.

With the rise of fluid interfaces, navigation has transitioned from a fixed frame into an **interactive instrument**. 

A **floating menu bar** acts as a physical, independent object. It lives above the content plane, respecting the depth-of-field of the user's viewport.

### The Physics of Floating

To make a floating menu feel satisfying, it must possess physical properties:
1. **Glassmorphism Backdrop:** By using \`backdrop-blur-md\` combined with a translucent background (e.g., \`rgba(15, 12, 30, 0.65)\`), the menu hints at what lies underneath, maintaining a unified spatial context.
2. **Subtle Elevation:** Heavy shadow offsets are replaced with a high-blur, low-opacity shadow that adapts as the page scrolls.
3. **Kinetic Elasticity:** When hover/click states are triggered, the elements shouldn't snap. Instead, they should stretch or animate gracefully (using libraries like **motion**).

### Desktop vs. Mobile Adaptability

On widescreen desktops, the floating menu anchors the top center or floats vertically as a side deck, keeping the primary viewport clean. 
On mobile displays, it floats close to the bottom thumb zone, allowing comfortable, fatigue-free exploration.

This responsive positioning solves one of the oldest problems in mobile usability: reaching for the far top-left corner just to click a hamburger menu. By shifting the navigation into a floating island, we bridge the gap between elegant art direction and ergonomics.`,
    comments: [
      {
        id: "c3",
        author: "Eva_Codes",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
        content: "We should absolutely move all navigation menus closer to the bottom on mobile. Thumb strain is real!",
        date: "Yesterday at 3:30 PM"
      }
    ]
  },
  {
    id: "curated-3",
    title: "In Praise of Rounded Corners: Why Smoothness Rules the Web",
    tagline: "The cognitive psychology behind smooth curves and how it defines our comfort.",
    category: "Philosophy",
    date: "June 15, 2026",
    readTime: "6 min read",
    author: "Curvature Zen",
    excerpt: "From Apple's squircle to browser boundaries, rounded corners trigger a sense of safety and organic harmony in our subconscious mind.",
    tags: ["geometry", "psychology", "minimalism", "design-thinking"],
    likes: 156,
    savesCount: 88,
    thumbnailUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80",
    content: `## The Hostility of Shards

In nature, sharp, 90-degree corners are incredibly rare. Sharp edges signify threats—broken branches, flint blades, teeth, and stone shards. Our visual cortex is hardwired to process pointy objects with a micro-dose of cognitive defense.

When the digital era launched, the limitations of pixels forced us to display everything in blocks, squares, and hard steps. But as rendering engines and high-density screens caught up with our anatomy, we reclaimed the curve.

### The Cognitive Ease of Smoothness

Professor Jürg Nänni, a Swiss cognitive scientist, demonstrated that our eyes process curved shapes with significantly higher ease than sharp corners. 
- **Focal Tracking:** A sharp corner requires your fovea (the central focusing area of your eye) to halt, change direction at a sudden angle, and resume. A curve, however, allows your eye to glide continuously.
- **Content Framing:** Rounded corners act as an inward-pointing funnel. They draw the user's attention back towards the inside of the container, while a sharp corner pushes the eye outward.

> "A corner is a dead-end for the human eye. A curve is an open invitation to explore further."

---

## The Perfect Sizing: From 'Squircle' to Card Grids

In this blog, we embrace the **rounded corner** configuration. We use card boundaries with border-radius attributes ranging from \`1rem (rounded-2xl)\` to \`1.5rem (rounded-3xl)\`.

This is not a decoration; it's a structural cuddle. It tells the reader that this card is a self-contained island of peaceful thought. When coupled with the light purple ambient backlight, the cards appear like glowing, soft-edged pebbles resting on a dark velvet surface.

By removing the harsh digital corners, we make the blog feel organic, human, and welcoming.`,
    comments: []
  }
];
