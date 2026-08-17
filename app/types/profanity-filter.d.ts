declare module "profanity-filter" {
  interface ProfanityFilter {
    clean(string: string): string;
    seed(name: Record<string, string> | string): void;
    setReplacementMethod(method: "stars" | "word" | "grawlix"): void;
    setGrawlixChars(chars: string[]): void;
    addWord(word: string, replacement?: string): void;
    removeWord(word: string): void;
    debug(): {
      dictionary: Record<string, string>;
      replacementMethod: string;
      grawlixChars: string[];
    };
  }

  const filter: ProfanityFilter;
  export default filter;
}
