@import "tailwindcss";

@layer base {
  body {
    @apply bg-[#0a0a0a] text-white antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  .glass {
    @apply border border-white/20 bg-white/10 backdrop-blur-xl;
  }
  
  .glass-dark {
    @apply border border-white/10 bg-black/40 backdrop-blur-2xl;
  }
}

/* Custom scrollbar for glassmorphic feel */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
