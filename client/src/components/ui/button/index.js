import { cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-display font-medium tracking-wide transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-gold to-gold-dark text-background hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-gradient-to-br from-ruby-light to-ruby text-cream hover:shadow-[0_0_20px_rgba(155,17,30,0.4)] border border-ruby/50",
        outline:
          "border border-gold/20 bg-transparent text-cream hover:bg-gold/5 hover:border-gold/40 hover:text-gold",
        secondary:
          "bg-surface text-cream border border-gold/10 hover:bg-surface-light hover:border-gold/20",
        ghost:
          "text-muted-foreground hover:bg-gold/5 hover:text-cream",
        link: "text-gold underline-offset-4 hover:underline hover:text-gold-light",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
