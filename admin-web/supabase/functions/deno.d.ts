// Type declarations for Deno runtime APIs used by Supabase Edge Functions.
// This file silences IDE errors without requiring the full Deno types package.

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;

  const env: {
    get(key: string): string | undefined;
  };
}

// Allow URL-based module imports (e.g. https://esm.sh/...)
declare module "https://*" {
  const mod: any;
  export default mod;
  export const createClient: any;
}
