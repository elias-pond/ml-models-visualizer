"use client";

import { Mail } from "lucide-react";

export function Socials() {
  return (
    <section
      id="socials"
      data-section
      className="border-t border-border px-4 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Connect with me
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Questions, feedback, or just want to say hi?
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/eliaspond/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-foreground/[0.02]"
          >
            <img
              src="/linkedin.png"
              alt="LinkedIn"
              className="h-5 w-5"
            />
            <span>LinkedIn</span>
            <span className="text-muted-foreground/60 transition-colors group-hover:text-foreground/80">
              /eliaspond
            </span>
          </a>

          {/* Email */}
          <a
            href="mailto:eliaspond7@gmail.com"
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-foreground/[0.02]"
          >
            <Mail className="h-5 w-5" />
            <span>Email</span>
            <span className="text-muted-foreground/60 transition-colors group-hover:text-foreground/80">
              eliaspond7@gmail.com
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
