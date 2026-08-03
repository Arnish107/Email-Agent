import { config } from "../config.js";
import type { EmailProvider } from "./types.js";
import { fixtureProvider } from "./fixture.js";
import { gmailProvider } from "./gmail.js";

export function getProvider(name: string): EmailProvider {
  switch (name) {
    case "gmail":
      return gmailProvider;
    case "fixture":
      if (!config.enableFixtureProvider) {
        throw new Error("Fixture provider is disabled");
      }
      return fixtureProvider;
    case "microsoft":
      throw new Error(
        "Microsoft Graph provider is scaffolded but not fully enabled in this prototype. Use Gmail or the fixture provider.",
      );
    default:
      throw new Error(`Unknown email provider: ${name}`);
  }
}
